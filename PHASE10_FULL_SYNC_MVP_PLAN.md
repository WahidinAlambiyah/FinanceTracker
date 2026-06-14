# Phase 10 Full Sync MVP Plan

**Status**: Plan prepared; implementation not started  
**Scope**: Full MVP sync across Phase 10A-10E  
**Architecture**: SQLite remains the runtime source of truth; Supabase is remote persistence only

**Phase 10A Status**: Remote repository layer implemented. Push/pull orchestration, conflict handling, and sync UI have not started.

## Preconditions Before Phase 10A

Do not start Phase 10A until all items are confirmed:

- [ ] The `financetracker` schema has been applied in the intended Supabase project.
- [ ] The `financetracker` schema is exposed in Supabase API settings.
- [ ] Phase 9C structural verification passed.
- [ ] Authenticated two-user RLS testing passed.
- [ ] The mobile app uses only the anon key and authenticated user session; no service-role key is present.
- [ ] Phase 10A implementation is explicitly approved.

## Architecture

SQLite remains the only runtime source of truth for financial UI and business calculations. Supabase stores remote copies for backup and multi-device synchronization.

```text
User action
  -> local service validates input
  -> SQLite write succeeds
  -> sync_queue receives pending operation
  -> UI reloads from SQLite

Full sync cycle
  -> verify authenticated session and online state
  -> push local pending/eligible failed changes
  -> pull remote changes since the per-user cursor
  -> resolve conflicts and apply accepted changes to SQLite
  -> update per-user last_sync_at only after the full cycle succeeds
  -> UI refreshes from SQLite
```

Rules:

- Only one sync cycle may run at a time.
- Push runs before pull so the current device publishes its local changes first.
- Parent entities are processed before transactions: profiles, wallets, categories, then transactions.
- Remote records never bypass SQLite to update UI state.
- Every remote query is authenticated and scoped by RLS.
- Synchronization is asynchronous, retryable, and must not block local financial actions.

## Non-Goals

- No hard delete; deletion is synchronized through `deleted_at` tombstones.
- No remote `sync_queue` table.
- No wallet balance column locally or remotely.
- No service-role key in the mobile app.
- No dashboard or report formula changes.
- No direct Supabase financial writes from screens or ordinary feature services.
- No advanced manual conflict-resolution UI in MVP.

## Phase 10A - Remote Repositories

Implement typed Supabase repositories for profiles, wallets, categories, and transactions using `supabase.schema('financetracker')`.

Responsibilities:

- Explicit local-to-remote and remote-to-local field mapping.
- Profile bootstrap/upsert if required for the authenticated user.
- Owned-record upsert for wallets, categories, and transactions.
- Queries for records updated after a supplied timestamp, including soft-deleted rows.
- No remote `sync_status` mapping.
- Sanitize errors and never log full financial payloads or auth credentials.

**Definition of done:**

- [x] Repository interfaces and remote row types are defined.
- [x] All repositories target the `financetracker` schema.
- [x] Owned upsert and incremental read operations are implemented for authenticated RLS.
- [x] Incremental reads include soft-deleted rows.
- [x] No orchestration, automatic sync, or UI behavior is introduced yet.
- [x] Existing SQLite-first runtime behavior remains unchanged.

## Phase 10B - Push Sync

Process local queue entries and persist the current canonical SQLite records remotely.

Responsibilities:

- Validate authentication and online state before processing.
- Select only queue items belonging to the current authenticated user.
- Recover stale `processing` items safely after interruption.
- Process wallets/categories before dependent transactions.
- Upsert the complete current SQLite record, including `deleted_at`.
- Mark an item successful only after the remote write succeeds.
- Mark failures with sanitized errors and increment retry count.
- Coalesce or supersede duplicate queue entries after the canonical record is persisted.

**Definition of done:**

- [ ] Offline-created, edited, and soft-deleted records push successfully.
- [ ] Push is idempotent when the same queue item is retried.
- [ ] Failed items remain retryable and counts remain accurate.
- [ ] Dependency failures leave transactions queued rather than losing data.
- [ ] Hard delete is never called.
- [ ] Local actions remain usable when push fails.

## Phase 10C - Pull Sync

Pull remote changes into SQLite after push completes.

Responsibilities:

- Use a per-user `last_sync_at` metadata key to prevent account data/cursor mixing.
- Fetch wallet, category, and transaction rows updated after the cursor, including tombstones.
- Pull in dependency order: wallets, categories, then transactions.
- Apply remote records through local repository methods that can include deleted rows.
- Preserve newer local pending/failed changes.
- Use an overlap window or equivalent idempotent boundary strategy to avoid timestamp-edge misses.
- Update `last_sync_at` only after the complete push/pull cycle succeeds.

**Definition of done:**

- [ ] A second device can reconstruct current remote state in local SQLite.
- [ ] Remote creates, updates, and tombstones are applied locally.
- [ ] Pending local changes are not overwritten without conflict comparison.
- [ ] A partial pull does not advance the cursor.
- [ ] Replaying an overlap window is safe and idempotent.
- [ ] UI continues to read only from SQLite.

## Phase 10D - Conflict Handling and Multi-Device Convergence

Use Last Write Wins based on `updated_at` for MVP. `deleted_at` is part of the versioned record and counts as a change.

Rules:

- If only one side changed, use that version.
- If both sides changed, the later `updated_at` wins.
- If the remote version wins, apply it locally and supersede stale queue entries.
- If the local version wins, retain/queue it for the next push.
- Never physically delete a local or remote financial record.
- Log conflict metadata without logging full financial payloads.

**Definition of done:**

- [ ] Device A changes converge to Device B and vice versa.
- [ ] Concurrent edits converge deterministically through LWW.
- [ ] A newer tombstone wins over an older edit.
- [ ] A newer edit wins over an older tombstone without hidden hard deletion.
- [ ] Cross-user records never enter another user's SQLite database.
- [ ] Known client clock-skew limitations are documented.

## Phase 10E - Sync UI, Retry, and Demo Readiness

Add user-controlled and observable synchronization without changing financial data sourcing.

Responsibilities:

- Add a Settings `Sync Now` action.
- Display online/offline, syncing, success, pending, and failed states.
- Display the last successful full-sync timestamp.
- Prevent overlapping manual, foreground, and connectivity-triggered cycles.
- Retry eligible failed queue items without blocking local usage.
- Refresh displayed data from SQLite after sync completion.

**Definition of done:**

- [ ] Manual sync cannot start concurrent cycles.
- [ ] Status and pending/failed counts reflect the current user.
- [ ] Offline sync attempts return a non-blocking user-friendly result.
- [ ] Auth, RLS, network, and partial-cycle failures are distinguishable in logs.
- [ ] Dashboard and reports remain SQLite-first and formulas are unchanged.
- [ ] Full demo flow works across two authenticated devices/users as applicable.

## Error Handling

- **Offline:** skip remote calls, retain queue, and show offline status.
- **Expired/invalid session:** stop sync and request re-authentication without deleting local data.
- **RLS failure:** stop the affected cycle and log sanitized context; do not repeatedly retry as a network failure.
- **Remote/network failure:** retain or mark queue items failed for later retry.
- **Partial push:** successful items remain successful; failed/dependent items remain retryable; do not advance the full-sync cursor.
- **Partial pull:** preserve the previous cursor so the batch is replayed.
- **App interruption:** recover stale `processing` entries on the next cycle.

## Likely Files To Change

Expected new or expanded files under `src/features/sync/`:

- Remote repository types and implementations for profile/wallet/category/transaction.
- Full sync orchestration service and sync result/error types.
- Sync status state/hook if needed by Settings.

Expected targeted modifications:

- Local wallet/category/transaction repositories for sync-safe reads/upserts including tombstones.
- Sync queue repository for current-user filtering, recovery, retry, and superseding entries.
- Sync metadata repository for per-user cursor/status keys.
- Settings screen for manual sync and status.
- Authenticated app lifecycle/network integration for guarded sync triggers.
- Phase documentation and `tasks.md` after each approved subphase.

No dashboard/report calculation repository should change.

## Manual Test Checklist

- [ ] Create, edit, and soft delete while offline; confirm SQLite changes immediately.
- [ ] Reconnect and push all pending changes.
- [ ] Confirm remote records contain expected data and tombstones.
- [ ] Pull remote creates, updates, and deletes into a second device's SQLite database.
- [ ] Force a network failure and confirm failed queue items retry successfully.
- [ ] Repeat a completed sync and confirm idempotency/no duplicates.
- [ ] Device A changes propagate to Device B.
- [ ] Device B changes propagate back to Device A.
- [ ] Concurrent edits resolve using the newer `updated_at`.
- [ ] Soft-delete/edit conflicts converge according to LWW.
- [ ] User A cannot read or mutate User B data during sync.
- [ ] Interrupt sync and confirm stale processing recovery.
- [ ] Confirm `last_sync_at` advances only after a successful full cycle.
- [ ] Confirm dashboard, reports, and balances still use SQLite and existing formulas.

## Implementation Order and Approval Gates

Implement and review in this exact order:

1. 10A remote repositories.
2. 10B push sync.
3. 10C pull sync.
4. 10D conflict handling and multi-device convergence.
5. 10E UI, retry, and demo readiness.

Each subphase requires implementation review and manual verification before the next subphase begins. Preparing this plan does not approve code implementation automatically.

## Phase 11 Direction

Pull sync is now part of Phase 10C. Phase 11 should focus on post-MVP hardening, such as advanced conflict diagnostics, background scheduling, queue cleanup, observability, performance, recovery tooling, or Play Store readiness. Its exact scope requires a separate approved plan.
