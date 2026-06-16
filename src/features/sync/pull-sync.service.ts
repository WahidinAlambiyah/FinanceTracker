import { supabase } from '@/lib/supabase/client';
import { getDatabase } from '@/lib/db';
import { getNetworkService } from '@/lib/network/network.service';
import { logger } from '@/lib/utils/logger';
import { getWalletRepository } from '@/features/wallets/wallet.repository';
import { getCategoryRepository } from '@/features/categories/category.repository';
import { getTransactionRepository } from '@/features/transactions/transaction.repository';
import { remoteWalletRepository } from './remote-wallet.repository';
import { remoteCategoryRepository } from './remote-category.repository';
import { remoteTransactionRepository } from './remote-transaction.repository';
import { RemoteRepositoryError } from './remote.types';
import { getSyncQueueRepository } from './sync-queue.repository';
import type { EntityName } from './sync-queue.types';
import type {
  PullSyncError,
  PullSyncOptions,
  PullSyncResult,
  PullSyncSkippedItem,
} from './pull-sync.types';

const INITIAL_PULL_TIMESTAMP = '1970-01-01T00:00:00.000Z';

function laterTimestamp(current: string | null, candidate: string): string {
  if (!current) return candidate;

  const currentTime = Date.parse(current);
  const candidateTime = Date.parse(candidate);
  if (Number.isFinite(currentTime) && Number.isFinite(candidateTime)) {
    return candidateTime > currentTime ? candidate : current;
  }

  return candidate > current ? candidate : current;
}

function safeError(
  entityName: EntityName | null,
  entityId: string | null,
  code: PullSyncError['code'],
  message: string
): PullSyncError {
  return { entityName, entityId, code, message };
}

/**
 * Explicit Phase 10C pull service.
 *
 * This service does not resolve conflicts, update last_sync_at, trigger push,
 * or connect itself to UI/network lifecycle events.
 */
export class PullSyncService {
  private isRunning = false;

  async pullRemoteChanges(options: PullSyncOptions = {}): Promise<PullSyncResult> {
    const emptyResult: PullSyncResult = {
      success: false,
      pulledCount: 0,
      appliedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      maxRemoteUpdatedAt: null,
      skippedItems: [],
      errors: [],
    };

    if (this.isRunning) {
      return {
        ...emptyResult,
        skippedCount: 1,
      };
    }

    this.isRunning = true;

    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        return {
          ...emptyResult,
          failedCount: 1,
          errors: [safeError(null, null, 'AUTH_REQUIRED', 'Authentication is required to pull data.')],
        };
      }

      if (!(await getNetworkService().isOnline())) {
        return {
          ...emptyResult,
          errors: [safeError(null, null, 'OFFLINE', 'Pull skipped because the device is offline.')],
        };
      }

      const userId = data.user.id;
      const updatedAfter = options.updatedAfter ?? INITIAL_PULL_TIMESTAMP;
      const db = await getDatabase();
      const queueRepository = getSyncQueueRepository(db);
      const walletRepository = getWalletRepository(db);
      const categoryRepository = getCategoryRepository(db);
      const transactionRepository = getTransactionRepository(db);
      const errors: PullSyncError[] = [];
      const skippedItems: PullSyncSkippedItem[] = [];
      let pulledCount = 0;
      let appliedCount = 0;
      let failedCount = 0;
      let maxRemoteUpdatedAt: string | null = null;

      const wallets = await remoteWalletRepository.findWalletsUpdatedAfter(userId, updatedAfter);
      pulledCount += wallets.length;
      for (const wallet of wallets) {
        maxRemoteUpdatedAt = laterTimestamp(maxRemoteUpdatedAt, wallet.updated_at);
        if (await queueRepository.hasUnsyncedItemsForEntity('wallets', wallet.id)) {
          skippedItems.push({
            entityName: 'wallets',
            entityId: wallet.id,
            remoteUpdatedAt: wallet.updated_at,
            reason: 'UNSYNCED_LOCAL_CHANGES',
          });
          continue;
        }

        try {
          await walletRepository.applyRemoteWallet(wallet);
          appliedCount += 1;
        } catch {
          failedCount += 1;
          errors.push(safeError(
            'wallets',
            wallet.id,
            'LOCAL_APPLY_FAILED',
            'Remote wallet could not be applied locally.'
          ));
        }
      }

      const categories = await remoteCategoryRepository.findCategoriesUpdatedAfter(
        userId,
        updatedAfter
      );
      pulledCount += categories.length;
      for (const category of categories) {
        maxRemoteUpdatedAt = laterTimestamp(maxRemoteUpdatedAt, category.updated_at);
        if (await queueRepository.hasUnsyncedItemsForEntity('categories', category.id)) {
          skippedItems.push({
            entityName: 'categories',
            entityId: category.id,
            remoteUpdatedAt: category.updated_at,
            reason: 'UNSYNCED_LOCAL_CHANGES',
          });
          continue;
        }

        try {
          await categoryRepository.applyRemoteCategory(category);
          appliedCount += 1;
        } catch {
          failedCount += 1;
          errors.push(safeError(
            'categories',
            category.id,
            'LOCAL_APPLY_FAILED',
            'Remote category could not be applied locally.'
          ));
        }
      }

      const transactions = await remoteTransactionRepository.findTransactionsUpdatedAfter(
        userId,
        updatedAfter
      );
      pulledCount += transactions.length;
      for (const transaction of transactions) {
        maxRemoteUpdatedAt = laterTimestamp(maxRemoteUpdatedAt, transaction.updated_at);
        if (await queueRepository.hasUnsyncedItemsForEntity('transactions', transaction.id)) {
          skippedItems.push({
            entityName: 'transactions',
            entityId: transaction.id,
            remoteUpdatedAt: transaction.updated_at,
            reason: 'UNSYNCED_LOCAL_CHANGES',
          });
          continue;
        }

        try {
          await transactionRepository.applyRemoteTransaction(transaction);
          appliedCount += 1;
        } catch {
          failedCount += 1;
          errors.push(safeError(
            'transactions',
            transaction.id,
            'LOCAL_APPLY_FAILED',
            'Remote transaction could not be applied locally.'
          ));
        }
      }

      return {
        success: failedCount === 0,
        pulledCount,
        appliedCount,
        skippedCount: skippedItems.length,
        failedCount,
        maxRemoteUpdatedAt,
        skippedItems,
        errors,
      };
    } catch (error) {
      logger.warn('Pull sync failed', {
        code: error instanceof RemoteRepositoryError ? error.code : 'PULL_FAILED',
      });

      return {
        ...emptyResult,
        failedCount: 1,
        errors: [safeError(
          null,
          null,
          error instanceof RemoteRepositoryError ? 'REMOTE_READ_FAILED' : 'PULL_FAILED',
          error instanceof RemoteRepositoryError
            ? 'Remote changes could not be read.'
            : 'Pull sync could not be completed.'
        )],
      };
    } finally {
      this.isRunning = false;
    }
  }
}

export const pullSyncService = new PullSyncService();
