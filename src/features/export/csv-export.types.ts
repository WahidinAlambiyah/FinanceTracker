import type { SyncStatus, TransactionType } from '@/features/transactions/transaction.types';

export interface CsvExportTransactionRow {
  transaction_date: string;
  type: TransactionType;
  amount_idr: number;
  wallet: string;
  destination_wallet: string;
  category: string;
  note: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface CsvExportTransactionSourceRow {
  type: TransactionType;
  amount: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
  wallet_name: string | null;
  destination_wallet_name: string | null;
  category_name: string | null;
}
