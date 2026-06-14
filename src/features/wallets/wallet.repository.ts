/**
 * Wallet Repository
 * 
 * Data access layer for wallet operations.
 * All methods use parameterized queries for SQL injection safety.
 * Aligned with Phase 1 SQLite schema.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { logger } from '@/lib/utils/logger';
import type { Wallet } from './wallet.types';

/**
 * Wallet Repository
 * 
 * Handles all SQLite operations for wallets.
 * Only uses columns that exist in Phase 1 schema.
 */
export class WalletRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Create wallet record in SQLite
   * 
   * @param wallet - Complete wallet record
   */
  async create(wallet: Wallet): Promise<void> {
    try {
      await this.db.runAsync(
        `INSERT INTO wallets (
          id, user_id, name, type, opening_balance,
          created_at, updated_at, deleted_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wallet.id,
          wallet.user_id,
          wallet.name,
          wallet.type,
          wallet.opening_balance,
          wallet.created_at,
          wallet.updated_at,
          wallet.deleted_at,
          wallet.sync_status,
        ]
      );

      logger.debug('Wallet created in SQLite', { walletId: wallet.id, name: wallet.name });
    } catch (error) {
      logger.error('Failed to create wallet in SQLite', error);
      throw new Error('Failed to save wallet to local database');
    }
  }

  /**
   * Update wallet record in SQLite
   * 
   * @param walletId - Wallet UUID
   * @param updates - Fields to update
   */
  async update(
    walletId: string,
    updates: {
      name?: string;
      type?: string;
      sync_status?: string;
      updated_at: string;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.sync_status !== undefined) {
      fields.push('sync_status = ?');
      values.push(updates.sync_status);
    }

    // Always update updated_at
    fields.push('updated_at = ?');
    values.push(updates.updated_at);

    // Add walletId to WHERE clause
    values.push(walletId);

    try {
      await this.db.runAsync(
        `UPDATE wallets SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
        values
      );

      logger.debug('Wallet updated in SQLite', { walletId });
    } catch (error) {
      logger.error('Failed to update wallet in SQLite', error);
      throw new Error('Failed to update wallet in local database');
    }
  }

  /**
   * Soft delete wallet
   * 
   * @param walletId - Wallet UUID
   * @param deletedAt - Deletion timestamp (ISO)
   */
  async softDelete(walletId: string, deletedAt: string): Promise<void> {
    try {
      await this.db.runAsync(
        `UPDATE wallets 
         SET deleted_at = ?, sync_status = 'pending', updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [deletedAt, deletedAt, walletId]
      );

      logger.debug('Wallet soft deleted in SQLite', { walletId });
    } catch (error) {
      logger.error('Failed to soft delete wallet in SQLite', error);
      throw new Error('Failed to delete wallet from local database');
    }
  }

  /**
   * Find wallet by ID
   * 
   * @param walletId - Wallet UUID
   * @returns Wallet or null if not found
   */
  async findById(walletId: string): Promise<Wallet | null> {
    try {
      const row = await this.db.getFirstAsync<any>(
        `SELECT * FROM wallets WHERE id = ? AND deleted_at IS NULL`,
        [walletId]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToWallet(row);
    } catch (error) {
      logger.error('Failed to find wallet by ID', error);
      throw new Error('Failed to retrieve wallet from local database');
    }
  }

  /** Load the canonical wallet for sync, including soft-deleted rows. */
  async findByIdForSync(userId: string, walletId: string): Promise<Wallet | null> {
    try {
      const row = await this.db.getFirstAsync<any>(
        `SELECT * FROM wallets WHERE id = ? AND user_id = ?`,
        [walletId, userId]
      );

      return row ? this.mapRowToWallet(row) : null;
    } catch (error) {
      logger.error('Failed to find wallet for sync', error);
      throw new Error('Failed to retrieve wallet for sync');
    }
  }

  /** Apply an RLS-scoped remote wallet, including soft-delete tombstones. */
  async applyRemoteWallet(wallet: Omit<Wallet, 'sync_status'>): Promise<void> {
    try {
      await this.db.runAsync(
        `INSERT INTO wallets (
          id, user_id, name, type, opening_balance,
          created_at, updated_at, deleted_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          name = excluded.name,
          type = excluded.type,
          opening_balance = excluded.opening_balance,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          sync_status = 'synced'`,
        [
          wallet.id,
          wallet.user_id,
          wallet.name,
          wallet.type,
          wallet.opening_balance,
          wallet.created_at,
          wallet.updated_at,
          wallet.deleted_at,
        ]
      );
    } catch (error) {
      logger.error('Failed to apply remote wallet to SQLite', error);
      throw new Error('Failed to apply remote wallet locally');
    }
  }

  async markSyncedIfUnchanged(
    userId: string,
    walletId: string,
    expectedUpdatedAt: string
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE wallets
       SET sync_status = 'synced'
       WHERE id = ? AND user_id = ? AND updated_at = ?`,
      [walletId, userId, expectedUpdatedAt]
    );
  }

  /**
   * Find all wallets for a user
   * 
   * @param userId - User UUID
   * @returns Array of wallets
   */
  async findByUserId(userId: string): Promise<Wallet[]> {
    try {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM wallets WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
        [userId]
      );

      return rows.map((row) => this.mapRowToWallet(row));
    } catch (error) {
      logger.error('Failed to find wallets by user ID', error);
      throw new Error('Failed to retrieve wallets from local database');
    }
  }

  /**
   * Count wallets for a user
   * 
   * @param userId - User UUID
   * @returns Total wallet count
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM wallets WHERE user_id = ? AND deleted_at IS NULL`,
        [userId]
      );

      return row?.count ?? 0;
    } catch (error) {
      logger.error('Failed to count wallets by user ID', error);
      throw new Error('Failed to count wallets in local database');
    }
  }

  /**
   * Map SQLite row to Wallet object
   * 
   * @param row - SQLite row
   * @returns Wallet object
   */
  private mapRowToWallet(row: any): Wallet {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      opening_balance: row.opening_balance,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      sync_status: row.sync_status,
    };
  }
}

/**
 * Singleton instance
 * Initialized lazily when first requested
 */
let walletRepositoryInstance: WalletRepository | null = null;

/**
 * Get or create wallet repository instance
 * 
 * @param db - SQLite database instance
 * @returns WalletRepository singleton
 */
export function getWalletRepository(db: SQLiteDatabase): WalletRepository {
  if (!walletRepositoryInstance) {
    walletRepositoryInstance = new WalletRepository(db);
  }
  return walletRepositoryInstance;
}
