# Phase 11B Sync Hardening Review

**Status**: Review completed  
**Scope**: Phase 10 sync implementation review only  
**Runtime changes**: None  
**Reviewer note**: This document records findings and recommendations only. It does not change sync behavior, SQLite schema, Supabase SQL, dependencies, dashboard formulas, or report formulas.

## Executive Summary

No blocker or high-severity issues were found in the Phase 10 sync implementation. The core MVP safety properties are intact: SQLite remains the runtime source of truth, `last_sync_at` advances only after complete manual convergence success, failed and partial sync attempts preserve local data, retryable queue items remain local, remote repositories enforce authenticated ownership checks, and delete behavior is tombstone-based rather than hard delete.

The medium cursor-hardening risk identified during review has been patched before Phase 11C: successful manual sync now stores the sync-cycle start timestamp instead of the completion timestamp. The five-minute overlap remains unchanged, and failed, partial, offline, or auth-required attempts still do not advance `last_sync_at`.

## Files Reviewed

- `src/features/sync/manual-sync.service.ts`
- `src/features/sync/manual-sync.types.ts`
- `src/features/sync/convergence-sync.service.ts`
- `src/features/sync/convergence-sync.types.ts`
- `src/features/sync/pull-sync.service.ts`
- `src/features/sync/pull-sync.types.ts`
- `src/features/sync/push-sync.service.ts`
- `src/features/sync/push-sync.types.ts`
- `src/features/sync/sync-queue.repository.ts`
- `src/features/sync/sync-queue.types.ts`
- `src/features/sync/sync-metadata.repository.ts`
- `src/features/sync/sync-metadata.types.ts`
- `src/features/sync/conflict-resolution.ts`
- `src/features/sync/conflict-resolution.types.ts`
- `src/features/sync/remote.repository-utils.ts`
- `src/features/sync/remote-profile.repository.ts`
- `src/features/sync/remote-wallet.repository.ts`
- `src/features/sync/remote-category.repository.ts`
- `src/features/sync/remote-transaction.repository.ts`
- `src/features/sync/remote.types.ts`
- `src/features/wallets/wallet.repository.ts`
- `src/features/categories/category.repository.ts`
- `src/features/transactions/transaction.repository.ts`
- `src/app/(tabs)/settings/index.tsx`
- `src/lib/utils/logger.ts`

## Findings Table

| ID | Severity | Area | Finding | Evidence | Recommendation |
|---|---|---|---|---|---|
| 11B-01 | medium | `last_sync_at` cursor | Patched after review. `last_sync_at` still advances only after complete convergence success, but the stored value is now the sync-cycle start timestamp rather than completion time. This avoids skipping remote writes that occur during a long sync cycle after a table has already been pulled. | `manual-sync.service.ts` captures `syncCycleStartedAt` before `convergenceSyncService.converge()` and stores it only after `isCompleteSuccess(result)`. Pull lower bound still uses `lastSyncAt - 5 minutes`. | no change |
| 11B-02 | medium | Equal timestamp conflicts | Equal-timestamp mismatches stay unresolved and safely block cursor advancement. This avoids data loss, but one unresolved item can cause repeated partial sync results until manually fixed or future conflict UI exists. | `resolveLastWriteWins()` returns `EQUAL_TIMESTAMP_MISMATCH`; convergence leaves it unsettled and does not mark queue success. | defer to future phase |
| 11B-03 | low | Queue retention | Successful queue rows are retained. Active retry/push queries exclude `success`, so this is not a correctness issue, but the table can grow over time. | `markSuccess()` changes status to `success`; no cleanup/coalescing is run in Phase 10E. | defer to future phase |
| 11B-04 | low | Duplicate queue rows | Multiple pending rows for the same entity can be processed separately. Because each push reads the canonical SQLite row and remote writes use idempotent upsert, this is acceptable for MVP but inefficient. | `findPushableItemsForUser()` returns rows by entity dependency and created time; convergence applies current canonical row. | documentation only |
| 11B-05 | low | Orphaned queue visibility | Orphaned queue rows are recoverable through payload ownership checks, but Settings counts only rows that still join to local entity tables. A hard-missing orphan can be retried by sync but not reflected in current-user pending/failed counts. This should be rare because product deletes are soft deletes. | `findOrphanedItemsForUser()` parses payload `user_id`; `countByStatusForUser()` counts only rows with matching local wallet/category/transaction records. | defer to future phase |
| 11B-06 | note | Manual retry | Manual sync intentionally uses a very high retry limit. This makes user-initiated retry effective, but a permanently invalid item can be attempted repeatedly. | `manual-sync.service.ts` passes `maxRetries: Number.MAX_SAFE_INTEGER` to convergence. | documentation only |
| 11B-07 | note | Logging hygiene | Sync logs avoid secrets, auth tokens, raw SQL, stack traces in user UI, and full financial payloads. Adjacent feature services still log limited metadata such as names and transaction amounts; that is outside this sync review but worth revisiting before release logging policy is finalized. | Sync services log codes/counts/entity IDs. `logger.error()` sanitizes messages and hides stack traces outside `__DEV__`. | defer to future phase |

## Non-Findings and Safe Behavior Confirmed

### `last_sync_at` Success Gate

Confirmed safe gate behavior. `manual-sync.service.ts` updates per-user `last_sync_at` only when convergence is a complete success:

- `result.success === true`
- `result.failedCount === 0`
- `result.unresolvedCount === 0`

Offline, auth-required, failed, and partial outcomes return without updating metadata.

### Per-User Metadata Isolation

Confirmed. `getLastSyncAtKey(userId)` stores the cursor as a user-specific key, preventing account cursor mixing on the same device.

### Overlap-Safe Pull Lower Bound

Confirmed. `getOverlappedUpdatedAfter()` uses Unix epoch for first sync and subtracts five minutes from an existing cursor. Local apply methods use `INSERT ... ON CONFLICT(id) DO UPDATE`, making replay idempotent for wallets, categories, and transactions.

### Retry Behavior

Confirmed. Pending rows and eligible failed rows remain in SQLite and are selected by `findPushableItemsForUser()`. Manual sync passes a high retry limit, so user-tapped retry can attempt failed rows again. Failures are marked `failed` with incremented `retry_count`; local financial data is not deleted.

### Stale Processing Recovery

Confirmed for normal interrupted sync rows. `resetProcessingItemsForUser(user.id)` changes current-user `processing` rows back to `pending` before processing. Current-user ownership is resolved through the canonical local entity tables.

### Conflict Behavior

Confirmed. LWW compares parsed `updated_at` values:

- local newer -> local wins and is upserted remotely.
- remote newer -> remote wins and is applied locally.
- equivalent equal timestamp -> queue item is marked success.
- mismatched equal timestamp -> unresolved and not marked success, preserving data rather than choosing arbitrarily.

### Safe User-Facing Messages

Confirmed for sync UI. Settings displays safe messages only:

- `Sync completed`
- `Some items still need attention`
- `You're offline`
- `Please sign in again`
- `Sync could not be completed. Please try again.`

No raw Supabase errors, SQL errors, stack traces, or provider payloads are shown to users.

### Logging Safety in Sync Scope

Confirmed for sync services. Sync logging uses codes, counts, entity names, entity IDs, and sanitized error wrappers. Remote repository errors are mapped to safe categories such as `RLS_DENIED`, `CONSTRAINT_VIOLATION`, and `REMOTE_UNAVAILABLE`.

### User Isolation

Confirmed. Remote repositories call `assertAuthenticatedOwner()` before reads and writes. Remote queries filter by current `user_id`. Local queue selection resolves ownership through local canonical entity tables, including soft-deleted rows.

### No-Hard-Delete Behavior

Confirmed for financial records. Wallet, category, and transaction deletes set `deleted_at`; remote upserts include `deleted_at`; pull applies tombstones locally through upsert. No reviewed sync path physically deletes wallet/category/transaction data.

Note: `sync_metadata.repository.ts` has a generic metadata `delete()` helper, but it is not a financial-record delete path and is not used by Phase 10 sync convergence.

## Proposed Next Steps

1. Cursor hardening patch applied before Phase 11C: successful sync now records the sync-cycle start timestamp as `last_sync_at`.
2. Keep equal-timestamp mismatch behavior as-is for MVP, but document it in demo notes as a known limitation until advanced conflict UI exists.
3. Defer queue cleanup/coalescing to a future hardening phase unless local database growth becomes visible during QA.
4. During Phase 11C, manually test replay idempotency by running `Sync Now` repeatedly after successful sync.
5. During release readiness, decide whether production logging should suppress transaction amount/name metadata outside sync-specific code.

## Definition of Review Completion

- Phase 10 sync implementation reviewed against the 11B topics.
- Findings are documented with severity and recommendations.
- Safe non-findings are explicitly confirmed.
- No runtime code was changed.
- No schema, SQL, dependency, dashboard formula, or report formula changes were made.
