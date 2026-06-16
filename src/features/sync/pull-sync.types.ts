import type { EntityName } from './sync-queue.types';

export type PullSyncErrorCode =
  | 'AUTH_REQUIRED'
  | 'OFFLINE'
  | 'REMOTE_READ_FAILED'
  | 'LOCAL_APPLY_FAILED'
  | 'PULL_FAILED';

export interface PullSyncError {
  entityName: EntityName | null;
  entityId: string | null;
  code: PullSyncErrorCode;
  message: string;
}

export interface PullSyncSkippedItem {
  entityName: EntityName;
  entityId: string;
  remoteUpdatedAt: string;
  reason: 'UNSYNCED_LOCAL_CHANGES';
}

export interface PullSyncResult {
  success: boolean;
  pulledCount: number;
  appliedCount: number;
  skippedCount: number;
  failedCount: number;
  maxRemoteUpdatedAt: string | null;
  skippedItems: PullSyncSkippedItem[];
  errors: PullSyncError[];
}

export interface PullSyncOptions {
  /** Exclusive lower bound. Defaults to the Unix epoch for an initial pull. */
  updatedAfter?: string;
}
