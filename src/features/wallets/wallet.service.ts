/**
 * Wallet Service
 * 
 * Business logic for wallet management.
 * Orchestrates repository, validation, and sync queue operations.
 * Aligned with Phase 1 SQLite schema.
 * 
 * IMPORTANT: Service methods receive userId as parameter.
 * Do NOT use useAuth() hook in service layer (React hooks are for components only).
 */

import { getDatabase } from '@/lib/db';
import { generateUUID } from '@/lib/utils/uuid';
import { getCurrentTimestamp } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import { getWalletRepository } from './wallet.repository';
import { getSyncQueueRepository } from '@/features/sync/sync-queue.repository';
import { validateCreateWalletInput, validateUpdateWalletInput } from './wallet.validation';
import type {
  Wallet,
  CreateWalletInput,
  UpdateWalletInput,
  WalletResult,
} from './wallet.types';

/**
 * Create new wallet
 * 
 * Flow:
 * 1. Validate input
 * 2. Generate UUID
 * 3. Save to local SQLite first
 * 4. Add sync queue item
 * 5. Return result to UI
 * 
 * @param userId - Current user ID
 * @param input - Wallet creation input
 * @returns Result with wallet data or error
 */
export async function createWallet(
  userId: string,
  input: CreateWalletInput
): Promise<WalletResult<Wallet>> {
  try {
    // Validate input
    const validation = validateCreateWalletInput(input);
    if (!validation.valid) {
      const errorMessage = validation.errors.map((e) => e.message).join(', ');
      logger.warn('Wallet creation validation failed', { errors: validation.errors });
      return { success: false, error: errorMessage };
    }

    // Generate UUID and timestamps
    const now = getCurrentTimestamp();
    const walletId = generateUUID();

    // Build wallet record
    const wallet: Wallet = {
      id: walletId,
      user_id: userId,
      name: input.name.trim(),
      type: input.type,
      opening_balance: input.opening_balance,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'pending',
    };

    // Get database and repositories
    const db = getDatabase();
    const walletRepo = getWalletRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // Save to local SQLite first
    await walletRepo.create(wallet);

    // Add sync queue item
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'wallets',
      entity_id: walletId,
      operation: 'create',
      payload: wallet,
    });

    logger.info('Wallet created successfully', { walletId, name: wallet.name });

    return { success: true, data: wallet };
  } catch (error) {
    logger.error('Failed to create wallet', error);
    return { success: false, error: 'Failed to create wallet. Please try again.' };
  }
}

/**
 * Update existing wallet
 * 
 * Note: opening_balance is NOT editable after creation.
 * 
 * Flow:
 * 1. Validate input
 * 2. Check wallet exists and belongs to user
 * 3. Update in local SQLite
 * 4. Add sync queue item
 * 5. Return updated wallet
 * 
 * @param userId - Current user ID
 * @param walletId - Wallet UUID to update
 * @param input - Wallet update input
 * @returns Result with updated wallet or error
 */
export async function updateWallet(
  userId: string,
  walletId: string,
  input: UpdateWalletInput
): Promise<WalletResult<Wallet>> {
  try {
    // Validate input
    const validation = validateUpdateWalletInput(input);
    if (!validation.valid) {
      const errorMessage = validation.errors.map((e) => e.message).join(', ');
      logger.warn('Wallet update validation failed', { errors: validation.errors });
      return { success: false, error: errorMessage };
    }

    // Get database and repositories
    const db = getDatabase();
    const walletRepo = getWalletRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // Check wallet exists and belongs to user
    const existingWallet = await walletRepo.findById(walletId);
    if (!existingWallet) {
      logger.warn('Wallet not found for update', { walletId });
      return { success: false, error: 'Wallet not found' };
    }

    if (existingWallet.user_id !== userId) {
      logger.warn('User attempted to update wallet belonging to another user', {
        walletId,
        userId,
        ownerId: existingWallet.user_id,
      });
      return { success: false, error: 'Wallet not found' };
    }

    // Prepare update payload
    const now = getCurrentTimestamp();
    const updates: any = {
      ...input,
      sync_status: 'pending',
      updated_at: now,
    };

    // Trim name if provided
    if (updates.name) {
      updates.name = updates.name.trim();
    }

    // Update in local SQLite
    await walletRepo.update(walletId, updates);

    // Get updated wallet
    const updatedWallet = await walletRepo.findById(walletId);
    if (!updatedWallet) {
      throw new Error('Failed to retrieve updated wallet');
    }

    // Add sync queue item
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'wallets',
      entity_id: walletId,
      operation: 'update',
      payload: updatedWallet,
    });

    logger.info('Wallet updated successfully', { walletId, name: updatedWallet.name });

    return { success: true, data: updatedWallet };
  } catch (error) {
    logger.error('Failed to update wallet', error);
    return { success: false, error: 'Failed to update wallet. Please try again.' };
  }
}

/**
 * Delete wallet (soft delete)
 * 
 * Flow:
 * 1. Check wallet exists and belongs to user
 * 2. Soft delete in local SQLite
 * 3. Add sync queue item
 * 4. Return success
 * 
 * @param userId - Current user ID
 * @param walletId - Wallet UUID to delete
 * @returns Result with success or error
 */
export async function deleteWallet(
  userId: string,
  walletId: string
): Promise<WalletResult> {
  try {
    // Get database and repositories
    const db = getDatabase();
    const walletRepo = getWalletRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // Check wallet exists and belongs to user
    const existingWallet = await walletRepo.findById(walletId);
    if (!existingWallet) {
      logger.warn('Wallet not found for delete', { walletId });
      return { success: false, error: 'Wallet not found' };
    }

    if (existingWallet.user_id !== userId) {
      logger.warn('User attempted to delete wallet belonging to another user', {
        walletId,
        userId,
        ownerId: existingWallet.user_id,
      });
      return { success: false, error: 'Wallet not found' };
    }

    // Soft delete
    const now = getCurrentTimestamp();
    await walletRepo.softDelete(walletId, now);

    // Add sync queue item
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'wallets',
      entity_id: walletId,
      operation: 'delete',
      payload: { id: walletId, deleted_at: now },
    });

    logger.info('Wallet deleted successfully', { walletId, name: existingWallet.name });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete wallet', error);
    return { success: false, error: 'Failed to delete wallet. Please try again.' };
  }
}

/**
 * Get all wallets for current user
 * 
 * @param userId - Current user ID
 * @returns Result with wallets array or error
 */
export async function getWallets(
  userId: string
): Promise<WalletResult<Wallet[]>> {
  try {
    const db = getDatabase();
    const walletRepo = getWalletRepository(db);

    const wallets = await walletRepo.findByUserId(userId);

    logger.debug('Wallets retrieved', { userId, count: wallets.length });

    return { success: true, data: wallets };
  } catch (error) {
    logger.error('Failed to retrieve wallets', error);
    return { success: false, error: 'Failed to load wallets. Please try again.' };
  }
}

/**
 * Get wallet by ID
 * 
 * @param userId - Current user ID
 * @param walletId - Wallet UUID
 * @returns Result with wallet or error
 */
export async function getWalletById(
  userId: string,
  walletId: string
): Promise<WalletResult<Wallet>> {
  try {
    const db = getDatabase();
    const walletRepo = getWalletRepository(db);

    const wallet = await walletRepo.findById(walletId);

    if (!wallet) {
      logger.warn('Wallet not found', { walletId });
      return { success: false, error: 'Wallet not found' };
    }

    // Check ownership
    if (wallet.user_id !== userId) {
      logger.warn('User attempted to access wallet belonging to another user', {
        walletId,
        userId,
        ownerId: wallet.user_id,
      });
      return { success: false, error: 'Wallet not found' };
    }

    logger.debug('Wallet retrieved', { walletId, name: wallet.name });

    return { success: true, data: wallet };
  } catch (error) {
    logger.error('Failed to retrieve wallet', error);
    return { success: false, error: 'Failed to load wallet. Please try again.' };
  }
}

/**
 * Get wallet count for current user
 * 
 * @param userId - Current user ID
 * @returns Result with count or error
 */
export async function getWalletCount(userId: string): Promise<WalletResult<number>> {
  try {
    const db = getDatabase();
    const walletRepo = getWalletRepository(db);

    const count = await walletRepo.countByUserId(userId);

    logger.debug('Wallet count retrieved', { userId, count });

    return { success: true, data: count };
  } catch (error) {
    logger.error('Failed to count wallets', error);
    return { success: false, error: 'Failed to count wallets. Please try again.' };
  }
}
