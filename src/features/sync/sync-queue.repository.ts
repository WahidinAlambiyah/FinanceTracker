/**
 * Sync Queue Repository (Minimal - Phase 4)
 * 
 * Scope: Add sync queue items only
 * NOT implementing: Processing, retry, remote push/pull (Phase 8/10/11)
 * 
 * Phase 4: Create queue entries for wallet operations
 * Phase 8: Network status and queue processing
 * Phase 10: Push sync (process queue → Supabase)
 * Phase 11: Pull sync (Supabase → local)
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { generateUUID } from '@/lib/utils/uuid';
import { getCurrentTimestamp } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import type { SyncQueueItem, AddSyncQueueItemInput } from './sync-queue.types';

/**
 * Minimal Sync Queue Repository
 * 
 * Allows features (wallets, categories, transactions) to add items to sync queue
 * after local SQLite writes.
 */
export class SyncQueueRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Add item to sync queue
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
