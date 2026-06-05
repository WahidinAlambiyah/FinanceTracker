/**
 * Wallet Type Definitions
 * 
 * Types for wallet management feature.
 */

/**
 * Wallet stored in SQLite
 */
export interface Wallet {
  id: string;                       // UUID
  user_id: string;                  // User UUID (from auth.users)
  name: string;                     // Wallet name (e.g., "Cash", "BCA Main")
  type: WalletType;                 // Wallet type
  balance: number;                  // Current balance (INTEGER Rupiah)
  opening_balance: number;          // Initial balance (INTEGER Rupiah)
  currency: string;                 // Currency code (default: 'IDR')
  icon: string | null;              // Icon identifier (optional)
  color: string | null;             // Color hex code (optional)
  notes: string | null;             // Additional notes (optional)
  is_active: boolean;               // Whether wallet is active
  sync_status: SyncStatus;          // Sync status with Supabase
  last_synced_at: string | null;   // Last successful sync timestamp (ISO)
  deleted_at: string | null;        // Soft delete timestamp (ISO)
  created_at: string;               // Creation timestamp (ISO)
  updated_at: string;               // Last update timestamp (ISO)
}

/**
 * Wallet type categories
 */
export type WalletType = 'cash' | 'bank' | 'ewallet' | 'investment' | 'other';

/**
 * Sync status
 */
export type SyncStatus = 'synced' | 'pending' | 'failed';

/**
 * Input for creating a new wallet
 */
export interface CreateWalletInput {
  name: string;
  type: WalletType;
  opening_balance: number;          // INTEGER Rupiah
  currency?: string;                // Default: 'IDR'
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  is_active?: boolean;              // Default: true
}

/**
 * Input for updating a wallet
 * 
 * Note: opening_balance is NOT editable after creation
 */
export interface UpdateWalletInput {
  name?: string;
  type?: WalletType;
  currency?: string;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  is_active?: boolean;
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
