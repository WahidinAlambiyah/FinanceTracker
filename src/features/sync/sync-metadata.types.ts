/**
 * Sync Metadata Type Definitions (Phase 8)
 * 
 * Types for sync metadata key-value storage.
 */

/**
 * Sync metadata item stored in SQLite
 */
export interface SyncMetadata {
  key: string;         // Metadata key
  value: string;       // Metadata value
  updated_at: string;  // ISO timestamp
}

/**
 * Common sync metadata keys
 */
export const SYNC_METADATA_KEYS = {
  LAST_SYNC_AT: 'last_sync_at',           // ISO timestamp of last successful sync (Phase 10)
  LAST_SYNC_STATUS: 'last_sync_status',   // 'success' | 'failed' (Phase 10)
  LAST_SYNC_ERROR: 'last_sync_error',     // Error message if failed (Phase 10)
  LAST_PULL_AT: 'last_pull_at',           // ISO timestamp of last pull sync (Phase 11)
} as const;

/** Keep full-sync cursors isolated between accounts on the same device. */
export function getLastSyncAtKey(userId: string): string {
  return `${SYNC_METADATA_KEYS.LAST_SYNC_AT}:${userId}`;
}
