/**
 * Wallet Repository
 * 
 * Data access layer for wallet operations.
 * All methods use parameterized queries for SQL injection safety.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { logger } from '@/lib/utils/logger';
import type { Wallet } from './wallet.types';

/**
 * Wallet Repository
 * 
 * Handles all SQLite operations for wallets.
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
          id, user_id, name, type, balance, opening_balance,
          currency, icon, color, notes, is_active,
          sync_status, last_synced_at, deleted_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wallet.id,
          wallet.user_id,
          wallet.name,
          wallet.type,
          wallet.balance,
          wallet.opening_balance,
          wallet.currency,
          wallet.icon,
          wallet.color,
          wallet.notes,
          wallet.is_active ? 1 : 0,
          wallet.sync_status,
          wallet.last_synced_at,
          wallet.deleted_at,
          wallet.created_at,
          wallet.updated_at,
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
      currency?: string;
      icon?: string | null;
      color?: string | null;
      notes?: string | null;
      is_active?: boolean;
      sync_status?: string;
      last_synced_at?: string | null;
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
    if (updates.currency !== undefined) {
      fields.push('currency = ?');
      values.push(updates.currency);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }
    if (updates.sync_status !== undefined) {
      fields.push('sync_status = ?');
      values.push(updates.sync_status);
    }
    if (updates.last_synced_at !== undefined) {
      fields.push('last_synced_at = ?');
      values.push(updates.last_synced_at);
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

  /**
   * Find all wallets for a user
   * 
   * @param userId - User UUID
   * @param includeInactive - Include inactive wallets (default: false)
   * @returns Array of wallets
   */
  async findByUserId(userId: string, includeInactive: boolean = false): Promise<Wallet[]> {
    try {
      const query = includeInactive
        ? `SELECT * FROM wallets WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`
        : `SELECT * FROM wallets WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY created_at DESC`;

      const rows = await this.db.getAllAsync<any>(query, [userId]);

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
      balance: row.balance,
      opening_balance: row.opening_balance,
      currency: row.currency,
      icon: row.icon,
      color: row.color,
      notes: row.notes,
      is_active: row.is_active === 1,
      sync_status: row.sync_status,
      last_synced_at: row.last_synced_at,
      deleted_at: row.deleted_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
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
