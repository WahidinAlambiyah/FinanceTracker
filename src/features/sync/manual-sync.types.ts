import type { ConvergenceSyncResult } from './convergence-sync.types';

export type ManualSyncOutcome =
  | 'success'
  | 'partial'
  | 'failed'
  | 'offline'
  | 'auth_required';

export interface ManualSyncStatus {
  isOnline: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
}

export interface ManualSyncResult {
  outcome: ManualSyncOutcome;
  message: string;
  convergenceResult: ConvergenceSyncResult | null;
  status: ManualSyncStatus;
}
