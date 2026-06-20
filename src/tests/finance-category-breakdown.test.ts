import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getReportsRepository } from '@/features/reports/reports.repository';

const mockDb = {
  getAllAsync: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(),
};

const repository = getReportsRepository(mockDb as unknown as SQLiteDatabase);

describe('reports category breakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates expense category totals, counts, percentages, and keeps highest total first', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([
      {
        category_id: 'food',
        category_name: 'Food',
        category_color: '#DC2626',
        total: 750000,
        count: 3,
      },
      {
        category_id: 'transport',
        category_name: 'Transport',
        category_color: '#2563EB',
        total: 250000,
        count: 1,
      },
    ]);

    const breakdown = await repository.getExpenseByCategory('user-1', 2026, 6);

    expect(breakdown).toEqual([
      expect.objectContaining({
        category_id: 'food',
        total: 750000,
        count: 3,
        percentage: 75,
      }),
      expect.objectContaining({
        category_id: 'transport',
        total: 250000,
        count: 1,
        percentage: 25,
      }),
    ]);

    const [sql, params] = mockDb.getAllAsync.mock.calls[0] as [unknown, unknown[]];
    expect(String(sql)).toEqual(expect.stringContaining("t.type = 'expense'"));
    expect(String(sql)).toEqual(expect.stringContaining('t.deleted_at IS NULL'));
    expect(String(sql)).toEqual(expect.stringContaining('c.deleted_at IS NULL'));
    expect(String(sql)).toEqual(expect.stringContaining('ORDER BY total DESC'));
    expect(params[0]).toBe('user-1');
    expect(params[3]).toBe('user-1');
    expect(new Date(params[1] as string).getTime()).toBeLessThan(
      new Date(params[2] as string).getTime()
    );
  });

  it('calculates income category totals, counts, percentages, and excludes transfers by type', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([
      {
        category_id: 'salary',
        category_name: 'Salary',
        category_color: '#16A34A',
        total: 600000,
        count: 1,
      },
      {
        category_id: 'freelance',
        category_name: 'Freelance',
        category_color: '#2563EB',
        total: 400000,
        count: 2,
      },
    ]);

    const breakdown = await repository.getIncomeByCategory('user-1', 2026, 6);

    expect(breakdown).toEqual([
      expect.objectContaining({
        category_id: 'salary',
        total: 600000,
        count: 1,
        percentage: 60,
      }),
      expect.objectContaining({
        category_id: 'freelance',
        total: 400000,
        count: 2,
        percentage: 40,
      }),
    ]);

    const [sql, params] = mockDb.getAllAsync.mock.calls[0] as [unknown, unknown[]];
    expect(String(sql)).toEqual(expect.stringContaining("t.type = 'income'"));
    expect(String(sql)).toEqual(expect.stringContaining("c.type = 'income'"));
    expect(String(sql)).not.toEqual(expect.stringContaining("t.type = 'transfer'"));
    expect(params[0]).toBe('user-1');
    expect(params[3]).toBe('user-1');
  });
});
