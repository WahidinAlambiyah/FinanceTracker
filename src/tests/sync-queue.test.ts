import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { SyncQueueRepository } from '@/features/sync/sync-queue.repository';
import type { SyncQueueItem } from '@/features/sync/sync-queue.types';

jest.mock('@/lib/utils/uuid', () => ({
  generateUUID: jest.fn(() => 'sync-item-1'),
}));

jest.mock('@/lib/utils/date', () => ({
  getCurrentTimestamp: jest.fn(() => '2026-06-21T00:00:00.000Z'),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

const mockDb = {
  runAsync: jest.fn<(...args: unknown[]) => Promise<void>>(),
  getAllAsync: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(),
  getFirstAsync: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

const repository = new SyncQueueRepository(mockDb as unknown as SQLiteDatabase);

describe('sync queue repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.runAsync.mockResolvedValue(undefined);
  });

  it('adds a pending queue item with JSON payload and zero retries', async () => {
    await repository.addSyncQueueItem({
      entity_name: 'wallets',
      entity_id: 'wallet-1',
      operation: 'create',
      payload: { id: 'wallet-1', user_id: 'user-1' },
    });

    const [sql, params] = mockDb.runAsync.mock.calls[0] as [unknown, unknown[]];

    expect(String(sql)).toEqual(expect.stringContaining('INSERT INTO sync_queue'));
    expect(params).toEqual([
      'sync-item-1',
      'wallets',
      'wallet-1',
      'create',
      JSON.stringify({ id: 'wallet-1', user_id: 'user-1' }),
      'pending',
      0,
      null,
      '2026-06-21T00:00:00.000Z',
      '2026-06-21T00:00:00.000Z',
    ]);
  });

  it('marks queue items through processing, success, and failed lifecycle states', async () => {
    await repository.markProcessing('sync-item-1');
    await repository.markSuccess('sync-item-1');
    await repository.markFailed('sync-item-1', 'REMOTE_REJECTED: Remote push failed.');

    const [processingSql, processingParams] = mockDb.runAsync.mock.calls[0] as [
      unknown,
      unknown[],
    ];
    const [successSql, successParams] = mockDb.runAsync.mock.calls[1] as [
      unknown,
      unknown[],
    ];
    const [failedSql, failedParams] = mockDb.runAsync.mock.calls[2] as [
      unknown,
      unknown[],
    ];

    expect(String(processingSql)).toEqual(expect.stringContaining("status = 'processing'"));
    expect(processingParams).toEqual(['2026-06-21T00:00:00.000Z', 'sync-item-1']);

    expect(String(successSql)).toEqual(expect.stringContaining("status = 'success'"));
    expect(String(successSql)).toEqual(expect.stringContaining('last_error = NULL'));
    expect(successParams).toEqual(['2026-06-21T00:00:00.000Z', 'sync-item-1']);

    expect(String(failedSql)).toEqual(expect.stringContaining("status = 'failed'"));
    expect(String(failedSql)).toEqual(expect.stringContaining('retry_count = retry_count + 1'));
    expect(String(failedSql)).toEqual(expect.stringContaining('last_error = ?'));
    expect(failedParams).toEqual([
      'REMOTE_REJECTED: Remote push failed.',
      '2026-06-21T00:00:00.000Z',
      'sync-item-1',
    ]);
  });

  it('finds pending items ordered by creation time', async () => {
    const pendingItems: SyncQueueItem[] = [
      {
        id: 'sync-item-1',
        entity_name: 'wallets',
        entity_id: 'wallet-1',
        operation: 'create',
        payload: '{}',
        status: 'pending',
        retry_count: 0,
        last_error: null,
        created_at: '2026-06-21T00:00:00.000Z',
        updated_at: '2026-06-21T00:00:00.000Z',
      },
    ];
    mockDb.getAllAsync.mockResolvedValueOnce(pendingItems);

    const result = await repository.findPendingItems(25);
    const [sql, params] = mockDb.getAllAsync.mock.calls[0] as [unknown, unknown[]];

    expect(result).toEqual(pendingItems);
    expect(String(sql)).toEqual(expect.stringContaining("WHERE status = 'pending'"));
    expect(String(sql)).toEqual(expect.stringContaining('ORDER BY created_at ASC'));
    expect(params).toEqual([25]);
  });

  it('counts queue items by status and returns zero when no row is found', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ count: 3 }).mockResolvedValueOnce(null);

    await expect(repository.countByStatus('failed')).resolves.toBe(3);
    await expect(repository.countByStatus('pending')).resolves.toBe(0);

    const [sql, params] = mockDb.getFirstAsync.mock.calls[0] as [unknown, unknown[]];
    expect(String(sql)).toEqual(expect.stringContaining('COUNT(*) as count'));
    expect(String(sql)).toEqual(expect.stringContaining('WHERE status = ?'));
    expect(params).toEqual(['failed']);
  });

  it('finds failed items below the retry limit', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    await repository.findFailedItems(5, 20);
    const [sql, params] = mockDb.getAllAsync.mock.calls[0] as [unknown, unknown[]];

    expect(String(sql)).toEqual(expect.stringContaining("WHERE status = 'failed'"));
    expect(String(sql)).toEqual(expect.stringContaining('retry_count < ?'));
    expect(String(sql)).toEqual(expect.stringContaining('ORDER BY created_at ASC'));
    expect(params).toEqual([5, 20]);
  });

  it('finds current-user pending and retryable failed items in dependency order', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    await repository.findPushableItemsForUser('user-1', 4, 50);
    const [sql, params] = mockDb.getAllAsync.mock.calls[0] as [unknown, unknown[]];

    expect(String(sql)).toEqual(expect.stringContaining("q.status = 'pending'"));
    expect(String(sql)).toEqual(expect.stringContaining("q.status = 'failed'"));
    expect(String(sql)).toEqual(expect.stringContaining('q.retry_count < ?'));
    expect(String(sql)).toEqual(expect.stringContaining('SELECT 1 FROM wallets w'));
    expect(String(sql)).toEqual(expect.stringContaining('SELECT 1 FROM categories c'));
    expect(String(sql)).toEqual(expect.stringContaining('SELECT 1 FROM transactions t'));
    expect(String(sql)).toEqual(expect.stringContaining("WHEN 'wallets' THEN 1"));
    expect(String(sql)).toEqual(expect.stringContaining("WHEN 'categories' THEN 2"));
    expect(String(sql)).toEqual(expect.stringContaining("WHEN 'transactions' THEN 3"));
    expect(params).toEqual([4, 'user-1', 'user-1', 'user-1', 50]);
  });

  it('resets current-user processing items back to pending', async () => {
    await repository.resetProcessingItemsForUser('user-1');
    const [sql, params] = mockDb.runAsync.mock.calls[0] as [unknown, unknown[]];

    expect(String(sql)).toEqual(expect.stringContaining("SET status = 'pending'"));
    expect(String(sql)).toEqual(expect.stringContaining("WHERE q.status = 'processing'"));
    expect(String(sql)).toEqual(expect.stringContaining('SELECT 1 FROM wallets w'));
    expect(String(sql)).toEqual(expect.stringContaining('SELECT 1 FROM categories c'));
    expect(String(sql)).toEqual(expect.stringContaining('SELECT 1 FROM transactions t'));
    expect(params).toEqual([
      '2026-06-21T00:00:00.000Z',
      'user-1',
      'user-1',
      'user-1',
    ]);
  });
});
