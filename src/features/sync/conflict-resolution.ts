import type {
  ConflictResolution,
  VersionedOwnedRecord,
} from './conflict-resolution.types';

/** Resolve one LWW decision without mutating local or remote state. */
export function resolveLastWriteWins<TLocal extends VersionedOwnedRecord, TRemote extends VersionedOwnedRecord>(
  local: TLocal,
  remote: TRemote | null,
  areEquivalent: (localRecord: TLocal, remoteRecord: TRemote) => boolean
): ConflictResolution {
  if (!remote) {
    return {
      decision: 'local_wins',
      reason: 'REMOTE_MISSING',
      localUpdatedAt: local.updated_at,
      remoteUpdatedAt: null,
    };
  }

  if (local.id !== remote.id || local.user_id !== remote.user_id) {
    return {
      decision: 'failed',
      reason: 'OWNERSHIP_MISMATCH',
      localUpdatedAt: local.updated_at,
      remoteUpdatedAt: remote.updated_at,
    };
  }

  const localTime = Date.parse(local.updated_at);
  const remoteTime = Date.parse(remote.updated_at);
  if (!Number.isFinite(localTime) || !Number.isFinite(remoteTime)) {
    return {
      decision: 'failed',
      reason: 'INVALID_TIMESTAMP',
      localUpdatedAt: local.updated_at,
      remoteUpdatedAt: remote.updated_at,
    };
  }

  if (localTime > remoteTime) {
    return {
      decision: 'local_wins',
      reason: 'LOCAL_NEWER',
      localUpdatedAt: local.updated_at,
      remoteUpdatedAt: remote.updated_at,
    };
  }

  if (remoteTime > localTime) {
    return {
      decision: 'remote_wins',
      reason: 'REMOTE_NEWER',
      localUpdatedAt: local.updated_at,
      remoteUpdatedAt: remote.updated_at,
    };
  }

  if (areEquivalent(local, remote)) {
    return {
      decision: 'skipped',
      reason: 'EQUIVALENT',
      localUpdatedAt: local.updated_at,
      remoteUpdatedAt: remote.updated_at,
    };
  }

  return {
    decision: 'skipped',
    reason: 'EQUAL_TIMESTAMP_MISMATCH',
    localUpdatedAt: local.updated_at,
    remoteUpdatedAt: remote.updated_at,
  };
}
