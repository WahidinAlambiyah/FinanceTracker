import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { getDatabase } from '@/lib/db';
import { getNetworkService } from '@/lib/network/network.service';
import { logger } from '@/lib/utils/logger';
import { getWalletRepository } from '@/features/wallets/wallet.repository';
import { getCategoryRepository } from '@/features/categories/category.repository';
import { getTransactionRepository } from '@/features/transactions/transaction.repository';
import { remoteProfileRepository } from './remote-profile.repository';
import { remoteWalletRepository } from './remote-wallet.repository';
import { remoteCategoryRepository } from './remote-category.repository';
import { remoteTransactionRepository } from './remote-transaction.repository';
import { RemoteRepositoryError } from './remote.types';
import { getSyncQueueRepository } from './sync-queue.repository';
import type { SyncQueueItem } from './sync-queue.types';
import type {
  PushSyncErrorCode,
  PushSyncItemError,
  PushSyncOptions,
  PushSyncResult,
} from './push-sync.types';

const DEFAULT_LIMIT = 100;
const DEFAULT_MAX_RETRIES = 3;

function safeError(
  queueItem: SyncQueueItem | null,
  code: PushSyncErrorCode,
  message: string
): PushSyncItemError {
  return {
    queueItemId: queueItem?.id ?? null,
    entityName: queueItem?.entity_name ?? null,
    entityId: queueItem?.entity_id ?? null,
    code,
    message,
  };
}

function safeQueueErrorMessage(error: unknown): string {
  if (error instanceof RemoteRepositoryError) {
    return `${error.code}: ${error.message}`;
  }

  return 'PUSH_FAILED: Remote push failed.';
}

async function getAuthenticatedUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

/**
 * Explicit Phase 10B push service.
 *
 * This service is not wired to UI, network listeners, or app lifecycle yet.
 * It does not pull data or advance the full-sync cursor.
 */
export class PushSyncService {
  private isRunning = false;

  async pushPendingChanges(options: PushSyncOptions = {}): Promise<PushSyncResult> {
    if (this.isRunning) {
      return {
        success: true,
        pushedCount: 0,
        skippedCount: 1,
        failedCount: 0,
        errors: [],
      };
    }

    this.isRunning = true;

    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        return {
          success: false,
          pushedCount: 0,
          skippedCount: 0,
          failedCount: 1,
          errors: [safeError(null, 'AUTH_REQUIRED', 'Authentication is required to push data.')],
        };
      }

      const online = await getNetworkService().isOnline();
      if (!online) {
        return {
          success: false,
          pushedCount: 0,
          skippedCount: 0,
          failedCount: 0,
          errors: [safeError(null, 'OFFLINE', 'Push skipped because the device is offline.')],
        };
      }

      const db = await getDatabase();
      const queueRepository = getSyncQueueRepository(db);
      const walletRepository = getWalletRepository(db);
      const categoryRepository = getCategoryRepository(db);
      const transactionRepository = getTransactionRepository(db);
      const errors: PushSyncItemError[] = [];
      let pushedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      try {
        const existingProfile = await remoteProfileRepository.findProfileById(user.id);
        if (!existingProfile) {
          const createdAt = user.created_at;
          await remoteProfileRepository.upsertProfile({
            id: user.id,
            email: user.email ?? '',
            display_name: typeof user.user_metadata?.display_name === 'string'
              ? user.user_metadata.display_name
              : null,
            created_at: createdAt,
            updated_at: user.updated_at ?? createdAt,
            deleted_at: null,
          });
        }
      } catch (error) {
        logger.warn('Remote profile bootstrap failed', {
          userId: user.id,
          code: error instanceof RemoteRepositoryError ? error.code : 'PUSH_FAILED',
        });
        return {
          success: false,
          pushedCount: 0,
          skippedCount: 0,
          failedCount: 1,
          errors: [{
            queueItemId: null,
            entityName: 'profiles',
            entityId: user.id,
            code: 'REMOTE_REJECTED',
            message: 'Remote profile bootstrap failed.',
          }],
        };
      }

      await queueRepository.resetProcessingItemsForUser(user.id);

      const orphanedItems = await queueRepository.findOrphanedItemsForUser(
        user.id,
        options.maxRetries ?? DEFAULT_MAX_RETRIES,
        options.limit ?? DEFAULT_LIMIT
      );

      for (const orphanedItem of orphanedItems) {
        await queueRepository.markFailed(
          orphanedItem.id,
          'LOCAL_RECORD_MISSING: Canonical local record was not found.'
        );
        failedCount += 1;
        errors.push(safeError(
          orphanedItem,
          'LOCAL_RECORD_MISSING',
          'Canonical local record was not found.'
        ));
      }

      const items = await queueRepository.findPushableItemsForUser(
        user.id,
        options.maxRetries ?? DEFAULT_MAX_RETRIES,
        options.limit ?? DEFAULT_LIMIT
      );

      for (const item of items) {
        try {
          await queueRepository.markProcessing(item.id);

          if (item.entity_name === 'wallets') {
            const wallet = await walletRepository.findByIdForSync(user.id, item.entity_id);
            if (!wallet) {
              throw new Error('LOCAL_RECORD_MISSING');
            }
            await remoteWalletRepository.upsertWallet({
              id: wallet.id,
              user_id: wallet.user_id,
              name: wallet.name,
              type: wallet.type,
              opening_balance: wallet.opening_balance,
              created_at: wallet.created_at,
              updated_at: wallet.updated_at,
              deleted_at: wallet.deleted_at,
            });
          } else if (item.entity_name === 'categories') {
            const category = await categoryRepository.findByIdForSync(user.id, item.entity_id);
            if (!category) {
              throw new Error('LOCAL_RECORD_MISSING');
            }
            await remoteCategoryRepository.upsertCategory({
              id: category.id,
              user_id: category.user_id,
              name: category.name,
              type: category.type,
              icon: category.icon,
              color: category.color,
              is_default: category.is_default,
              created_at: category.created_at,
              updated_at: category.updated_at,
              deleted_at: category.deleted_at,
            });
          } else if (item.entity_name === 'transactions') {
            const transaction = await transactionRepository.findByIdForSync(
              user.id,
              item.entity_id
            );
            if (!transaction) {
              throw new Error('LOCAL_RECORD_MISSING');
            }
            await remoteTransactionRepository.upsertTransaction({
              id: transaction.id,
              user_id: transaction.user_id,
              type: transaction.type,
              wallet_id: transaction.wallet_id,
              destination_wallet_id: transaction.destination_wallet_id,
              category_id: transaction.category_id,
              amount: transaction.amount,
              note: transaction.note,
              transaction_date: transaction.transaction_date,
              created_at: transaction.created_at,
              updated_at: transaction.updated_at,
              deleted_at: transaction.deleted_at,
            });
          } else {
            skippedCount += 1;
            await queueRepository.markFailed(item.id, 'PUSH_FAILED: Unsupported entity type.');
            continue;
          }

          await queueRepository.markSuccess(item.id);
          pushedCount += 1;
        } catch (error) {
          const missing = error instanceof Error && error.message === 'LOCAL_RECORD_MISSING';
          const queueMessage = missing
            ? 'LOCAL_RECORD_MISSING: Canonical local record was not found.'
            : safeQueueErrorMessage(error);

          await queueRepository.markFailed(item.id, queueMessage);
          failedCount += 1;
          errors.push(safeError(
            item,
            missing ? 'LOCAL_RECORD_MISSING' : 'REMOTE_REJECTED',
            missing
              ? 'Canonical local record was not found.'
              : 'Remote push failed and remains retryable.'
          ));
        }
      }

      return {
        success: failedCount === 0,
        pushedCount,
        skippedCount,
        failedCount,
        errors,
      };
    } catch (error) {
      logger.error('Push sync service failed', error);
      return {
        success: false,
        pushedCount: 0,
        skippedCount: 0,
        failedCount: 1,
        errors: [safeError(null, 'PUSH_FAILED', 'Push sync could not be completed.')],
      };
    } finally {
      this.isRunning = false;
    }
  }
}

export const pushSyncService = new PushSyncService();
