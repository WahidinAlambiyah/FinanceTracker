import { getDatabase } from '@/lib/db';
import { getNetworkService } from '@/lib/network/network.service';
import { supabase } from '@/lib/supabase/client';
import { getCurrentTimestamp } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import { convergenceSyncService } from './convergence-sync.service';
import { getLastSyncAtKey } from './sync-metadata.types';
import { getSyncMetadataRepository } from './sync-metadata.repository';
import { getSyncQueueRepository } from './sync-queue.repository';
import type {
  ManualSyncOutcome,
  ManualSyncResult,
  ManualSyncStatus,
} from './manual-sync.types';

const INITIAL_SYNC_TIMESTAMP = '1970-01-01T00:00:00.000Z';
const SYNC_OVERLAP_MS = 5 * 60 * 1000;
const MANUAL_RETRY_LIMIT = Number.MAX_SAFE_INTEGER;

/** Replay a small window so exact timestamp boundaries cannot hide remote rows. */
export function getOverlappedUpdatedAfter(lastSyncAt: string | null): string {
  if (!lastSyncAt) return INITIAL_SYNC_TIMESTAMP;

  const lastSyncTime = Date.parse(lastSyncAt);
  if (!Number.isFinite(lastSyncTime)) return INITIAL_SYNC_TIMESTAMP;

  return new Date(Math.max(0, lastSyncTime - SYNC_OVERLAP_MS)).toISOString();
}

function classifyOutcome(result: ManualSyncResult['convergenceResult']): ManualSyncOutcome {
  if (!result) return 'failed';

  const pullCode = result.pullResult?.errors[0]?.code;
  if (pullCode === 'AUTH_REQUIRED') return 'auth_required';
  if (pullCode === 'OFFLINE') return 'offline';

  if (isCompleteSuccess(result)) {
    return 'success';
  }

  const madeProgress = result.itemResults.length > 0
    || (result.pullResult?.appliedCount ?? 0) > 0
    || result.unresolvedCount > 0;
  return madeProgress ? 'partial' : 'failed';
}

function isCompleteSuccess(result: NonNullable<ManualSyncResult['convergenceResult']>): boolean {
  return result.success && result.failedCount === 0 && result.unresolvedCount === 0;
}

function messageFor(outcome: ManualSyncOutcome): string {
  switch (outcome) {
    case 'success':
      return 'Sync completed';
    case 'partial':
      return 'Some items still need attention';
    case 'offline':
      return "You're offline";
    case 'auth_required':
      return 'Please sign in again';
    default:
      return 'Sync could not be completed. Please try again.';
  }
}

export class ManualSyncService {
  async getStatus(userId: string): Promise<ManualSyncStatus> {
    const db = await getDatabase();
    const queueRepository = getSyncQueueRepository(db);
    const metadataRepository = getSyncMetadataRepository(db);

    const [isOnline, lastSyncAt, pendingCount, failedCount] = await Promise.all([
      getNetworkService().isOnline(),
      metadataRepository.get(getLastSyncAtKey(userId)),
      queueRepository.countByStatusForUser(userId, 'pending'),
      queueRepository.countByStatusForUser(userId, 'failed'),
    ]);

    return { isOnline, lastSyncAt, pendingCount, failedCount };
  }

  async syncNow(userId: string): Promise<ManualSyncResult> {
    const currentStatus = await this.getStatus(userId);

    if (!currentStatus.isOnline) {
      logger.info('Manual sync skipped', { code: 'OFFLINE' });
      return {
        outcome: 'offline',
        message: messageFor('offline'),
        convergenceResult: null,
        status: currentStatus,
      };
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || data.user.id !== userId) {
      logger.warn('Manual sync stopped', { code: 'AUTH_REQUIRED' });
      return {
        outcome: 'auth_required',
        message: messageFor('auth_required'),
        convergenceResult: null,
        status: currentStatus,
      };
    }

    const syncCycleStartedAt = getCurrentTimestamp();
    const result = await convergenceSyncService.converge({
      updatedAfter: getOverlappedUpdatedAfter(currentStatus.lastSyncAt),
      maxRetries: MANUAL_RETRY_LIMIT,
    });

    let outcome = classifyOutcome(result);
    if (outcome === 'failed' && !result.pullResult) {
      if (!(await getNetworkService().isOnline())) {
        outcome = 'offline';
      } else {
        const authCheck = await supabase.auth.getUser();
        if (authCheck.error || !authCheck.data.user || authCheck.data.user.id !== userId) {
          outcome = 'auth_required';
        }
      }
    }

    if (isCompleteSuccess(result)) {
      const db = await getDatabase();
      await getSyncMetadataRepository(db).set(
        getLastSyncAtKey(userId),
        syncCycleStartedAt
      );
    } else {
      logger.warn('Manual sync incomplete', {
        code: outcome.toUpperCase(),
        failedCount: result.failedCount,
        unresolvedCount: result.unresolvedCount,
      });
    }

    return {
      outcome,
      message: messageFor(outcome),
      convergenceResult: result,
      status: await this.getStatus(userId),
    };
  }
}

export const manualSyncService = new ManualSyncService();
