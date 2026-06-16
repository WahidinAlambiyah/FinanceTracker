/**
 * Transaction Type Definitions
 * 
 * Types for transaction management feature.
 * Aligned with Phase 1 SQLite schema.
 */

/**
 * Transaction stored in SQLite
 * 
 * Schema from Phase 1 (src/lib/db/schema.ts):
 * - id TEXT PRIMARY KEY
 * - user_id TEXT NOT NULL
 * - type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer'))
 * - wallet_id TEXT NOT NULL
 * - destination_wallet_id TEXT
 * - category_id TEXT
 * - amount INTEGER NOT NULL CHECK (amount > 0)
 * - note TEXT
 * - transaction_date TEXT NOT NULL
 * - created_at TEXT NOT NULL
 * - updated_at TEXT NOT NULL
 * - deleted_at TEXT
 * - sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict'))
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

/**
 * Transaction with related entity names (for display)
 */
export interface TransactionWithNames extends Transaction {
  wallet_name: string | null;
  destination_wallet_name: string | null;
  category_name: string | null;
}

/**
 * Transaction filters for queries
 */
export interface TransactionFilters {
  type?: TransactionType;
  walletId?: string;
  categoryId?: string;
  year?: number;
  month?: number;
  limit?: number;
}
