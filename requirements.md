# requirements.md

# Finance Tracker Mobile — Requirements

## 1. Product Summary

Build a serious offline-first mobile financial tracking application using Expo React Native. The app must work on Android first and be ready for iOS later. Users must be able to record income, expenses, transfers, wallets, and categories even without internet. When internet is available, the app synchronizes local data to Supabase.

## 2. Core Product Goals

1. Help users record daily personal finance quickly from a phone.
2. Keep the app usable when offline.
3. Synchronize data safely when back online.
4. Keep the MVP simple, stable, and maintainable.
5. Avoid premature complex features before the core offline-online flow is reliable.

## 3. Non-Goals for MVP

The MVP must NOT include these features yet:

- Bank account integration.
- Automatic transaction import.
- OCR receipt scanning.
- AI financial advisor.
- Family/shared finance.
- Multi-currency investment tracking.
- Complex budgeting engine.
- Web admin dashboard.
- Payment gateway.
- Loan management.
- Tax reporting.

These can be considered after the offline-first transaction flow is stable.

## 4. Target Platform

### 4.1 Initial Target

- Android phone.
- Local development using Expo.
- Physical device testing through Expo Go or development build.

### 4.2 Future Target

- iOS support.
- Play Store release.
- App Store release.
- EAS Build support.

## 5. Recommended Tech Stack

### 5.1 Mobile App

- Expo React Native.
- TypeScript.
- Expo Router.
- expo-sqlite for local database.
- Supabase JS client for auth and remote sync.
- Expo SecureStore for sensitive session/token storage.
- React Hook Form and Zod for form validation.
- Zustand or simple React Context for lightweight UI state.
- date-fns for date formatting.
- Optional UI library: NativeWind or Tamagui, but do not add heavy UI dependencies unless needed.

### 5.2 Backend

- Supabase Auth.
- Supabase PostgreSQL.
- Row Level Security.
- Supabase REST/PostgREST or Supabase JS client.
- Optional later: Supabase Edge Functions for advanced sync conflict handling.

## 6. User Roles

### 6.1 Normal User

The normal user can:

- Register and login.
- Use the app offline after login/session exists.
- Create wallets.
- Create income/expense categories.
- Create income, expense, and transfer transactions.
- View dashboard and reports.
- Sync data to server.
- Export local data later.

Only one role is needed for MVP.

## 7. Functional Requirements

## 7.1 Authentication

### REQ-AUTH-001 — Register

WHEN a new user opens the app and chooses register  
THE SYSTEM SHALL allow the user to create an account using email and password through Supabase Auth.

### REQ-AUTH-002 — Login

WHEN an existing user enters valid credentials  
THE SYSTEM SHALL authenticate the user and store the active session securely.

### REQ-AUTH-003 — Logout

WHEN the user logs out  
THE SYSTEM SHALL clear local auth session and prevent access to private screens.

### REQ-AUTH-004 — Offline Access After Login

IF the user has logged in before and the session is still available locally  
THE SYSTEM SHALL allow the user to open local financial data even when offline.

### REQ-AUTH-005 — Guest Mode Decision

THE SYSTEM SHALL NOT implement guest mode in MVP unless explicitly requested later.

Rationale: guest mode complicates account merge and sync.

---

## 7.2 Local Database

### REQ-LOCAL-001 — Local Persistence

THE SYSTEM SHALL store wallets, categories, transactions, sync metadata, and sync queue locally using SQLite.

### REQ-LOCAL-002 — App Restart Persistence

WHEN the user closes and reopens the app  
THE SYSTEM SHALL preserve all local financial records.

### REQ-LOCAL-003 — Client Generated IDs

THE SYSTEM SHALL generate UUIDs on the client for all wallet, category, and transaction records.

### REQ-LOCAL-004 — Soft Delete

WHEN a user deletes a wallet, category, or transaction  
THE SYSTEM SHALL mark the record as deleted using `deleted_at` instead of immediately removing it.

### REQ-LOCAL-005 — Local Migration

THE SYSTEM SHALL have a migration mechanism for SQLite schema changes.

---

## 7.3 Wallet Management

### REQ-WALLET-001 — Create Wallet

WHEN the user creates a wallet  
THE SYSTEM SHALL save wallet name, wallet type, starting balance, and timestamps locally.

Wallet types:

- cash
- bank
- ewallet
- other

### REQ-WALLET-002 — Edit Wallet

WHEN the user edits a wallet  
THE SYSTEM SHALL update local wallet data and add the change to the sync queue.

### REQ-WALLET-003 — Delete Wallet

WHEN the user deletes a wallet  
THE SYSTEM SHALL soft-delete the wallet and add the delete operation to the sync queue.

### REQ-WALLET-004 — Wallet Balance

THE SYSTEM SHALL calculate wallet balance from transactions instead of trusting only a mutable balance field.

For MVP, starting balance may be stored as an opening balance transaction.

---

## 7.4 Category Management

### REQ-CATEGORY-001 — Default Categories

WHEN a user first creates an account or initializes local data  
THE SYSTEM SHALL create default income and expense categories.

Suggested default expense categories:

- Food
- Transport
- Shopping
- Bills
- Health
- Education
- Family
- Entertainment
- Other

Suggested default income categories:

- Salary
- Freelance
- Business
- Gift
- Other

### REQ-CATEGORY-002 — Custom Category

WHEN the user adds a custom category  
THE SYSTEM SHALL save the category locally and queue it for sync.

### REQ-CATEGORY-003 — Category Type

THE SYSTEM SHALL classify each category as income or expense.

---

## 7.5 Transaction Management

### REQ-TRX-001 — Add Expense

WHEN the user adds an expense  
THE SYSTEM SHALL require amount, wallet, category, transaction date, and optionally note.

### REQ-TRX-002 — Add Income

WHEN the user adds income  
THE SYSTEM SHALL require amount, wallet, category, transaction date, and optionally note.

### REQ-TRX-003 — Add Transfer

WHEN the user transfers money between wallets  
THE SYSTEM SHALL require source wallet, destination wallet, amount, transaction date, and optionally note.

### REQ-TRX-004 — Amount Validation

THE SYSTEM SHALL reject transactions with amount less than or equal to zero.

### REQ-TRX-005 — Edit Transaction

WHEN the user edits a transaction  
THE SYSTEM SHALL update the local transaction record and queue an update operation.

### REQ-TRX-006 — Delete Transaction

WHEN the user deletes a transaction  
THE SYSTEM SHALL soft-delete the transaction and queue a delete operation.

### REQ-TRX-007 — Recent Transactions

THE SYSTEM SHALL display recent transactions sorted by transaction date descending.

---

## 7.6 Dashboard

### REQ-DASH-001 — Monthly Summary

THE SYSTEM SHALL show monthly income, monthly expense, and net cashflow.

### REQ-DASH-002 — Total Balance

THE SYSTEM SHALL show total balance across active wallets.

### REQ-DASH-003 — Offline Indicator

WHEN the device is offline  
THE SYSTEM SHALL show an offline indicator.

### REQ-DASH-004 — Sync Indicator

WHEN there are unsynced local changes  
THE SYSTEM SHALL show a pending sync indicator.

---

## 7.7 Reports

### REQ-REPORT-001 — Monthly Report

THE SYSTEM SHALL show income, expense, and balance summary for the selected month.

### REQ-REPORT-002 — Category Breakdown

THE SYSTEM SHALL show expense total grouped by category.

### REQ-REPORT-003 — Wallet Breakdown

THE SYSTEM SHALL show balance grouped by wallet.

---

## 7.8 Offline-First Sync

### REQ-SYNC-001 — Queue Local Changes

WHEN a user creates, updates, or deletes a local entity  
THE SYSTEM SHALL add a corresponding record to `sync_queue`.

### REQ-SYNC-002 — Sync When Online

WHEN the app detects internet connection  
THE SYSTEM SHALL attempt to push pending sync queue items to Supabase.

### REQ-SYNC-003 — Retry Failed Sync

WHEN sync fails  
THE SYSTEM SHALL mark the queue item as failed, save the error message, and retry later.

### REQ-SYNC-004 — Pull Remote Changes

WHEN sync succeeds or user triggers manual sync  
THE SYSTEM SHALL pull remote changes updated after the local `last_sync_at`.

### REQ-SYNC-005 — Conflict Strategy MVP

IF the same record is changed locally and remotely  
THE SYSTEM SHALL use last-write-wins based on `updated_at` for MVP.

### REQ-SYNC-006 — Conflict Visibility

WHEN a conflict is detected  
THE SYSTEM SHOULD log the conflict locally for debugging, even if MVP resolves using last-write-wins.

### REQ-SYNC-007 — Sync Status

THE SYSTEM SHALL store sync status per record using one of:

- synced
- pending
- failed
- conflict

### REQ-SYNC-008 — Manual Sync

THE SYSTEM SHALL provide a manual sync button in settings or dashboard.

---

## 7.9 Security and Privacy

### REQ-SEC-001 — Row Level Security

THE SYSTEM SHALL enforce Supabase Row Level Security so users can only access their own financial records.

### REQ-SEC-002 — Secure Session Storage

THE SYSTEM SHALL store auth session/tokens using secure mobile storage, not plain text local storage.

### REQ-SEC-003 — Local App Lock Later

THE SYSTEM SHOULD support PIN or biometric app lock in a future phase.

### REQ-SEC-004 — Sensitive Logs

THE SYSTEM SHALL NOT log full financial payloads, passwords, tokens, or secrets.

### REQ-SEC-005 — Environment Variables

THE SYSTEM SHALL keep Supabase URL and anon key in environment configuration.

---

## 7.10 UX Requirements

### REQ-UX-001 — Fast Add Transaction

THE SYSTEM SHALL allow the user to add a transaction in less than three major steps from the home screen.

### REQ-UX-002 — Mobile First

THE SYSTEM SHALL optimize layout for one-handed phone usage.

### REQ-UX-003 — Clear Empty State

WHEN no data exists  
THE SYSTEM SHALL show clear empty states and guide the user to create wallet and transaction.

### REQ-UX-004 — Indonesian Locale

THE SYSTEM SHALL format currency primarily as Indonesian Rupiah.

### REQ-UX-005 — Date Input

THE SYSTEM SHALL default transaction date to today.

---

## 7.11 Data Export

### REQ-EXPORT-001 — CSV Export Later

THE SYSTEM SHOULD support CSV export in a later phase.

### REQ-EXPORT-002 — Backup Later

THE SYSTEM SHOULD support local backup or cloud backup in a later phase.

---

## 8. Data Entities

MVP entities:

- profile
- wallet
- category
- transaction
- sync_queue
- sync_metadata

Optional later:

- budget
- recurring_transaction
- attachment
- audit_log
- device
- app_lock_setting

## 9. Acceptance Criteria for MVP

The MVP is accepted when:

1. User can register and login.
2. User can create wallet.
3. User can create income and expense category.
4. User can add income transaction.
5. User can add expense transaction.
6. User can add transfer transaction.
7. User can see dashboard summary.
8. User can turn off internet and still add transactions.
9. User can turn internet back on and sync pending transactions.
10. User can close and reopen app without losing local data.
11. Supabase RLS prevents users from reading other users' data.
12. Basic tests exist for repository, sync queue, and transaction calculations.

## 10. AI Agent Guardrails

The AI agent must follow these rules:

1. Do not blindly agree with implementation ideas.
2. Identify risks before making structural changes.
3. Do not rewrite the entire app when a small targeted change is enough.
4. Do not remove offline-first behavior.
5. Do not add complex libraries without explaining why.
6. Do not store financial data only in memory.
7. Do not bypass local SQLite for core financial records.
8. Do not disable Supabase RLS.
9. Do not expose secrets in code.
10. Before changing sync logic, explain impact on offline behavior.
