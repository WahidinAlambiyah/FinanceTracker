# Phase 7 Implementation Plan — Dashboard and Reports

**Status**: ⏸️ Planning (Awaiting Approval)  
**Date**: Phase 7 Planning  
**Dependencies**: Phase 6 Complete ✅

---

## Executive Summary

Phase 7 implements dashboard and reports foundation with **derived wallet balance calculation** and monthly financial summaries. All data comes from local SQLite only. No remote sync, no Supabase schema, no chart libraries (unless explicitly approved).

**Core Principles:**
- Wallet balance is **DERIVED ONLY** (never mutated, never stored)
- Balance calculation: `opening_balance + income - expense - transfers_out + transfers_in`
- Dashboard shows: total balance, monthly summary, recent transactions
- Reports show: monthly breakdown, category analysis, wallet balances
- All data from local SQLite (no remote sync yet)
- No new dependencies unless explicitly approved
- Simple UI with text/numbers (no charts unless approved)

---

## Phase 7 Implementation Rules (Non-Negotiable)

These rules **MUST** be followed during Phase 7 implementation. Any deviation requires explicit user approval.

### 1. Balance Calculation Rules

**Balance must be derived only. Never stored, never mutated.**

**Formula:**
```
current_balance = opening_balance + income - expense - transfers_out + transfers_in
```

**Rules:**
- ✅ Calculate balance on-demand via SQL query
- ✅ Use opening_balance from wallets table
- ✅ Sum income transactions where wallet_id = wallet.id
- ✅ Sum expense transactions where wallet_id = wallet.id
- ✅ Sum transfers_out where wallet_id = wallet.id (source wallet)
- ✅ Sum transfers_in where destination_wallet_id = wallet.id (destination wallet)
- ❌ Do NOT mutate wallet balance
- ❌ Do NOT add balance column to wallets table
- ❌ Do NOT store calculated balance in database
- ❌ Do NOT add new SQLite migration

### 2. Transfer Handling Rules

**Transfers must be handled explicitly and correctly.**

**Rules:**
- ✅ Transfer OUT decreases source wallet balance (subtract from wallet_id)
- ✅ Transfer IN increases destination wallet balance (add to destination_wallet_id)
- ❌ Transfer must NOT be counted as income
- ❌ Transfer must NOT be counted as expense
- ✅ Transfer may be shown separately in reports if needed
- ✅ Transfer does NOT affect monthly net cashflow
- ✅ Transfer is excluded from category breakdown (no category_id)

**Example:**
- User has Wallet A (Cash) with balance Rp 1.000.000
- User transfers Rp 300.000 from Wallet A → Wallet B (Bank)
- **Result:**
  - Wallet A balance: Rp 700.000 (1.000.000 - 300.000)
  - Wallet B balance: Rp 300.000 (0 + 300.000)
  - Total balance: Rp 1.000.000 (unchanged, money moved internally)
  - Monthly income: Rp 0 (transfer not counted)
  - Monthly expense: Rp 0 (transfer not counted)
  - Net cashflow: Rp 0 (no income/expense change)

### 3. Dashboard Summary Rules

**Dashboard must display accurate financial summary.**

**Rules:**
- ✅ Total balance = sum of all derived wallet balances
- ✅ Monthly income = sum of income transactions only (type = 'income')
- ✅ Monthly expense = sum of expense transactions only (type = 'expense')
- ✅ Monthly net cashflow = monthly income - monthly expense
- ❌ Transfer must NOT affect monthly income
- ❌ Transfer must NOT affect monthly expense
- ❌ Transfer must NOT affect monthly net cashflow
- ✅ Recent transactions may include all types (income, expense, transfer)

### 4. Reports Rules

**Reports must provide accurate breakdown and analysis.**

**Rules:**
- ✅ Category breakdown includes income/expense categories ONLY
- ❌ Transfer must NOT be grouped into income/expense category breakdown
- ✅ Wallet balance report uses derived wallet balance
- ✅ Reports use local SQLite data ONLY
- ✅ Month selector filters transactions by date range
- ✅ Expense by category: Sum WHERE type = 'expense' GROUP BY category_id
- ✅ Income by category: Sum WHERE type = 'income' GROUP BY category_id
- ✅ Wallet balances: Derived balance for each wallet (current, not historical)

### 5. UI Rules

**UI must follow established design system and avoid new dependencies.**

**Rules:**
- ❌ Do NOT add chart library (no react-native-chart-kit, no victory-native)
- ✅ Use simple cards, rows, and horizontal bars with React Native View
- ✅ Follow AGENTS.md blue theme (#2563EB primary)
- ✅ Color coding:
  - Income: green accent #10B981
  - Expense: red accent #EF4444
  - Transfer: blue/purple accent #2563EB or #8B5CF6 (if shown)
- ✅ Use consistent padding (16px), card radius (12px), button radius (8px)
- ✅ Use formatRupiah() for money display
- ✅ Use formatIndonesianDate() for date display
- ✅ Empty states with helpful messages

### 6. Service and Repository Rules

**Services and repositories must follow established patterns.**

**Rules:**
- ✅ Service methods receive userId parameter
- ❌ Do NOT use useAuth() hook inside service layer
- ✅ Use parameterized SQLite queries ONLY:
  - `runAsync(sql, params)`
  - `getFirstAsync(sql, params)`
  - `getAllAsync(sql, params)`
  - `prepareAsync(sql)`
- ❌ Do NOT use execAsync() with user input (SQL injection risk)
- ✅ Filter by user_id in all queries (security)
- ✅ Filter by deleted_at IS NULL (exclude soft-deleted records)
- ✅ Use singleton pattern: `getBalanceRepository(db)`, `getReportsRepository(db)`

### 7. Phase Boundary Rules

**Phase 7 scope is dashboard and reports ONLY. Do not expand scope.**

**Rules:**
- ❌ Do NOT implement remote sync (Phase 10)
- ❌ Do NOT implement network detection (Phase 8)
- ❌ Do NOT implement Supabase schema/RLS (Phase 9)
- ❌ Do NOT write to Supabase
- ❌ Do NOT implement CSV export (Phase 15+)
- ❌ Do NOT implement app lock/PIN/biometric (Phase 15+)
- ❌ Do NOT implement budgeting (Phase 15+)
- ❌ Do NOT implement recurring transactions (Phase 15+)
- ❌ Do NOT start Phase 8 until Phase 7 approved
- ❌ Do NOT add new dependencies (unless explicitly approved)
- ❌ Do NOT run terminal commands automatically

### 8. Testing Rules

**Manual testing is sufficient for Phase 7. Automated tests deferred.**

**Rules:**
- ✅ Manual testing required before Phase 7 approval
- ✅ Test balance calculation with income/expense/transfer
- ✅ Test dashboard display with empty state
- ✅ Test reports with multiple categories
- ❌ Automated tests deferred to Phase 13
- ✅ Provide manual verification commands only

---

## Current Available Data Sources (SQLite)

### From Phase 1 Schema

**1. Wallets Table**
```sql
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'other')),
  opening_balance INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
```

**Available Data:**
- `opening_balance` - Starting balance (INTEGER Rupiah)
- All active wallets per user
- Wallet names and types


**2. Transactions Table**
```sql
CREATE TABLE transactions (
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
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
```

**Available Data:**
- Income transactions (per wallet, per category)
- Expense transactions (per wallet, per category)
- Transfer transactions (source → destination)
- All transactions by month/date range
- Transaction amounts (INTEGER Rupiah)

**3. Categories Table**
```sql
CREATE TABLE categories (
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
```

**Available Data:**
- Income categories (for breakdown)
- Expense categories (for breakdown)
- Category names and colors

### Existing Phase 6 Repository Methods

**Transaction Repository** (`transaction.repository.ts`):
- `getMonthlyIncomeTotal(userId, year, month)` - Sum of income for month
- `getMonthlyExpenseTotal(userId, year, month)` - Sum of expense for month
- `findByUserIdAndMonth(userId, year, month)` - All transactions for month
- `findByUserId(userId, limit?)` - Recent transactions

**Transaction Service** (`transaction.service.ts`):
- `getMonthlySummary(userId, year, month)` - Returns `{ income, expense, netCashflow }`
- `getTransactionsWithNames(userId, year, month)` - Transactions with wallet/category names

**Wallet Repository** (`wallet.repository.ts`):
- `findByUserId(userId)` - All active wallets
- `findById(walletId)` - Single wallet by ID

**Category Repository** (`category.repository.ts`):
- `findByUserId(userId, type?)` - Categories by type

---

## Wallet Balance Derived Calculation Design

### Balance Formula

For each wallet, current balance is calculated as:

```
current_balance = opening_balance + income - expense - transfers_out + transfers_in
```

Where:
- `opening_balance` - From wallets table
- `income` - Sum of `amount` WHERE `type = 'income'` AND `wallet_id = wallet.id`
- `expense` - Sum of `amount` WHERE `type = 'expense'` AND `wallet_id = wallet.id`
- `transfers_out` - Sum of `amount` WHERE `type = 'transfer'` AND `wallet_id = wallet.id` (source)
- `transfers_in` - Sum of `amount` WHERE `type = 'transfer'` AND `destination_wallet_id = wallet.id` (destination)


### Repository Implementation

**New File:** `src/features/dashboard/balance.repository.ts`

**Method:** `calculateWalletBalance(userId: string, walletId: string): Promise<number>`

**SQL Query:**
```sql
SELECT 
  w.opening_balance,
  COALESCE(SUM(CASE 
    WHEN t.type = 'income' AND t.wallet_id = ? THEN t.amount 
    ELSE 0 
  END), 0) as total_income,
  COALESCE(SUM(CASE 
    WHEN t.type = 'expense' AND t.wallet_id = ? THEN t.amount 
    ELSE 0 
  END), 0) as total_expense,
  COALESCE(SUM(CASE 
    WHEN t.type = 'transfer' AND t.wallet_id = ? THEN t.amount 
    ELSE 0 
  END), 0) as total_transfers_out,
  COALESCE(SUM(CASE 
    WHEN t.type = 'transfer' AND t.destination_wallet_id = ? THEN t.amount 
    ELSE 0 
  END), 0) as total_transfers_in
FROM wallets w
LEFT JOIN transactions t ON (
  (t.wallet_id = w.id OR t.destination_wallet_id = w.id) 
  AND t.deleted_at IS NULL
  AND t.user_id = ?
)
WHERE w.id = ? 
  AND w.user_id = ? 
  AND w.deleted_at IS NULL
GROUP BY w.id, w.opening_balance;
```

**Calculation:**
```typescript
const balance = 
  opening_balance + 
  total_income - 
  total_expense - 
  total_transfers_out + 
  total_transfers_in;
```

**Method:** `calculateTotalBalance(userId: string): Promise<number>`
- Loop through all active wallets
- Sum individual wallet balances
- Return total

**Method:** `getWalletBalances(userId: string): Promise<WalletBalance[]>`
- Return array of `{ walletId, walletName, balance }` for all wallets


### Service Implementation

**New File:** `src/features/dashboard/dashboard.service.ts`

**Method:** `getDashboardSummary(userId: string): Promise<DashboardSummary>`

Returns:
```typescript
interface DashboardSummary {
  totalBalance: number;           // Sum of all wallet balances
  monthlyIncome: number;          // Current month income
  monthlyExpense: number;         // Current month expense
  netCashflow: number;            // monthlyIncome - monthlyExpense
  recentTransactions: TransactionWithNames[]; // Last 10 transactions
}
```

**Flow:**
1. Calculate total balance (all wallets)
2. Get current month's income/expense summary
3. Get last 10 transactions
4. Return combined summary

**Method:** `getWalletBalances(userId: string): Promise<WalletBalance[]>`
- Returns balance for each wallet

---

## Dashboard Screen Plan

### Layout Structure

```
┌─────────────────────────────────┐
│  Dashboard Header               │
├─────────────────────────────────┤
│  ┌───────────────────────────┐ │
│  │  Total Balance Card       │ │
│  │  Rp 10.500.000           │ │  ← Derived from all wallets
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Monthly Summary          │ │
│  │  Income:   Rp 5.000.000  │ │
│  │  Expense:  Rp 3.500.000  │ │
│  │  Net:      Rp 1.500.000  │ │
│  └───────────────────────────┘ │
│                                 │
│  Recent Transactions            │
│  ┌───────────────────────────┐ │
│  │  Transaction 1            │ │
│  └───────────────────────────┘ │
│  ┌───────────────────────────┐ │
│  │  Transaction 2            │ │
│  └───────────────────────────┘ │
│                                 │
│             [FAB +]             │
└─────────────────────────────────┘
```


### Dashboard Features

1. **Total Balance Card**
   - Display total balance across all wallets
   - Large, prominent display
   - Color: primary blue #2563EB
   - Format: `formatRupiah(totalBalance)`

2. **Monthly Summary Card**
   - Current month income (green)
   - Current month expense (red)
   - Net cashflow (green if positive, red if negative)
   - Month selector (same as transactions list)

3. **Recent Transactions List**
   - Last 10 transactions (all types)
   - Same card design as transaction list screen
   - Tap to navigate to edit screen
   - "View All" button → navigate to Transactions tab

4. **Quick Actions**
   - FAB (+) → navigate to Add Transaction screen

5. **Empty State**
   - "No transactions yet"
   - "Get started by adding your first transaction"

6. **Pull-to-Refresh**
   - Reload dashboard data

---

## Reports Screen Plan

### Layout Structure

```
┌─────────────────────────────────┐
│  Reports Header                 │
├─────────────────────────────────┤
│  Month Selector                 │
│  [ ← ] December 2025 [ → ]     │
├─────────────────────────────────┤
│  ┌───────────────────────────┐ │
│  │  Monthly Overview         │ │
│  │  Income:   Rp 5.000.000  │ │
│  │  Expense:  Rp 3.500.000  │ │
│  │  Net:      Rp 1.500.000  │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Expense by Category      │ │
│  │  Food:         Rp 1.200k │ │
│  │  Transport:    Rp 800k   │ │
│  │  Shopping:     Rp 500k   │ │
│  │  ...                      │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Income by Category       │ │
│  │  Salary:       Rp 4.500k │ │
│  │  Freelance:    Rp 500k   │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Wallet Balances          │ │
│  │  Cash:         Rp 500k   │ │
│  │  BCA:          Rp 8.000k │ │
│  │  GoPay:        Rp 300k   │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```


### Reports Features

1. **Month Selector**
   - Navigate previous/next month
   - Same pattern as transaction list

2. **Monthly Overview Card**
   - Total income for month
   - Total expense for month
   - Net cashflow for month

3. **Expense by Category Section**
   - List categories with total spent
   - Sorted by amount (highest first)
   - Show category color dot
   - Display percentage of total expense (optional)
   - Format: `formatRupiah(amount)`

4. **Income by Category Section**
   - List categories with total earned
   - Sorted by amount (highest first)
   - Show category color dot
   - Format: `formatRupiah(amount)`

5. **Wallet Balances Section**
   - List all wallets with current balance
   - Derived balance calculation
   - Show wallet type
   - Format: `formatRupiah(balance)`

6. **Empty State**
   - "No transactions for this month"
   - "Add transactions to see reports"

---

## Repository Design

### New Repository: Balance Repository

**File:** `src/features/dashboard/balance.repository.ts`

**Methods:**
```typescript
calculateWalletBalance(userId: string, walletId: string): Promise<number>
calculateTotalBalance(userId: string): Promise<number>
getWalletBalances(userId: string): Promise<WalletBalance[]>
```

**Pattern:** Singleton with `getBalanceRepository(db: SQLiteDatabase)`


### New Repository: Reports Repository

**File:** `src/features/reports/reports.repository.ts`

**Methods:**
```typescript
// Get expense breakdown by category for month
getExpenseByCategory(userId: string, year: number, month: number): Promise<CategoryBreakdown[]>

// Get income breakdown by category for month
getIncomeByCategory(userId: string, year: number, month: number): Promise<CategoryBreakdown[]>

// Get transaction count by type for month
getTransactionCountByType(userId: string, year: number, month: number): Promise<TypeCount[]>
```

**Types:**
```typescript
interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_color: string | null;
  total: number;        // Sum of amounts (INTEGER Rupiah)
  count: number;        // Number of transactions
}

interface TypeCount {
  type: 'income' | 'expense' | 'transfer';
  count: number;
}
```

**SQL Example (Expense by Category):**
```sql
SELECT 
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  COALESCE(SUM(t.amount), 0) as total,
  COUNT(t.id) as count
FROM categories c
LEFT JOIN transactions t ON t.category_id = c.id 
  AND t.type = 'expense'
  AND t.user_id = ?
  AND t.deleted_at IS NULL
  AND t.transaction_date >= ?
  AND t.transaction_date < ?
WHERE c.user_id = ? 
  AND c.type = 'expense'
  AND c.deleted_at IS NULL
GROUP BY c.id, c.name, c.color
HAVING total > 0
ORDER BY total DESC;
```


---

## Service Design

### Dashboard Service

**File:** `src/features/dashboard/dashboard.service.ts`

**Methods:**
```typescript
getDashboardSummary(userId: string): Promise<DashboardResult<DashboardSummary>>
getWalletBalances(userId: string): Promise<DashboardResult<WalletBalance[]>>
```

**Pattern:** Service receives `userId` parameter (no useAuth hook)

**Flow:**
1. Call balance repository for total balance
2. Call transaction service for monthly summary
3. Call transaction repository for recent transactions
4. Combine results and return

### Reports Service

**File:** `src/features/reports/reports.service.ts`

**Methods:**
```typescript
getMonthlyReport(userId: string, year: number, month: number): Promise<ReportsResult<MonthlyReport>>
```

**Returns:**
```typescript
interface MonthlyReport {
  overview: MonthlySummary;           // Income, expense, net cashflow
  expenseByCategory: CategoryBreakdown[];
  incomeByCategory: CategoryBreakdown[];
  walletBalances: WalletBalance[];
}
```

**Pattern:** Service receives `userId` parameter (no useAuth hook)

---

## UI Approach (No Chart Dependency)

### Simple Text-Based Visualization

**Expense by Category Card:**
```
┌─────────────────────────────────┐
│ Expense by Category             │
├─────────────────────────────────┤
│ ● Food             Rp 1.200.000 │
│   34% of expenses               │
├─────────────────────────────────┤
│ ● Transport          Rp 800.000 │
│   23% of expenses               │
├─────────────────────────────────┤
│ ● Shopping           Rp 500.000 │
│   14% of expenses               │
└─────────────────────────────────┘
```


**Alternative: Simple Horizontal Bar (No Dependency)**
```
┌─────────────────────────────────┐
│ Expense by Category             │
├─────────────────────────────────┤
│ Food                            │
│ ████████████░░░░░░░░  Rp 1.2jt │
│                                 │
│ Transport                       │
│ ████████░░░░░░░░░░░░  Rp 800k  │
│                                 │
│ Shopping                        │
│ █████░░░░░░░░░░░░░░░  Rp 500k  │
└─────────────────────────────────┘
```

**Implementation:**
- Use colored `<View>` with flex width
- Calculate percentage: `(categoryTotal / totalExpense) * 100`
- Bar width: `{ width: `${percentage}%` }`
- No chart library needed

**Wallet Balances Card:**
```
┌─────────────────────────────────┐
│ Wallet Balances                 │
├─────────────────────────────────┤
│ Cash                            │
│ Rp 500.000                      │
├─────────────────────────────────┤
│ BCA (Bank)                      │
│ Rp 8.000.000                    │
├─────────────────────────────────┤
│ GoPay (E-Wallet)                │
│ Rp 300.000                      │
└─────────────────────────────────┘
```

**Pattern:** Simple list with wallet type subtitle and balance

---

## Risks and Tradeoffs

### Balance Calculation Performance

**Risk:** Complex SQL query with multiple JOINs and CASE statements may be slow for users with many transactions.

**Mitigation:**
- SQLite indexes already exist (wallet_id, transaction_date)
- Query is read-only (no writes)
- Result can be cached in component state
- Test with 1000+ transactions to verify performance


**Tradeoff:** Balance is calculated on-demand vs. stored in database.

**Decision:** Prefer derived calculation because:
- No mutation risk
- Always accurate (no sync issues)
- Simpler data model
- If performance becomes issue, can add caching layer later

### Dashboard Empty State

**Risk:** New users with no transactions see empty dashboard with zero balances.

**Mitigation:**
- Show helpful empty state: "Add your first transaction to start tracking"
- Display wallet opening balances even with no transactions
- Show "Get Started" guide (optional)

### Reports Without Charts

**Risk:** Text-only reports may feel less engaging than visual charts.

**Mitigation:**
- Use color coding (green/red/blue)
- Use simple horizontal bars (no dependency)
- Add percentage calculations
- If user requests charts, propose library in Phase 12+

**Tradeoff:** Simple vs. Feature-Rich

**Decision:** Start simple. Add chart library only if explicitly requested after MVP.

---

## Files to Create

### Dashboard Feature (4 files)

1. **`src/features/dashboard/balance.repository.ts`** (NEW)
   - Wallet balance calculation queries
   - Total balance calculation
   - Wallet balances array

2. **`src/features/dashboard/dashboard.service.ts`** (NEW)
   - Dashboard summary orchestration
   - Combines balance, monthly summary, recent transactions

3. **`src/features/dashboard/dashboard.types.ts`** (NEW)
   - TypeScript interfaces for dashboard data

4. **`src/features/dashboard/index.ts`** (NEW)
   - Barrel export


### Reports Feature (4 files)

5. **`src/features/reports/reports.repository.ts`** (NEW)
   - Expense by category query
   - Income by category query
   - Transaction count by type

6. **`src/features/reports/reports.service.ts`** (NEW)
   - Monthly report orchestration
   - Combines overview, category breakdowns, wallet balances

7. **`src/features/reports/reports.types.ts`** (NEW)
   - TypeScript interfaces for reports data

8. **`src/features/reports/index.ts`** (NEW)
   - Barrel export

### Screens (2 files)

9. **`src/app/(tabs)/dashboard.tsx`** (REPLACE)
   - Replace placeholder with full dashboard
   - Total balance card
   - Monthly summary card
   - Recent transactions list
   - Pull-to-refresh
   - FAB to add transaction

10. **`src/app/(tabs)/reports.tsx`** (REPLACE)
    - Replace placeholder with reports screen
    - Month selector
    - Monthly overview
    - Expense by category
    - Income by category
    - Wallet balances
    - Pull-to-refresh

### Optional Shared Components (1-2 files)

11. **`src/components/finance/BalanceCard.tsx`** (OPTIONAL)
    - Reusable balance display card

12. **`src/components/finance/CategoryBreakdownCard.tsx`** (OPTIONAL)
    - Reusable category breakdown list with bars

---

## Files to Modify

1. **`tasks.md`** (MODIFY)
   - Mark 7.1-7.4 complete
   - Mark 7.5 deferred to Phase 13 (tests)
   - Add Phase 7 status notes

2. **`src/app/(tabs)/wallets/index.tsx`** (OPTIONAL ENHANCEMENT)
   - Display wallet balance (derived) in wallet cards
   - If not done in Phase 7, defer to Phase 12


---

## Tasks.md Update Plan

### Phase 7 Tasks

```markdown
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
  - Requirements: REQ-DASH-001, REQ-DASH-002

- [ ] 7.4 Create reports screen
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
```

**Mark as complete:**
- Task 7.1 after balance repository/service implemented
- Task 7.2 after dashboard/reports services implemented
- Task 7.3 after dashboard screen implemented
- Task 7.4 after reports screen implemented
- Task 7.5 remains deferred to Phase 13


---

## Tests Deferred to Phase 13

**Rationale:**
- MVP priority is functional implementation
- Manual testing sufficient for Phase 7
- Automated tests add development time
- Phase 13 dedicated to testing infrastructure

**Manual Testing Approach:**
- Test balance calculation with sample transactions
- Verify income/expense/transfer impact on balance
- Test dashboard display with empty state
- Test reports with multiple categories
- Test month navigation
- Test pull-to-refresh

---

## Phase 7 Implementation Confirmation

### No New Dependencies

- ✅ No chart library added
- ✅ No date picker added
- ✅ No external API libraries
- ✅ Use existing utilities only:
  - `formatRupiah()` - money formatting
  - `getCurrentTimestamp()` - date utility
  - `getMonthRange()` - date range calculation
  - `formatIndonesianDate()` - date display

### Balance Calculation Rules

- ✅ Do NOT mutate wallet balance
- ✅ Do NOT add balance column to wallets table
- ✅ Do NOT store calculated balance in database
- ✅ Balance is DERIVED ONLY from:
  - `opening_balance + income - expense - transfers_out + transfers_in`

### Data Source Rules

- ✅ Dashboard data from local SQLite ONLY
- ✅ Reports data from local SQLite ONLY
- ✅ Do NOT write to Supabase
- ✅ Do NOT implement remote sync
- ✅ Do NOT implement network detection
- ✅ Do NOT implement Supabase schema/RLS


### Advanced Features Deferred

- ❌ Do NOT implement advanced analytics
- ❌ Do NOT implement CSV export
- ❌ Do NOT implement app lock/PIN/biometric
- ❌ Do NOT implement recurring transactions
- ❌ Do NOT implement budgeting
- ❌ Do NOT implement chart visualizations (unless explicitly approved)

### Phase 8 Not Started

- ✅ Phase 8 (Network and Sync Foundation) will NOT be started
- ✅ Phase 7 scope is dashboard and reports ONLY
- ✅ Sync queue items remain local (no processing yet)

---

## Manual Verification Commands

After Phase 7 implementation:

**TypeScript Type Check:**
```bash
npx tsc --noEmit
```

**Expo Dev Client Start:**
```bash
npx expo start --dev-client
```

**Git Status:**
```bash
git status
```

**Git Diff:**
```bash
git diff
```

---

## Manual Testing Checklist

### Test 1: Dashboard with No Transactions

1. Fresh user with wallets but no transactions
2. Navigate to Dashboard tab
3. **Expected**: Total balance = sum of opening balances
4. **Expected**: Monthly summary shows zero income/expense
5. **Expected**: Recent transactions shows empty state

### Test 2: Dashboard with Transactions

1. User with multiple transactions
2. Navigate to Dashboard tab
3. **Verify**: Total balance = opening_balance + income - expense - transfers_out + transfers_in
4. **Verify**: Monthly summary shows current month income/expense
5. **Verify**: Recent transactions shows last 10 transactions


### Test 3: Balance Calculation (Income)

1. Create wallet with opening balance Rp 1.000.000
2. Add income transaction Rp 500.000
3. Navigate to Dashboard
4. **Expected**: Total balance = Rp 1.500.000

### Test 4: Balance Calculation (Expense)

1. Wallet balance Rp 1.500.000 (from Test 3)
2. Add expense transaction Rp 200.000
3. Navigate to Dashboard
4. **Expected**: Total balance = Rp 1.300.000

### Test 5: Balance Calculation (Transfer Out)

1. Create second wallet with opening balance Rp 0
2. Add transfer from Wallet 1 → Wallet 2: Rp 300.000
3. Navigate to Dashboard
4. **Expected**: 
   - Wallet 1 balance = Rp 1.000.000 (1.300.000 - 300.000)
   - Wallet 2 balance = Rp 300.000 (0 + 300.000)
   - Total balance = Rp 1.300.000 (unchanged, money moved)

### Test 6: Reports with Categories

1. Create multiple expense transactions in different categories
2. Navigate to Reports tab
3. **Expected**: Expense by category list shows each category with total
4. **Expected**: Categories sorted by amount (highest first)
5. **Expected**: Percentages calculated correctly

### Test 7: Month Navigation

1. On Reports screen, tap **← (previous month)**
2. **Expected**: Month display changes
3. **Expected**: Category breakdowns update for previous month
4. **Expected**: Wallet balances remain current (not historical)

### Test 8: Pull-to-Refresh

1. On Dashboard, pull down to refresh
2. **Expected**: Data reloads
3. On Reports, pull down to refresh
4. **Expected**: Data reloads


---

## Implementation Summary

### Total Files to Create: 10-12 files

**Dashboard Feature (4 files):**
- balance.repository.ts
- dashboard.service.ts
- dashboard.types.ts
- index.ts

**Reports Feature (4 files):**
- reports.repository.ts
- reports.service.ts
- reports.types.ts
- index.ts

**Screens (2 files):**
- dashboard.tsx (replace placeholder)
- reports.tsx (replace placeholder)

**Optional Components (0-2 files):**
- BalanceCard.tsx (optional)
- CategoryBreakdownCard.tsx (optional)

### Files to Modify: 1-2 files

- tasks.md (mark Phase 7 tasks complete)
- wallets/index.tsx (optional: add balance display)

### Implementation Order

1. **Balance Repository** - Core balance calculation logic
2. **Dashboard Types** - TypeScript interfaces
3. **Dashboard Service** - Orchestration layer
4. **Dashboard Screen** - UI implementation
5. **Reports Repository** - Category breakdown queries
6. **Reports Types** - TypeScript interfaces
7. **Reports Service** - Orchestration layer
8. **Reports Screen** - UI implementation
9. **Tasks.md Update** - Mark complete
10. **Manual Testing** - Verify all scenarios

---

## Phase 7 Approval Checklist

Before implementation begins:

- [ ] User reviews balance calculation design
- [ ] User approves derived-only approach (no stored balance)
- [ ] User approves text-based reports (no charts)
- [ ] User approves simple horizontal bars (if needed)
- [ ] User confirms no new dependencies required
- [ ] User confirms Phase 8 should NOT start
- [ ] User confirms tests deferred to Phase 13


---

## Known Limitations (Phase 7)

### 1. Historical Balance

- **Limitation**: Wallet balances are always current, not historical.
- **Impact**: Cannot see wallet balance as of specific date in the past.
- **Rationale**: Historical balance requires date-filtered queries, adds complexity.
- **Future Enhancement**: Phase 15+ if requested.

### 2. Balance Caching

- **Limitation**: Balance calculated on-demand every screen load.
- **Impact**: Potential performance issue with 1000+ transactions.
- **Mitigation**: SQLite indexes exist. Test with large dataset.
- **Future Enhancement**: Add caching layer if performance issue confirmed.

### 3. Visual Charts

- **Limitation**: No pie charts, bar charts, or line graphs.
- **Impact**: Reports are text-based with simple horizontal bars.
- **Rationale**: Avoid adding chart library dependency for MVP.
- **Future Enhancement**: Phase 12+ if user explicitly requests charts.

### 4. Multi-Currency

- **Limitation**: All amounts in Rupiah only. No currency conversion.
- **Impact**: Users with multi-currency wallets cannot track accurately.
- **Rationale**: Out of MVP scope.
- **Future Enhancement**: Phase 15+ if requested.

### 5. Budget Tracking

- **Limitation**: No budget limits, no budget vs. actual comparison.
- **Impact**: Users cannot set spending limits per category.
- **Rationale**: Deferred to Phase 15+.

### 6. Forecast/Projection

- **Limitation**: No future balance projection, no trend analysis.
- **Impact**: Users cannot predict future balance.
- **Rationale**: Requires advanced analytics, out of MVP scope.


---

## Alternative Approaches Considered

### Option A: Store Balance in Database

**Approach:** Add `current_balance` column to wallets table, update on every transaction.

**Pros:**
- Faster queries (no calculation needed)
- Simpler dashboard queries

**Cons:**
- Risk of balance mutation errors
- Complex sync logic (balance must sync separately)
- Balance can become out-of-sync with transactions
- Requires migration (breaks existing schema)
- Harder to debug balance inconsistencies

**Decision:** ❌ Rejected. Derived balance is safer and simpler for MVP.

---

### Option B: Add Chart Library

**Approach:** Add chart library (e.g., `react-native-chart-kit`, `victory-native`).

**Pros:**
- Beautiful visual reports
- Professional appearance
- Industry-standard charts

**Cons:**
- Adds dependency
- Increases bundle size
- Requires learning curve
- May slow down MVP delivery
- Text-based reports sufficient for MVP

**Decision:** ❌ Deferred to Phase 12+ unless user explicitly requests.

---

### Option C: Historical Balance Snapshots

**Approach:** Store daily balance snapshots in separate table.

**Pros:**
- Fast historical balance queries
- Can show balance trends over time

**Cons:**
- Requires nightly job or background task
- Adds schema complexity
- Not needed for MVP
- Can be derived if needed later

**Decision:** ❌ Deferred to Phase 15+ if requested.


---

## Related Documentation

- `design.md` - Offline-first architecture, balance calculation philosophy
- `requirements.md` - Dashboard requirements (REQ-DASH-*), Reports requirements (REQ-REPORT-*)
- `tasks.md` - Phase 7 tasks and acceptance criteria
- `AGENTS.md` - UI/UX design system, blue theme consistency
- `PHASE6_SUMMARY.md` - Transaction management foundation (provides data for reports)

---

## Next Steps After Approval

1. User reviews Phase 7 plan
2. User approves or requests changes
3. Begin implementation (balance repository first)
4. Implement dashboard feature module
5. Implement reports feature module
6. Implement dashboard screen
7. Implement reports screen
8. Update tasks.md
9. Manual testing
10. Create PHASE7_SUMMARY.md

**Do NOT proceed to Phase 8 until Phase 7 approved and complete.**

---

**Phase 7 Plan Complete**

Awaiting user approval before implementation begins.
