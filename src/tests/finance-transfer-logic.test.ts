import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { Transaction } from '@/features/transactions/transaction.types';
import { validateCreateTransactionInput } from '@/features/transactions/transaction.validation';

declare const require: <TModule>(moduleName: string) => TModule;

const mockDb = {};
const mockGetDatabase = jest.fn(() => mockDb);
const mockTransactionRepository = {
  create: jest.fn<(...args: unknown[]) => Promise<void>>(),
  findById: jest.fn<(...args: unknown[]) => Promise<Transaction | null>>(),
  update: jest.fn<(...args: unknown[]) => Promise<void>>(),
};
const mockWalletRepository = {
  findById: jest.fn<(...args: unknown[]) => Promise<{ id: string; user_id: string } | null>>(),
};
const mockCategoryRepository = {
  findById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};
const mockSyncQueueRepository = {
  addSyncQueueItem: jest.fn<(...args: unknown[]) => Promise<void>>(),
};

jest.mock('@/lib/db', () => ({
  getDatabase: mockGetDatabase,
}));

jest.mock('@/lib/utils/uuid', () => ({
  generateUUID: jest.fn(() => 'transaction-1'),
}));

jest.mock('@/lib/utils/date', () => ({
  getCurrentTimestamp: jest.fn(() => '2026-06-20T00:00:00.000Z'),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/features/transactions/transaction.repository', () => ({
  getTransactionRepository: jest.fn(() => mockTransactionRepository),
}));

jest.mock('@/features/wallets/wallet.repository', () => ({
  getWalletRepository: jest.fn(() => mockWalletRepository),
}));

jest.mock('@/features/categories/category.repository', () => ({
  getCategoryRepository: jest.fn(() => mockCategoryRepository),
}));

jest.mock('@/features/sync/sync-queue.repository', () => ({
  getSyncQueueRepository: jest.fn(() => mockSyncQueueRepository),
}));

function loadTransactionService() {
  jest.resetModules();
  jest.doMock('@/lib/db', () => ({
    getDatabase: mockGetDatabase,
  }));
  jest.doMock('@/lib/utils/uuid', () => ({
    generateUUID: jest.fn(() => 'transaction-1'),
  }));
  jest.doMock('@/lib/utils/date', () => ({
    getCurrentTimestamp: jest.fn(() => '2026-06-20T00:00:00.000Z'),
  }));
  jest.doMock('@/lib/utils/logger', () => ({
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  }));
  jest.doMock('@/features/transactions/transaction.repository', () => ({
    getTransactionRepository: jest.fn(() => mockTransactionRepository),
  }));
  jest.doMock('@/features/wallets/wallet.repository', () => ({
    getWalletRepository: jest.fn(() => mockWalletRepository),
  }));
  jest.doMock('@/features/categories/category.repository', () => ({
    getCategoryRepository: jest.fn(() => mockCategoryRepository),
  }));
  jest.doMock('@/features/sync/sync-queue.repository', () => ({
    getSyncQueueRepository: jest.fn(() => mockSyncQueueRepository),
  }));

  return require<typeof import('@/features/transactions/transaction.service')>(
    '@/features/transactions/transaction.service'
  );
}

const baseTransfer: Transaction = {
  id: 'transaction-1',
  user_id: 'user-1',
  type: 'transfer',
  wallet_id: 'wallet-a',
  destination_wallet_id: 'wallet-b',
  category_id: null,
  amount: 100000,
  note: null,
  transaction_date: '2026-06-20T00:00:00.000Z',
  created_at: '2026-06-20T00:00:00.000Z',
  updated_at: '2026-06-20T00:00:00.000Z',
  deleted_at: null,
  sync_status: 'pending',
};

describe('transfer transaction logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockReturnValue(mockDb);
  });

  it('requires a destination wallet when creating a transfer', () => {
    const validation = validateCreateTransactionInput({
      type: 'transfer',
      wallet_id: 'wallet-a',
      amount: 100000,
      transaction_date: '2026-06-20T00:00:00.000Z',
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContainEqual({
      field: 'destination_wallet_id',
      message: 'Transfer transaction requires a destination wallet',
    });
  });

  it('rejects create transfer when the destination wallet belongs to another user', async () => {
    mockWalletRepository.findById.mockImplementation(async (walletId) => {
      if (walletId === 'wallet-a') {
        return { id: 'wallet-a', user_id: 'user-1' };
      }
      return { id: 'wallet-b', user_id: 'other-user' };
    });
    const { createTransaction } = loadTransactionService();

    const result = await createTransaction('user-1', {
      type: 'transfer',
      wallet_id: 'wallet-a',
      destination_wallet_id: 'wallet-b',
      amount: 100000,
      transaction_date: '2026-06-20T00:00:00.000Z',
    });

    expect(result).toEqual({
      success: false,
      error: 'Destination wallet not found',
    });
    expect(mockTransactionRepository.create).not.toHaveBeenCalled();
    expect(mockSyncQueueRepository.addSyncQueueItem).not.toHaveBeenCalled();
  });

  it('rejects update transfer when the final source and destination wallets are the same', async () => {
    mockTransactionRepository.findById.mockResolvedValueOnce(baseTransfer);
    const { updateTransaction } = loadTransactionService();

    const result = await updateTransaction('user-1', 'transaction-1', {
      wallet_id: 'wallet-b',
    });

    expect(result).toEqual({
      success: false,
      error: 'Source and destination wallets must be different',
    });
    expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    expect(mockSyncQueueRepository.addSyncQueueItem).not.toHaveBeenCalled();
  });

  it('rejects update transfer when a category would be set', async () => {
    mockTransactionRepository.findById.mockResolvedValueOnce(baseTransfer);
    const { updateTransaction } = loadTransactionService();

    const result = await updateTransaction('user-1', 'transaction-1', {
      category_id: 'category-1',
    });

    expect(result).toEqual({
      success: false,
      error: 'Transfer transaction cannot have a category',
    });
    expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    expect(mockSyncQueueRepository.addSyncQueueItem).not.toHaveBeenCalled();
  });
});
