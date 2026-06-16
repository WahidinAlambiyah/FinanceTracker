import type { User } from '@supabase/supabase-js';
import type { Wallet } from '@/features/wallets/wallet.types';
import type { Category } from '@/features/categories/category.types';
import type { Transaction } from '@/features/transactions/transaction.types';
import { getWalletRepository } from '@/features/wallets/wallet.repository';
import { getCategoryRepository } from '@/features/categories/category.repository';
import { getTransactionRepository } from '@/features/transactions/transaction.repository';
import { getDatabase } from '@/lib/db';
import { getNetworkService } from '@/lib/network/network.service';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import { resolveLastWriteWins } from './conflict-resolution';
import type { ConflictResolution } from './conflict-resolution.types';
import type {
  ConvergenceItemResult,
  ConvergenceSyncOptions,
  ConvergenceSyncResult,
} from './convergence-sync.types';
import { pullSyncService } from './pull-sync.service';
import { remoteCategoryRepository } from './remote-category.repository';
import { remoteProfileRepository } from './remote-profile.repository';
import { RemoteRepositoryError } from './remote.types';
import { remoteTransactionRepository } from './remote-transaction.repository';
import { remoteWalletRepository } from './remote-wallet.repository';
import { getSyncQueueRepository } from './sync-queue.repository';
import type { SyncQueueItem } from './sync-queue.types';

const DEFAULT_LIMIT = 100;
const DEFAULT_MAX_RETRIES = 3;

function sameValue(left: unknown, right: unknown): boolean {
  return left === right;
}

function walletsEquivalent(local: Wallet, remote: Parameters<typeof remoteWalletRepository.upsertWallet>[0]): boolean {
  return sameValue(local.id, remote.id)
    && sameValue(local.user_id, remote.user_id)
    && sameValue(local.name, remote.name)
    && sameValue(local.type, remote.type)
    && sameValue(local.opening_balance, remote.opening_balance)
    && sameValue(local.created_at, remote.created_at)
    && sameValue(local.updated_at, remote.updated_at)
    && sameValue(local.deleted_at, remote.deleted_at);
}

function categoriesEquivalent(
  local: Category,
  remote: Parameters<typeof remoteCategoryRepository.upsertCategory>[0]
): boolean {
  return sameValue(local.id, remote.id)
    && sameValue(local.user_id, remote.user_id)
    && sameValue(local.name, remote.name)
    && sameValue(local.type, remote.type)
    && sameValue(local.icon, remote.icon)
    && sameValue(local.color, remote.color)
    && sameValue(local.is_default, remote.is_default)
    && sameValue(local.created_at, remote.created_at)
    && sameValue(local.updated_at, remote.updated_at)
    && sameValue(local.deleted_at, remote.deleted_at);
}

function transactionsEquivalent(
  local: Transaction,
  remote: Parameters<typeof remoteTransactionRepository.upsertTransaction>[0]
): boolean {
  return sameValue(local.id, remote.id)
    && sameValue(local.user_id, remote.user_id)
    && sameValue(local.type, remote.type)
    && sameValue(local.wallet_id, remote.wallet_id)
    && sameValue(local.destination_wallet_id, remote.destination_wallet_id)
    && sameValue(local.category_id, remote.category_id)
    && sameValue(local.amount, remote.amount)
    && sameValue(local.note, remote.note)
    && sameValue(local.transaction_date, remote.transaction_date)
    && sameValue(local.created_at, remote.created_at)
    && sameValue(local.updated_at, remote.updated_at)
    && sameValue(local.deleted_at, remote.deleted_at);
}

async function ensureRemoteProfile(user: User): Promise<void> {
  const existing = await remoteProfileRepository.findProfileById(user.id);
  if (existing) return;

  await remoteProfileRepository.upsertProfile({
    id: user.id,
    email: user.email ?? '',
    display_name: typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : null,
    created_at: user.created_at,
    updated_at: user.updated_at ?? user.created_at,
    deleted_at: null,
  });
}

function resultFor(
  item: SyncQueueItem,
  resolution: ConflictResolution,
  settled: boolean
): ConvergenceItemResult {
  return {
    queueItemId: item.id,
    entityName: item.entity_name,
    entityId: item.entity_id,
    decision: resolution.decision,
    reason: resolution.reason,
    settled,
  };
}

/**
 * Explicit Phase 10D convergence cycle.
 *
 * Queue work is resolved through LWW before the normal pull stage so an older
 * local record cannot overwrite a newer remote record. This service does not
 * update last_sync_at or connect itself to UI/lifecycle triggers.
 */
export class ConvergenceSyncService {
  private isRunning = false;

  async converge(options: ConvergenceSyncOptions = {}): Promise<ConvergenceSyncResult> {
    const itemResults: ConvergenceItemResult[] = [];
    let localWinsCount = 0;
    let remoteWinsCount = 0;
    let settledEquivalentCount = 0;
    let failedCount = 0;

    const finish = (pullResult: ConvergenceSyncResult['pullResult']): ConvergenceSyncResult => {
      const unresolvedCount = itemResults.filter((item) => !item.settled).length
        + (pullResult?.skippedCount ?? 0);
      const pullFailures = pullResult?.failedCount ?? 0;
      return {
        success: failedCount === 0 && pullFailures === 0 && unresolvedCount === 0,
        localWinsCount,
        remoteWinsCount,
        settledEquivalentCount,
        skippedCount: itemResults.filter((item) => item.decision === 'skipped').length
          + (pullResult?.skippedCount ?? 0),
        failedCount: failedCount + pullFailures,
        unresolvedCount,
        lastSyncAdvanced: false,
        itemResults,
        pullResult,
      };
    };

    if (this.isRunning) {
      failedCount += 1;
      return finish(null);
    }

    this.isRunning = true;

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || !(await getNetworkService().isOnline())) {
        failedCount += 1;
        return finish(null);
      }

      const user = data.user;
      const db = await getDatabase();
      const queueRepository = getSyncQueueRepository(db);
      const walletRepository = getWalletRepository(db);
      const categoryRepository = getCategoryRepository(db);
      const transactionRepository = getTransactionRepository(db);

      await ensureRemoteProfile(user);
      await queueRepository.resetProcessingItemsForUser(user.id);

      const orphanedItems = await queueRepository.findOrphanedItemsForUser(
        user.id,
        options.maxRetries ?? DEFAULT_MAX_RETRIES,
        options.limit ?? DEFAULT_LIMIT
      );
      for (const item of orphanedItems) {
        await queueRepository.markFailed(
          item.id,
          'LOCAL_RECORD_MISSING: Canonical local record was not found.'
        );
        failedCount += 1;
        itemResults.push({
          queueItemId: item.id,
          entityName: item.entity_name,
          entityId: item.entity_id,
          decision: 'failed',
          reason: 'LOCAL_RECORD_MISSING',
          settled: false,
        });
      }

      const items = await queueRepository.findPushableItemsForUser(
        user.id,
        options.maxRetries ?? DEFAULT_MAX_RETRIES,
        options.limit ?? DEFAULT_LIMIT
      );

      for (const item of items) {
        try {
          if (item.entity_name === 'wallets') {
            const local = await walletRepository.findByIdForSync(user.id, item.entity_id);
            if (!local) throw new Error('LOCAL_RECORD_MISSING');
            const remote = await remoteWalletRepository.findWalletById(user.id, item.entity_id);
            const resolution = resolveLastWriteWins(local, remote, walletsEquivalent);
            if (resolution.decision === 'failed') {
              await queueRepository.markFailed(
                item.id,
                `CONFLICT_FAILED: ${resolution.reason}.`
              );
              failedCount += 1;
              itemResults.push(resultFor(item, resolution, false));
              continue;
            }
            await this.applyWalletDecision(item, resolution, local, remote, queueRepository, walletRepository);
            itemResults.push(resultFor(
              item,
              resolution,
              resolution.reason !== 'EQUAL_TIMESTAMP_MISMATCH'
            ));
            if (resolution.decision === 'local_wins') localWinsCount += 1;
            if (resolution.decision === 'remote_wins') remoteWinsCount += 1;
            if (resolution.reason === 'EQUIVALENT') settledEquivalentCount += 1;
          } else if (item.entity_name === 'categories') {
            const local = await categoryRepository.findByIdForSync(user.id, item.entity_id);
            if (!local) throw new Error('LOCAL_RECORD_MISSING');
            const remote = await remoteCategoryRepository.findCategoryById(user.id, item.entity_id);
            const resolution = resolveLastWriteWins(local, remote, categoriesEquivalent);
            if (resolution.decision === 'failed') {
              await queueRepository.markFailed(
                item.id,
                `CONFLICT_FAILED: ${resolution.reason}.`
              );
              failedCount += 1;
              itemResults.push(resultFor(item, resolution, false));
              continue;
            }
            await this.applyCategoryDecision(
              item,
              resolution,
              local,
              remote,
              queueRepository,
              categoryRepository
            );
            itemResults.push(resultFor(item, resolution, resolution.reason !== 'EQUAL_TIMESTAMP_MISMATCH'));
            if (resolution.decision === 'local_wins') localWinsCount += 1;
            if (resolution.decision === 'remote_wins') remoteWinsCount += 1;
            if (resolution.reason === 'EQUIVALENT') settledEquivalentCount += 1;
          } else {
            const local = await transactionRepository.findByIdForSync(user.id, item.entity_id);
            if (!local) throw new Error('LOCAL_RECORD_MISSING');
            const remote = await remoteTransactionRepository.findTransactionById(
              user.id,
              item.entity_id
            );
            const resolution = resolveLastWriteWins(local, remote, transactionsEquivalent);
            if (resolution.decision === 'failed') {
              await queueRepository.markFailed(
                item.id,
                `CONFLICT_FAILED: ${resolution.reason}.`
              );
              failedCount += 1;
              itemResults.push(resultFor(item, resolution, false));
              continue;
            }
            await this.applyTransactionDecision(
              item,
              resolution,
              local,
              remote,
              queueRepository,
              transactionRepository
            );
            itemResults.push(resultFor(item, resolution, resolution.reason !== 'EQUAL_TIMESTAMP_MISMATCH'));
            if (resolution.decision === 'local_wins') localWinsCount += 1;
            if (resolution.decision === 'remote_wins') remoteWinsCount += 1;
            if (resolution.reason === 'EQUIVALENT') settledEquivalentCount += 1;
          }
        } catch (itemError) {
          const missing = itemError instanceof Error && itemError.message === 'LOCAL_RECORD_MISSING';
          await queueRepository.markFailed(
            item.id,
            missing
              ? 'LOCAL_RECORD_MISSING: Canonical local record was not found.'
              : 'REMOTE_OPERATION_FAILED: Conflict convergence failed.'
          );
          failedCount += 1;
          itemResults.push({
            queueItemId: item.id,
            entityName: item.entity_name,
            entityId: item.entity_id,
            decision: 'failed',
            reason: missing ? 'LOCAL_RECORD_MISSING' : 'REMOTE_OPERATION_FAILED',
            settled: false,
          });
        }
      }

      const pullResult = await pullSyncService.pullRemoteChanges({
        updatedAfter: options.updatedAfter,
      });
      return finish(pullResult);
    } catch (error) {
      logger.warn('Convergence sync failed', {
        code: error instanceof RemoteRepositoryError ? error.code : 'CONVERGENCE_FAILED',
      });
      failedCount += 1;
      return finish(null);
    } finally {
      this.isRunning = false;
    }
  }

  private async applyWalletDecision(
    item: SyncQueueItem,
    resolution: ConflictResolution,
    local: Wallet,
    remote: Parameters<typeof remoteWalletRepository.upsertWallet>[0] | null,
    queueRepository: ReturnType<typeof getSyncQueueRepository>,
    walletRepository: ReturnType<typeof getWalletRepository>
  ): Promise<void> {
    if (resolution.decision === 'failed' || resolution.reason === 'EQUAL_TIMESTAMP_MISMATCH') {
      return;
    }
    if (resolution.reason === 'EQUIVALENT') {
      await walletRepository.markSyncedIfUnchanged(
        local.user_id,
        local.id,
        local.updated_at
      );
      await queueRepository.markSuccess(item.id);
      return;
    }
    await queueRepository.markProcessing(item.id);
    if (resolution.decision === 'local_wins') {
      await remoteWalletRepository.upsertWallet(local);
      await walletRepository.markSyncedIfUnchanged(
        local.user_id,
        local.id,
        local.updated_at
      );
    } else if (remote) {
      await walletRepository.applyRemoteWallet(remote);
    }
    await queueRepository.markSuccess(item.id);
  }

  private async applyCategoryDecision(
    item: SyncQueueItem,
    resolution: ConflictResolution,
    local: Category,
    remote: Parameters<typeof remoteCategoryRepository.upsertCategory>[0] | null,
    queueRepository: ReturnType<typeof getSyncQueueRepository>,
    categoryRepository: ReturnType<typeof getCategoryRepository>
  ): Promise<void> {
    if (resolution.decision === 'failed' || resolution.reason === 'EQUAL_TIMESTAMP_MISMATCH') {
      return;
    }
    if (resolution.reason === 'EQUIVALENT') {
      await categoryRepository.markSyncedIfUnchanged(
        local.user_id,
        local.id,
        local.updated_at
      );
      await queueRepository.markSuccess(item.id);
      return;
    }
    await queueRepository.markProcessing(item.id);
    if (resolution.decision === 'local_wins') {
      await remoteCategoryRepository.upsertCategory(local);
      await categoryRepository.markSyncedIfUnchanged(
        local.user_id,
        local.id,
        local.updated_at
      );
    } else if (remote) {
      await categoryRepository.applyRemoteCategory(remote);
    }
    await queueRepository.markSuccess(item.id);
  }

  private async applyTransactionDecision(
    item: SyncQueueItem,
    resolution: ConflictResolution,
    local: Transaction,
    remote: Parameters<typeof remoteTransactionRepository.upsertTransaction>[0] | null,
    queueRepository: ReturnType<typeof getSyncQueueRepository>,
    transactionRepository: ReturnType<typeof getTransactionRepository>
  ): Promise<void> {
    if (resolution.decision === 'failed' || resolution.reason === 'EQUAL_TIMESTAMP_MISMATCH') {
      return;
    }
    if (resolution.reason === 'EQUIVALENT') {
      await transactionRepository.markSyncedIfUnchanged(
        local.user_id,
        local.id,
        local.updated_at
      );
      await queueRepository.markSuccess(item.id);
      return;
    }
    await queueRepository.markProcessing(item.id);
    if (resolution.decision === 'local_wins') {
      await remoteTransactionRepository.upsertTransaction(local);
      await transactionRepository.markSyncedIfUnchanged(
        local.user_id,
        local.id,
        local.updated_at
      );
    } else if (remote) {
      await transactionRepository.applyRemoteTransaction(remote);
    }
    await queueRepository.markSuccess(item.id);
  }
}

export const convergenceSyncService = new ConvergenceSyncService();
