# FinanceTracker Phase 11E Release Demo Script

## Purpose

This demo validates the release-ready MVP flow after Phase 10 Full Sync MVP and Phase 11 hardening/cleanup.

The goal is to show the approved MVP behavior safely and repeatably:

- Local-first financial data operations.
- Offline usability through SQLite.
- Manual sync through Settings -> Sync Now.
- Remote persistence through Supabase sync services.
- Known release boundaries and deferred items.

This demo is not a production app-store release checklist.

## Current Release Boundaries

- SQLite is the runtime source of truth.
- Supabase is remote persistence only.
- Sync is manual through Settings -> Sync Now.
- UI/screens must not directly write financial data to Supabase.
- Two-device convergence is deferred and not considered passed.
- Expired session behavior is deferred and not considered passed.
- Lint is unavailable/deferred by owner decision.
- Typecheck passed during Phase 11E.5.
- This is not a production App Store / Play Store release checklist.

## Demo Preconditions

- App can run locally or as a development build using the owner's previously used workflow.
- Valid local `.env` exists and is not committed.
- Supabase project, `financetracker` schema, and RLS are already prepared from earlier phases.
- Test account/user is available.
- Network can be toggled offline and online.
- Start from a known local dataset, or state that exact values may differ from the script.
- Demo user understands that Settings -> Sync Now is the approved manual sync path.

## Demo Flow

### 1. App Launch and Login

Steps:

1. Launch the app.
2. Confirm auth/session state.
3. Login if needed with the test account.
4. Confirm the app reaches the authenticated area.

Expected result:

- The app launches without requiring remote financial data reads for local UI startup.
- Authenticated user can access the app.
- If already signed in, the existing session is used.

### 2. Local-First Transaction Create

Steps:

1. Create one expense or income transaction.
2. Confirm the transaction appears immediately in the local UI.
3. Do not run sync before confirming local visibility.

Expected result:

- Transaction is available before sync.
- UI reflects the SQLite write immediately.
- Any pending sync indicator represents local queue state, not completed remote convergence.

### 3. Local Edit

Steps:

1. Edit the transaction amount, category, or note according to current UI behavior.
2. Save the edit.
3. Confirm the local UI updates.

Expected result:

- Edited values appear locally before manual sync.
- The update remains a SQLite-first operation.
- No direct Supabase write is required from the screen.

### 4. Local Delete / Soft Delete Behavior

Steps:

1. Delete or remove the transaction according to current UI behavior.
2. Confirm it disappears from active transaction views or is marked according to app behavior.
3. Do not assume hard delete.

Expected result:

- Active UI no longer shows the deleted transaction, or shows the current app's intended delete state.
- Deletion is handled locally first.
- Sync should preserve tombstone behavior instead of requiring a remote hard delete.

### 5. Offline Behavior

Steps:

1. Turn network off.
2. Create, edit, or delete a transaction while offline.
3. Confirm the app remains usable.
4. Confirm the local UI updates while offline.

Expected result:

- Local SQLite write works while offline.
- App does not depend on direct Supabase access for local create/edit/delete.
- Pending local queue may increase.
- No crash is observed.

### 6. Reconnect and Manual Sync Now

Steps:

1. Turn network on.
2. Go to Settings -> Sync Now.
3. Trigger sync manually.
4. Wait for sync result messaging and status refresh.

Expected result:

- Sync completes successfully.
- Local pending queue settles.
- No duplicate rows appear.
- Remote persistence is updated through the sync service.
- Supabase remains remote persistence, not the runtime source of truth.

### 7. Reopen App / Persistence Check

Steps:

1. Restart or reopen the app if possible.
2. Login again if needed.
3. Confirm local data persists.
4. Confirm dashboard/report values remain consistent with the local dataset.

Expected result:

- SQLite data persists after app restart.
- Synced and locally retained data remain visible according to current app behavior.
- Dashboard/report values are still derived from local data.

### 8. RLS Isolation Smoke Check

Safe manual verification:

1. Use User A and User B test accounts prepared for QA.
2. Confirm User A data appears only for User A.
3. Confirm User B data appears only for User B.
4. Run Settings -> Sync Now per account if needed.
5. Do not expose secrets, anon keys, service keys, auth tokens, or raw credentials in demo notes.

Expected result:

- RLS isolation holds.
- User A cannot access User B remote rows.
- User B cannot access User A remote rows.
- Detailed evidence is tracked in `docs/qa/PHASE11D_OFFLINE_ONLINE_RELEASE_QA.md` under 11D.5.

### 9. Negative/Deferred Demo Items

Do not demonstrate or claim these items as passed:

- Two-device convergence.
- Expired session behavior.
- Full automated background sync.
- App Store / Play Store production release.
- Lint coverage.

These remain outside the approved Phase 11E.6 demo pass claim.

## Demo Talking Points

- FinanceTracker is offline-first: SQLite is the runtime source of truth.
- Supabase is used for authenticated remote persistence and sync, not direct UI writes.
- Manual sync through Settings -> Sync Now is an intentional MVP boundary.
- UI/screens must not directly write financial records to Supabase because that would bypass local queue, retry, tombstone, and offline guarantees.
- The current MVP validates local create/edit/delete, offline usage, reconnect sync, tombstones, persistence, and RLS isolation smoke behavior.
- Two-device convergence and expired-session `Sync Now` behavior are intentionally deferred.
- Lint coverage is unavailable/deferred; Phase 11E.5 typecheck passed.
- This demo supports release-readiness review, not production store submission.

## Demo Pass/Fail Checklist

| Step | Expected Result | Status |
|------|-----------------|--------|
| App Launch and Login | App launches and authenticated user can access private screens. | TODO |
| Local-first Transaction Create | Transaction appears in local UI before sync. | TODO |
| Local Edit | Edited transaction values update locally before sync. | TODO |
| Local Delete / Soft Delete Behavior | Deleted transaction disappears from active UI or follows current app delete behavior. | TODO |
| Offline Behavior | Offline local create/edit/delete works from SQLite without direct Supabase dependency. | TODO |
| Reconnect and Manual Sync Now | Manual Sync Now completes, pending queue settles, and no duplicate rows appear. | TODO |
| Reopen App / Persistence Check | Local data persists after restart/reopen. | TODO |
| RLS Isolation Smoke Check | User A and User B remain isolated; no cross-user rows appear. | TODO |
| Negative/Deferred Items | Deferred items are not claimed as passed. | TODO |

## Troubleshooting Notes

| Issue | What to Check |
|---|---|
| Not logged in | Confirm the test account is available and login succeeds before demoing private flows. |
| Missing `.env` | Confirm local `.env` exists and contains owner-provided Supabase values; do not commit or expose it. |
| Supabase unreachable | Confirm network is online and the Supabase project is reachable before running Sync Now. |
| Network still offline | Recheck device/emulator network state before expecting remote sync to complete. |
| Sync fails due expired session | Treat as a known risk path; 11D.4 expired-session behavior is deferred and not passed. |
| Pending queue not settling | Check whether a local queue item failed, the session is valid, and Supabase is reachable. Do not manually edit local DB during demo unless separately approved. |
| Duplicate row appears | Stop the demo, record evidence, and investigate sync idempotency before claiming release readiness. |
| RLS check cannot be performed locally | Reference 11D.5 evidence and mark the live smoke check as not run instead of claiming a new pass. |

## References

- `tasks.md`
- `docs/qa/PHASE11C_DATA_INTEGRITY_QA.md`
- `docs/qa/PHASE11D_OFFLINE_ONLINE_RELEASE_QA.md`
- `PHASE11_HARDENING_RELEASE_READINESS_PLAN.md`
- `README.md`
