import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import {
  RemoteRepositoryError,
  type RemoteRepositoryErrorCode,
} from './remote.types';

export const remoteDatabase = supabase.schema('financetracker');

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

export async function assertAuthenticatedOwner(expectedUserId: string): Promise<void> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new RemoteRepositoryError(
      'AUTH_REQUIRED',
      'Authentication is required for remote data access.'
    );
  }

  if (data.user.id !== expectedUserId) {
    throw new RemoteRepositoryError(
      'FORBIDDEN',
      'Remote data access is not allowed for this user.'
    );
  }
}

function mapErrorCode(error: SupabaseErrorLike): RemoteRepositoryErrorCode {
  if (error.code === '42501') {
    return 'RLS_DENIED';
  }

  if (error.code === '23503' || error.code === '23505' || error.code === '23514') {
    return 'CONSTRAINT_VIOLATION';
  }

  const message = error.message?.toLowerCase() ?? '';
  if (message.includes('fetch') || message.includes('network')) {
    return 'REMOTE_UNAVAILABLE';
  }

  return 'REMOTE_ERROR';
}

export function throwRemoteRepositoryError(
  operation: string,
  entity: string,
  entityId: string | null,
  error: SupabaseErrorLike
): never {
  const code = mapErrorCode(error);

  logger.warn('Remote repository operation failed', {
    operation,
    entity,
    entityId,
    code,
    providerCode: error.code ?? 'unknown',
  });

  const message = code === 'AUTH_REQUIRED'
    ? 'Authentication is required for remote data access.'
    : code === 'FORBIDDEN' || code === 'RLS_DENIED'
      ? 'Remote data access was denied.'
      : code === 'CONSTRAINT_VIOLATION'
        ? 'Remote data did not satisfy required constraints.'
        : code === 'REMOTE_UNAVAILABLE'
          ? 'Remote service is currently unavailable.'
          : 'Remote data operation failed.';

  throw new RemoteRepositoryError(code, message);
}
