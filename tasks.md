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

---

## Phase 4 — Wallet Management

- [ ] 4.1 Create wallet model and validation schema
  - Create wallet type.
  - Validate name.
  - Validate wallet type.
  - Validate opening balance.

- [ ] 4.2 Create wallet repository
  - Create wallet.
  - Update wallet.
  - Soft delete wallet.
  - List active wallets.
  - Get wallet by ID.
  - Requirements: REQ-WALLET-001, REQ-WALLET-002, REQ-WALLET-003

- [ ] 4.3 Create wallet service
  - Save wallet locally.
  - Add sync queue item after create/update/delete.
  - Requirements: REQ-SYNC-001

- [ ] 4.4 Create wallets screen
  - Show wallet list.
  - Show empty state.
  - Show add wallet button.
  - Requirements: REQ-WALLET-001

- [ ] 4.5 Create add wallet screen
  - Wallet name.
  - Wallet type.
  - Opening balance.
  - Save button.

- [ ] 4.6 Create edit wallet screen
  - Load wallet by ID.
  - Edit wallet.
  - Soft delete wallet.

- [ ] 4.7 Add wallet tests
  - Create wallet.
  - Update wallet.
  - Soft delete wallet.
  - Queue sync item.

---

## Phase 5 — Category Management

- [ ] 5.1 Create category model and validation schema
  - Category name.
  - Category type.
  - Icon.
  - Color.
  - is_default.

- [ ] 5.2 Create category repository
  - Create category.
  - Update category.
  - Soft delete category.
  - List by type.
  - Requirements: REQ-CATEGORY-001, REQ-CATEGORY-002

- [ ] 5.3 Create default category seeder
  - Seed default income categories.
  - Seed default expense categories.
  - Prevent duplicate default categories.
  - Requirements: REQ-CATEGORY-001

- [ ] 5.4 Create category service
  - Save category locally.
  - Add sync queue item.
  - Requirements: REQ-SYNC-001

- [ ] 5.5 Create category management screen
  - List categories by type.
  - Add custom category.
  - Edit category.
  - Soft delete category.

- [ ] 5.6 Add category tests
  - Seed defaults.
  - Create custom category.
  - Soft delete category.
  - Queue sync item.

---

## Phase 6 — Transaction Management

- [ ] 6.1 Create transaction model and validation schema
  - Type: income, expense, transfer.
  - Amount.
  - Wallet ID.
  - Destination wallet ID.
  - Category ID.
  - Note.
  - Transaction date.
  - Requirements: REQ-TRX-001, REQ-TRX-002, REQ-TRX-003, REQ-TRX-004

- [ ] 6.2 Create transaction repository
  - Create transaction.
  - Update transaction.
  - Soft delete transaction.
  - List recent transactions.
  - List transactions by month.
  - Requirements: REQ-TRX-005, REQ-TRX-006, REQ-TRX-007

- [ ] 6.3 Create transaction service
  - Validate transaction.
  - Save locally.
  - Add sync queue item.
  - Requirements: REQ-SYNC-001

- [ ] 6.4 Create add transaction screen
  - Type selector.
  - Amount input.
  - Wallet selector.
  - Destination wallet selector for transfer.
  - Category selector for income/expense.
  - Date input.
  - Note input.
  - Save button.
  - Requirements: REQ-UX-001, REQ-UX-005

- [ ] 6.5 Create edit transaction screen
  - Load transaction.
  - Update transaction.
  - Soft delete transaction.

- [ ] 6.6 Create transactions list screen
  - Show recent transactions.
  - Filter by month.
  - Filter by type.
  - Show pending sync state.

- [ ] 6.7 Add transaction tests
  - Add income.
  - Add expense.
  - Add transfer.
  - Reject amount <= 0.
  - Reject transfer to same wallet.
  - Queue sync item.

---

## Phase 7 — Dashboard and Reports

- [ ] 7.1 Implement balance calculator
  - Calculate wallet balance from opening balance and transactions.
  - Calculate total balance across wallets.
  - Requirements: REQ-WALLET-004, REQ-DASH-002

- [ ] 7.2 Implement monthly summary service
  - Monthly income.
  - Monthly expense.
  - Net cashflow.
  - Requirements: REQ-DASH-001

- [ ] 7.3 Create dashboard screen
  - Total balance.
  - Monthly income.
  - Monthly expense.
  - Net cashflow.
  - Recent transactions.
  - Add transaction button.
  - Offline indicator.
  - Sync indicator.
  - Requirements: REQ-DASH-001, REQ-DASH-002, REQ-DASH-003, REQ-DASH-004

- [ ] 7.4 Create reports screen
  - Month selector.
  - Income and expense summary.
  - Expense by category.
  - Balance by wallet.
  - Requirements: REQ-REPORT-001, REQ-REPORT-002, REQ-REPORT-003

- [ ] 7.5 Add dashboard and report tests
  - Balance calculation.
  - Monthly summary.
  - Category breakdown.
  - Transfer impact on wallet balance.

---

## Phase 8 — Network and Sync Foundation

- [ ] 8.1 Implement network status service
  - Detect online/offline state.
  - Expose current connectivity state.
  - Requirements: REQ-DASH-003

- [ ] 8.2 Create sync queue repository
  - Add queue item.
  - Find pending items.
  - Mark processing.
  - Mark failed.
  - Mark success.
  - Increment retry count.
  - Requirements: REQ-SYNC-001, REQ-SYNC-003

- [ ] 8.3 Implement sync metadata repository
  - Get last_sync_at.
  - Set last_sync_at.
  - Requirements: REQ-SYNC-004

- [ ] 8.4 Create sync status badge component
  - Show synced.
  - Show pending.
  - Show failed.
  - Show offline.
  - Requirements: REQ-DASH-004

---

## Phase 9 — Supabase Remote Schema and RLS

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

## Phase 10 — Push Sync

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

## Phase 11 — Pull Sync

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
- [ ] User can sync pending data after online.
- [ ] User can see pending/failed sync state.
- [ ] Supabase RLS prevents cross-user data access.
- [ ] Local data persists after app restart.
- [ ] Basic unit and repository tests pass.
