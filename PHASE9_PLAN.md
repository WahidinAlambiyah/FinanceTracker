# Phase 9 Plan - Supabase Remote Schema and RLS

**Status**: Planning complete, awaiting implementation approval  
**Recommended first step**: Documentation-only Phase 9A  
**Dependencies**: Phase 8 approved and closed

---

## 1. Current Architecture Summary

- Runtime financial data is local-first: wallets, categories, transactions, reports, dashboard metrics, and sync status all read from SQLite repositories.
- Financial writes go to SQLite first, then create `sync_queue` entries.
- Supabase is currently used for Auth only through `src/lib/supabase/client.ts` and secure session storage.
- No financial repository currently calls Supabase.
- Local schema has `profiles`, `wallets`, `categories`, `transactions`, `sync_queue`, and `sync_metadata`.
- Money is stored as integer Rupiah.
- Records use client-generated UUIDs.
- Deletes are soft deletes via `deleted_at`.
- Wallet balances are derived, not stored.

## 2. What Phase 8 Already Completed

Phase 8 is complete and intentionally limited to network and sync visibility foundation:

- Added `@react-native-community/netinfo`.
- Added network detection service.
- Expanded `sync_queue` repository with pending, failed, and status helpers.
- Added `sync_metadata` repository.
- Added `SyncStatusBadge`.
- Dashboard shows online/offline state.
- Settings shows network status, pending/failed counts, and `Never synced`.
- No Supabase schema/RLS was created.
- No push/pull sync was implemented.
- No sync queue processing was implemented.

## 3. Recommended Phase 9 Objective

Phase 9 should define and prepare the Supabase remote data boundary:

- Create a reviewed Supabase schema/RLS plan for the custom `financetracker` schema.
- Align remote table columns with the current SQLite schema.
- Define RLS policies for user-owned data isolation.
- Decide the exact SQL migration shape before any remote sync code exists.
- Keep the app runtime unchanged.

Phase 9 should start as documentation-only first, then proceed to schema SQL after explicit approval.

## 4. Explicit Non-Goals For Phase 9

Phase 9 must not:

- Push local data to Supabase.
- Pull remote data from Supabase.
- Process `sync_queue`.
- Add remote repositories.
- Add sync orchestration.
- Add manual sync UI.
- Add dependencies.
- Change dashboard/report formulas.
- Store wallet balances remotely.
- Change SQLite runtime behavior.
- Introduce Phase 10 or Phase 11 sync logic.

## 5. Proposed Supabase Schema Planning Scope

Remote schema should use custom schema `financetracker`, not `public`.

Planned tables:

- `financetracker.profiles`
- `financetracker.wallets`
- `financetracker.categories`
- `financetracker.transactions`

Remote tables should mirror local fields where possible:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)` for user-owned records
- Business fields matching SQLite
- `created_at timestamptz`
- `updated_at timestamptz`
- `deleted_at timestamptz`
- No `balance` column
- No app-side `sync_queue` table in Supabase for MVP unless separately approved

Important schema decisions before implementation:

- Remote `sync_status`: recommended default is not to include it remotely because sync status is local app state unless Phase 10 proves it is needed.
- Foreign keys: recommended default is to keep FK references for integrity, while confirming soft-delete behavior does not block syncing deleted wallets/categories referenced by historical transactions.
- Profile creation: recommended default is to explicitly choose trigger-based or app-created profile rows before SQL is written.

## 6. Proposed RLS Planning Scope

RLS should be enabled on every `financetracker` table.

Policy model:

- `profiles`: user can select/update only own profile where `auth.uid() = id`.
- `wallets`: user can select/insert/update/delete only rows where `auth.uid() = user_id`.
- `categories`: same ownership policy.
- `transactions`: same ownership policy.

For inserts and updates, policies must use `WITH CHECK (auth.uid() = user_id)`.

Because the app uses soft delete, Phase 10 should prefer `UPDATE deleted_at = ...` for remote deletion. Hard `DELETE` policies may still exist for administrative cleanup, but remote sync should not rely on hard deletes for normal user actions.

## 7. How Phase 9 Preserves Offline-First Behavior

- Runtime reads remain SQLite-only.
- Runtime writes remain SQLite-first.
- Existing `sync_queue` behavior is unchanged.
- Supabase schema exists only as future remote persistence infrastructure.
- No UI should change except documentation/status updates if approved.
- No Supabase financial queries should be introduced in app code.

## 8. Risks And Decisions Needing Approval

Risks:

- Documentation drift can lead to wrong SQL being copied, especially any reference to `public.*` application tables.
- Remote schema that diverges from SQLite will make Phase 10 sync fragile.
- Strict foreign keys can complicate out-of-order sync if transactions arrive before wallets/categories.
- Profile creation needs a clear strategy.
- RLS testing requires at least two users and real Supabase execution, which should be manual and explicitly approved.

Decisions needed:

- Approve whether Phase 9B should add SQL only, or also include manually applied Supabase setup steps.
- Approve whether SQL should live in a new `supabase/` folder or a docs SQL folder.
- Approve profile creation strategy: trigger-based or app-created later.
- Approve whether remote tables include `sync_status`. Recommended default: no.

## 9. Suggested Implementation Phases After Plan Approval

1. Phase 9A: Documentation-only
   - Create `PHASE9_PLAN.md`.
   - Update docs that incorrectly reference `public.*`.
   - Finalize remote table and RLS contract.

2. Phase 9B: Schema SQL draft
   - Add reviewed SQL for `financetracker` schema, tables, indexes, and RLS.
   - Do not execute automatically.

3. Phase 9C: Manual Supabase application
   - User applies SQL manually in Supabase after review.
   - User manually tests RLS with two users.

4. Phase 10: Push sync
   - Add remote repositories and sync queue processor.
   - Mark local records synced only after successful remote writes.

5. Phase 11: Pull sync
   - Pull remote changes since `last_sync_at`.
   - Apply last-write-wins MVP conflict strategy.

## 10. Files Likely To Be Changed Later

Likely documentation files:

- `PHASE9_PLAN.md`
- `tasks.md`
- `design.md`
- `src/lib/supabase/README.md`

Likely SQL/schema files, if approved later:

- A new Supabase SQL migration or setup file
- Possibly a new `supabase/` or `docs/sql/` folder if the repo standard is approved

App runtime files should not change in Phase 9A.

## 11. Test Strategy For Phase 9 Implementation

For documentation-only Phase 9A:

- Review docs for consistency with `financetracker` schema.
- Confirm no app code, dependencies, migrations, or runtime behavior changed.

For schema SQL Phase 9B/9C:

- Manually apply SQL in Supabase.
- Confirm schema exists: `financetracker`.
- Confirm four tables exist with expected columns.
- Confirm RLS is enabled on all four tables.
- Test with User A and User B:
  - User A cannot select User B records.
  - User A cannot insert records with User B `user_id`.
  - User A cannot update User B records.
  - User A cannot delete User B records.
- Confirm app still launches and remains SQLite-first.

## 12. Final Recommendation

Phase 9 should be documentation-only first.

Do not jump straight to schema execution. The current docs had schema drift around `public.*` references, and the profile/RLS/FK choices should be locked before SQL is created. After that, move to a schema-only SQL draft. App integration should wait for Phase 10.
