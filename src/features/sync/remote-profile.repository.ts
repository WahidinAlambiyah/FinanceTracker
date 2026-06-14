import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import {
  assertAuthenticatedOwner,
  remoteDatabase,
  throwRemoteRepositoryError,
} from './remote.repository-utils';
import type { RemoteProfileRow, UpsertRemoteProfileInput } from './remote.types';

const PROFILE_COLUMNS = 'id,email,display_name,created_at,updated_at,deleted_at';

function mapProfileRow(row: Record<string, unknown>): RemoteProfileRow {
  return {
    id: row.id as string,
    email: row.email as string,
    display_name: row.display_name as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: row.deleted_at as string | null,
  };
}

export class RemoteProfileRepository {
  async upsertProfile(input: UpsertRemoteProfileInput): Promise<RemoteProfileRow> {
    await assertAuthenticatedOwner(input.id);

    const row: UpsertRemoteProfileInput = {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      created_at: input.created_at,
      updated_at: input.updated_at,
      deleted_at: input.deleted_at,
    };

    const response = await remoteDatabase
      .from('profiles')
      .upsert(row, { onConflict: 'id' })
      .select(PROFILE_COLUMNS)
      .single() as PostgrestSingleResponse<Record<string, unknown>>;

    if (response.error) {
      throwRemoteRepositoryError('upsert', 'profile', input.id, response.error);
    }

    return mapProfileRow(response.data);
  }

  async findProfileById(userId: string): Promise<RemoteProfileRow | null> {
    await assertAuthenticatedOwner(userId);

    const { data, error } = await remoteDatabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throwRemoteRepositoryError('findById', 'profile', userId, error);
    }

    return data ? mapProfileRow(data as Record<string, unknown>) : null;
  }
}

export const remoteProfileRepository = new RemoteProfileRepository();
