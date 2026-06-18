# design.md

# Finance Tracker Mobile — Design

## 1. Overview

This project is an offline-first mobile financial tracker built with Expo React Native. The app stores financial data locally using SQLite and syncs to Supabase when internet is available.

The app must be useful even before sync is available. Local SQLite is the main runtime data source. Supabase is used for authentication, backup, multi-device sync, and remote persistence.

## 2. Design Principles

1. Offline-first, not online-first with cache.
2. Local data must be fast and reliable.
3. All core write actions go to local SQLite first.
4. Sync is asynchronous and retryable.
5. Client-generated UUIDs must be used.
6. Deletes are soft deletes.
7. Security and RLS must be designed from the beginning.
8. Keep MVP small and stable before adding advanced finance features.

## 3. High-Level Architecture

```text
Expo React Native App
  |
  |-- Presentation Layer
  |     |-- Screens
  |     |-- Components
  |     |-- Forms
  |
  |-- Application Layer
  |     |-- Use Cases
  |     |-- Sync Orchestrator
  |     |-- Validation
  |
  |-- Data Layer
  |     |-- SQLite Repositories
  |     |-- Supabase Remote Repositories
  |     |-- Migrations
  |
  |-- Infrastructure
        |-- Auth Session Storage
        |-- Network Status
        |-- Logging
        |-- Environment Config
```

## 4. Runtime Data Flow

### 4.1 Create Transaction While Offline

```text
User submits transaction form
  ↓
Validate input with Zod
  ↓
Write transaction to SQLite in a local transaction
  ↓
Insert sync_queue item
  ↓
Update UI from local SQLite
  ↓
Show pending sync badge
```

### 4.2 Manual Sync When Online

```text
User taps Settings -> Sync Now
  ↓
Read pending sync_queue items
  ↓
Push local changes to Supabase
  ↓
Mark queue items as success or failed
  ↓
Pull remote changes updated after last_sync_at
  ↓
Upsert remote changes into SQLite
  ↓
Update last_sync_at
```

Current MVP behavior is manual sync only. Automatic background, app-start, foreground, or connectivity-triggered sync is future work and must not be assumed from the online-state diagram.

## 5. Suggested Folder Structure

```text
src/
  app/
    _layout.tsx
    index.tsx
    (auth)/
      login.tsx
      register.tsx
    (tabs)/
      dashboard.tsx
      transactions.tsx
      wallets.tsx
      reports.tsx
      settings.tsx
    transaction/
      new.tsx
      [id].tsx
    wallet/
      new.tsx
      [id].tsx
    category/
      index.tsx

  components/
    ui/
    finance/
      AmountInput.tsx
      TransactionCard.tsx
      WalletCard.tsx
      SyncStatusBadge.tsx
      EmptyState.tsx

  features/
    auth/
      auth.service.ts
      auth.store.ts
      auth.types.ts

    wallets/
      wallet.model.ts
      wallet.repository.ts
      wallet.service.ts
      wallet.schema.ts

    categories/
      category.model.ts
      category.repository.ts
      category.service.ts
      category.schema.ts

    transactions/
      transaction.model.ts
      transaction.repository.ts
      transaction.service.ts
      transaction.schema.ts
      transaction-calculator.ts

    dashboard/
      dashboard.service.ts

    reports/
      report.service.ts

    sync/
      sync-queue.repository.ts
      sync.service.ts
      sync.types.ts
      conflict-resolver.ts

  lib/
    db/
      sqlite.ts
      migrations.ts
      schema.sql
    supabase/
      supabase.ts
      supabase-session-storage.ts
    network/
      network.service.ts
    config/
      env.ts
    utils/
      money.ts
      date.ts
      uuid.ts
      logger.ts

  tests/
    unit/
    integration/
```

## 6. Navigation Design

Use Expo Router.

### Routes

```text
(auth)/login
(auth)/register

(tabs)/dashboard
(tabs)/transactions
(tabs)/wallets
(tabs)/reports
(tabs)/settings

transaction/new
transaction/[id]
wallet/new
wallet/[id]
category
```

### Main Tabs

1. Dashboard
2. Transactions
3. Wallets
4. Reports
5. Settings

## 7. Screen Design

## 7.1 Login Screen

Purpose:

- Let user login with email and password.
- Show offline warning if user has no local session and no internet.

Elements:

- Email input.
- Password input.
- Login button.
- Register link.
- Error message.

## 7.2 Dashboard Screen

Elements:

- Total balance.
- Monthly income.
- Monthly expense.
- Net cashflow.
- Sync status badge.
- Add transaction floating action button.
- Recent transactions.

## 7.3 Transactions Screen

Elements:

- List of transactions.
- Filter by month.
- Filter by type.
- Add button.
- Empty state.

## 7.4 Add Transaction Screen

Fields:

- Type: income, expense, transfer.
- Amount.
- Wallet.
- Destination wallet for transfer.
- Category for income/expense.
- Date.
- Note.

Validation:

- Amount must be greater than 0.
- Wallet is required.
- Category is required for income/expense.
- Destination wallet is required for transfer.
- Source and destination wallet cannot be the same.

## 7.5 Wallets Screen

Elements:

- List of active wallets.
- Balance per wallet.
- Add wallet button.
- Wallet type icon.

## 7.6 Reports Screen

Elements:

- Month picker.
- Income total.
- Expense total.
- Category breakdown.
- Wallet breakdown.

## 7.7 Settings Screen

Elements:

- Account information.
- Sync status.
- Manual sync button.
- Last sync time.
- Logout button.
- Future: export CSV.
- Future: app lock.

## 8. Local SQLite Schema

## 8.1 Schema Notes

- Store IDs as TEXT UUID.
- Use ISO string timestamps.
- Use integer minor units for money to avoid floating point issues.
  - Example: Rp10.000 stored as 10000.
- Use soft delete via `deleted_at`.
- Use `sync_status`.

## 8.2 migrations Table

```sql
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  executed_at TEXT NOT NULL
);
```

## 8.3 profiles Table

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
```

## 8.4 wallets Table

```sql
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'other')),
  opening_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON wallets(updated_at);
```

## 8.5 categories Table

```sql
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
```

## 8.6 transactions Table

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  wallet_id TEXT NOT NULL,
  destination_wallet_id TEXT,
  category_id TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  transaction_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',

  FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (destination_wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON transactions(updated_at);
```

## 8.7 sync_queue Table

```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_name TEXT NOT NULL CHECK (entity_name IN ('wallets', 'categories', 'transactions')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'failed', 'success')) DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
```

## 8.8 sync_metadata Table

```sql
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 9. Supabase Server Schema

**Schema Organization:**
- All application tables use custom schema: `financetracker`
- Supabase Auth tables remain in default `auth` schema (managed by Supabase)
- Benefits: Clean separation, easier migrations, clear namespace isolation

**Implementation Phase:** Phase 9 (Supabase Remote Schema and RLS)

**Note:** The following schema definitions were introduced for Phase 9+ implementation. Current runtime financial data remains SQLite-first. Supabase application tables are remote persistence for the approved manual sync flow; screens and ordinary financial services must not write financial records directly to Supabase.

**Phase 9 boundaries:**
- Do not create a remote `sync_queue` table for MVP unless separately approved.
- Do not store wallet balances remotely; balances remain derived from opening balance and transactions.
- Do not include remote `sync_status` by default; local sync status is app-local state unless Phase 10 proves a remote field is needed.
- Keep all application tables in the `financetracker` schema, not `public`.

## 9.1 profiles

```sql
CREATE SCHEMA IF NOT EXISTS financetracker;

CREATE TABLE IF NOT EXISTS financetracker.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
```

## 9.2 wallets

```sql
CREATE TABLE IF NOT EXISTS financetracker.wallets (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'other')),
  opening_balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);
```

## 9.3 categories

```sql
CREATE TABLE IF NOT EXISTS financetracker.categories (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  icon text,
  color text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);
```

## 9.4 transactions

```sql
CREATE TABLE IF NOT EXISTS financetracker.transactions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  wallet_id uuid NOT NULL REFERENCES financetracker.wallets(id),
  destination_wallet_id uuid REFERENCES financetracker.wallets(id),
  category_id uuid REFERENCES financetracker.categories(id),
  amount bigint NOT NULL CHECK (amount > 0),
  note text,
  transaction_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);
```

**Note:** Foreign key references in `financetracker.transactions` point to `financetracker.wallets` and `financetracker.categories` within the same custom schema.

## 10. Supabase RLS Policy Design

**Implementation Phase:** Phase 9 (Supabase Remote Schema and RLS)

Enable RLS for all tables in the `financetracker` schema:

- financetracker.profiles
- financetracker.wallets
- financetracker.categories
- financetracker.transactions

Example pattern:

```sql
ALTER TABLE financetracker.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own wallets"
ON financetracker.wallets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
ON financetracker.wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
ON financetracker.wallets
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
ON financetracker.wallets
FOR DELETE
USING (auth.uid() = user_id);
```

Repeat similar policies for `financetracker.categories` and `financetracker.transactions`.

## 11. Sync Design

## 11.1 MVP Sync Direction

Use two-way sync:

1. Push local pending changes.
2. Pull remote changes since last sync.

## 11.2 Push Algorithm

Pseudo-code:

```ts
async function pushPendingChanges() {
  const items = await syncQueueRepository.findPending();

  for (const item of items) {
    try {
      await syncQueueRepository.markProcessing(item.id);

      if (item.entityName === 'wallets') {
        await remoteWalletRepository.upsert(JSON.parse(item.payload));
      }

      if (item.entityName === 'categories') {
        await remoteCategoryRepository.upsert(JSON.parse(item.payload));
      }

      if (item.entityName === 'transactions') {
        await remoteTransactionRepository.upsert(JSON.parse(item.payload));
      }

      await syncQueueRepository.markSuccess(item.id);
      await localRepository.markRecordSynced(item.entityName, item.entityId);
    } catch (error) {
      await syncQueueRepository.markFailed(item.id, error.message);
    }
  }
}
```

## 11.3 Pull Algorithm

Pseudo-code:

```ts
async function pullRemoteChanges() {
  const lastSyncAt = await syncMetadataRepository.get('last_sync_at');

  const remoteWallets = await remoteWalletRepository.findUpdatedAfter(lastSyncAt);
  const remoteCategories = await remoteCategoryRepository.findUpdatedAfter(lastSyncAt);
  const remoteTransactions = await remoteTransactionRepository.findUpdatedAfter(lastSyncAt);

  await localWalletRepository.upsertMany(remoteWallets);
  await localCategoryRepository.upsertMany(remoteCategories);
  await localTransactionRepository.upsertMany(remoteTransactions);

  await syncMetadataRepository.set('last_sync_at', new Date().toISOString());
}
```

## 11.4 Conflict Strategy

For MVP:

- Use last-write-wins based on `updated_at`.
- If local record has `sync_status = pending` and remote record has newer `updated_at`, mark local record as `conflict`.
- For MVP, prefer latest `updated_at`, but log conflict metadata.

Later:

- Add conflict resolution screen.
- Add audit log.
- Add per-field merge.

## 12. Wallet Balance Calculation

Do not directly mutate wallet balance on every transaction except opening balance.

Recommended calculation:

```text
wallet balance =
  opening_balance
  + income transactions for wallet
  - expense transactions for wallet
  - outgoing transfers
  + incoming transfers
```

Pseudo-code:

```ts
function calculateWalletBalance(walletId, transactions, openingBalance) {
  return openingBalance
    + sum(income where wallet_id = walletId)
    - sum(expense where wallet_id = walletId)
    - sum(transfer where wallet_id = walletId)
    + sum(transfer where destination_wallet_id = walletId);
}
```

## 13. Money Format

Use integer amount in Rupiah.

Example:

```text
Rp10.000 => 10000
Rp250.500 => 250500
```

Display using Indonesian locale:

```ts
new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(amount);
```

## 14. Validation Rules

## 14.1 Wallet

- name required.
- type must be cash, bank, ewallet, or other.
- opening_balance must be >= 0.

## 14.2 Category

- name required.
- type must be income or expense.

## 14.3 Transaction

- type required.
- amount > 0.
- wallet_id required.
- category_id required for income and expense.
- destination_wallet_id required for transfer.
- destination_wallet_id cannot equal wallet_id.
- transaction_date required.

## 15. State Management

Use local SQLite as the source of truth.

Allowed:

- Zustand for UI-only state.
- React state for form state.
- SQLite queries for persistent data.
- Optional TanStack Query only if it does not bypass offline-first rules.

Do not store financial records only in Zustand/Context.

## 16. Error Handling

## 16.1 Local DB Error

- Show generic error to user.
- Log safe technical error.
- Do not lose form data.

## 16.2 Sync Error

- Mark queue item as failed.
- Keep data locally.
- Show pending/failed sync state.
- Allow manual retry.

## 16.3 Auth Error

- Show clear login/register error.
- Do not expose raw backend error if it contains sensitive details.

## 17. Testing Strategy

## 17.1 Unit Tests

Test:

- Money formatter.
- Date utilities.
- Transaction validation.
- Balance calculator.
- Conflict resolver.
- Sync queue state transitions.

## 17.2 Repository Tests

Test:

- SQLite migration.
- Create wallet.
- Create category.
- Create transaction.
- Soft delete.
- Query monthly summary.

## 17.3 Integration Tests

Test:

- Add transaction while offline.
- Sync pending transaction when online.
- Pull remote changes.
- Prevent duplicate sync queue processing.

## 18. Implementation Rules for Kiro AI Agent

1. Implement tasks incrementally.
2. Prefer small commits or small changes.
3. Keep files organized by feature.
4. Do not add new dependencies without updating this design.
5. Do not remove tests to make code pass.
6. Do not bypass SQLite for wallet/category/transaction writes.
7. Do not implement advanced features before MVP tasks are complete.
8. After each major change, run typecheck and tests when available.
