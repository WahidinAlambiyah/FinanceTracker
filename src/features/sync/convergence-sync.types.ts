import type { PullSyncResult } from './pull-sync.types';
import type { ConflictDecision, ConflictReason } from './conflict-resolution.types';
import type { EntityName } from './sync-queue.types';

export interface ConvergenceItemResult {
  queueItemId: string;
  entityName: EntityName;
  entityId: string;
  decision: ConflictDecision;
  reason: ConflictReason | 'LOCAL_RECORD_MISSING' | 'REMOTE_OPERATION_FAILED';
  settled: boolean;
}

export interface ConvergenceSyncOptions {
  updatedAfter?: string;
  limit?: number;
  maxRetries?: number;
}

export interface ConvergenceSyncResult {
  success: boolean;
  localWinsCount: number;
  remoteWinsCount: number;
  settledEquivalentCount: number;
  skippedCount: number;
  failedCount: number;
  unresolvedCount: number;
  lastSyncAdvanced: false;
  itemResults: ConvergenceItemResult[];
  pullResult: PullSyncResult | null;
}
