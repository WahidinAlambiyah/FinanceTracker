import { describe, expect, it, jest } from '@jest/globals';

import { resolveLastWriteWins } from '@/features/sync/conflict-resolution';
import type { VersionedOwnedRecord } from '@/features/sync/conflict-resolution.types';

interface TestRecord extends VersionedOwnedRecord {
  name: string;
}

const baseLocal: TestRecord = {
  id: 'record-1',
  user_id: 'user-1',
  updated_at: '2026-06-21T10:00:00.000Z',
  deleted_at: null,
  name: 'Local',
};

function remoteRecord(overrides: Partial<TestRecord> = {}): TestRecord {
  return {
    id: 'record-1',
    user_id: 'user-1',
    updated_at: '2026-06-21T10:00:00.000Z',
    deleted_at: null,
    name: 'Local',
    ...overrides,
  };
}

describe('last-write-wins conflict resolution', () => {
  it('keeps local when the remote row is missing', () => {
    const resolution = resolveLastWriteWins(baseLocal, null, () => false);

    expect(resolution).toEqual({
      decision: 'local_wins',
      reason: 'REMOTE_MISSING',
      localUpdatedAt: baseLocal.updated_at,
      remoteUpdatedAt: null,
    });
  });

  it('keeps local when local updated_at is newer', () => {
    const remote = remoteRecord({ updated_at: '2026-06-21T09:00:00.000Z' });

    const resolution = resolveLastWriteWins(baseLocal, remote, () => false);

    expect(resolution).toEqual({
      decision: 'local_wins',
      reason: 'LOCAL_NEWER',
      localUpdatedAt: baseLocal.updated_at,
      remoteUpdatedAt: remote.updated_at,
    });
  });

  it('takes remote when remote updated_at is newer', () => {
    const remote = remoteRecord({ updated_at: '2026-06-21T11:00:00.000Z' });

    const resolution = resolveLastWriteWins(baseLocal, remote, () => false);

    expect(resolution).toEqual({
      decision: 'remote_wins',
      reason: 'REMOTE_NEWER',
      localUpdatedAt: baseLocal.updated_at,
      remoteUpdatedAt: remote.updated_at,
    });
  });

  it('skips equivalent records with the same timestamp', () => {
    const remote = remoteRecord();
    const areEquivalent = jest.fn<
      (localRecord: TestRecord, remoteRecord: TestRecord) => boolean
    >(() => true);

    const resolution = resolveLastWriteWins(baseLocal, remote, areEquivalent);

    expect(resolution).toEqual({
      decision: 'skipped',
      reason: 'EQUIVALENT',
      localUpdatedAt: baseLocal.updated_at,
      remoteUpdatedAt: remote.updated_at,
    });
    expect(areEquivalent).toHaveBeenCalledWith(baseLocal, remote);
  });

  it('skips but leaves unresolved records with equal timestamp mismatches', () => {
    const remote = remoteRecord({ name: 'Remote' });

    const resolution = resolveLastWriteWins(baseLocal, remote, () => false);

    expect(resolution).toEqual({
      decision: 'skipped',
      reason: 'EQUAL_TIMESTAMP_MISMATCH',
      localUpdatedAt: baseLocal.updated_at,
      remoteUpdatedAt: remote.updated_at,
    });
  });

  it('fails records with ownership mismatch', () => {
    const remote = remoteRecord({ user_id: 'other-user' });

    const resolution = resolveLastWriteWins(baseLocal, remote, () => false);

    expect(resolution).toEqual({
      decision: 'failed',
      reason: 'OWNERSHIP_MISMATCH',
      localUpdatedAt: baseLocal.updated_at,
      remoteUpdatedAt: remote.updated_at,
    });
  });

  it('fails records with invalid timestamps', () => {
    const local = {
      ...baseLocal,
      updated_at: 'not-a-date',
    };
    const remote = remoteRecord();

    const resolution = resolveLastWriteWins(local, remote, () => false);

    expect(resolution).toEqual({
      decision: 'failed',
      reason: 'INVALID_TIMESTAMP',
      localUpdatedAt: local.updated_at,
      remoteUpdatedAt: remote.updated_at,
    });
  });
});
