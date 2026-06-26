import { describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  CsvExportRepository,
  CsvExportService,
  formatCsvCell,
  mapTransactionSourceRowToCsvRow,
  transactionRowsToCsv,
} from '@/features/export';
import type { CsvExportTransactionSourceRow } from '@/features/export';

const header =
  'transaction_date,type,amount_idr,wallet,destination_wallet,category,note,sync_status,created_at,updated_at';

function makeRow(
  overrides: Partial<CsvExportTransactionSourceRow> = {}
): CsvExportTransactionSourceRow {
  return {
    type: 'income',
    amount: 125000,
    note: 'Salary',
    transaction_date: '2026-06-25T10:00:00.000Z',
    created_at: '2026-06-25T10:01:00.000Z',
    updated_at: '2026-06-25T10:02:00.000Z',
    sync_status: 'synced',
    wallet_name: 'Main Wallet',
    destination_wallet_name: null,
    category_name: 'Salary',
    ...overrides,
  };
}

describe('CSV export formatting', () => {
  it('includes the transaction CSV header row', () => {
    expect(transactionRowsToCsv([])).toBe(header);
  });

  it('escapes comma, quote, and newline characters', () => {
    expect(formatCsvCell('Food, "daily"\nLunch')).toBe('"Food, ""daily""\nLunch"');
  });

  it('exports null and empty values as empty cells', () => {
    expect(formatCsvCell(null)).toBe('');
    expect(formatCsvCell(undefined)).toBe('');
    expect(formatCsvCell('')).toBe('');
  });

  it('preserves integer Rupiah amounts', () => {
    const csv = transactionRowsToCsv([makeRow({ amount: 150000 })]);

    expect(csv).toContain('income,150000,');
    expect(csv).not.toContain('150000.00');
  });

  it('neutralizes spreadsheet formula injection in text cells', () => {
    expect(formatCsvCell('=SUM(1,1)')).toBe('"\'=SUM(1,1)"');
    expect(formatCsvCell('+628123')).toBe("'+628123");
    expect(formatCsvCell('-10')).toBe("'-10");
    expect(formatCsvCell('@cmd')).toBe("'@cmd");
    expect(formatCsvCell('\tTabbed')).toBe("'\tTabbed");
  });
});

describe('CSV export row mapping', () => {
  it('maps income rows with wallet and category names', () => {
    const row = mapTransactionSourceRowToCsvRow(makeRow());

    expect(row).toEqual({
      transaction_date: '2026-06-25T10:00:00.000Z',
      type: 'income',
      amount_idr: 125000,
      wallet: 'Main Wallet',
      destination_wallet: '',
      category: 'Salary',
      note: 'Salary',
      sync_status: 'synced',
      created_at: '2026-06-25T10:01:00.000Z',
      updated_at: '2026-06-25T10:02:00.000Z',
    });
  });

  it('maps expense rows with empty note safely', () => {
    const row = mapTransactionSourceRowToCsvRow(
      makeRow({
        type: 'expense',
        amount: 75000,
        note: null,
        category_name: 'Food',
        sync_status: 'pending',
      })
    );

    expect(row.amount_idr).toBe(75000);
    expect(row.category).toBe('Food');
    expect(row.note).toBe('');
    expect(row.sync_status).toBe('pending');
  });

  it('maps transfer rows with destination wallet and empty category', () => {
    const row = mapTransactionSourceRowToCsvRow(
      makeRow({
        type: 'transfer',
        destination_wallet_name: 'Savings',
        category_name: 'Ignored category',
      })
    );

    expect(row.destination_wallet).toBe('Savings');
    expect(row.category).toBe('');
  });

  it('handles missing or deleted referenced names with empty values', () => {
    const row = mapTransactionSourceRowToCsvRow(
      makeRow({
        wallet_name: null,
        destination_wallet_name: null,
        category_name: null,
      })
    );

    expect(row.wallet).toBe('');
    expect(row.destination_wallet).toBe('');
    expect(row.category).toBe('');
  });
});

describe('CSV export repository and service', () => {
  it('queries active current-user transaction rows from local SQLite only', async () => {
    const getAllAsync = jest.fn<(...args: unknown[]) => Promise<CsvExportTransactionSourceRow[]>>();
    getAllAsync.mockResolvedValueOnce([]);
    const repository = new CsvExportRepository({
      getAllAsync,
    } as unknown as SQLiteDatabase);

    await repository.findActiveTransactionRowsForUser('user-1');

    const [sql, params] = getAllAsync.mock.calls[0] as [unknown, unknown[]];
    expect(String(sql)).toEqual(expect.stringContaining('FROM transactions t'));
    expect(String(sql)).toEqual(expect.stringContaining('LEFT JOIN wallets w'));
    expect(String(sql)).toEqual(expect.stringContaining('LEFT JOIN wallets dw'));
    expect(String(sql)).toEqual(expect.stringContaining('LEFT JOIN categories c'));
    expect(String(sql)).toEqual(expect.stringContaining('WHERE t.user_id = ?'));
    expect(String(sql)).toEqual(expect.stringContaining('AND t.deleted_at IS NULL'));
    expect(String(sql)).toEqual(expect.stringContaining('AND w.deleted_at IS NULL'));
    expect(String(sql)).toEqual(expect.stringContaining('AND dw.deleted_at IS NULL'));
    expect(String(sql)).toEqual(expect.stringContaining('AND c.deleted_at IS NULL'));
    expect(String(sql)).not.toEqual(expect.stringContaining('user_id as'));
    expect(params).toEqual(['user-1']);
  });

  it('builds header-only CSV for an empty export', async () => {
    const repository = {
      findActiveTransactionRowsForUser: jest.fn<(...args: unknown[]) => Promise<[]>>(),
    };
    repository.findActiveTransactionRowsForUser.mockResolvedValueOnce([]);
    const service = new CsvExportService(repository as unknown as CsvExportRepository);

    await expect(service.buildTransactionsCsvForUser('user-1')).resolves.toBe(header);
    expect(repository.findActiveTransactionRowsForUser).toHaveBeenCalledWith('user-1');
  });
});
