import type { EntityName } from './sync-queue.types';

export type PushSyncErrorCode =
  | 'AUTH_REQUIRED'
  | 'OFFLINE'
  | 'LOCAL_RECORD_MISSING'
  | 'REMOTE_REJECTED'
  | 'PUSH_FAILED';

export interface PushSyncItemError {
  queueItemId: string | null;
  entityName: EntityName | 'profiles' | null;
  entityId: string | null;
  code: PushSyncErrorCode;
  message: string;
}

export interface PushSyncResult {
  success: boolean;
  pushedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: PushSyncItemError[];
}

export interface PushSyncOptions {
  limit?: number;
  maxRetries?: number;
}
