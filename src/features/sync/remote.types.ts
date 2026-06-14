export interface RemoteProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UpsertRemoteProfileInput {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RemoteWalletRow {
  id: string;
  user_id: string;
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'other';
  opening_balance: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type UpsertRemoteWalletInput = RemoteWalletRow;

export interface RemoteCategoryRow {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type UpsertRemoteCategoryInput = RemoteCategoryRow;

export interface RemoteTransactionRow {
  id: string;
  user_id: string;
  type: 'income' | 'expense' | 'transfer';
  wallet_id: string;
  destination_wallet_id: string | null;
  category_id: string | null;
  amount: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type UpsertRemoteTransactionInput = RemoteTransactionRow;

export type RemoteRepositoryErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'RLS_DENIED'
  | 'CONSTRAINT_VIOLATION'
  | 'REMOTE_UNAVAILABLE'
  | 'REMOTE_ERROR';

export class RemoteRepositoryError extends Error {
  constructor(
    public readonly code: RemoteRepositoryErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'RemoteRepositoryError';
  }
}
