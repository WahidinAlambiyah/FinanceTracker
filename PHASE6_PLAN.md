# Phase 6 Implementation Plan — Transaction Management (REVISED)

**Status**: ⏸️ Planning (Awaiting Approval)  
**Date**: Phase 6 Planning - Revised  
**Dependencies**: Phase 5 Complete ✅

---

## Executive Summary

Phase 6 implements transaction management (income, expense, transfer) with offline-first architecture. Users will be able to create, edit, delete, and view transactions with monthly summaries. All transaction operations write to local SQLite first with async sync queue integration.

**Core Principles:**
- Offline-first: SQLite writes before any sync
- Three transaction types: income, expense, transfer
- Money as INTEGER Rupiah
- Client-generated UUIDs
- Soft deletes via `deleted_at`
- Manual validation (no Zod, no React Hook Form)
- **NO new dependencies** (simple date input, no date picker library)
- Type READ-ONLY on edit (delete and recreate workaround)
- Wallet balance derived only (no mutation, no balance column)

---

## 1. Current SQLite Transactions Schema Review

**From Phase 1 (`src/lib/db/schema.ts`):**

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
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict')),
  
  FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (destination_wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### Existing Schema Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Client-generated UUID |
| `user_id` | TEXT | NOT NULL | Owner UUID (from auth.users) |
| `type` | TEXT | NOT NULL, CHECK | Transaction type: 'income', 'expense', 'transfer' |
| `wallet_id` | TEXT | NOT NULL, FK | Source wallet UUID (always required) |
| `destination_wallet_id` | TEXT | nullable, FK | Transfer destination wallet UUID (required ONLY for transfer) |
| `category_id` | TEXT | nullable, FK | Category UUID (required for income/expense, NULL for transfer) |
| `amount` | INTEGER | NOT NULL, > 0 | Amount in Rupiah (no cents, INTEGER only) |
| `note` | TEXT | nullable | Optional memo/description |
| `transaction_date` | TEXT | NOT NULL | Transaction date (ISO 8601 timestamp) |
| `created_at` | TEXT | NOT NULL | Record creation timestamp (ISO 8601) |
| `updated_at` | TEXT | NOT NULL | Last update timestamp (ISO 8601) |
| `deleted_at` | TEXT | nullable | Soft delete timestamp (ISO 8601) |
| `sync_status` | TEXT | NOT NULL, CHECK, default 'pending' | Sync status with Supabase |

### Allowed Transaction Types

Must match CHECK constraint:
- `income` - Money coming into a wallet (requires category_id, no destination_wallet_id)
- `expense` - Money going out of a wallet (requires category_id, no destination_wallet_id)
- `transfer` - Money moving between wallets (requires destination_wallet_id, no category_id)

### Allowed Sync Statuses

Must match CHECK constraint:
- `synced` - Successfully synced to Supabase
- `pending` - Waiting to be synced (default for new records)
- `failed` - Sync attempt failed
- `conflict` - Sync conflict detected

### Amount Rules

- **MUST be INTEGER** (no decimals, no floats)
- **MUST be greater than 0** (enforced by CHECK constraint)
- **Stored in Rupiah** (IDR has no cents/minor units)
- Example: Rp 10.000 is stored as `10000`

### Foreign Key References

- `wallet_id` → `wallets(id)` (source wallet)
- `destination_wallet_id` → `wallets(id)` (transfer destination)
- `category_id` → `categories(id)` (income/expense classification)

**Note:** SQLite foreign keys do NOT enforce `ON DELETE RESTRICT` by default. Transactions may reference deleted wallets/categories. Use LEFT JOIN to handle orphaned references.

### Indexes (Already Created)

```sql
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON transactions(updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_sync_status ON transactions(sync_status);
```

### Phase 6 Schema Compliance

- ✅ Use ONLY existing columns (no additions, no migrations)
- ✅ Respect all CHECK constraints
- ✅ Respect foreign key references
- ✅ Amount stored as INTEGER Rupiah
- ✅ Dates stored as ISO 8601 strings
- ✅ Soft delete via `deleted_at`
- ✅ Sync status tracking

---

## 2. Final Route Structure

### Current State (Before Phase 6)

```
src/app/(tabs)/transactions.tsx  (placeholder screen)
```

### Target Structure (Phase 6)

```
src/app/(tabs)/transactions/
├── index.tsx        (transaction list screen - moved from transactions.tsx)
├── new.tsx          (add transaction form - hidden from tabs)
└── [id].tsx         (edit transaction form - hidden from tabs)
```

### Route Migration Steps

1. **Create folder:** `src/app/(tabs)/transactions/`
2. **Move file:** `src/app/(tabs)/transactions.tsx` → `src/app/(tabs)/transactions/index.tsx`
3. **Delete old file:** `src/app/(tabs)/transactions.tsx` (after content moved)
4. **Create nested routes:**
   - `src/app/(tabs)/transactions/new.tsx` (add transaction screen)
   - `src/app/(tabs)/transactions/[id].tsx` (edit transaction screen)
5. **Update tab layout:** Hide nested routes from tab bar

### Tab Bar Configuration

**Update:** `src/app/(tabs)/_layout.tsx`

**Add hidden route configurations:**
```typescript
<Tabs.Screen 
  name="transactions/new" 
  options={{ 
    href: null,
    title: 'Add Transaction',
  }} 
/>

<Tabs.Screen 
  name="transactions/[id]" 
  options={{ 
    href: null,
    title: 'Edit Transaction',
  }} 
/>
```

**Pattern:** Same as existing wallet and settings nested routes (wallets/new, wallets/[id], settings/categories)

### Bottom Tab Bar Result

**Visible tabs (5 only):**
- Dashboard → `/dashboard`
- Transactions → `/transactions` (resolves to `/transactions/index.tsx`)
- Wallets → `/wallets`
- Reports → `/reports`
- Settings → `/settings`

**Hidden nested routes (accessible via navigation, not visible in tabs):**
- `/transactions/new` (add transaction form)
- `/transactions/[id]` (edit transaction form)

### Navigation Flow

- Transaction list → FAB (+) → `/transactions/new`
- Transaction list → tap card → `/transactions/[id]`
- Add/edit screen → save/cancel → back to `/transactions`

### Rationale

- Avoids competing routes between `transactions.tsx` and `transactions/` folder
- Clean nested structure for add/edit screens
- Consistent with existing wallet and settings patterns
- Tab bar remains clean with only 5 main tabs

---

## 3. Files to Create/Modify/Delete

### Transaction Feature Module (6 files to CREATE)

```
src/features/transactions/
├── transaction.types.ts          (TypeScript interfaces, types, input/output)
├── transaction.validation.ts     (Manual validation functions, no Zod)
├── transaction.repository.ts     (SQLite data access, parameterized queries)
├── transaction.service.ts        (Business logic, sync queue integration)
├── transaction.utils.ts          (Optional: helper functions, date/balance utils)
└── index.ts                      (Barrel export)
```

**Purpose:** Encapsulate all transaction business logic following established patterns from wallet and category features.

### Transaction Screens (3 files to CREATE/MOVE)

```
src/app/(tabs)/transactions/
├── index.tsx        (CREATE: transaction list screen - moved from transactions.tsx)
├── new.tsx          (CREATE: add transaction form)
└── [id].tsx         (CREATE: edit transaction form)
```

**Purpose:** User-facing screens for transaction management.

### Optional Reusable Components (2-3 files to CREATE if needed)

```
src/components/finance/
├── TransactionCard.tsx           (Optional: transaction list item component)
└── MonthlySummaryCard.tsx        (Optional: income/expense/net summary card)
```

**Note:** Keep components simple in Phase 6. Extract reusable components in Phase 12 (UX Polish) if needed.

### Files to MOVE

```
Move: src/app/(tabs)/transactions.tsx → src/app/(tabs)/transactions/index.tsx
```

**Action:** Copy content from `transactions.tsx` to `transactions/index.tsx`, then delete old file.

### Files to DELETE

```
Delete: src/app/(tabs)/transactions.tsx (after content moved to transactions/index.tsx)
```

### Files to MODIFY

```
1. src/app/(tabs)/_layout.tsx
   - Add `href: null` for transactions/new
   - Add `href: null` for transactions/[id]
   - Purpose: Hide nested routes from bottom tab bar

2. tasks.md
   - Mark 6.1 complete (Transaction model and validation)
   - Mark 6.2 complete (Transaction repository)
   - Mark 6.3 complete (Transaction service)
   - Mark 6.4 complete (Add transaction screen)
   - Mark 6.5 complete (Transaction list screen + edit screen)
   - Mark 6.6 complete (Transfer transaction flow)
   - Mark 6.7 deferred to Phase 13 (Automated tests)
   - Update Phase 6 status note
```

### Documentation to CREATE

```
PHASE6_SUMMARY.md
   - Implementation summary
   - Files created/modified/deleted
   - Manual verification checklist
   - Known limitations
   - Future enhancements
```

### Total File Count

- **CREATE:** 10-12 files (6 feature + 3 screens + 0-3 optional components + 1 doc)
- **MOVE:** 1 file
- **DELETE:** 1 file
- **MODIFY:** 2 files

---

## 4. Transaction Data Model

### TypeScript Interfaces (Aligned with SQLite Schema)

**File:** `src/features/transactions/transaction.types.ts`

```typescript
/**
 * Transaction stored in SQLite
 * 
 * Aligned with Phase 1 SQLite schema (src/lib/db/schema.ts)
 */
export interface Transaction {
  id: string;                          // UUID (client-generated)
  user_id: string;                     // User UUID
  type: TransactionType;               // 'income' | 'expense' | 'transfer'
  wallet_id: string;                   // Source wallet UUID (always required)
  destination_wallet_id: string | null; // Transfer destination UUID (nullable)
  category_id: string | null;          // Category UUID (nullable)
  amount: number;                      // INTEGER Rupiah (no cents)
  note: string | null;                 // Optional memo
  transaction_date: string;            // ISO 8601 timestamp
  created_at: string;                  // ISO 8601 timestamp
  updated_at: string;                  // ISO 8601 timestamp
  deleted_at: string | null;           // Soft delete timestamp
  sync_status: SyncStatus;             // Sync status
}

/**
 * Transaction type
 * Must match SQLite CHECK constraint
 */
export type TransactionType = 'income' | 'expense' | 'transfer';

/**
 * Sync status
 * Must match SQLite CHECK constraint
 */
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'conflict';

/**
 * Input for creating a new transaction
 */
export interface CreateTransactionInput {
  type: TransactionType;
  wallet_id: string;                   // Always required
  destination_wallet_id?: string | null; // Required for transfer only
  category_id?: string | null;         // Required for income/expense only
  amount: number;                      // INTEGER Rupiah, > 0
  note?: string | null;                // Optional
  transaction_date: string;            // ISO timestamp (default: current)
}

/**
 * Input for updating a transaction
 * Note: type is NOT editable (read-only on edit)
 */
export interface UpdateTransactionInput {
  wallet_id?: string;
  destination_wallet_id?: string | null;
  category_id?: string | null;
  amount?: number;                     // INTEGER Rupiah, > 0
  note?: string | null;
  transaction_date?: string;
}

/**
 * Transaction operation result
 */
export interface TransactionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Monthly summary result
 */
export interface MonthlySummary {
  income: number;      // Total income for month (INTEGER Rupiah)
  expense: number;     // Total expense for month (INTEGER Rupiah)
  netCashflow: number; // income - expense (INTEGER Rupiah)
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
```

### Type-Specific Field Requirements

**Income Transaction:**
- ✅ Required: `type = 'income'`, `wallet_id`, `category_id`, `amount > 0`, `transaction_date`
- ❌ Must NOT have: `destination_wallet_id` (must be null)
- ✅ Optional: `note`

**Expense Transaction:**
- ✅ Required: `type = 'expense'`, `wallet_id`, `category_id`, `amount > 0`, `transaction_date`
- ❌ Must NOT have: `destination_wallet_id` (must be null)
- ✅ Optional: `note`

**Transfer Transaction:**
- ✅ Required: `type = 'transfer'`, `wallet_id`, `destination_wallet_id`, `amount > 0`, `transaction_date`
- ❌ Must NOT have: `category_id` (must be null)
- ❌ Constraint: `wallet_id` ≠ `destination_wallet_id` (prevent same-wallet transfer)
- ✅ Optional: `note`

### Schema Compliance Rules

- ✅ Use ONLY existing columns from Phase 1 schema
- ❌ Do NOT add unsupported fields (e.g., `tags`, `receipt_url`, `location`)
- ❌ Do NOT add new columns without migration
- ✅ Amount stored as INTEGER (no float, no decimal)
- ✅ Dates stored as ISO 8601 strings
- ✅ Soft delete via `deleted_at` timestamp

---

## 5. Manual Validation Approach

### No External Dependencies

- ❌ No Zod
- ❌ No React Hook Form
- ❌ No Yup
- ❌ No Joi
- ✅ Manual validation functions only (follow wallet/category pattern)

### Validation File

**File:** `src/features/transactions/transaction.validation.ts`

### Validation Functions

```typescript
validateCreateTransactionInput(input: CreateTransactionInput): ValidationResult
validateUpdateTransactionInput(input: UpdateTransactionInput): ValidationResult
```

### Validation Rules for Create Transaction

**1. Type Validation:**
- Required field
- Must be one of: 'income', 'expense', 'transfer'

**2. Wallet ID Validation:**
- Required field
- Must be non-empty string
- Must be valid UUID format

**3. Amount Validation:**
- Required field
- Must be a number
- Must be greater than 0
- Must be an INTEGER (no decimals: `amount === Math.floor(amount)`)
- Error message: "Amount must be a positive integer in Rupiah"

**4. Transaction Date Validation:**
- Required field
- Must be valid ISO 8601 timestamp string
- Must be parseable by `new Date()`

**5. Income-Specific Validation:**
- `category_id` REQUIRED (non-null, non-empty)
- `destination_wallet_id` MUST be null or undefined
- Error if category missing: "Income transaction requires a category"
- Error if destination wallet present: "Income transaction cannot have a destination wallet"

**6. Expense-Specific Validation:**
- `category_id` REQUIRED (non-null, non-empty)
- `destination_wallet_id` MUST be null or undefined
- Error if category missing: "Expense transaction requires a category"
- Error if destination wallet present: "Expense transaction cannot have a destination wallet"

**7. Transfer-Specific Validation:**
- `destination_wallet_id` REQUIRED (non-null, non-empty)
- `category_id` MUST be null or undefined
- `destination_wallet_id` ≠ `wallet_id` (prevent same-wallet transfer)
- Error if destination missing: "Transfer transaction requires a destination wallet"
- Error if category present: "Transfer transaction cannot have a category"
- Error if same wallet: "Source and destination wallets must be different"

**8. Note Validation:**
- Optional field
- If provided, max 500 characters

### Validation Rules for Update Transaction

- All fields optional (except type, which is read-only)
- Same validation rules as create for provided fields
- **Type is NOT validated** (read-only on edit, cannot be changed)
- If `amount` provided: must be > 0 and INTEGER
- If `wallet_id` or `destination_wallet_id` changes: validate no same-wallet transfer
- If `category_id` changes: must be valid UUID

### Validation Pattern

Follow existing patterns from `wallet.validation.ts` and `category.validation.ts`:

```typescript
export function validateCreateTransactionInput(input: CreateTransactionInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Type validation
  if (!input.type) {
    errors.push({ field: 'type', message: 'Transaction type is required' });
  } else if (!['income', 'expense', 'transfer'].includes(input.type)) {
    errors.push({ field: 'type', message: 'Invalid transaction type' });
  }

  // Amount validation
  if (typeof input.amount !== 'number' || input.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
  } else if (input.amount !== Math.floor(input.amount)) {
    errors.push({ field: 'amount', message: 'Amount must be an integer (no decimals)' });
  }

  // Type-specific validation
  if (input.type === 'income' || input.type === 'expense') {
    if (!input.category_id) {
      errors.push({ field: 'category_id', message: `${input.type} transaction requires a category` });
    }
    if (input.destination_wallet_id) {
      errors.push({ field: 'destination_wallet_id', message: `${input.type} transaction cannot have a destination wallet` });
    }
  } else if (input.type === 'transfer') {
    if (!input.destination_wallet_id) {
      errors.push({ field: 'destination_wallet_id', message: 'Transfer transaction requires a destination wallet' });
    }
    if (input.category_id) {
      errors.push({ field: 'category_id', message: 'Transfer transaction cannot have a category' });
    }
    if (input.wallet_id === input.destination_wallet_id) {
      errors.push({ field: 'destination_wallet_id', message: 'Source and destination wallets must be different' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 6. Date Input Approach (No New Dependency)

### MVP Approach: Simple Date Input

**Strategy:** Default to current timestamp with optional manual editing

**Rationale:**
- Most transactions are recorded "today"
- Default current timestamp covers 80%+ use case
- Avoids adding date picker dependency for MVP
- Users can manually edit if needed

### Implementation Approaches

**Option A: Default Current + Simple Text Edit (RECOMMENDED)**

```typescript
const [transactionDate, setTransactionDate] = useState(getCurrentTimestamp());

// Display formatted date
<View style={styles.dateField}>
  <Text style={styles.label}>Date</Text>
  <Text style={styles.dateValue}>{formatDate(transactionDate)}</Text>
  <TouchableOpacity onPress={() => setShowDateModal(true)}>
    <Text style={styles.editButton}>Edit</Text>
  </TouchableOpacity>
</View>

// Simple modal with date input
<Modal visible={showDateModal}>
  <TextInput 
    placeholder="YYYY-MM-DD"
    value={transactionDate.split('T')[0]}
    onChangeText={(text) => {
      // Parse and convert to ISO timestamp
      const isoDate = `${text}T${getCurrentTimestamp().split('T')[1]}`;
      setTransactionDate(isoDate);
    }}
  />
</Modal>
```

**Option B: Simple Date Buttons (Alternative)**

- Modal with Year/Month/Day buttons
- Tap to increment/decrement
- No external dependency

**Option C: Keep Default Only (Simplest)**

- Always use current timestamp
- No editing in Phase 6
- Add editing in Phase 12 if requested

### Date Utility Functions

Use existing `src/lib/utils/date.ts`:

```typescript
import { getCurrentTimestamp, formatDate } from '@/lib/utils/date';

// Get current timestamp (ISO 8601)
const now = getCurrentTimestamp();

// Format for display
const displayDate = formatDate(now); // "5 Jan 2026, 10:30"
```

### Date Validation

Validate ISO timestamp format on submit:

```typescript
function isValidISOTimestamp(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
```

### Limitations and Future Improvements

**Phase 6 Limitations:**
- No visual calendar picker
- Manual date entry prone to typos
- No date range validation (e.g., prevent future dates)

**Future Enhancements (Phase 12+):**
- If user requests better UX, evaluate `@react-native-community/datetimepicker`
- Add calendar visual picker
- Add date range constraints
- Add "quick select" buttons (Today, Yesterday, Last Week)

**Benefit of Phase 6 Approach:**
- ✅ Zero new dependencies
- ✅ Covers most common use case (today's date)
- ✅ Simple implementation
- ✅ Can enhance later without breaking changes

---

## 7. Repository Method Design

### File

**File:** `src/features/transactions/transaction.repository.ts`

### Singleton Pattern

```typescript
export function getTransactionRepository(db: SQLiteDatabase): TransactionRepository
```

Follow existing `getWalletRepository()` and `getCategoryRepository()` patterns.

### Core CRUD Methods

```typescript
/**
 * Create new transaction
 */
create(transaction: Transaction): Promise<void>

/**
 * Update existing transaction
 */
update(transactionId: string, updates: Partial<Transaction>): Promise<void>

/**
 * Soft delete transaction
 */
softDelete(transactionId: string, deletedAt: string): Promise<void>

/**
 * Find transaction by ID
 */
findById(transactionId: string): Promise<Transaction | null>
```

### Query Methods

```typescript
/**
 * Find transactions by user ID (with optional limit)
 */
findByUserId(userId: string, limit?: number): Promise<Transaction[]>

/**
 * Find transactions by user ID and month
 */
findByUserIdAndMonth(userId: string, year: number, month: number): Promise<Transaction[]>

/**
 * Find transactions by wallet ID
 */
findByWalletId(walletId: string, limit?: number): Promise<Transaction[]>

/**
 * Find transactions by category ID
 */
findByCategoryId(categoryId: string, limit?: number): Promise<Transaction[]>

/**
 * Find transactions by type (income/expense/transfer)
 */
findByType(userId: string, type: TransactionType, limit?: number): Promise<Transaction[]>

/**
 * Count transactions for user
 */
countByUserId(userId: string): Promise<number>
```

### Monthly Summary Methods (Optional but Recommended)

```typescript
/**
 * Get monthly income total
 */
getMonthlyIncomeTotal(userId: string, year: number, month: number): Promise<number>

/**
 * Get monthly expense total
 */
getMonthlyExpenseTotal(userId: string, year: number, month: number): Promise<number>
```

### Parameterized Query Rules

**CRITICAL:** Use parameterized APIs only

✅ **ALLOWED:**
- `runAsync(sql, params)` - INSERT, UPDATE, DELETE with parameters
- `getFirstAsync(sql, params)` - SELECT single row with parameters
- `getAllAsync(sql, params)` - SELECT multiple rows with parameters
- `prepareAsync(sql)` - Prepared statements

❌ **FORBIDDEN:**
- `execAsync()` with user-provided values (SQL injection risk)
- String interpolation in SQL queries
- Dynamic SQL construction with user input

### Query Examples

**Create Transaction:**
```typescript
async create(transaction: Transaction): Promise<void> {
  await this.db.runAsync(
    `INSERT INTO transactions (
      id, user_id, type, wallet_id, destination_wallet_id, category_id,
      amount, note, transaction_date, created_at, updated_at, deleted_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.id,
      transaction.user_id,
      transaction.type,
      transaction.wallet_id,
      transaction.destination_wallet_id,
      transaction.category_id,
      transaction.amount,
      transaction.note,
      transaction.transaction_date,
      transaction.created_at,
      transaction.updated_at,
      transaction.deleted_at,
      transaction.sync_status,
    ]
  );
}
```

**Find by Month (with date range):**
```typescript
async findByUserIdAndMonth(userId: string, year: number, month: number): Promise<Transaction[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
  const endDate = month === 12 
    ? `${year + 1}-01-01T00:00:00.000Z`
    : `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000Z`;

  return await this.db.getAllAsync<Transaction>(
    `SELECT * FROM transactions 
     WHERE user_id = ? 
       AND deleted_at IS NULL 
       AND transaction_date >= ? 
       AND transaction_date < ?
     ORDER BY transaction_date DESC, created_at DESC`,
    [userId, startDate, endDate]
  );
}
```

**Monthly Income Total (aggregation):**
```typescript
async getMonthlyIncomeTotal(userId: string, year: number, month: number): Promise<number> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
  const endDate = month === 12 
    ? `${year + 1}-01-01T00:00:00.000Z`
    : `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000Z`;

  const result = await this.db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM transactions 
     WHERE user_id = ? 
       AND type = 'income' 
       AND deleted_at IS NULL 
       AND transaction_date >= ? 
       AND transaction_date < ?`,
    [userId, startDate, endDate]
  );
  
  return result?.total || 0;
}
```

**Find with LEFT JOIN (handle deleted wallets/categories):**
```typescript
async findByUserIdWithNames(userId: string, limit?: number): Promise<TransactionWithNames[]> {
  const sql = `
    SELECT 
      t.*,
      w.name as wallet_name,
      dw.name as destination_wallet_name,
      c.name as category_name
    FROM transactions t
    LEFT JOIN wallets w ON t.wallet_id = w.id
    LEFT JOIN wallets dw ON t.destination_wallet_id = dw.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.deleted_at IS NULL
    ORDER BY t.transaction_date DESC, t.created_at DESC
    ${limit ? 'LIMIT ?' : ''}
  `;
  
  const params = limit ? [userId, limit] : [userId];
  return await this.db.getAllAsync<TransactionWithNames>(sql, params);
}
```

### Repository Design Rules

- ✅ Filter `deleted_at IS NULL` for active records
- ✅ Order by `transaction_date DESC, created_at DESC` (newest first)
- ✅ Apply `user_id` filter for security
- ✅ Use LEFT JOIN for deleted wallet/category references
- ✅ Return NULL for wallet/category names if deleted
- ✅ Use SQLite indexes (already created in schema)

---

## 8. Service Flow

### File

**File:** `src/features/transactions/transaction.service.ts`

### Service Method Signatures (Approved)

**IMPORTANT:** Service methods receive `userId` as parameter. Do NOT use `useAuth()` inside service.

```typescript
createTransaction(userId: string, input: CreateTransactionInput): Promise<TransactionResult<Transaction>>
updateTransaction(userId: string, transactionId: string, input: UpdateTransactionInput): Promise<TransactionResult<Transaction>>
deleteTransaction(userId: string, transactionId: string): Promise<TransactionResult>
getTransactions(userId: string, filters?: TransactionFilters): Promise<TransactionResult<Transaction[]>>
getTransactionById(userId: string, transactionId: string): Promise<TransactionResult<Transaction>>
getMonthlySummary(userId: string, year: number, month: number): Promise<TransactionResult<MonthlySummary>>
```

### Create Transaction Flow

**Steps:**
1. Validate input using `validateCreateTransactionInput(input)`
2. Verify wallet exists and belongs to user
3. **If income/expense:** Verify category exists, belongs to user, and matches transaction type
4. **If transfer:** Verify destination wallet exists, belongs to user, and ≠ source wallet
5. Generate UUID and timestamps using `generateUUID()` and `getCurrentTimestamp()`
6. Build transaction record with `sync_status: 'pending'`
7. **Save to local SQLite first** (offline-first principle)
8. Add sync queue item
9. Return transaction result

**Example:**
```typescript
export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionResult<Transaction>> {
  try {
    // 1. Validate input
    const validation = validateCreateTransactionInput(input);
    if (!validation.valid) {
      const errorMessage = validation.errors.map((e) => e.message).join(', ');
      return { success: false, error: errorMessage };
    }

    // 2. Verify wallet exists and belongs to user
    const db = getDatabase();
    const walletRepo = getWalletRepository(db);
    const wallet = await walletRepo.findById(input.wallet_id);
    if (!wallet || wallet.user_id !== userId) {
      return { success: false, error: 'Wallet not found' };
    }

    // 3. Type-specific verification
    if (input.type === 'income' || input.type === 'expense') {
      const categoryRepo = getCategoryRepository(db);
      const category = await categoryRepo.findById(input.category_id!);
      if (!category || category.user_id !== userId || category.type !== input.type) {
        return { success: false, error: 'Invalid category for this transaction type' };
      }
    } else if (input.type === 'transfer') {
      const destWallet = await walletRepo.findById(input.destination_wallet_id!);
      if (!destWallet || destWallet.user_id !== userId) {
        return { success: false, error: 'Destination wallet not found' };
      }
    }

    // 5. Generate UUID and timestamps
    const now = getCurrentTimestamp();
    const transactionId = generateUUID();

    // 6. Build transaction record
    const transaction: Transaction = {
      id: transactionId,
      user_id: userId,
      type: input.type,
      wallet_id: input.wallet_id,
      destination_wallet_id: input.destination_wallet_id ?? null,
      category_id: input.category_id ?? null,
      amount: input.amount,
      note: input.note ?? null,
      transaction_date: input.transaction_date,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'pending',
    };

    // 7. Save to local SQLite first
    const transactionRepo = getTransactionRepository(db);
    await transactionRepo.create(transaction);

    // 8. Add sync queue item
    const syncQueueRepo = getSyncQueueRepository(db);
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'transactions',
      entity_id: transactionId,
      operation: 'create',
      payload: transaction,
    });

    // 9. Return result
    return { success: true, data: transaction };
  } catch (error) {
    logger.error('Failed to create transaction', error);
    return { success: false, error: 'Failed to create transaction. Please try again.' };
  }
}
```

### Update Transaction Flow

**Steps:**
1. Validate input using `validateUpdateTransactionInput(input)`
2. Check transaction exists and belongs to user
3. **Type is READ-ONLY** (cannot be changed on edit)
4. If `wallet_id` changes: verify new wallet exists and belongs to user
5. If `destination_wallet_id` changes: verify wallet exists and prevent same-wallet transfer
6. If `category_id` changes: verify category exists and belongs to user
7. Update in local SQLite (set `updated_at`, `sync_status: 'pending'`)
8. Add sync queue item
9. Return updated transaction

### Delete Transaction Flow

**Steps:**
1. Check transaction exists and belongs to user
2. Soft delete in local SQLite (set `deleted_at` timestamp)
3. Add sync queue item with delete operation
4. Return success

### Get Monthly Summary Flow

**Steps:**
1. Call `transactionRepo.getMonthlyIncomeTotal(userId, year, month)`
2. Call `transactionRepo.getMonthlyExpenseTotal(userId, year, month)`
3. Calculate net cashflow: `income - expense`
4. Return summary

### Service Design Rules

- ✅ Service methods receive `userId` as parameter
- ❌ Do NOT use `useAuth()` hook in service (React hooks are for components only)
- ✅ Screens/components call `useAuth()`, then pass `user.id` to service
- ✅ Use logger for errors and debug info
- ✅ Return generic user-facing error messages ("Failed to create transaction")
- ✅ Log technical details for developers (sanitized via logger)
- ✅ Validate foreign key ownership (wallet/category belong to user)
- ✅ All writes go to SQLite first (offline-first)

---

## 9. Sync Queue Behavior

### Integration Points

**Every transaction operation MUST add sync queue item:**
- Create transaction → add sync queue item with `operation: 'create'`
- Update transaction → add sync queue item with `operation: 'update'`
- Delete transaction → add sync queue item with `operation: 'delete'`

### Sync Queue Item Structure

```typescript
await syncQueueRepo.addSyncQueueItem({
  entity_name: 'transactions',
  entity_id: transactionId,
  operation: 'create' | 'update' | 'delete',
  payload: transaction, // Full transaction object (or {id, deleted_at} for delete)
});
```

### Phase 6 Scope: Local Queue Only

**✅ Phase 6 Implements:**
- Adding items to sync_queue table
- Marking transactions with `sync_status: 'pending'`
- Sync status badges in UI (pending/failed indicators)

**❌ Phase 6 Does NOT Implement:**
- Sync processing (reading queue and pushing to Supabase)
- Retry lifecycle (incrementing retry_count)
- Error handling (last_error field)
- Remote push to Supabase
- Remote pull from Supabase
- Conflict resolution
- Sync button functionality
- Background sync

**Deferred to Later Phases:**
- Phase 8: Network status detection
- Phase 9: Supabase schema and RLS
- Phase 10: Push sync processing
- Phase 11: Pull sync and conflict resolution

### Sync Status Display

**Transaction List UI:**
- Show "Pending" badge for `sync_status: 'pending'`
- Show "Failed" badge for `sync_status: 'failed'`
- No badge for `sync_status: 'synced'`

**Colors:**
- Pending: Amber/orange (#F59E0B)
- Failed: Red (#DC2626)
- Synced: No indicator (default state)

---

## 10. Wallet/Category Selection Strategy

### Wallet Selection

**Load Wallets:**
```typescript
const { data: wallets } = await getWallets(userId);
// Returns only active wallets (deleted_at IS NULL)
```

**No Wallets Handling:**
- Show empty state: "You need at least one wallet to create a transaction"
- Button: "Create Wallet" → navigate to `/wallets/new`
- Do NOT allow transaction creation without wallet

**Selection UI (Simple Approach):**
- Option A: React Native `Picker` component (built-in, no dependency)
- Option B: Modal with FlatList of wallet cards (tap to select)
- Display: wallet name + type (e.g., "Cash Wallet (cash)")

**For Transfer - Destination Wallet:**
- Load all user's wallets
- Filter out source wallet (exclude from destination options)
- Prevent same-wallet transfer

### Category Selection

**Load Categories:**
```typescript
// For income transaction
const { data: incomeCategories } = await getCategories(userId, 'income');

// For expense transaction
const { data: expenseCategories } = await getCategories(userId, 'expense');
```

**No Categories Handling:**
- Show message: "You need at least one [income/expense] category"
- Button: "Manage Categories" → navigate to `/settings/categories`
- Do NOT auto-create categories in Phase 6
- User must manage categories manually first

**Selection UI:**
- React Native `Picker` or modal with FlatList
- Display: category name + icon (text) + color (circle)
- Default categories shown first (order by `is_default DESC, name ASC`)

**For Transfer:**
- Hide category selector entirely
- Show destination wallet selector instead

### Selection Flow Example

```typescript
// Income transaction
1. User selects type: "Income"
2. Form shows:
   - Wallet selector (all user wallets)
   - Category selector (income categories only)
   - Amount input
   - Date input
   - Note input

// Expense transaction
1. User selects type: "Expense"
2. Form shows:
   - Wallet selector (all user wallets)
   - Category selector (expense categories only)
   - Amount input
   - Date input
   - Note input

// Transfer transaction
1. User selects type: "Transfer"
2. Form shows:
   - Source wallet selector (all user wallets)
   - Destination wallet selector (excludes source wallet)
   - Amount input
   - Date input
   - Note input
   - NO category selector
```

### Empty State Handling

**No Wallets:**
- Cannot create transaction
- Prompt to create wallet first
- Clear message and action button

**No Categories for Income/Expense:**
- Can create transfer transactions (no category needed)
- For income/expense: prompt to manage categories
- Clear message and action button

---

## 11. Transfer Flow Design

### Transfer Transaction Rules

**Required Fields:**
- `type: 'transfer'`
- `wallet_id` (source wallet)
- `destination_wallet_id` (destination wallet)
- `amount > 0` (INTEGER Rupiah)
- `transaction_date` (ISO timestamp)

**Constraints:**
- Source wallet ≠ Destination wallet (must be different)
- Both wallets must exist and belong to user
- `category_id` MUST be null (no category for transfers)

### UI Flow

1. User selects "Transfer" type in form
2. Type selector changes to "Transfer" (blue accent)
3. Form fields update:
   - **Show:** Source wallet selector
   - **Show:** Destination wallet selector (excludes source)
   - **Show:** Amount input
   - **Show:** Date input
   - **Show:** Note input (optional)
   - **Hide:** Category selector (transfer has no category)
4. User selects source wallet
5. Destination wallet options update (exclude selected source)
6. User selects destination wallet
7. Validation: source ≠ destination (real-time or on submit)
8. User enters amount (INTEGER Rupiah, > 0)
9. User confirms date (default: today)
10. User optionally adds note
11. User submits → create transaction

### Validation Rules

**Transfer-Specific Validation:**
- `destination_wallet_id` required (cannot be null)
- `destination_wallet_id` ≠ `wallet_id`
- `category_id` must be null
- Both wallets must exist and belong to user

**Error Messages:**
- "Transfer requires a destination wallet"
- "Source and destination wallets must be different"
- "Transfer cannot have a category"

### Balance Impact (Phase 7 - Future)

**Phase 6:** Transfer transactions are recorded but do NOT update wallet balance

**Phase 7 Dashboard:** Balance calculation will include transfers:
- Source wallet: `balance -= transfer amount`
- Destination wallet: `balance += transfer amount`

**Example Transfer Record:**
```typescript
{
  id: 'uuid-123',
  user_id: 'user-456',
  type: 'transfer',
  wallet_id: 'wallet-cash-123',           // Source: Cash Wallet
  destination_wallet_id: 'wallet-bank-456', // Destination: Bank Wallet
  category_id: null,                      // NO category
  amount: 50000,                          // Rp 50.000
  note: 'Cash deposit to bank',
  transaction_date: '2026-01-05T10:30:00.000Z',
  created_at: '2026-01-05T10:30:00.000Z',
  updated_at: '2026-01-05T10:30:00.000Z',
  deleted_at: null,
  sync_status: 'pending',
}
```

### Transfer Display in Transaction List

**Format:** "Transfer: [Source Wallet] → [Destination Wallet]"

**Example:**
- "Transfer: Cash Wallet → Bank Wallet"
- Amount: Rp 50.000 (blue accent color)
- Icon: ⇄ (transfer symbol)

---

## 12. Transaction List Screen Plan

### Route

**Route:** `src/app/(tabs)/transactions/index.tsx` (moved from `transactions.tsx`)

### Screen Sections

**1. Header with Month Selector**
- Current month display: "January 2026"
- Previous month button (arrow left)
- Next month button (arrow right)
- Or: Swipe gesture for month navigation

**2. Monthly Summary Card**

Display format:
```
┌─────────────────────────────────────┐
│  January 2026 Summary               │
│                                     │
│  Income      Rp 5.000.000  ↑ (green)│
│  Expense     Rp 3.500.000  ↓ (red)  │
│  ────────────────────────           │
│  Net          Rp 1.500.000 (green)  │
└─────────────────────────────────────┘
```

**Calculation:**
- Monthly income: SUM(amount) WHERE type='income' AND month=X AND deleted_at IS NULL
- Monthly expense: SUM(amount) WHERE type='expense' AND month=X AND deleted_at IS NULL
- Net cashflow: income - expense
- Color: green if positive, red if negative

**3. Transaction List (FlatList)**

**Ordering:**
- `ORDER BY transaction_date DESC, created_at DESC` (newest first)

**Grouping by Date:**
- Section headers: "Today", "Yesterday", "5 Jan 2026"
- Group transactions by date

**Transaction Card:**
```
┌─────────────────────────────────────┐
│ ↑ Salary                   Rp xxx   │  (income - green)
│   Cash Wallet • 10:30               │
│   Optional note...                  │
│   [Pending]                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ↓ Food & Dining            Rp xxx   │  (expense - red)
│   Cash Wallet • 14:20               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⇄ Transfer: Cash → Bank    Rp xxx   │  (transfer - blue)
│   16:45                             │
└─────────────────────────────────────┘
```

**Card Elements:**
- Type indicator icon: ↑ (income), ↓ (expense), ⇄ (transfer)
- Category name (for income/expense) or "Transfer: Source → Dest"
- Amount (formatted Rupiah, right-aligned)
- Amount color: green (income), red (expense), blue (transfer)
- Wallet name + time
- Note (if present, truncated to 1 line)
- Sync status badge (if pending/failed)

**Interactions:**
- Tap card → navigate to `/transactions/[id]` (edit screen)
- Long-press → show delete confirmation

**Handling Deleted Wallets/Categories:**
- Use LEFT JOIN to get wallet/category names
- If deleted: show "(Deleted Wallet)" or "(Deleted Category)"
- Transaction still visible, orphaned reference handled gracefully

**4. Empty State**

```
No transactions yet

Add your first transaction to start tracking your finances

[Add Transaction] button
```

**5. Floating Action Button (FAB)**

- Fixed position: bottom-right
- Blue background (#2563EB)
- White "+" icon
- Shadow/elevation
- OnPress: navigate to `/transactions/new`

**6. Pull-to-Refresh**

- Reload transaction list
- Update monthly summary
- Standard React Native RefreshControl

**7. Month Navigation**

- Loads transactions for selected month
- Updates monthly summary
- Smooth transition
- Display: "January 2026", "February 2026", etc.

### Phase 6 Scope Limitations

**✅ Phase 6 Includes:**
- Monthly transaction list for selected month
- Monthly income/expense/net summary for selected month
- Month navigation (prev/next)

**❌ Phase 6 Does NOT Include:**
- Total balance across all wallets (Phase 7)
- Balance per wallet (Phase 7)
- Expense by category chart (Phase 7)
- Income by category chart (Phase 7)
- Date range filtering beyond month (Phase 7+)
- Search functionality (Phase 12+)
- Export to CSV (Phase 15+)

---

## 13. Add/Edit Transaction Screen Plan

### Add Transaction Screen

**Route:** `src/app/(tabs)/transactions/new.tsx`

**Screen Structure:**

**1. Type Selector (Segmented Control)**

```
┌─────────────────────────────────────┐
│ [Income] [Expense] [Transfer]       │
└─────────────────────────────────────┘
```

- Three buttons: Income, Expense, Transfer
- Active state: blue background (#2563EB), white text
- Inactive state: white background, gray text
- Changes form fields dynamically

**2. Dynamic Form Fields**

**Income/Expense Form:**
- Wallet selector (Picker/modal, required)
- Category selector (Picker/modal, required, filtered by type)
- Amount input (TextInput, numeric keyboard, required)
- Date input (default: current timestamp, editable)
- Note input (TextInput, multiline, optional)

**Transfer Form:**
- Source wallet selector (Picker/modal, required)
- Destination wallet selector (Picker/modal, required, excludes source)
- Amount input (TextInput, numeric keyboard, required)
- Date input (default: current timestamp, editable)
- Note input (TextInput, multiline, optional)
- Category selector: HIDDEN

**3. Amount Input**

- Label: "Amount"
- Placeholder: "0"
- Keyboard type: numeric
- Real-time validation: must be > 0, must be INTEGER
- Format preview: "Rp 10.000" (use `formatRupiah()` for display)
- Error state: red border if invalid

**4. Date Input (Simple Approach)**

- Label: "Date"
- Display: formatted date (e.g., "5 Jan 2026, 10:30")
- Default: current timestamp
- Tap to edit: show simple modal or text input
- Validation: must be valid ISO timestamp

**5. Note Input**

- Label: "Note (optional)"
- Placeholder: "Add a note..."
- Multiline: yes
- Max length: 500 characters
- Height: 3-4 lines

**6. Action Buttons**

- **Save Button:**
  - Full-width, blue background (#2563EB)
  - Shows loading spinner when submitting
  - Disabled if validation fails or submitting

- **Cancel Button:**
  - Secondary style (white background, blue border)
  - Navigates back to transaction list

**7. Validation Feedback**

- Inline error messages below fields
- Real-time validation for amount (> 0, INTEGER)
- Submit-time validation for all required fields
- Error alert for server-side errors

**8. Empty State Handling**

**No Wallets:**
```
You need at least one wallet to create a transaction

[Create Wallet] button
```

**No Categories (for Income/Expense):**
```
You need at least one [income/expense] category

[Manage Categories] button
```

### Edit Transaction Screen

**Route:** `src/app/(tabs)/transactions/[id].tsx`

**Screen Structure:**

**1. Type Display (READ-ONLY)**

- Display current type as label or disabled selector
- Helper text: "Transaction type cannot be changed. Delete and recreate to change type."
- No type switching on edit

**2. Form Fields (Pre-filled)**

- All fields pre-filled with existing transaction data
- Wallet/category selectors: pre-selected
- Amount input: pre-filled
- Date input: pre-filled
- Note input: pre-filled

**3. Editable Fields**

- Wallet selector: editable (verify new wallet exists and belongs to user)
- Category selector: editable for income/expense (verify category valid)
- Destination wallet selector: editable for transfer (verify wallet valid, ≠ source)
- Amount: editable (must be > 0, INTEGER)
- Date: editable
- Note: editable

**4. Action Buttons**

- **Save Button:** updates transaction, adds sync queue item
- **Delete Button:** soft deletes transaction (with confirmation)
- **Cancel Button:** navigates back without changes

**5. Delete Confirmation**

```
Delete Transaction?

[Category Name / Transfer info]
Rp [amount]
[date]

This action cannot be undone.

[Cancel]  [Delete]
```

### UI Design Rules (AGENTS.md Compliance)

**Theme:**
- Primary blue: #2563EB
- App background: #F8FAFC
- Card background: #FFFFFF
- Text primary: #0F172A
- Text secondary: #64748B

**Type-Specific Colors:**
- Income: green accent #10B981
- Expense: red accent #EF4444
- Transfer: blue accent #2563EB

**Spacing:**
- Screen padding: 16px
- Card padding: 16px
- Input spacing: 12px between fields

**Borders:**
- Card radius: 12px
- Button radius: 8px
- Input radius: 8px

**Consistency:**
- Follow existing wallet/category form patterns
- Use same button styles
- Use same input styles
- Use same validation feedback

---

## 14. Derived Balance Calculation Approach

### Balance Calculation Rules (Read-Only)

**Wallet Balance Formula:**
```
Wallet Balance = opening_balance 
  + SUM(income to this wallet)
  - SUM(expense from this wallet)
  + SUM(transfers IN to this wallet)
  - SUM(transfers OUT from this wallet)
```

### Phase 6 Restrictions

**✅ Allowed in Phase 6:**
- Calculate balance for **display only** (if needed for wallet detail screen)
- Use derived calculation on-demand
- Return calculated value, do NOT store

**❌ NOT Allowed in Phase 6:**
- Do NOT store calculated balance in wallet table
- Do NOT add `balance` or `current_balance` column to wallets table
- Do NOT mutate `opening_balance` after wallet creation
- Do NOT implement dashboard balance calculations (Phase 7)
- Do NOT implement total balance across all wallets (Phase 7)

### Why No Balance Column?

**Rationale:**
1. **Single Source of Truth:** Wallet balance is derived from transactions (no redundant data)
2. **Data Consistency:** Storing balance creates update anomaly risk (balance vs transactions mismatch)
3. **Sync Simplicity:** Derived data eliminates sync conflicts for balance field
4. **Always Recalculable:** Balance can be calculated on-demand from transactions
5. **Offline-First Safety:** No risk of stale balance when offline

### Phase 6 Monthly Summary (Allowed)

**Phase 6 Implements:**
- Monthly income total (for selected month only)
- Monthly expense total (for selected month only)
- Net cashflow (income - expense for selected month)
- Display on transaction list screen header

**Phase 6 Does NOT Implement:**
- Total balance across all wallets
- Balance per wallet display
- Category breakdown charts
- Wallet breakdown charts
- Reports screen

### Phase 7 Dashboard Extension (Future)

**Phase 7 Will Add:**
- Total balance dashboard card
- Balance per wallet display
- Expense by category chart
- Income by category chart
- Balance by wallet chart
- Reports screen with comprehensive summaries

### Example Derived Calculation (If Needed)

If wallet balance display is needed in Phase 6 (e.g., wallet detail screen):

```typescript
async function calculateWalletBalance(walletId: string): Promise<number> {
  const wallet = await walletRepo.findById(walletId);
  if (!wallet) return 0;

  // Sum income to this wallet
  const income = await transactionRepo.sumIncomeByWallet(walletId);

  // Sum expense from this wallet
  const expense = await transactionRepo.sumExpenseByWallet(walletId);

  // Sum transfers IN
  const transfersIn = await transactionRepo.sumTransfersInByWallet(walletId);

  // Sum transfers OUT
  const transfersOut = await transactionRepo.sumTransfersOutByWallet(walletId);

  // Calculate derived balance
  return wallet.opening_balance + income - expense + transfersIn - transfersOut;
}
```

**IMPORTANT:** Return calculated value only. Do NOT store in database.

---

## 15. Risks and Tradeoffs

### Risk 1: No Date Picker Dependency

**Issue:** Simple date input may result in less polished UX compared to visual calendar picker.

**Mitigation:**
- Default to current timestamp (covers 80%+ use case)
- Optional simple modal for manual date editing
- Most transactions recorded "today"

**Tradeoff:**
- ✅ Zero new dependencies
- ✅ Simpler implementation
- ❌ Less polished date selection
- 🔮 Can add date picker library in Phase 12+ if needed

**Acceptable for MVP:** Yes

### Risk 2: Dynamic Form Field Complexity

**Issue:** Switching transaction type (income ↔ expense ↔ transfer) requires conditional rendering and different validation rules.

**Mitigation:**
- Clear UI state management
- Conditional rendering based on `selectedType`
- Type-specific validation functions
- Inline validation feedback

**Tradeoff:**
- More complex form logic
- Type READ-ONLY on edit (workaround: delete and recreate)

**Acceptable for MVP:** Yes

### Risk 3: Deleted Wallet/Category References

**Issue:** If user deletes wallet/category, existing transactions reference deleted entities.

**Mitigation:**
- Use LEFT JOIN to get wallet/category names
- Handle NULL by displaying "(Deleted Wallet)" or "(Deleted Category)"
- Transaction still visible, orphaned reference handled gracefully
- Phase 6: Show clear indicator for deleted references

**Future Enhancement (Phase 12+):**
- Add warning when deleting wallet/category with transactions
- Option: "View transactions before deleting"

**Tradeoff:**
- Transactions may show orphaned references
- User can still see transaction history

**Acceptable for MVP:** Yes

### Risk 4: Transfer Transaction Confusion

**Issue:** Users might confuse transfer with income/expense, or not understand when to use it.

**Mitigation:**
- Clear type selector labels
- Helper text: "Income: Money in", "Expense: Money out", "Transfer: Move between wallets"
- Prevent invalid combinations (transfer + category)
- Different form fields based on type

**Acceptable for MVP:** Yes

### Risk 5: Monthly Summary Performance

**Issue:** SUM queries on large transaction datasets could be slow.

**Mitigation:**
- SQLite indexes on `transaction_date`, `type`, `user_id` already exist
- Limit queries to single month range (not all-time)
- Month range reduces query size significantly
- Mobile SQLite optimized for local queries

**Future Optimization (Phase 8+):**
- Add monthly summary cache table if performance issues arise
- Precompute summaries during sync

**Acceptable for MVP:** Yes (simple SUM queries sufficient)

### Risk 6: Balance is Derived, Not Stored

**Issue:** Calculating balance on-demand may be slower than reading stored value.

**Mitigation:**
- Balance calculation is fast for mobile app scale (thousands of transactions)
- SQLite indexes optimize SUM queries
- Can cache in memory (component state) if needed
- Eliminates data consistency risk

**Benefit:**
- Single source of truth
- No sync conflicts for balance field
- Always accurate

**Acceptable for MVP:** Yes

### Risk 7: Type READ-ONLY on Edit

**Issue:** Users cannot change transaction type after creation (e.g., income → expense).

**Mitigation:**
- Clear helper text: "Transaction type cannot be changed"
- Workaround: Delete and recreate with correct type
- Prevents complex validation state changes

**Future Enhancement (Phase 12+):**
- Allow type editing with dynamic validation if user requests

**Acceptable for MVP:** Yes

---

## 16. Tests

### Task 6.7 Decision: Defer to Phase 13 ✅

**Rationale:**
1. **Consistency:** Phases 4 and 5 deferred tests to Phase 13
2. **MVP Focus:** Manual testing sufficient for Phase 6 validation
3. **Test Infrastructure:** Phase 13 will setup framework for all features at once
4. **Development Speed:** Focus on features, not test setup during MVP

### Phase 6 Testing Approach

**✅ Manual Testing Only:**
- Comprehensive manual test checklist in `PHASE6_SUMMARY.md`
- User performs manual verification after implementation
- Similar to Phase 4 and Phase 5 patterns

**❌ No Automated Tests in Phase 6:**
- Do NOT install Jest
- Do NOT install React Native Testing Library
- Do NOT install testing dependencies
- Do NOT write unit/integration tests

### Phase 13 Test Scope (Future)

**Will Test:**
- Transaction CRUD operations
- Type-specific validation (income/expense/transfer)
- Same-wallet transfer prevention
- Amount validation (> 0, INTEGER)
- Monthly summary calculations
- Repository query correctness
- Service error handling
- Balance derivation accuracy
- Sync queue integration

### Manual Test Checklist Preview

**Will be documented in `PHASE6_SUMMARY.md`:**
- TypeScript passes
- Expo starts successfully
- Tab bar shows only 5 tabs
- Transaction CRUD works
- Type-specific validation works
- Monthly summary calculates correctly
- Transfer flow works
- Sync queue items created
- Persistence after app restart
- No SQLite errors

---

## 17. Restrictions and Phase Boundaries

### Phase 6 Implementation Restrictions

**❌ Do NOT Implement:**
- Phase 7 features (dashboard, reports, total balance)
- Phase 8 features (network status, sync foundation)
- Phase 9 features (Supabase schema, RLS)
- Phase 10+ features (remote sync processing)
- Automated tests (Phase 13)
- Advanced features (recurring transactions, receipts, OCR - Phase 15+)

**❌ Do NOT Add:**
- New dependencies (no date picker, no Zod, no React Hook Form)
- New SQLite columns or tables
- Database migrations
- Icon libraries
- Testing frameworks

**❌ Do NOT Run:**
- Terminal commands automatically
- `npx tsc --noEmit` automatically
- `npx expo start` automatically
- `npm test` automatically

**✅ DO Provide:**
- Manual verification commands only
- Implementation summary
- Files created/modified/deleted
- Honest documentation

### Phase 6 Scope Summary

**✅ Phase 6 Implements:**
- Transaction types: income, expense, transfer
- CRUD operations (create, read, update, delete - soft delete)
- Add transaction screen with type selector and dynamic fields
- Transaction list screen with monthly summary
- Edit transaction screen (type read-only)
- Monthly income/expense/net cashflow summary
- Month navigation (prev/next month)
- Wallet/category selection (simple Picker or modal)
- Transfer flow (source/destination wallet, same-wallet prevention)
- Sync queue integration (add items, no processing)
- Simple date input (default current timestamp)
- Manual validation (no Zod)
- Derived balance calculation approach (no mutation)
- Empty states (no wallets, no categories)
- Sync status badges (pending/failed indicators)
- Deleted wallet/category handling (show "(Deleted)" labels)

**❌ Phase 6 Does NOT Implement:**
- Total balance dashboard
- Balance per wallet
- Reports screen
- Category breakdown charts
- Wallet breakdown charts
- Remote sync processing
- Sync retry logic
- Supabase writes
- Supabase schema/RLS
- Network status detection
- Automated tests
- Date picker library
- Icon library
- Reusable selector components (defer to Phase 12)

### Phase 7 Prerequisites

**Phase 7 will start ONLY after:**
1. Phase 6 manual verification passes
2. Phase 6 explicitly approved by user
3. User reviews and approves Phase 7 plan

**Phase 7 will implement:**
- Dashboard with total balance
- Balance per wallet display
- Expense by category breakdown
- Income by category breakdown
- Balance by wallet breakdown
- Reports screen with comprehensive summaries

---

## 18. Implementation Checklist

### Pre-Implementation

- [ ] Review Phase 1 SQLite schema
- [ ] Review existing wallet/category patterns
- [ ] Understand route migration requirements
- [ ] Understand type-specific validation rules
- [ ] Understand derived balance calculation approach

### Implementation Steps

**Step 1: Route Migration**
- [ ] Create `src/app/(tabs)/transactions/` folder
- [ ] Move `transactions.tsx` → `transactions/index.tsx`
- [ ] Delete old `transactions.tsx`
- [ ] Update `_layout.tsx` to hide nested routes

**Step 2: Transaction Feature Module**
- [ ] Create `transaction.types.ts` (aligned with schema)
- [ ] Create `transaction.validation.ts` (manual validation, no Zod)
- [ ] Create `transaction.repository.ts` (parameterized queries only)
- [ ] Create `transaction.service.ts` (userId parameter, no useAuth)
- [ ] Create `transaction.utils.ts` (optional helpers)
- [ ] Create `index.ts` (barrel export)

**Step 3: Add Transaction Screen**
- [ ] Create `transactions/new.tsx`
- [ ] Implement type selector (Income/Expense/Transfer)
- [ ] Implement dynamic form fields
- [ ] Implement wallet/category selection (simple Picker)
- [ ] Implement amount input (INTEGER validation)
- [ ] Implement simple date input (default current)
- [ ] Implement note input
- [ ] Implement validation feedback
- [ ] Implement empty states (no wallets/categories)
- [ ] Implement submit handler

**Step 4: Transaction List Screen**
- [ ] Update `transactions/index.tsx` (moved from transactions.tsx)
- [ ] Implement monthly summary card
- [ ] Implement month navigation
- [ ] Implement transaction list (FlatList)
- [ ] Implement date grouping
- [ ] Implement transaction card
- [ ] Implement empty state
- [ ] Implement FAB
- [ ] Implement pull-to-refresh
- [ ] Handle deleted wallets/categories

**Step 5: Edit Transaction Screen**
- [ ] Create `transactions/[id].tsx`
- [ ] Implement pre-fill form
- [ ] Implement type read-only display
- [ ] Implement editable fields
- [ ] Implement save handler
- [ ] Implement delete confirmation
- [ ] Implement delete handler

**Step 6: Transfer Flow**
- [ ] Implement transfer-specific validation
- [ ] Implement destination wallet exclusion
- [ ] Implement same-wallet prevention
- [ ] Implement category hiding for transfer

**Step 7: Sync Queue Integration**
- [ ] Add sync queue item on create
- [ ] Add sync queue item on update
- [ ] Add sync queue item on delete
- [ ] Display sync status badges

**Step 8: Documentation**
- [ ] Update `tasks.md` (mark 6.1-6.6 complete, 6.7 deferred)
- [ ] Create `PHASE6_SUMMARY.md`
- [ ] Document route structure
- [ ] Document date input approach
- [ ] Document balance calculation limitation
- [ ] Document manual test checklist

### Post-Implementation

- [ ] Verify TypeScript passes (do NOT run automatically)
- [ ] Verify Expo starts (do NOT run automatically)
- [ ] Verify tab bar shows only 5 tabs
- [ ] Verify nested routes hidden
- [ ] Verify no new dependencies added
- [ ] Verify Phase 7 not started
- [ ] Provide manual verification commands

---

## 19. Manual Verification Commands

**Provide these commands to user (do NOT run automatically):**

```bash
# TypeScript check
npx tsc --noEmit

# Start Expo dev server
npx expo start --dev-client

# Check git status
git status

# View changes
git diff
```

---

## 20. Success Criteria

Phase 6 is complete when:

- ✅ All transaction types (income, expense, transfer) can be created
- ✅ Transactions can be edited (type read-only) and deleted (soft delete)
- ✅ Transaction list displays correctly with date grouping and ordering
- ✅ Monthly summary calculates income, expense, net cashflow
- ✅ Month navigation works correctly (prev/next)
- ✅ Transfer prevents same-wallet selection
- ✅ Amount validation enforces > 0 and INTEGER Rupiah
- ✅ Type-specific validation works correctly
- ✅ All writes go to SQLite first (offline-first)
- ✅ Sync queue items created for all operations
- ✅ No new unsupported schema fields
- ✅ No new dependencies added
- ✅ TypeScript passes
- ✅ Expo dev client starts successfully
- ✅ Bottom tab bar shows only 5 tabs
- ✅ Nested routes hidden from tabs
- ✅ Manual verification checklist passes
- ✅ UI follows AGENTS.md blue theme
- ✅ Deleted wallets/categories handled gracefully
- ✅ Empty states work correctly
- ✅ Simple date input works (default current timestamp)
- ✅ No wallet balance mutation
- ✅ No Phase 7 features implemented
- ✅ tasks.md updated honestly
- ✅ PHASE6_SUMMARY.md created

---

**Phase 6 Plan Complete** ✅

**Status:** Awaiting user approval before implementation

**Next Steps:**
1. User reviews PHASE6_PLAN.md
2. User approves or requests revisions
3. Upon approval: Begin Phase 6 implementation
4. After implementation: Manual verification
5. After verification: Phase 6 approval
6. Then: Create Phase 7 plan (NOT before)

