/**
 * Sync Metadata Repository (Phase 8)
 * 
 * Key-value storage for sync-related metadata.
 * Uses existing sync_metadata table from Phase 1 schema.
 * 
 * Phase 8: Storage foundation only (no sync processing)
 * Phase 10: Store last_sync_at after successful push sync
 * Phase 11: Store last_sync_at after successful pull sync
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { getCurrentTimestamp } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';

/**
 * Sync Metadata Repository
 * 
 * Stores sync-related metadata as key-value pairs.
 * Common keys: last_sync_at, last_sync_status, last_sync_error
 */
export class SyncMetadataRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Get metadata value by key
   * 
   * @param key - Metadata key
   * @returns Value string or null if key does not exist
   */
  async get(key: string): Promise<string | null> {
    try {
      const result = await this.db.getFirstAsync<{ value: string }>(
        `SELECT value FROM sync_metadata WHERE key = ?`,
        [key]
      );

      return result?.value ?? null;
    } catch (error) {
      logger.error('Failed to get sync metadata', error);
      throw error;
    }
  }

  /**
   * Set metadata value by key (upsert)
   * 
   * Creates new key-value pair or updates existing value.
   * 
   * @param key - Metadata key
   * @param value - Value to store
   */
  async set(key: string, value: string): Promise<void> {
    const now = getCurrentTimestamp();

    try {
      await this.db.runAsync(
        `INSERT INTO sync_metadata (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        [key, value, now]
      );

      logger.debug('Sync metadata set', { key });
    } catch (error) {
      logger.error('Failed to set sync metadata', error);
      throw error;
    }
  }

  /**
   * Delete metadata key
   * 
   * @param key - Metadata key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      await this.db.runAsync(
        `DELETE FROM sync_metadata WHERE key = ?`,
        [key]
      );

      logger.debug('Sync metadata deleted', { key });
    } catch (error) {
      logger.error('Failed to delete sync metadata', error);
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
let syncMetadataRepositoryInstance: SyncMetadataRepository | null = null;

/**
 * Get or create sync metadata repository instance
 * 
 * @param db - SQLite database instance
 * @returns SyncMetadataRepository singleton
 */
export function getSyncMetadataRepository(db: SQLiteDatabase): SyncMetadataRepository {
  if (!syncMetadataRepositoryInstance) {
    syncMetadataRepositoryInstance = new SyncMetadataRepository(db);
  }
  return syncMetadataRepositoryInstance;
}
