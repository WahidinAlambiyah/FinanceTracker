import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getBalanceRepository } from '@/features/dashboard/balance.repository';

const mockDb = {
  getFirstAsync: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  getAllAsync: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(),
};

const repository = getBalanceRepository(mockDb as unknown as SQLiteDatabase);

describe('balance repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates wallet balance from opening balance, income, expense, and transfers', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({
      opening_balance: 1000000,
      total_income: 500000,
      total_expense: 125000,
      total_transfers_out: 200000,
      total_transfers_in: 75000,
    });

    const balance = await repository.calculateWalletBalance('user-1', 'wallet-a');

    expect(balance).toBe(1250000);

    const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
    expect(String(sql)).toEqual(expect.stringContaining('t.deleted_at IS NULL'));
    expect(params).toEqual([
      'wallet-a',
      'wallet-a',
      'wallet-a',
      'wallet-a',
      'user-1',
      'wallet-a',
      'user-1',
    ]);
  });

  it('returns zero when the wallet is not found', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce(null);

    const balance = await repository.calculateWalletBalance('user-1', 'missing-wallet');

    expect(balance).toBe(0);
  });

  it('sums derived balances across active wallets', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 'wallet-a' }, { id: 'wallet-b' }]);
    mockDb.getFirstAsync
      .mockResolvedValueOnce({
        opening_balance: 100000,
        total_income: 50000,
        total_expense: 25000,
        total_transfers_out: 10000,
        total_transfers_in: 0,
      })
      .mockResolvedValueOnce({
        opening_balance: 200000,
        total_income: 0,
        total_expense: 40000,
        total_transfers_out: 0,
        total_transfers_in: 10000,
      });

    const totalBalance = await repository.calculateTotalBalance('user-1');

    expect(totalBalance).toBe(285000);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('deleted_at IS NULL'),
      ['user-1']
    );
  });
});
