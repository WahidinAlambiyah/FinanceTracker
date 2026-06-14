import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import {
  assertAuthenticatedOwner,
  remoteDatabase,
  throwRemoteRepositoryError,
} from './remote.repository-utils';
import type { RemoteCategoryRow, UpsertRemoteCategoryInput } from './remote.types';

const CATEGORY_COLUMNS =
  'id,user_id,name,type,icon,color,is_default,created_at,updated_at,deleted_at';

function mapCategoryRow(row: Record<string, unknown>): RemoteCategoryRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    type: row.type as RemoteCategoryRow['type'],
    icon: row.icon as string | null,
    color: row.color as string | null,
    is_default: row.is_default as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: row.deleted_at as string | null,
  };
}

export class RemoteCategoryRepository {
  async upsertCategory(input: UpsertRemoteCategoryInput): Promise<RemoteCategoryRow> {
    await assertAuthenticatedOwner(input.user_id);

    const row: UpsertRemoteCategoryInput = {
      id: input.id,
      user_id: input.user_id,
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color,
      is_default: input.is_default,
      created_at: input.created_at,
      updated_at: input.updated_at,
      deleted_at: input.deleted_at,
    };

    const response = await remoteDatabase
      .from('categories')
      .upsert(row, { onConflict: 'id' })
      .select(CATEGORY_COLUMNS)
      .single() as PostgrestSingleResponse<Record<string, unknown>>;

    if (response.error) {
      throwRemoteRepositoryError('upsert', 'category', input.id, response.error);
    }

    return mapCategoryRow(response.data);
  }

  async findCategoryById(
    userId: string,
    categoryId: string
  ): Promise<RemoteCategoryRow | null> {
    await assertAuthenticatedOwner(userId);

    const { data, error } = await remoteDatabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('user_id', userId)
      .eq('id', categoryId)
      .maybeSingle();

    if (error) {
      throwRemoteRepositoryError('findById', 'category', categoryId, error);
    }

    return data ? mapCategoryRow(data as Record<string, unknown>) : null;
  }

  async findCategoriesUpdatedAfter(
    userId: string,
    updatedAfter: string
  ): Promise<RemoteCategoryRow[]> {
    await assertAuthenticatedOwner(userId);

    const { data, error } = await remoteDatabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('user_id', userId)
      .gt('updated_at', updatedAfter)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throwRemoteRepositoryError('findUpdatedAfter', 'category', null, error);
    }

    return (data ?? []).map((row) => mapCategoryRow(row as Record<string, unknown>));
  }
}

export const remoteCategoryRepository = new RemoteCategoryRepository();
