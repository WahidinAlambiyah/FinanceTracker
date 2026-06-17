# Phase 11C Data Integrity QA

**Status**: Checklist prepared; manual execution pending  
**Scope**: Manual QA for data integrity after Phase 10 sync  
**Runtime changes**: None

## Objective

Validate that wallet, category, transaction, transfer, tombstone, dashboard/report, persistence, and user-isolation behavior remains correct after manual sync. SQLite must remain the app runtime source of truth, while Supabase is used only for authenticated backup and multi-device synchronization.

## Preconditions

- Phase 10 Full Sync MVP is verified and closed.
- Phase 11B sync hardening review is completed.
- Phase 11B cursor hardening patch is applied.
- Supabase `financetracker` schema is applied and exposed through API settings.
- RLS is enabled and manually verified for two users.
- Two test accounts are available:
  - User A: `<user_a_email>` / `<user_a_id>`
  - User B: `<user_b_email>` / `<user_b_id>`
- At least one Android device or emulator is available.
- Optional second device/emulator is available for pull/convergence checks.
- Tester can inspect Supabase table rows for read-only verification.

## Test Data Setup

Use clearly named records so QA evidence is easy to inspect:

- Wallet A1: `QA Wallet Cash A`
- Wallet A2: `QA Wallet Bank A`
- Wallet B1: `QA Wallet Cash B`
- Category A income: `QA Income A`
- Category A expense: `QA Expense A`
- Transaction notes:
  - `QA income sync`
  - `QA expense sync`
  - `QA transfer sync`
  - `QA edited transaction`

Recommended starting state:

- User A is signed in on Device A.
- User B is signed in on Device B or can be tested by signing out/in on the same device.
- Run `Sync Now` once per account before test execution if the account already has local test data.
- Record whether each test starts from a clean local database or an existing QA database.

## Evidence Template

Copy this block for each executed test.

```text
Test ID:
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

## Step-by-Step Checklist

### 11C-WALLET-01 - Wallet Create Push

Expected result: A newly created wallet appears immediately in local UI, receives a pending queue item, and appears in Supabase after `Sync Now`.

Evidence:

```text
Test ID: 11C-WALLET-01
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Sign in as User A.
2. Create wallet `QA Wallet Cash A`.
3. Confirm wallet appears in Wallets UI before sync.
4. Run `Sync Now`.
5. Verify Supabase `financetracker.wallets` has the wallet for User A.

### 11C-WALLET-02 - Wallet Edit Push/Pull

Expected result: Wallet edits sync to remote and can be pulled into another device/account session for the same user.

Evidence:

```text
Test ID: 11C-WALLET-02
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Edit `QA Wallet Cash A` to `QA Wallet Cash A Edited`.
2. Run `Sync Now`.
3. On a second User A device/session, run `Sync Now`.
4. Confirm the edited wallet name appears.

### 11C-WALLET-03 - Wallet Soft Delete

Expected result: Deleted wallet is hidden from active UI, remains as a tombstone locally/remotely, and is not hard deleted.

Evidence:

```text
Test ID: 11C-WALLET-03
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Soft delete `QA Wallet Cash A Edited`.
2. Confirm it is hidden from active Wallets UI.
3. Run `Sync Now`.
4. Verify Supabase row still exists and `deleted_at` is not null.

### 11C-CATEGORY-01 - Default Categories Stability

Expected result: Default categories remain stable after sync and do not duplicate unexpectedly.

Evidence:

```text
Test ID: 11C-CATEGORY-01
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Sign in as User A.
2. Open category management.
3. Record default category count.
4. Run `Sync Now`.
5. Restart app.
6. Reopen category management and confirm default categories did not duplicate.

### 11C-CATEGORY-02 - Custom Category Create/Edit/Delete

Expected result: Custom category create, edit, and soft delete sync correctly and preserve tombstones.

Evidence:

```text
Test ID: 11C-CATEGORY-02
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Create expense category `QA Expense A`.
2. Run `Sync Now`.
3. Edit category name to `QA Expense A Edited`.
4. Run `Sync Now`.
5. Soft delete the category.
6. Run `Sync Now`.
7. Verify remote row exists with non-null `deleted_at`.

### 11C-TRX-01 - Income Transaction Sync

Expected result: Income transaction syncs correctly and contributes to monthly income and net cashflow.

Evidence:

```text
Test ID: 11C-TRX-01
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Create income category `QA Income A` if needed.
2. Create income transaction with note `QA income sync`.
3. Run `Sync Now`.
4. Verify transaction appears remotely.
5. Confirm dashboard/report monthly income includes the amount.

### 11C-TRX-02 - Expense Transaction Sync

Expected result: Expense transaction syncs correctly and contributes to monthly expense and net cashflow.

Evidence:

```text
Test ID: 11C-TRX-02
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Create expense category `QA Expense A` if needed.
2. Create expense transaction with note `QA expense sync`.
3. Run `Sync Now`.
4. Verify transaction appears remotely.
5. Confirm dashboard/report monthly expense includes the amount.

### 11C-TRX-03 - Transaction Edit and Soft Delete

Expected result: Edited transaction syncs to remote; soft-deleted transaction is hidden from active UI and retained as a tombstone.

Evidence:

```text
Test ID: 11C-TRX-03
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Edit an existing QA transaction note to `QA edited transaction`.
2. Run `Sync Now`.
3. Verify remote row reflects the edited note.
4. Soft delete the transaction.
5. Run `Sync Now`.
6. Verify remote row still exists with non-null `deleted_at`.

### 11C-TRANSFER-01 - Transfer Integrity After Sync

Expected result: Transfer decreases source wallet balance, increases destination wallet balance, does not count as income/expense, and preserves wallet relationships after push/pull.

Evidence:

```text
Test ID: 11C-TRANSFER-01
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Create or confirm two active wallets: `QA Wallet Cash A` and `QA Wallet Bank A`.
2. Create transfer from cash wallet to bank wallet with note `QA transfer sync`.
3. Record source and destination wallet balances.
4. Confirm monthly income and monthly expense do not change because of transfer.
5. Run `Sync Now`.
6. On another User A device/session, run `Sync Now`.
7. Confirm transfer appears with valid source/destination wallet relationships.

### 11C-FORMULA-01 - Dashboard and Report Formula Integrity

Expected result: Dashboard and report values match existing formulas and remain SQLite-derived.

Evidence:

```text
Test ID: 11C-FORMULA-01
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Expected formulas:

- Total balance = opening balances + income - expense - transfers out + transfers in.
- Monthly income = sum of active income transactions for selected month.
- Monthly expense = sum of active expense transactions for selected month.
- Net cashflow = monthly income - monthly expense.
- Transfer transactions do not count as income or expense.
- Expense by category uses active expense transactions only.
- Income by category uses active income transactions only.
- Balance by wallet uses each wallet's derived balance, not a stored balance column.

Steps:

1. Record known QA wallet opening balances.
2. Record QA income, expense, and transfer amounts.
3. Calculate expected dashboard/report values manually.
4. Run `Sync Now`.
5. Restart app.
6. Compare Dashboard and Reports values to expected formulas.

### 11C-TOMBSTONE-01 - Tombstone Integrity

Expected result: Deleted rows keep `deleted_at`, are hidden from active UI, and are not physically deleted locally or remotely.

Evidence:

```text
Test ID: 11C-TOMBSTONE-01
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Soft delete one wallet, one category, and one transaction.
2. Run `Sync Now`.
3. Confirm each deleted item is hidden from active UI.
4. Verify each remote row still exists with non-null `deleted_at`.
5. On another User A device/session, run `Sync Now`.
6. Confirm deleted items remain hidden after pull.

### 11C-PERSIST-01 - App Restart Persistence

Expected result: SQLite data, sync metadata, and failed queue state persist after app restart.

Evidence:

```text
Test ID: 11C-PERSIST-01
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. Create or edit a QA record.
2. If testing failed queue persistence, force a failed sync attempt.
3. Close and restart the app.
4. Confirm local data is still visible.
5. Confirm Settings still shows expected last successful sync and queue counts.
6. Restore connectivity/session and retry `Sync Now`.

### 11C-ISO-01 - User Isolation

Expected result: User A data is not visible to User B and User B data is not visible to User A.

Evidence:

```text
Test ID: 11C-ISO-01
Date/time:
Device/account:
Steps performed:
Expected result:
Actual result:
PASS/FAIL:
Notes/screenshots reference:
```

Steps:

1. As User A, create wallet/category/transaction QA records and run `Sync Now`.
2. Sign out and sign in as User B, or use Device B.
3. Run `Sync Now` as User B.
4. Confirm User A records do not appear in User B UI.
5. Create User B QA records and run `Sync Now`.
6. Sign back in as User A and run `Sync Now`.
7. Confirm User B records do not appear in User A UI.

## Manual Execution Result

**Execution status**: Partial manual QA executed.  
**Result summary**: Wallet, category, and transaction CRUD after sync passed. Transfer integrity, dashboard/report formula integrity, comprehensive tombstone verification, app restart persistence, and user isolation were intentionally skipped and remain pending.

| Test ID | Area | Status | Notes |
|---|---|---|---|
| 11C-WALLET-01 | Wallet create push | PASS | Wallet create after sync validated. |
| 11C-WALLET-02 | Wallet edit push/pull | PASS | Wallet edit sync path validated. |
| 11C-WALLET-03 | Wallet soft delete | PASS | Wallet soft-delete sync path validated. |
| 11C-CATEGORY-01 | Default categories stability | PASS | Default category stability validated. |
| 11C-CATEGORY-02 | Custom category create/edit/delete | PASS | Custom category CRUD after sync validated. |
| 11C-TRX-01 | Income transaction sync | PASS | Income transaction sync path validated. |
| 11C-TRX-02 | Expense transaction sync | PASS | Expense transaction sync path validated. |
| 11C-TRX-03 | Transaction edit and soft delete | PASS | Transaction edit and soft-delete sync path validated. |
| 11C-TRANSFER-01 | Transfer integrity after sync | PASS | Retest passed after Wallets screen derived balance patch. Source wallet decreases, destination wallet increases, transfer does not count as income/expense, and the existing balance formula remains unchanged. |
| 11C-FORMULA-01 | Dashboard and report formula integrity | PASS | Manual QA passed: Income Rp900.000, Expense Rp525.000, Net Cashflow Rp375.000, Dana Rp800.000 + Bank BCA Rp9.700.000 = Total Balance Rp10.500.000. Transfers do not count as income/expense. |
| 11C-TOMBSTONE-01 | Tombstone integrity | SKIP | Comprehensive tombstone check intentionally deferred; remains pending. |
| 11C-PERSIST-01 | App restart persistence | SKIP | Intentionally deferred; remains pending. |
| 11C-ISO-01 | User isolation | SKIP | Intentionally deferred; remains pending. |

Pending Phase 11C items:

- Dashboard/report formula integrity.
- Comprehensive tombstone integrity.
- App restart persistence.
- User isolation.

### Phase 11C Sync Queue Settlement Finding

Manual QA found that the Rp200.000 transfer transaction existed in Supabase, but the local app still showed the transaction as pending:

- Settings showed `Pending local queue: 1 item`.
- Settings showed `Failed: 0 items`.
- `Sync Now` returned `Some items still need attention`.
- The transfer row existed remotely, so the remote write had succeeded.

Most likely root cause: strict equivalence comparison caused `EQUAL_TIMESTAMP_MISMATCH` for a semantically equivalent local/remote transaction row. In that path, convergence intentionally did not call `transactionRepository.markSyncedIfUnchanged(...)` or `queueRepository.markSuccess(...)`, leaving the queue row and transaction status pending.

Patch applied: convergence equivalence now compares timestamp fields by parsed time and normalizes `undefined` to `null` for nullable fields without treating empty string as null. LWW ordering rules are unchanged.

Retest required:

- Run `Sync Now`.
- Pending local queue should become `0`.
- Transfer pending badge should disappear.
- No duplicate remote row should be created.

Retest result after equivalence normalization patch: PASS.

- Run `Sync Now`: PASS.
- Pending local queue became `0`: PASS.
- Transfer Pending badge disappeared: PASS.
- Supabase remote row remained safe: PASS.
- No duplicate remote row was created: PASS.

## Supabase SQL Helper Queries

Use these as read-only verification helpers in Supabase SQL editor. Replace placeholders before running.

### Wallets for One User

```sql
select id, user_id, name, type, opening_balance, updated_at, deleted_at
from financetracker.wallets
where user_id = '<user_id>'
order by updated_at desc, id;
```

### Categories for One User

```sql
select id, user_id, name, type, is_default, updated_at, deleted_at
from financetracker.categories
where user_id = '<user_id>'
order by type, is_default desc, name;
```

### Transactions for One User

```sql
select
  id,
  user_id,
  type,
  wallet_id,
  destination_wallet_id,
  category_id,
  amount,
  note,
  transaction_date,
  updated_at,
  deleted_at
from financetracker.transactions
where user_id = '<user_id>'
order by updated_at desc, id;
```

### Tombstone Check

```sql
select 'wallet' as entity, id, user_id, updated_at, deleted_at
from financetracker.wallets
where user_id = '<user_id>' and deleted_at is not null
union all
select 'category' as entity, id, user_id, updated_at, deleted_at
from financetracker.categories
where user_id = '<user_id>' and deleted_at is not null
union all
select 'transaction' as entity, id, user_id, updated_at, deleted_at
from financetracker.transactions
where user_id = '<user_id>' and deleted_at is not null
order by updated_at desc;
```

### Cross-User Isolation Spot Check

```sql
select 'wallet' as entity, id, user_id, name as label
from financetracker.wallets
where user_id in ('<user_a_id>', '<user_b_id>')
union all
select 'category' as entity, id, user_id, name as label
from financetracker.categories
where user_id in ('<user_a_id>', '<user_b_id>')
union all
select 'transaction' as entity, id, user_id, coalesce(note, type) as label
from financetracker.transactions
where user_id in ('<user_a_id>', '<user_b_id>')
order by user_id, entity, label;
```

## Local Verification Notes

- Active UI should hide rows where `deleted_at` is not null.
- Dashboard and Reports should be checked from the app UI because UI must read from SQLite.
- Settings Sync Status should show:
  - Online/offline state.
  - Last successful sync.
  - Current-account device-local pending queue count.
  - Current-account device-local failed queue count.
- Local queue details are not exposed directly in the UI. For this phase, use Settings counts and user-visible sync results unless a separate local database inspection workflow is approved.
- Do not claim Android runtime success unless the test was performed on a real device or emulator.

## Known Limitations

- This document is a manual QA checklist, not automated test coverage.
- Equal-timestamp mismatches remain an MVP limitation and should surface as unresolved/partial sync rather than automatic conflict resolution.
- Client clock skew can affect LWW outcomes.
- Successful queue rows may remain in local `sync_queue`; active retry queries ignore `success` rows.
- Queue counts are current-account and device-local, not a remote global queue state.
- Manual verification depends on accurate tester evidence. Do not mark tests passed without actual result notes.
