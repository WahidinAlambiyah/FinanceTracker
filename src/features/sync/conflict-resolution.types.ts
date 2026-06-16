export type ConflictDecision = 'local_wins' | 'remote_wins' | 'skipped' | 'failed';

export type ConflictReason =
  | 'REMOTE_MISSING'
  | 'LOCAL_NEWER'
  | 'REMOTE_NEWER'
  | 'EQUIVALENT'
  | 'EQUAL_TIMESTAMP_MISMATCH'
  | 'OWNERSHIP_MISMATCH'
  | 'INVALID_TIMESTAMP';

export interface ConflictResolution {
  decision: ConflictDecision;
  reason: ConflictReason;
  localUpdatedAt: string;
  remoteUpdatedAt: string | null;
}

export interface VersionedOwnedRecord {
  id: string;
  user_id: string;
  updated_at: string;
  deleted_at: string | null;
}
