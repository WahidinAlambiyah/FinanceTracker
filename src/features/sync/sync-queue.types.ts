/**
 * Sync Queue Type Definitions
 * 
 * Types for offline-first sync queue system.
 * Queue items track local changes that need to be synced to Supabase.
 */

export type EntityName = 'wallets' | 'categories' | 'transactions';
export type Operation = 'create' | 'update' | 'delete';
export type QueueStatus = 'pending' | 'processing' | 'failed' | 'success';

/**
 * Sync queue item stored in SQLite
 */
export interface SyncQueueItem {
  id: string;                    // UUID
  entity_name: EntityName;       // Table name ('wallets', 'categories', 'transactions')
  entity_id: string;             // Entity UUID
  operation: Operation;          // 'create' | 'update' | 'delete'
  payload: string;               // JSON stringified entity data
  status: QueueStatus;           // Sync status
  retry_count: number;           // Number of failed sync attempts
  last_error: string | null;     // Last error message from sync attempt
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}

/**
 * Input for adding sync queue item
 */
export interface AddSyncQueueItemInput {
  entity_name: EntityName;
  entity_id: string;
  operation: Operation;
  payload: any;  // Will be JSON.stringified
}
