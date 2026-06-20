import { beforeEach, describe, expect, it, jest } from '@jest/globals';

declare const require: <TModule>(moduleName: string) => TModule;

const mockDb = {
  getFirstAsync: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

const mockGetDatabase = jest.fn(() => mockDb);

jest.mock('@/lib/db', () => ({
  getDatabase: mockGetDatabase,
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

function loadTransactionService() {
  jest.resetModules();
  jest.doMock('@/lib/db', () => ({
    getDatabase: mockGetDatabase,
  }));
  jest.doMock('@/lib/utils/logger', () => ({
    logger: {
      debug: jest.fn(),
      error: jest.fn(),
    },
  }));

  return require<typeof import('@/features/transactions/transaction.service')>(
    '@/features/transactions/transaction.service'
  );
}

describe('monthly summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockReturnValue(mockDb);
  });

  it('returns income, expense, and net cashflow from existing monthly totals', async () => {
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ total: 900000 })
      .mockResolvedValueOnce({ total: 525000 });
    const { getMonthlySummary } = loadTransactionService();

    const result = await getMonthlySummary('user-1', 2026, 6);

    expect(result).toEqual({
      success: true,
      data: {
        income: 900000,
        expense: 525000,
        netCashflow: 375000,
      },
    });

    const [incomeSql, incomeParams] = mockDb.getFirstAsync.mock.calls[0] as [unknown, unknown[]];
    const [expenseSql, expenseParams] = mockDb.getFirstAsync.mock.calls[1] as [unknown, unknown[]];

    expect(String(incomeSql)).toEqual(expect.stringContaining("type = 'income'"));
    expect(String(expenseSql)).toEqual(expect.stringContaining("type = 'expense'"));
    expect(String(incomeSql)).toEqual(expect.stringContaining('deleted_at IS NULL'));
    expect(String(expenseSql)).toEqual(expect.stringContaining('deleted_at IS NULL'));
    expect(String(incomeSql)).not.toEqual(expect.stringContaining("type = 'transfer'"));
    expect(String(expenseSql)).not.toEqual(expect.stringContaining("type = 'transfer'"));
    expect(incomeParams[0]).toBe('user-1');
    expect(expenseParams[0]).toBe('user-1');
  });
});
