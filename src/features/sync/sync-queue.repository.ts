/**
 * Sync Queue Repository (Phase 4 + Phase 8 Expansion)
 * 
 * Phase 4: Add sync queue items only
 * Phase 8: Query and update methods for sync foundation
 * NOT implementing: Processing, retry, remote push/pull (Phase 10/11)
 * 
 * Phase 4: Create queue entries for wallet operations
 * Phase 8: Query pending/failed, update status, count by status
 * Phase 10: Push sync (process queue → Supabase)
 * Phase 11: Pull sync (Supabase → local)
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { generateUUID } from '@/lib/utils/uuid';
import { getCurrentTimestamp } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import type { SyncQueueItem, AddSyncQueueItemInput, QueueStatus } from './sync-queue.types';

/**
 * Sync Queue Repository
 * 
 * Phase 4: Add items to sync queue after local SQLite writes
 * Phase 8: Query pending/failed items, update status
 */
export class SyncQueueRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Add item to sync queue (Phase 4)
   * 
   * Called by wallet/category/transaction services after successful local writes.
   * Creates a pending sync queue entry that will be processed in Phase 10.
   * 
   * @param input - Entity info and operation
   */
  async addSyncQueueItem(input: AddSyncQueueItemInput): Promise<void> {
    const now = getCurrentTimestamp();
    const item: SyncQueueItem = {
      id: generateUUID(),
      entity_name: input.entity_name,
      entity_id: input.entity_id,
      operation: input.operation,
      payload: JSON.stringify(input.payload),
      status: 'pending',
      retry_count: 0,
      last_error: null,
      created_at: now,
      updated_at: now,
    };

    try {
      await this.db.runAsync(
        `INSERT INTO sync_queue (
          id, entity_name, entity_id, operation, payload,
          status, retry_count, last_error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.entity_name,
          item.entity_id,
          item.operation,
          item.payload,
          item.status,
          item.retry_count,
          item.last_error,
          item.created_at,
          item.updated_at,
        ]
      );

      logger.debug('Sync queue item added', {
        entityName: item.entity_name,
        entityId: item.entity_id,
        operation: item.operation,
      });
    } catch (error) {
      logger.error('Failed to add sync queue item', error);
      throw error;
    }
  }

  /**
   * Find pending sync queue items (Phase 8)
   * 
   * Query items with status = 'pending'
   * Used by sync service (Phase 10) to process queue
   * 
   * @param limit - Maximum number of items to return
   * @returns Array of pending sync queue items
   */
  async findPendingItems(limit: number = 100): Promise<SyncQueueItem[]> {
    try {
      const rows = await this.db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT ?`,
        [limit]
      );

      return rows || [];
    } catch (error) {
      logger.error('Failed to find pending sync queue items', error);
      throw error;
    }
  }

  /**
   * Find failed sync queue items (Phase 8)
   * 
   * Query items with status = 'failed' and retry_count < maxRetries
   * Used by sync service (Phase 10) to retry failed items
   * 
   * @param maxRetries - Maximum retry count
   * @param limit - Maximum number of items to return
   * @returns Array of failed sync queue items eligible for retry
   */
  async findFailedItems(maxRetries: number = 3, limit: number = 100): Promise<SyncQueueItem[]> {
    try {
      const rows = await this.db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue
         WHERE status = 'failed'
           AND retry_count < ?
         ORDER BY created_at ASC
         LIMIT ?`,
        [maxRetries, limit]
      );

      return rows || [];
    } catch (error) {
      logger.error('Failed to find failed sync queue items', error);
      throw error;
    }
  }

  /**
   * Count sync queue items by status (Phase 8)
   * 
   * Used by Settings screen to display pending/failed count
   * 
   * @param status - Queue status to count
   * @returns Number of items with given status
   */
  async countByStatus(status: QueueStatus): Promise<number> {
    try {
      const result = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue
         WHERE status = ?`,
        [status]
      );

      return result?.count ?? 0;
    } catch (error) {
      logger.error('Failed to count sync queue items', error);
      throw error;
    }
  }

  /**
   * Mark sync queue item as processing (Phase 8)
   * 
   * Called when sync starts processing an item (Phase 10)
   * 
   * @param id - Sync queue item ID
   */
  async markProcessing(id: string): Promise<void> {
    const now = getCurrentTimestamp();

    try {
      await this.db.runAsync(
        `UPDATE sync_queue
         SET status = 'processing', updated_at = ?
         WHERE id = ?`,
        [now, id]
      );

      logger.debug('Sync queue item marked as processing', { id });
    } catch (error) {
      logger.error('Failed to mark sync queue item as processing', error);
      throw error;
    }
  }

  /**
   * Mark sync queue item as success (Phase 8)
   * 
   * Called after successful remote sync (Phase 10)
   * 
   * @param id - Sync queue item ID
   */
  async markSuccess(id: string): Promise<void> {
    const now = getCurrentTimestamp();

    try {
      await this.db.runAsync(
        `UPDATE sync_queue
         SET status = 'success', updated_at = ?
         WHERE id = ?`,
        [now, id]
      );

      logger.debug('Sync queue item marked as success', { id });
    } catch (error) {
      logger.error('Failed to mark sync queue item as success', error);
      throw error;
    }
  }

  /**
   * Mark sync queue item as failed (Phase 8)
   * 
   * Called after failed remote sync (Phase 10)
   * Increments retry_count and stores error message
   * 
   * @param id - Sync queue item ID
   * @param errorMessage - Error message from sync attempt
   */
  async markFailed(id: string, errorMessage: string): Promise<void> {
    const now = getCurrentTimestamp();

    try {
      await this.db.runAsync(
        `UPDATE sync_queue
         SET status = 'failed',
             retry_count = retry_count + 1,
             last_error = ?,
             updated_at = ?
         WHERE id = ?`,
        [errorMessage, now, id]
      );

      logger.debug('Sync queue item marked as failed', { id, errorMessage });
    } catch (error) {
      logger.error('Failed to mark sync queue item as failed', error);
      throw error;
    }
  }
}

/**
 * Singleton instance
 * Initialized lazily when first requested
 */
let syncQueueRepositoryInstance: SyncQueueRepository | null = null;

/**
 * Get or create sync queue repository instance
 * 
 * @param db - SQLite database instance
 * @returns SyncQueueRepository singleton
 */
export function getSyncQueueRepository(db: SQLiteDatabase): SyncQueueRepository {
  if (!syncQueueRepositoryInstance) {
    syncQueueRepositoryInstance = new SyncQueueRepository(db);
  }
  return syncQueueRepositoryInstance;
}
