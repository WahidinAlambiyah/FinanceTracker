/**
 * Reports Repository
 * 
 * Queries for financial reports and category breakdowns.
 * Uses local SQLite data only.
 * 
 * IMPORTANT: Transfer transactions are excluded from category breakdowns.
 * Category breakdown includes income/expense categories ONLY.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { getMonthRange } from '@/lib/utils/date';
import type { CategoryBreakdown } from './reports.types';

let reportsRepositoryInstance: ReportsRepository | null = null;

class ReportsRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Get expense breakdown by category for a month
   * 
   * Returns categories with total spent and transaction count.
   * Excludes transfer transactions (no category_id).
   * Sorted by total amount (highest first).
   */
  async getExpenseByCategory(
    userId: string,
    year: number,
    month: number
  ): Promise<CategoryBreakdown[]> {
    const { startDate, endDate } = getMonthRange(year, month);

    const results = await this.db.getAllAsync<{
      category_id: string;
      category_name: string;
      category_color: string | null;
      total: number;
      count: number;
    }>(
      `SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(t.amount), 0) as total,
        COUNT(t.id) as count
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id 
        AND t.type = 'expense'
        AND t.user_id = ?
        AND t.deleted_at IS NULL
        AND t.transaction_date >= ?
        AND t.transaction_date < ?
      WHERE c.user_id = ? 
        AND c.type = 'expense'
        AND c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.color
      HAVING total > 0
      ORDER BY total DESC`,
      [userId, startDate, endDate, userId]
    );

    // Calculate total expense for percentage
    const totalExpense = results.reduce((sum, item) => sum + item.total, 0);

    return results.map((item) => ({
      ...item,
      percentage: totalExpense > 0 ? (item.total / totalExpense) * 100 : 0,
    }));
  }

  /**
   * Get income breakdown by category for a month
   * 
   * Returns categories with total earned and transaction count.
   * Excludes transfer transactions (no category_id).
   * Sorted by total amount (highest first).
   */
  async getIncomeByCategory(
    userId: string,
    year: number,
    month: number
  ): Promise<CategoryBreakdown[]> {
    const { startDate, endDate } = getMonthRange(year, month);

    const results = await this.db.getAllAsync<{
      category_id: string;
      category_name: string;
      category_color: string | null;
      total: number;
      count: number;
    }>(
      `SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(t.amount), 0) as total,
        COUNT(t.id) as count
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id 
        AND t.type = 'income'
        AND t.user_id = ?
        AND t.deleted_at IS NULL
        AND t.transaction_date >= ?
        AND t.transaction_date < ?
      WHERE c.user_id = ? 
        AND c.type = 'income'
        AND c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.color
      HAVING total > 0
      ORDER BY total DESC`,
      [userId, startDate, endDate, userId]
    );

    // Calculate total income for percentage
    const totalIncome = results.reduce((sum, item) => sum + item.total, 0);

    return results.map((item) => ({
      ...item,
      percentage: totalIncome > 0 ? (item.total / totalIncome) * 100 : 0,
    }));
  }
}

/**
 * Get reports repository singleton instance
 */
export function getReportsRepository(db: SQLiteDatabase): ReportsRepository {
  if (!reportsRepositoryInstance) {
    reportsRepositoryInstance = new ReportsRepository(db);
  }
  return reportsRepositoryInstance;
}
