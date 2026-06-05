/**
 * Category Type Definitions
 * 
 * Types for category management feature.
 * Aligned with Phase 1 SQLite schema.
 */

/**
 * Category stored in SQLite
 * 
 * Schema from Phase 1 (src/lib/db/schema.ts):
 * - id TEXT PRIMARY KEY
 * - user_id TEXT NOT NULL
 * - name TEXT NOT NULL
 * - type TEXT NOT NULL CHECK (type IN ('income', 'expense'))
 * - icon TEXT
 * - color TEXT
 * - is_default INTEGER NOT NULL DEFAULT 0
 * - created_at TEXT NOT NULL
 * - updated_at TEXT NOT NULL
 * - deleted_at TEXT
 * - sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict'))
 */
export interface Category {
  id: string;                    // UUID
  user_id: string;               // User UUID
  name: string;                  // Category name (max 50 chars)
  type: CategoryType;            // 'income' | 'expense'
  icon: string | null;           // Icon identifier (optional)
  color: string | null;          // Hex color (optional)
  is_default: boolean;           // Whether this is a default category (INTEGER 0/1 in DB)
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
  deleted_at: string | null;     // ISO timestamp (soft delete)
  sync_status: SyncStatus;       // Sync status
}

/**
 * Category type
 * Must match SQLite CHECK constraint
 */
export type CategoryType = 'income' | 'expense';

/**
 * Sync status
 * Must match SQLite CHECK constraint
 */
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'conflict';

/**
 * Input for creating a new category
 */
export interface CreateCategoryInput {
  name: string;
  type: CategoryType;            // Required on create, NOT editable after
  icon?: string | null;
  color?: string | null;
}

/**
 * Input for updating a category
 * Note: type is NOT editable after creation
 * Note: is_default is NOT editable by user
 */
export interface UpdateCategoryInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
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
 * Category operation result
 */
export interface CategoryResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Seed result
 */
export interface SeedResult {
  success: boolean;
  insertedCount?: number;
  totalDefaults?: number;
  error?: string;
}
