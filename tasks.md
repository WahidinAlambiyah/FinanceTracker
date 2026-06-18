# tasks.md

# Finance Tracker Mobile — Implementation Tasks

## Notes for Kiro AI Agent

- Implement tasks sequentially.
- Do not skip offline-first foundations.
- Do not add advanced features before MVP.
- Before changing architecture, explain the risk and update `design.md`.
- Every write operation for financial records must go to local SQLite first.
- Supabase sync must be asynchronous and retryable.
- Keep implementation simple and testable.

---

## Phase 0 — Project Setup

- [x] 0.1 Create Expo project with TypeScript
  - Use Expo React Native.
  - Configure TypeScript.
  - Configure Expo Router.
  - Verify app runs on Android.
  - Requirements: REQ-AUTH-001, REQ-LOCAL-001

- [x] 0.2 Setup folder structure
  - Create `src/app`.
  - Create `src/components`.
  - Create `src/features`.
  - Create `src/lib`.
  - Create `src/tests`.
  - Follow `design.md` folder structure.

- [x] 0.3 Add base dependencies
  - Add `expo-sqlite`.
  - Add Supabase JS client.
  - Add `expo-secure-store`.
  - Add form validation dependencies.
  - Add UUID utility.
  - Add date and formatting utilities.
  - Do not add unnecessary UI framework yet.

- [x] 0.4 Setup environment config
  - Create `.env.example`.
  - Add Supabase URL placeholder.
  - Add Supabase anon key placeholder.
  - Ensure secrets are not committed.
  - Requirements: REQ-SEC-005

---

## Phase 1 — Local Database Foundation

- [x] 1.1 Implement SQLite connection
  - Create `src/lib/db/sqlite.ts`.
  - Open local database.
  - Export database helper functions.
  - Requirements: REQ-LOCAL-001, REQ-LOCAL-002

- [x] 1.2 Implement migration runner
  - Create `src/lib/db/migrations.ts`.
  - Create migrations table.
  - Run migrations once.
  - Store executed migration names.
  - Requirements: REQ-LOCAL-005

- [x] 1.3 Create initial local schema
  - Create profiles table.
  - Create wallets table.
  - Create categories table.
  - Create transactions table.
  - Create sync_queue table.
  - Create sync_metadata table.
  - Requirements: REQ-LOCAL-001

- [x] 1.4 Add local database initialization
  - Ensure database initializes before private screens load.
  - Show loading state during initialization.
  - Show safe error state if database fails.

- [ ] 1.5 Add repository tests for migration
  - Test fresh database migration.
  - Test migration does not run twice.
  - Test required tables exist.

---

## Phase 2 — Core Utilities

- [x] 2.1 Implement UUID utility
  - Create client-side UUID generator.
  - Use UUID for wallets, categories, transactions, and sync queue.
  - Requirements: REQ-LOCAL-003

- [x] 2.2 Implement date utility
  - Create ISO timestamp helper.
  - Create month range helper.
  - Create Indonesian date display helper.

- [x] 2.3 Implement money utility
  - Store money as integer Rupiah.
  - Format amount as IDR.
  - Parse user amount input.
  - Requirements: REQ-UX-004

- [x] 2.4 Implement logger utility
  - Avoid logging passwords, tokens, and complete financial payloads.
  - Requirements: REQ-SEC-004

---

## Additional Completed Tasks

### Phase 1 Fixes Applied

- **Migration Safety Enhancement** (Post Phase 1)
  - Wrapped each migration execution and `recordMigration()` in `withExclusiveTransactionAsync()` for atomic operations
  - Ensures schema execution and migration recording happen together
  - Prevents database inconsistency if migration partially succeeds
  - Note: `execAsync()` is only safe for static SQL; future repositories will use parameterized APIs (`runAsync()`, `prepareAsync()`, etc.)

- **Error Handling Improvement** (Post Phase 1)
  - Database initialization logs technical errors to console for developers
  - Returns generic user-facing error message: "Failed to initialize local database. Please restart the app."
  - Removed raw SQLite/migration error display from UI (`_layout.tsx`)
  - App startup screen (`index.tsx`) imports `getDatabase` directly (not dynamically)

### Phase 2 Implementation Notes

- **Zero External Dependencies**
  - UUID utility uses `expo-crypto` (built-in with Expo)
  - Date utility uses native JavaScript `Date` and `Intl.DateTimeFormat` APIs
  - Money utility uses native `Intl.NumberFormat` and `parseFloat`
  - Logger utility uses native console and Object methods
  - **Justification**: Native APIs are sufficient for Phase 2 requirements. Can add libraries like `date-fns` later if complex date operations needed.

- **Indonesian Locale Support**
  - Money formatting uses `id-ID` locale (Rupiah with dot thousands separator)
  - Date formatting uses `id-ID` locale (Indonesian month names)
  - Money parser handles both Indonesian format (`1.500.000` or `1,5jt`) and English format (`1,500,000`)

- **Framework-Light Design**
  - All utilities are pure functions (except logger console output)
  - No side effects (except logging)
  - Easy to unit test
  - Deterministic output for given input

- **Security Considerations**
  - Logger sanitizes sensitive object fields (password, token, secret, session, etc.)
  - Logger sanitizes message strings for common sensitive patterns
  - `logger.financial()` restricts logged fields to safe metadata only
  - Stack traces only logged in development mode (`__DEV__`)

### Pre-Phase 3 Checkpoint

- **Logger Error Safety Enhancement**
  - `logger.error()` now sanitizes `error.message` before logging
  - Stack traces are sanitized before logging in development mode
  - Production logging never exposes tokens, passwords, auth sessions, or secrets
  - Both object fields and string content are protected

- **AI/Developer Consistency Guide Created**
  - Created `AGENTS.md` as authoritative guide for Kiro AI, future AI agents, and human developers
  - Documents project mission, architecture rules, code organization, dependencies, security, and UI/UX design system
  - Establishes blue-based color palette and consistent component design
  - Defines phase discipline and documentation requirements
  - Ensures all contributors maintain architectural consistency

---

## Phase 3 — Authentication

- [x] 3.1 Setup Supabase client
  - Create `src/lib/supabase/supabase.ts`.
  - Configure Supabase URL and anon key.
  - Requirements: REQ-AUTH-001, REQ-AUTH-002

- [x] 3.2 Implement secure session storage
  - Use secure storage for auth session.
  - Do not store tokens in plain text.
  - Requirements: REQ-SEC-002

- [x] 3.3 Create auth service
  - Implement register.
  - Implement login.
  - Implement logout.
  - Implement get current session.
  - Requirements: REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-003

- [x] 3.4 Create login screen
  - Email input.
  - Password input.
  - Submit button.
  - Register link.
  - Safe error message.

- [x] 3.5 Create register screen
  - Email input.
  - Password input.
  - Confirm password input.
  - Submit button.
  - Login link.

- [x] 3.6 Implement protected navigation
  - Redirect unauthenticated users to login.
  - Allow authenticated users to access tabs.
  - Requirements: REQ-AUTH-004

**Phase 3 Status**: Implementation complete. TypeScript verification passed after tsconfig.json path alias fix (`@/*` → `./src/*` relative path). Expo dev server with dev client starts successfully.

---

## Phase 4 — Wallet Management

- [x] 4.1 Create wallet model and validation schema
  - Create wallet type.
  - Validate name.
  - Validate wallet type.
  - Validate opening balance.

- [x] 4.2 Create wallet repository
  - Create wallet.
  - Update wallet.
  - Soft delete wallet.
  - List active wallets.
  - Get wallet by ID.
  - Requirements: REQ-WALLET-001, REQ-WALLET-002, REQ-WALLET-003

- [x] 4.3 Create wallet service
  - Save wallet locally.
  - Add sync queue item after create/update/delete.
  - Requirements: REQ-SYNC-001

- [x] 4.4 Create wallets screen
  - Show wallet list.
  - Show empty state.
  - Show add wallet button.
  - Requirements: REQ-WALLET-001

- [x] 4.5 Create add wallet screen
  - Wallet name.
  - Wallet type.
  - Opening balance.
  - Save button.

- [x] 4.6 Create edit wallet screen
  - Load wallet by ID.
  - Edit wallet.
  - Soft delete wallet.

- [ ] 4.7 Add wallet tests (Deferred to Phase 13)
  - Create wallet.
  - Update wallet.
  - Soft delete wallet.
  - Queue sync item.

**Phase 4 Status**: Implementation complete with schema alignment patch applied. Manual testing checklist available in `PHASE4_SUMMARY.md`.

**Phase 4 Schema Alignment Patch Applied**: Initial Phase 4 implementation added unsupported fields (balance, currency, icon, color, notes, is_active, last_synced_at, investment type) that did not exist in Phase 1 SQLite schema. Patch removed all unsupported fields and aligned wallet implementation with existing schema columns only.

---

## Phase 5 — Category Management

- [x] 5.1 Create category model and validation schema
  - Create category type.
  - Validate name.
  - Validate category type.
  - Validate icon and color.

- [x] 5.2 Create category repository
  - Create category.
  - Update category.
  - Soft delete category.
  - List by type.
  - Requirements: REQ-CATEGORY-001, REQ-CATEGORY-002

- [x] 5.3 Create default category seeder
  - Seed default income categories.
  - Seed default expense categories.
  - Prevent duplicate default categories.
  - Requirements: REQ-CATEGORY-001

- [x] 5.4 Create category service
  - Save category locally.
  - Add sync queue item.
  - Requirements: REQ-SYNC-001

- [x] 5.5 Create category management screen
  - List categories by type.
  - Add custom category.
  - Edit category.
  - Soft delete category.

- [ ] 5.6 Add category tests (Deferred to Phase 13)
  - Seed defaults.
  - Create custom category.
  - Soft delete category.
  - Queue sync item.

**Phase 5 Status**: Implementation complete with seeding trigger fix applied. Manual testing checklist available in `PHASE5_SUMMARY.md`.

**Phase 5 Seeding Trigger Fix Applied**: Initial implementation gated seeding with `getCategoryCount() === 0`, which broke partial-seed recovery. Fix removes count gate, removes unused import, and always calls seeder on first load. Seeder is idempotent per-category and inserts only missing defaults. Uses `logger.error()` instead of `console.error()`.

---

## Phase 6 — Transaction Management

- [x] 6.1 Create transaction model and validation schema
  - Type: income, expense, transfer.
  - Amount.
  - Wallet ID.
  - Destination wallet ID.
  - Category ID.
  - Note.
  - Transaction date.
  - Requirements: REQ-TRX-001, REQ-TRX-002, REQ-TRX-003, REQ-TRX-004

- [x] 6.2 Create transaction repository
  - Create transaction.
  - Update transaction.
  - Soft delete transaction.
  - List recent transactions.
  - List transactions by month.
  - Requirements: REQ-TRX-005, REQ-TRX-006, REQ-TRX-007

- [x] 6.3 Create transaction service
  - Validate transaction.
  - Save locally.
  - Add sync queue item.
  - Requirements: REQ-SYNC-001

- [x] 6.4 Create add transaction screen
  - Type selector.
  - Amount input.
  - Wallet selector.
  - Destination wallet selector for transfer.
  - Category selector for income/expense.
  - Date input.
  - Note input.
  - Save button.
  - Requirements: REQ-UX-001, REQ-UX-005

- [x] 6.5 Create edit transaction screen
  - Load transaction.
  - Update transaction.
  - Soft delete transaction.

- [x] 6.6 Create transactions list screen
  - Show recent transactions.
  - Filter by month.
  - Filter by type.
  - Show pending sync state.

- [ ] 6.7 Add transaction tests (Deferred to Phase 13)
  - Add income.
  - Add expense.
  - Add transfer.
  - Reject amount <= 0.
  - Reject transfer to same wallet.
  - Queue sync item.

**Phase 6 Status**: Implementation complete with update-flow validation patch applied. Manual testing checklist available in `PHASE6_SUMMARY.md`.

**Phase 6 Update-Flow Validation Patch Applied**: Initial implementation validated inputs separately but didn't validate the final state after merging updates with existing transaction data. Patch computes final state (finalWalletId, finalDestinationWalletId, finalCategoryId) before validation, enforces type-specific rules based on existing transaction type (read-only), and prevents invalid field combinations.

**Phase 6 Route Structure**: Migrated from flat `transactions.tsx` to nested folder structure `transactions/index.tsx`, `transactions/new.tsx`, `transactions/[id].tsx`. Hidden nested routes from tab bar using `href: null`. Bottom tab bar shows only 5 main tabs.

**Phase 6 Date Input Approach**: Default to current timestamp with read-only display on create/edit. No date picker dependency added in Phase 6 (deferred to future phase if requested).

**Phase 6 Transaction Type Constraint**: Type is READ-ONLY on edit. Users must delete and recreate if type change is needed (prevents complex validation state issues).

---

## Phase 7 — Dashboard and Reports

- [x] 7.1 Implement balance calculator
  - Calculate wallet balance from opening balance and transactions.
  - Calculate total balance across wallets.
  - Requirements: REQ-WALLET-004, REQ-DASH-002

- [x] 7.2 Implement monthly summary service
  - Monthly income.
  - Monthly expense.
  - Net cashflow.
  - Requirements: REQ-DASH-001

- [x] 7.3 Create dashboard screen
  - Total balance.
  - Monthly income.
  - Monthly expense.
  - Net cashflow.
  - Recent transactions.
  - Add transaction button.
  - Requirements: REQ-DASH-001, REQ-DASH-002

- [x] 7.4 Create reports screen
  - Month selector.
  - Income and expense summary.
  - Expense by category.
  - Income by category.
  - Balance by wallet.
  - Requirements: REQ-REPORT-001, REQ-REPORT-002, REQ-REPORT-003

- [ ] 7.5 Add dashboard and report tests (Deferred to Phase 13)
  - Balance calculation.
  - Monthly summary.
  - Category breakdown.
  - Transfer impact on wallet balance.

**Phase 7 Status**: Implementation complete and manually verified. Balance is derived only (opening_balance + income - expense - transfers_out + transfers_in). Transfer handling verified (affects balance, not income/expense/cashflow). Dashboard and reports use local SQLite only. No chart dependency added. No new dependencies. No migrations. No remote sync/Supabase implementation. Manual testing passed.

---

## Phase 8 — Network and Sync Foundation

- [x] 8.1 Implement network status service
  - Detect online/offline state.
  - Expose current connectivity state.
  - Requirements: REQ-DASH-003

- [x] 8.2 Create sync queue repository
  - Add queue item.
  - Find pending items.
  - Mark processing.
  - Mark failed.
  - Mark success.
  - Increment retry count.
  - Requirements: REQ-SYNC-001, REQ-SYNC-003

- [x] 8.3 Implement sync metadata repository
  - Get last_sync_at.
  - Set last_sync_at.
  - Requirements: REQ-SYNC-004

- [x] 8.4 Create sync status badge component
  - Show synced.
  - Show pending.
  - Show failed.
  - Show offline.
  - Requirements: REQ-DASH-004

- [ ] 8.5 Add sync tests (Deferred to Phase 13)
  - Unit tests for network service
  - Unit tests for sync queue repository
  - Unit tests for sync metadata repository
  - UI tests for sync status badge

**Phase 8 Historical Status**: Implementation complete. Network detection using @react-native-community/netinfo. Sync queue repository expanded with query/update methods. Sync metadata repository implemented. Sync status badge component created. Dashboard shows network status. Settings displayed sync status foundation. At Phase 8 closure, remote sync processing and Supabase schema/RLS were not yet implemented; later Phase 9 and Phase 10 work completed those approved scopes.

---

## Phase 9 — Supabase Remote Schema and RLS

**Current status note**: Phase 9 is historical and was followed by Phase 10 Full Sync MVP. Supabase is now remote persistence for manual sync; SQLite remains the runtime source of truth.

**Phase 9A Planning Status**: Documentation-only plan created in `PHASE9_PLAN.md`. This was the initial planning status before later Phase 9/10 implementation work.

- [x] 9.0 Prepare Phase 9B SQL draft only
  - Draft file: `docs/sql/phase9b_financetracker_schema_rls.sql`.
  - Historical note: SQL was not executed as part of this draft-only task.
  - Later schema/RLS status is tracked by Phase 9C/Phase 10/Phase 11 QA notes.

- [x] 9.0.1 Prepare Phase 9C manual apply and RLS test guide
  - Guide file: `docs/sql/PHASE9C_MANUAL_APPLY_AND_RLS_TEST.md`.
  - Historical note: this item prepared the guide only.
  - Later RLS verification status is tracked under Phase 11D.5.

- [ ] 9.1 Create Supabase SQL migration
  - profiles table.
  - wallets table.
  - categories table.
  - transactions table.

- [ ] 9.2 Enable Row Level Security
  - Enable RLS on all user-owned tables.
  - Requirements: REQ-SEC-001

- [ ] 9.3 Add RLS policies
  - Users can select own records.
  - Users can insert own records.
  - Users can update own records.
  - Users can delete own records.
  - Requirements: REQ-SEC-001

- [ ] 9.4 Test RLS manually
  - User A cannot read User B data.
  - User A cannot update User B data.
  - User A cannot insert data for User B.

---

## Phase 10 — Full Sync MVP

- [x] 10.0 Prepare Full Sync MVP implementation plan
  - Plan file: `PHASE10_FULL_SYNC_MVP_PLAN.md`.
  - Historical planning item; Phase 10 implementation is now complete and closed.

### Phase 10A — Remote Repositories

- [x] 10A.1 Create remote repository types and field mappings
- [x] 10A.2 Create remote profile repository/bootstrap if needed
- [x] 10A.3 Create remote wallet repository
- [x] 10A.4 Create remote category repository
- [x] 10A.5 Create remote transaction repository

**Phase 10A Status**: Remote repository layer implemented and later verified as part of the closed Phase 10 MVP.

### Phase 10B — Push Sync

- [x] 10B.1 Process current-user pending and eligible failed queue items
- [x] 10B.2 Push canonical SQLite records in dependency order
- [x] 10B.3 Synchronize deletes through `deleted_at` tombstones
- [x] 10B.4 Mark queue success only after confirmed remote write
- [x] 10B.5 Recover failed/interrupted items and prevent overlapping explicit runs

**Phase 10B Status**: Explicit push service implemented and later verified as part of the closed Phase 10 MVP.

### Phase 10C — Pull Sync

- [x] 10C.1 Pull remote changes from an explicit per-user lower bound
- [x] 10C.2 Apply remote rows and tombstones to SQLite in dependency order
- [x] 10C.3 Skip rows with pending/processing/failed local queue work
- [x] 10C.4 Return maximum observed remote timestamp without advancing the cursor

**Phase 10C Status**: Explicit pull service implemented and later verified as part of the closed Phase 10 MVP.

### Phase 10D — Conflict Handling and Multi-Device

- [x] 10D.1 Implement Last Write Wins using `updated_at`
- [x] 10D.2 Treat `deleted_at` as a versioned change
- [x] 10D.3 Add explicit conflict-aware push/pull convergence flow
- [x] 10D.4 Preserve authenticated ownership checks during convergence

**Phase 10D Status**: Conflict resolution and explicit convergence service implemented and later verified as part of the closed Phase 10 MVP.

### Phase 10E — Sync UI, Retry, and Demo Readiness

- [x] 10E.1 Add guarded manual sync action in Settings
- [x] 10E.2 Display online/offline, never/last synced, syncing, success, partial, pending, and failed states
- [x] 10E.3 Add non-overlapping manual retry using current-user queue counts and an overlap-safe cursor
- [x] 10E.4 Complete offline, retry, conflict, and multi-device demo checklist

**Phase 10E Status**: Manual Settings sync is implemented and manually verified using `convergenceSyncService`, with per-user `last_sync_at`, a five-minute overlap window, current-user device-local queue counts, safe user messages, and repeatable manual retry. No background, app-start, foreground, or connectivity-triggered sync was added. Manual demo verification passed.

**Phase 10 Final Status**: Phase 10 Full Sync MVP is verified and closed. Remote repositories, push sync, pull sync, conflict-aware convergence, manual `Sync Now`, offline behavior, retry behavior, user isolation, no-hard-delete behavior, and `last_sync_at` behavior were manually verified. `npx tsc --noEmit` passed.

### Phase 11 — Post-MVP Sync Hardening and Release Readiness

The legacy Phase 11 pull-sync checklist is superseded. Pull sync, local remote-row upsert, LWW conflict handling, and the full manual sync flow were completed in Phase 10C, 10D, and 10E. Do not implement the old Phase 11.1-11.5 checklist as active code work.

- [x] 11A.1 Close Phase 10 documentation after manual verification
- [x] 11A.2 Supersede legacy Phase 11 pull-sync checklist
- [x] 11A.3 Create `PHASE11_HARDENING_RELEASE_READINESS_PLAN.md`
- [x] 11B.1 Review `last_sync_at` behavior
- [x] 11B.2 Review retry behavior
- [x] 11B.3 Review stale queue handling
- [x] 11B.4 Review duplicate queue and replay behavior
- [x] 11B.5 Review safe user-facing messages
- [x] 11C.0 Create data integrity QA checklist and evidence template
- [x] 11C.1 Validate wallet/category/transaction CRUD after sync
- [x] 11C.2 Validate dashboard/report formulas remain unchanged
- [x] 11C.3 Validate transfers after sync
- [x] 11C.4 Validate tombstones
- [x] 11C.5 Validate app restart persistence
- [x] 11D.1 Validate offline create/edit/delete
- [x] 11D.2 Validate reconnect and `Sync Now`
- [ ] 11D.3 Validate two-device convergence
- [ ] 11D.4 Validate expired session behavior
- [x] 11D.5 Validate RLS isolation
- [x] 11E.1 Remove obsolete documentation wording
- [x] 11E.2 Ensure no temporary DEV buttons/scripts remain
- [x] 11E.3 Ensure `.env.example` is safe
- [x] 11E.4 Ensure no secrets or local test files are committed
- [x] 11E.5 Document lint/typecheck checklist
- [x] 11E.6 Prepare demo script

**Phase 11A Status**: Planning and Phase 10 closure documentation completed only. No runtime code, SQLite schema, Supabase SQL, dependencies, dashboard formulas, or report formulas changed.

**Phase 11B Status**: Sync hardening review completed in `docs/reviews/PHASE11B_SYNC_HARDENING_REVIEW.md`. No runtime code, SQLite schema, Supabase SQL, dependencies, dashboard formulas, or report formulas changed. Review found no blockers or high-severity issues; one medium cursor-hardening tiny patch is recommended before Phase 11C.

**Phase 11B Patch Note**: Cursor hardening patch applied. Manual sync now records the sync-cycle start timestamp as `last_sync_at` after complete convergence success, preserving the existing five-minute overlap and success-only advancement gate. Later Phase 11C/11D/11E statuses are recorded below.

**Phase 11C Documentation Status**: Data integrity QA checklist and evidence template created in `docs/qa/PHASE11C_DATA_INTEGRITY_QA.md`. Later Phase 11C manual QA results are recorded below.

**Phase 11C Partial QA Status**: Historical partial snapshot. Wallet, category, and transaction CRUD after sync passed manual QA (`11C-WALLET-01` through `11C-TRX-03`). Later Phase 11C results below record the remaining 11C.1-11C.5 checks.

**Phase 11C Bugfix Note**: `11C-TRANSFER-01` found a valid UI bug: Wallets screen displayed `opening_balance` instead of derived/current wallet balance after transfers. A small Wallets screen patch now reuses `getWalletBalances(userId)` from the dashboard feature and keeps the existing derived formula unchanged. The transfer retest passed later.

**Phase 11C Transfer Retest Status**: `11C-TRANSFER-01` passed after the Wallets derived balance patch. Source wallet decreases, destination wallet increases, transfer does not count as income/expense, and the existing balance formula remains unchanged. Later Phase 11C statuses record formula, tombstone, and persistence results; user isolation is tracked under Phase 11D.

**Phase 11C Formula QA Status**: `11C-FORMULA-01` passed manually. Verified Income Rp900.000, Expense Rp525.000, Net Cashflow Rp375.000, and Total Balance Rp10.500.000 from Dana Rp800.000 plus Bank BCA Rp9.700.000. Transfers do not count as income/expense.

**Phase 11C Sync Settlement Bugfix Note**: Manual QA found a remote-existing Rp200.000 transfer transaction still had a local pending queue/entity status and `Sync Now` returned partial. The likely cause was strict equivalence causing `EQUAL_TIMESTAMP_MISMATCH` for semantically equivalent rows. Convergence equivalence now compares timestamp fields by parsed time and normalizes `undefined` to `null` for nullable fields without changing LWW rules. Retest is required before considering the pending queue issue resolved.

**Phase 11C Sync Settlement Retest Status**: Retest after equivalence normalization patch passed. `Sync Now` completed, pending local queue became 0, Transfer Pending badge disappeared, Supabase remote row remained safe, and no duplicate remote row was created. Later Phase 11C statuses record tombstone and app restart persistence results.

**Phase 11C Tombstone QA Status**: `11C-TOMBSTONE-01` passed manually. Wallet/category/transaction tombstones were verified: deleted items are hidden from active UI, remote rows remain present, `deleted_at` is populated, no hard delete was observed, and tombstones remain preserved after `Sync Now`. App restart persistence passed later.

**Phase 11C App Restart Persistence QA Status**: `11C-PERSIST-01` passed manually. Full app close/reopen preserved wallet data, transaction data, dashboard values, and reports values. Tombstoned items remained hidden from active UI, Settings showed no new pending/failed queue after restart, and `Sync Now` after restart did not create duplicate data.

**Phase 11C Status**: Phase 11C data integrity QA items `11C.1` through `11C.5` are complete. RLS/user isolation remains tracked under Phase 11D and is not marked complete here.

**Phase 11D Offline QA Status**: `11D.1` passed manually and is documented in `docs/qa/PHASE11D_OFFLINE_ONLINE_RELEASE_QA.md`. Offline wallet/category/transaction create worked locally, local edits worked offline, soft deletes worked offline, UI updated from SQLite, pending local queue increased, Supabase was not required for local offline operations, and no crash was observed. Later Phase 11D statuses record 11D.2 and 11D.5 results.

**Phase 11D Reconnect QA Status**: `11D.2` passed manually and is documented in `docs/qa/PHASE11D_OFFLINE_ONLINE_RELEASE_QA.md`. Offline-created/edited/deleted data was preserved locally, `Sync Now` after reconnect cleared pending queue to 0, failed count remained 0, Supabase rows were created/updated correctly, tombstones remained intact, no hard delete or duplicate data was observed, and dashboard/report values remained consistent. Later Phase 11D statuses record 11D.3, 11D.4, and 11D.5 outcomes.

**Phase 11D Two-Device QA Deferral**: `11D.3` two-device convergence is intentionally deferred due to test-device availability/time constraints. It remains unchecked and is not considered passed. Retest is required before claiming full multi-device release readiness. `11D.4` is also deferred; `11D.5` passed later.

**Phase 11D Expired Session QA Deferral**: `11D.4` expired-session behavior is intentionally deferred and remains unchecked. Normal logout prevents access to Settings and is not equivalent to expired-session `Sync Now` QA. Retest requires a safe way to invalidate the auth session while the app remains on a screen that can trigger `Sync Now`, or another approved QA strategy. `11D.5` passed later.

**Phase 11D RLS QA Status**: `11D.5` passed manually and is documented in `docs/qa/PHASE11D_OFFLINE_ONLINE_RELEASE_QA.md`. User A only sees User A data, User B only sees User B data, remote rows have correct `user_id` ownership, no cross-user leak was observed, and `Sync Now` did not pull another user's rows.

**Phase 11D Status**: `11D.1`, `11D.2`, and `11D.5` are complete. `11D.3` two-device convergence and `11D.4` expired-session behavior are deferred and not considered passed. Phase 11D is not claimed as fully passed because deferred items remain.

**Phase 11E.1-11E.2 Cleanup Status**: Obsolete documentation wording was updated to reflect current Phase 10/11 status. Review found no temporary DEV sync buttons, reset/wipe scripts, or production-reachable debug sync UI. Production `Sync Now` remains the approved Phase 10E manual sync action. Logging policy cleanup remains an owner decision and is not treated as a completed runtime change.

**Phase 11E.3-11E.4 Cleanup Status**: `.env.example` was verified as placeholder-only. Git safety checks confirmed `.env` is local-only and not present in git history; `.expo/` is ignored; `.claude/settings.json` is tracked and remains an owner decision. `.gitignore` was hardened for env variants, local SQLite files, keystore/certificate files, and credential artifacts. No runtime behavior changed.

**Phase 11E.5 Static Check Status**: `npm run typecheck` exists and runs `tsc --noEmit`. Typecheck result from 11E.5A: PASS. Lint result: NOT AVAILABLE because no project-level ESLint config or lint dependency is present. Owner decision: do not add ESLint/lint tooling in Phase 11E; lint setup is deferred to a future owner-approved task. `11E.5` is complete with this documented limitation. No runtime, schema, sync, Supabase config, or logging behavior changed.

**Phase 11E.6 Release Demo Script Status**: Release demo script created in `docs/qa/PHASE11E_RELEASE_DEMO_SCRIPT.md`. The script documents the approved MVP demo flow, current release boundaries, preconditions, manual sync demo steps, RLS isolation smoke check, negative/deferred items, pass/fail checklist, troubleshooting notes, and references. It does not claim Phase 11D fully passed, does not mark two-device convergence or expired-session behavior as passed, and does not claim lint coverage. No runtime, schema, sync, Supabase config, or logging behavior changed.

**Phase 11E Status**: Phase 11E release-readiness cleanup is complete with documented limitations. `11D.3` two-device convergence and `11D.4` expired-session behavior remain deferred and not considered passed. Lint remains unavailable/deferred by owner decision. Typecheck passed during 11E.5.

### Legacy Phase 10 Checklist (Superseded)

The checklist below was written for the former push-only Phase 10 scope. Do not use it for implementation tracking; use the approved 10A-10E checklist above. It is retained temporarily for requirements traceability until documentation cleanup is separately approved.

- [ ] 10.1 Create remote repositories
  - Remote wallet repository.
  - Remote category repository.
  - Remote transaction repository.
  - Use Supabase client.
  - Respect user_id from auth session.

- [ ] 10.2 Implement push sync service
  - Read pending sync_queue.
  - Push wallets.
  - Push categories.
  - Push transactions.
  - Mark success or failed.
  - Requirements: REQ-SYNC-002, REQ-SYNC-003

- [ ] 10.3 Add retry handling
  - Failed items remain local.
  - Failed items can be retried.
  - Save last_error.
  - Requirements: REQ-SYNC-003

- [ ] 10.4 Add manual sync button
  - Add to settings screen.
  - Trigger push sync.
  - Show success or failure message.
  - Requirements: REQ-SYNC-008

- [ ] 10.5 Test offline-to-online push
  - Turn off internet.
  - Add transaction.
  - Confirm pending queue.
  - Turn on internet.
  - Run sync.
  - Confirm data exists in Supabase.

---

## Phase 11 — Post-MVP Sync Hardening and Release Readiness

**Legacy scope note**: Pull sync moved to Phase 10C. The checklist retained below is superseded and must not be treated as the active Phase 11 plan. The active Phase 11 plan is now **Phase 11 — Post-MVP Sync Hardening and Release Readiness**, with details in `PHASE11_HARDENING_RELEASE_READINESS_PLAN.md`.

- [ ] 11.1 Implement remote query updated after timestamp
  - Wallets updated after last_sync_at.
  - Categories updated after last_sync_at.
  - Transactions updated after last_sync_at.
  - Requirements: REQ-SYNC-004

- [ ] 11.2 Implement local upsert from remote
  - Upsert remote wallets.
  - Upsert remote categories.
  - Upsert remote transactions.
  - Preserve local pending records carefully.
  - Requirements: REQ-SYNC-004

- [ ] 11.3 Implement last-write-wins conflict resolver
  - Compare updated_at.
  - Prefer latest record.
  - Mark conflict when needed.
  - Requirements: REQ-SYNC-005, REQ-SYNC-006

- [ ] 11.4 Integrate full sync flow
  - Push pending changes.
  - Pull remote changes.
  - Update last_sync_at.
  - Refresh UI.
  - Requirements: REQ-SYNC-002, REQ-SYNC-004

- [ ] 11.5 Test remote-to-local pull
  - Create remote data.
  - Run sync.
  - Confirm local data appears.

---

## Phase 12 — Settings and UX Polish

- [x] 12A Product polish and Settings UX review
- [x] 12B Settings UX polish
- [x] 12C Empty/loading/error state polish
- [ ] 12D Form validation and confirmation polish
- [ ] 12E Final polish verification

**Phase 12B Status**: User-facing Settings and sync copy was polished only. Raw user ID is hidden from normal Settings UI, technical queue wording was replaced with clearer user-facing labels, manual `Sync Now` behavior is explained, and internal roadmap/phase wording is not shown to users. Validation follow-up passed with `npm.cmd run typecheck`. No sync behavior, SQLite schema, Supabase config/RLS, dependencies, or runtime data flow changed. `11D.3` two-device convergence and `11D.4` expired-session behavior remain deferred and not considered passed.

**Phase 12C Status**: Empty, loading, and error state copy was polished for Dashboard, Reports, Wallets, Transactions, and Categories. Minor text overflow protection was added for visible list/card labels and amount rows. Validation passed with `npm.cmd run typecheck`. No sync behavior, auth behavior, SQLite schema, Supabase config/RLS, dependencies, runtime data flow, or financial formulas changed. `11D.3` two-device convergence and `11D.4` expired-session behavior remain deferred and not considered passed.

<!-- Legacy Phase 12 checklist retained below for requirements traceability. -->

- [ ] 12.1 Create settings screen
  - Account info.
  - Sync status.
  - Last sync time.
  - Manual sync button.
  - Logout button.

- [ ] 12.2 Add empty states
  - Empty wallet state.
  - Empty transaction state.
  - Empty report state.
  - Requirements: REQ-UX-003

- [ ] 12.3 Add loading and error states
  - Form submit loading.
  - Database loading.
  - Sync loading.
  - Safe error messages.

- [ ] 12.4 Improve mobile layout
  - One-handed friendly spacing.
  - Large tap targets.
  - Clear typography.
  - Requirements: REQ-UX-002

---

## Phase 13 — Testing and Quality

- [ ] 13.1 Add unit test setup
  - Configure test runner.
  - Add basic test scripts.
  - Keep tests runnable locally.

- [ ] 13.2 Add utility tests
  - Money formatter.
  - Date helper.
  - UUID helper.
  - Logger safety.

- [ ] 13.3 Add finance logic tests
  - Balance calculator.
  - Monthly summary.
  - Category breakdown.
  - Transfer logic.

- [ ] 13.4 Add sync tests
  - Queue item lifecycle.
  - Failed sync retry.
  - Last-write-wins conflict resolver.

- [ ] 13.5 Run checks
  - Typecheck.
  - Lint.
  - Tests.
  - Fix only relevant issues.

---

## Phase 14 — Android Build Preparation

- [ ] 14.1 Configure app metadata
  - App name.
  - App slug.
  - Android package name.
  - Icon placeholder.
  - Splash screen placeholder.

- [ ] 14.2 Configure EAS
  - Add EAS config.
  - Create development build profile.
  - Create preview build profile.
  - Create production build profile.

- [ ] 14.3 Build Android preview
  - Generate APK or AAB preview.
  - Install on physical Android device.
  - Test login.
  - Test offline transaction.
  - Test sync.

---

## Phase 15 — Future Enhancements After MVP

Do not implement before MVP acceptance criteria are met.

- [ ] 15.1 CSV export
- [ ] 15.2 PIN app lock
- [ ] 15.3 Biometric unlock
- [ ] 15.4 Recurring transactions
- [ ] 15.5 Budgeting
- [ ] 15.6 Receipt attachment
- [ ] 15.7 OCR receipt scanning
- [ ] 15.8 Family/shared finance
- [ ] 15.9 Advanced conflict resolution screen
- [ ] 15.10 Audit log
- [ ] 15.11 iOS release preparation

---

## MVP Completion Checklist

The MVP is complete only when all items below are true:

- [ ] User can register.
- [ ] User can login.
- [ ] User can create wallet.
- [ ] User can create category.
- [ ] User can create income transaction.
- [ ] User can create expense transaction.
- [ ] User can create transfer transaction.
- [ ] User can see dashboard summary.
- [ ] User can use the app while offline.
- [ ] User can add transaction while offline.
- [x] User can sync pending data after online.
- [x] User can see pending/failed sync state.
- [x] Supabase RLS prevents cross-user data access.
- [ ] Local data persists after app restart.
- [ ] Basic unit and repository tests pass.
