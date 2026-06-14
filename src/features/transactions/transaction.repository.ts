/**
 * Transaction Repository
 * 
 * SQLite data access layer for transactions.
 * Uses parameterized queries only (no execAsync with user input).
 * Aligned with Phase 1 SQLite schema.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { Transaction, TransactionType, TransactionWithNames } from './transaction.types';
import { getMonthRange } from '@/lib/utils/date';

export class TransactionRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Create new transaction
   */
  async create(transaction: Transaction): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO transactions (
        id, user_id, type, wallet_id, destination_wallet_id, category_id,
        amount, note, transaction_date, created_at, updated_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.user_id,
        transaction.type,
        transaction.wallet_id,
        transaction.destination_wallet_id,
        transaction.category_id,
        transaction.amount,
        transaction.note,
        transaction.transaction_date,
        transaction.created_at,
        transaction.updated_at,
        transaction.deleted_at,
        transaction.sync_status,
      ]
    );
  }

  /**
   * Update existing transaction
   */
  async update(transactionId: string, updates: Partial<Transaction>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    if (updates.wallet_id !== undefined) {
      fields.push('wallet_id = ?');
      values.push(updates.wallet_id);
    }
    if (updates.destination_wallet_id !== undefined) {
      fields.push('destination_wallet_id = ?');
      values.push(updates.destination_wallet_id);
    }
    if (updates.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(updates.category_id);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.note !== undefined) {
      fields.push('note = ?');
      values.push(updates.note);
    }
    if (updates.transaction_date !== undefined) {
      fields.push('transaction_date = ?');
      values.push(updates.transaction_date);
    }
    if (updates.updated_at !== undefined) {
      fields.push('updated_at = ?');
      values.push(updates.updated_at);
    }
    if (updates.sync_status !== undefined) {
      fields.push('sync_status = ?');
      values.push(updates.sync_status);
    }

    if (fields.length === 0) {
      return; // Nothing to update
    }

    values.push(transactionId);

    await this.db.runAsync(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Soft delete transaction
   */
  async softDelete(transactionId: string, deletedAt: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE transactions SET deleted_at = ?, sync_status = ? WHERE id = ?`,
      [deletedAt, 'pending', transactionId]
    );
  }

  /**
   * Find transaction by ID
   */
  async findById(transactionId: string): Promise<Transaction | null> {
    const result = await this.db.getFirstAsync<Transaction>(
      `SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL`,
      [transactionId]
    );
    return result || null;
  }

  /** Load the canonical transaction for sync, including soft-deleted rows. */
  async findByIdForSync(userId: string, transactionId: string): Promise<Transaction | null> {
    const result = await this.db.getFirstAsync<Transaction>(
      `SELECT * FROM transactions WHERE id = ? AND user_id = ?`,
      [transactionId, userId]
    );
    return result || null;
  }

  /**
   * Find transactions by user ID
   */
  async findByUserId(userId: string, limit?: number): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions 
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY transaction_date DESC, created_at DESC
      ${limit ? 'LIMIT ?' : ''}
    `;
    
    const params = limit ? [userId, limit] : [userId];
    return await this.db.getAllAsync<Transaction>(sql, params);
  }

  /**
   * Find transactions by user ID and month
   * Uses local timezone month boundaries from date utility
   */
  async findByUserIdAndMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<Transaction[]> {
    // Use existing date utility for local timezone month boundaries
    const { startDate, endDate } = getMonthRange(year, month);

    return await this.db.getAllAsync<Transaction>(
      `SELECT * FROM transactions 
       WHERE user_id = ? 
         AND deleted_at IS NULL 
         AND transaction_date >= ? 
         AND transaction_date < ?
       ORDER BY transaction_date DESC, created_at DESC`,
      [userId, startDate, endDate]
    );
  }

  /**
   * Find transactions by wallet ID (with user isolation)
   */
  async findByWalletId(
    userId: string,
    walletId: string,
    limit?: number
  ): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions 
      WHERE user_id = ? AND wallet_id = ? AND deleted_at IS NULL
      ORDER BY transaction_date DESC, created_at DESC
      ${limit ? 'LIMIT ?' : ''}
    `;
    
    const params = limit ? [userId, walletId, limit] : [userId, walletId];
    return await this.db.getAllAsync<Transaction>(sql, params);
  }

  /**
   * Find transactions by category ID (with user isolation)
   */
  async findByCategoryId(
    userId: string,
    categoryId: string,
    limit?: number
  ): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions 
      WHERE user_id = ? AND category_id = ? AND deleted_at IS NULL
      ORDER BY transaction_date DESC, created_at DESC
      ${limit ? 'LIMIT ?' : ''}
    `;
    
    const params = limit ? [userId, categoryId, limit] : [userId, categoryId];
    return await this.db.getAllAsync<Transaction>(sql, params);
  }

  /**
   * Find transactions by type
   */
  async findByType(
    userId: string,
    type: TransactionType,
    limit?: number
  ): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions 
      WHERE user_id = ? AND type = ? AND deleted_at IS NULL
      ORDER BY transaction_date DESC, created_at DESC
      ${limit ? 'LIMIT ?' : ''}
    `;
    
    const params = limit ? [userId, type, limit] : [userId, type];
    return await this.db.getAllAsync<Transaction>(sql, params);
  }

  /**
   * Count transactions for user
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return result?.count || 0;
  }

  /**
   * Get monthly income total
   */
  async getMonthlyIncomeTotal(
    userId: string,
    year: number,
    month: number
  ): Promise<number> {
    // Use existing date utility for local timezone month boundaries
    const { startDate, endDate } = getMonthRange(year, month);

    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE user_id = ? 
         AND type = 'income' 
         AND deleted_at IS NULL 
         AND transaction_date >= ? 
         AND transaction_date < ?`,
      [userId, startDate, endDate]
    );
    
    return result?.total || 0;
  }

  /**
   * Get monthly expense total
   */
  async getMonthlyExpenseTotal(
    userId: string,
    year: number,
    month: number
  ): Promise<number> {
    // Use existing date utility for local timezone month boundaries
    const { startDate, endDate } = getMonthRange(year, month);

    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE user_id = ? 
         AND type = 'expense' 
         AND deleted_at IS NULL 
         AND transaction_date >= ? 
         AND transaction_date < ?`,
      [userId, startDate, endDate]
    );
    
    return result?.total || 0;
  }

  /**
   * Find transactions with wallet/category names (LEFT JOIN for deleted references)
   */
  async findByUserIdWithNames(
    userId: string,
    year: number,
    month: number
  ): Promise<TransactionWithNames[]> {
    // Use existing date utility for local timezone month boundaries
    const { startDate, endDate } = getMonthRange(year, month);

    return await this.db.getAllAsync<TransactionWithNames>(
      `SELECT 
        t.*,
        w.name as wallet_name,
        dw.name as destination_wallet_name,
        c.name as category_name
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN wallets dw ON t.destination_wallet_id = dw.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? 
        AND t.deleted_at IS NULL
        AND t.transaction_date >= ? 
        AND t.transaction_date < ?
      ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [userId, startDate, endDate]
    );
  }
}

// Singleton pattern
let transactionRepositoryInstance: TransactionRepository | null = null;

export function getTransactionRepository(db: SQLiteDatabase): TransactionRepository {
  if (!transactionRepositoryInstance) {
    transactionRepositoryInstance = new TransactionRepository(db);
  }
  return transactionRepositoryInstance;
}
