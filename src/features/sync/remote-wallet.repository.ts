import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import {
  assertAuthenticatedOwner,
  remoteDatabase,
  throwRemoteRepositoryError,
} from './remote.repository-utils';
import type { RemoteWalletRow, UpsertRemoteWalletInput } from './remote.types';

const WALLET_COLUMNS =
  'id,user_id,name,type,opening_balance,created_at,updated_at,deleted_at';

function mapWalletRow(row: Record<string, unknown>): RemoteWalletRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    type: row.type as RemoteWalletRow['type'],
    opening_balance: Number(row.opening_balance),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: row.deleted_at as string | null,
  };
}

export class RemoteWalletRepository {
  async upsertWallet(input: UpsertRemoteWalletInput): Promise<RemoteWalletRow> {
    await assertAuthenticatedOwner(input.user_id);

    const row: UpsertRemoteWalletInput = {
      id: input.id,
      user_id: input.user_id,
      name: input.name,
      type: input.type,
      opening_balance: input.opening_balance,
      created_at: input.created_at,
      updated_at: input.updated_at,
      deleted_at: input.deleted_at,
    };

    const response = await remoteDatabase
      .from('wallets')
      .upsert(row, { onConflict: 'id' })
      .select(WALLET_COLUMNS)
      .single() as PostgrestSingleResponse<Record<string, unknown>>;

    if (response.error) {
      throwRemoteRepositoryError('upsert', 'wallet', input.id, response.error);
    }

    return mapWalletRow(response.data);
  }

  async findWalletById(userId: string, walletId: string): Promise<RemoteWalletRow | null> {
    await assertAuthenticatedOwner(userId);

    const { data, error } = await remoteDatabase
      .from('wallets')
      .select(WALLET_COLUMNS)
      .eq('user_id', userId)
      .eq('id', walletId)
      .maybeSingle();

    if (error) {
      throwRemoteRepositoryError('findById', 'wallet', walletId, error);
    }

    return data ? mapWalletRow(data as Record<string, unknown>) : null;
  }

  async findWalletsUpdatedAfter(
    userId: string,
    updatedAfter: string
  ): Promise<RemoteWalletRow[]> {
    await assertAuthenticatedOwner(userId);

    const { data, error } = await remoteDatabase
      .from('wallets')
      .select(WALLET_COLUMNS)
      .eq('user_id', userId)
      .gt('updated_at', updatedAfter)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throwRemoteRepositoryError('findUpdatedAfter', 'wallet', null, error);
    }

    return (data ?? []).map((row) => mapWalletRow(row as Record<string, unknown>));
  }
}

export const remoteWalletRepository = new RemoteWalletRepository();
