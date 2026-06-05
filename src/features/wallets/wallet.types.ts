/**
 * Wallet Type Definitions
 * 
 * Types for wallet management feature.
 * Aligned with Phase 1 SQLite schema.
 */

/**
 * Wallet stored in SQLite
 * 
 * Schema from Phase 1 (src/lib/db/schema.ts):
 * - id TEXT PRIMARY KEY
 * - user_id TEXT NOT NULL
 * - name TEXT NOT NULL
 * - type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'other'))
 * - opening_balance INTEGER NOT NULL DEFAULT 0
 * - created_at TEXT NOT NULL
 * - updated_at TEXT NOT NULL
 * - deleted_at TEXT
 * - sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict'))
 */
export interface Wallet {
  id: string;                       // UUID
  user_id: string;                  // User UUID (from auth.users)
  name: string;                     // Wallet name (e.g., "Cash", "BCA Main")
  type: WalletType;                 // Wallet type
  opening_balance: number;          // Initial balance (INTEGER Rupiah)
  created_at: string;               // Creation timestamp (ISO)
  updated_at: string;               // Last update timestamp (ISO)
  deleted_at: string | null;        // Soft delete timestamp (ISO)
  sync_status: SyncStatus;          // Sync status with Supabase
}

/**
 * Wallet type categories
 * Must match SQLite CHECK constraint
 */
export type WalletType = 'cash' | 'bank' | 'ewallet' | 'other';

/**
 * Sync status
 * Must match SQLite CHECK constraint
 */
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'conflict';

/**
 * Input for creating a new wallet
 */
export interface CreateWalletInput {
  name: string;
  type: WalletType;
  opening_balance: number;          // INTEGER Rupiah
}

/**
 * Input for updating a wallet
 * 
 * Note: opening_balance is NOT editable after creation
 */
export interface UpdateWalletInput {
  name?: string;
  type?: WalletType;
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
 * Wallet operation result
 */
export interface WalletResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
