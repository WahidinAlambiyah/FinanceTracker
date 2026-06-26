import type {
  CsvExportTransactionRow,
  CsvExportTransactionSourceRow,
} from './csv-export.types';

export const TRANSACTION_CSV_HEADERS = [
  'transaction_date',
  'type',
  'amount_idr',
  'wallet',
  'destination_wallet',
  'category',
  'note',
  'sync_status',
  'created_at',
  'updated_at',
] as const;

type CsvCell = string | number | null | undefined;

function sanitizeCsvTextCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function formatCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = typeof value === 'number' ? String(value) : sanitizeCsvTextCell(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rowsToCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(formatCsvCell).join(',')).join('\r\n');
}

export function mapTransactionSourceRowToCsvRow(
  row: CsvExportTransactionSourceRow
): CsvExportTransactionRow {
  return {
    transaction_date: row.transaction_date,
    type: row.type,
    amount_idr: row.amount,
    wallet: row.wallet_name ?? '',
    destination_wallet: row.type === 'transfer' ? row.destination_wallet_name ?? '' : '',
    category: row.type === 'transfer' ? '' : row.category_name ?? '',
    note: row.note ?? '',
    sync_status: row.sync_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function transactionRowsToCsv(rows: CsvExportTransactionSourceRow[]): string {
  const csvRows: CsvCell[][] = [
    [...TRANSACTION_CSV_HEADERS],
    ...rows.map((row) => {
      const csvRow = mapTransactionSourceRowToCsvRow(row);

      return [
        csvRow.transaction_date,
        csvRow.type,
        csvRow.amount_idr,
        csvRow.wallet,
        csvRow.destination_wallet,
        csvRow.category,
        csvRow.note,
        csvRow.sync_status,
        csvRow.created_at,
        csvRow.updated_at,
      ];
    }),
  ];

  return rowsToCsv(csvRows);
}
