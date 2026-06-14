import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import {
  assertAuthenticatedOwner,
  remoteDatabase,
  throwRemoteRepositoryError,
} from './remote.repository-utils';
import type {
  RemoteTransactionRow,
  UpsertRemoteTransactionInput,
} from './remote.types';

const TRANSACTION_COLUMNS =
  'id,user_id,type,wallet_id,destination_wallet_id,category_id,amount,note,transaction_date,created_at,updated_at,deleted_at';

function mapTransactionRow(row: Record<string, unknown>): RemoteTransactionRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    type: row.type as RemoteTransactionRow['type'],
    wallet_id: row.wallet_id as string,
    destination_wallet_id: row.destination_wallet_id as string | null,
    category_id: row.category_id as string | null,
    amount: Number(row.amount),
    note: row.note as string | null,
    transaction_date: row.transaction_date as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: row.deleted_at as string | null,
  };
}

export class RemoteTransactionRepository {
  async upsertTransaction(
    input: UpsertRemoteTransactionInput
  ): Promise<RemoteTransactionRow> {
    await assertAuthenticatedOwner(input.user_id);

    const row: UpsertRemoteTransactionInput = {
      id: input.id,
      user_id: input.user_id,
      type: input.type,
      wallet_id: input.wallet_id,
      destination_wallet_id: input.destination_wallet_id,
      category_id: input.category_id,
      amount: input.amount,
      note: input.note,
      transaction_date: input.transaction_date,
      created_at: input.created_at,
      updated_at: input.updated_at,
      deleted_at: input.deleted_at,
    };

    const response = await remoteDatabase
      .from('transactions')
      .upsert(row, { onConflict: 'id' })
      .select(TRANSACTION_COLUMNS)
      .single() as PostgrestSingleResponse<Record<string, unknown>>;

    if (response.error) {
      throwRemoteRepositoryError('upsert', 'transaction', input.id, response.error);
    }

    return mapTransactionRow(response.data);
  }

  async findTransactionsUpdatedAfter(
    userId: string,
    updatedAfter: string
  ): Promise<RemoteTransactionRow[]> {
    await assertAuthenticatedOwner(userId);

    const { data, error } = await remoteDatabase
      .from('transactions')
      .select(TRANSACTION_COLUMNS)
      .eq('user_id', userId)
      .gt('updated_at', updatedAfter)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throwRemoteRepositoryError('findUpdatedAfter', 'transaction', null, error);
    }

    return (data ?? []).map((row) => mapTransactionRow(row as Record<string, unknown>));
  }
}

export const remoteTransactionRepository = new RemoteTransactionRepository();
