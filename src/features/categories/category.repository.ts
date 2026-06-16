/**
 * Category Repository
 * 
 * Data access layer for category operations.
 * All methods use parameterized queries for SQL injection safety.
 * Aligned with Phase 1 SQLite schema.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { logger } from '@/lib/utils/logger';
import type { Category, CategoryType } from './category.types';

/**
 * Category Repository
 * 
 * Handles all SQLite operations for categories.
 * Only uses columns that exist in Phase 1 schema.
 */
export class CategoryRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Create category record in SQLite
   * 
   * @param category - Complete category record
   */
  async create(category: Category): Promise<void> {
    try {
      await this.db.runAsync(
        `INSERT INTO categories (
          id, user_id, name, type, icon, color, is_default,
          created_at, updated_at, deleted_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          category.id,
          category.user_id,
          category.name,
          category.type,
          category.icon,
          category.color,
          category.is_default ? 1 : 0,
          category.created_at,
          category.updated_at,
          category.deleted_at,
          category.sync_status,
        ]
      );

      logger.debug('Category created in SQLite', { categoryId: category.id, name: category.name });
    } catch (error) {
      logger.error('Failed to create category in SQLite', error);
      throw new Error('Failed to save category to local database');
    }
  }

  /**
   * Update category record in SQLite
   * 
   * @param categoryId - Category UUID
   * @param updates - Fields to update
   */
  async update(
    categoryId: string,
    updates: {
      name?: string;
      icon?: string | null;
      color?: string | null;
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
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.sync_status !== undefined) {
      fields.push('sync_status = ?');
      values.push(updates.sync_status);
    }

    // Always update updated_at
    fields.push('updated_at = ?');
    values.push(updates.updated_at);

    // Add categoryId to WHERE clause
    values.push(categoryId);

    try {
      await this.db.runAsync(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
        values
      );

      logger.debug('Category updated in SQLite', { categoryId });
    } catch (error) {
      logger.error('Failed to update category in SQLite', error);
      throw new Error('Failed to update category in local database');
    }
  }

  /**
   * Soft delete category
   * 
   * @param categoryId - Category UUID
   * @param deletedAt - Deletion timestamp (ISO)
   */
  async softDelete(categoryId: string, deletedAt: string): Promise<void> {
    try {
      await this.db.runAsync(
        `UPDATE categories 
         SET deleted_at = ?, sync_status = 'pending', updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [deletedAt, deletedAt, categoryId]
      );

      logger.debug('Category soft deleted in SQLite', { categoryId });
    } catch (error) {
      logger.error('Failed to soft delete category in SQLite', error);
      throw new Error('Failed to delete category from local database');
    }
  }

  /**
   * Find category by ID
   * 
   * @param categoryId - Category UUID
   * @returns Category or null if not found
   */
  async findById(categoryId: string): Promise<Category | null> {
    try {
      const row = await this.db.getFirstAsync<any>(
        `SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL`,
        [categoryId]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToCategory(row);
    } catch (error) {
      logger.error('Failed to find category by ID', error);
      throw new Error('Failed to retrieve category from local database');
    }
  }

  /** Load the canonical category for sync, including soft-deleted rows. */
  async findByIdForSync(userId: string, categoryId: string): Promise<Category | null> {
    try {
      const row = await this.db.getFirstAsync<any>(
        `SELECT * FROM categories WHERE id = ? AND user_id = ?`,
        [categoryId, userId]
      );

      return row ? this.mapRowToCategory(row) : null;
    } catch (error) {
      logger.error('Failed to find category for sync', error);
      throw new Error('Failed to retrieve category for sync');
    }
  }

  /** Apply an RLS-scoped remote category, including soft-delete tombstones. */
  async applyRemoteCategory(category: Omit<Category, 'sync_status'>): Promise<void> {
    try {
      await this.db.runAsync(
        `INSERT INTO categories (
          id, user_id, name, type, icon, color, is_default,
          created_at, updated_at, deleted_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          name = excluded.name,
          type = excluded.type,
          icon = excluded.icon,
          color = excluded.color,
          is_default = excluded.is_default,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          sync_status = 'synced'`,
        [
          category.id,
          category.user_id,
          category.name,
          category.type,
          category.icon,
          category.color,
          category.is_default ? 1 : 0,
          category.created_at,
          category.updated_at,
          category.deleted_at,
        ]
      );
    } catch (error) {
      logger.error('Failed to apply remote category to SQLite', error);
      throw new Error('Failed to apply remote category locally');
    }
  }

  async markSyncedIfUnchanged(
    userId: string,
    categoryId: string,
    expectedUpdatedAt: string
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE categories
       SET sync_status = 'synced'
       WHERE id = ? AND user_id = ? AND updated_at = ?`,
      [categoryId, userId, expectedUpdatedAt]
    );
  }

  /**
   * Find categories for a user (optionally filtered by type)
   * 
   * @param userId - User UUID
   * @param type - Optional category type filter
   * @returns Array of categories (defaults first, then by name)
   */
  async findByUserId(userId: string, type?: CategoryType): Promise<Category[]> {
    try {
      let query: string;
      let params: any[];

      if (type) {
        query = `SELECT * FROM categories 
                 WHERE user_id = ? AND type = ? AND deleted_at IS NULL 
                 ORDER BY is_default DESC, name ASC`;
        params = [userId, type];
      } else {
        query = `SELECT * FROM categories 
                 WHERE user_id = ? AND deleted_at IS NULL 
                 ORDER BY type ASC, is_default DESC, name ASC`;
        params = [userId];
      }

      const rows = await this.db.getAllAsync<any>(query, params);

      return rows.map((row) => this.mapRowToCategory(row));
    } catch (error) {
      logger.error('Failed to find categories by user ID', error);
      throw new Error('Failed to retrieve categories from local database');
    }
  }

  /**
   * Find default categories for a user
   * 
   * @param userId - User UUID
   * @returns Array of default categories
   */
  async findDefaultCategories(userId: string): Promise<Category[]> {
    try {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM categories 
         WHERE user_id = ? AND is_default = 1 AND deleted_at IS NULL 
         ORDER BY type ASC, name ASC`,
        [userId]
      );

      return rows.map((row) => this.mapRowToCategory(row));
    } catch (error) {
      logger.error('Failed to find default categories', error);
      throw new Error('Failed to retrieve default categories from local database');
    }
  }

  /**
   * Count categories for a user
   * 
   * @param userId - User UUID
   * @returns Total category count
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND deleted_at IS NULL`,
        [userId]
      );

      return row?.count ?? 0;
    } catch (error) {
      logger.error('Failed to count categories by user ID', error);
      throw new Error('Failed to count categories in local database');
    }
  }

  /**
   * Check if a category with the same name and type already exists for user
   * 
   * @param userId - User UUID
   * @param name - Category name
   * @param type - Category type
   * @returns True if category exists
   */
  async categoryExists(userId: string, name: string, type: CategoryType): Promise<boolean> {
    try {
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM categories 
         WHERE user_id = ? AND name = ? AND type = ? AND deleted_at IS NULL`,
        [userId, name, type]
      );

      return (row?.count ?? 0) > 0;
    } catch (error) {
      logger.error('Failed to check if category exists', error);
      throw new Error('Failed to check category existence in local database');
    }
  }

  /**
   * Check if a default category with the same name and type already exists for user
   * Used by seeder to ensure idempotent seeding
   * 
   * @param userId - User UUID
   * @param name - Category name
   * @param type - Category type
   * @returns True if default category exists
   */
  async defaultCategoryExists(userId: string, name: string, type: CategoryType): Promise<boolean> {
    try {
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM categories 
         WHERE user_id = ? AND name = ? AND type = ? AND is_default = 1 AND deleted_at IS NULL`,
        [userId, name, type]
      );

      return (row?.count ?? 0) > 0;
    } catch (error) {
      logger.error('Failed to check if default category exists', error);
      throw new Error('Failed to check default category existence in local database');
    }
  }

  /**
   * Map SQLite row to Category object
   * 
   * @param row - SQLite row
   * @returns Category object
   */
  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      icon: row.icon,
      color: row.color,
      is_default: row.is_default === 1,
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
let categoryRepositoryInstance: CategoryRepository | null = null;

/**
 * Get or create category repository instance
 * 
 * @param db - SQLite database instance
 * @returns CategoryRepository singleton
 */
export function getCategoryRepository(db: SQLiteDatabase): CategoryRepository {
  if (!categoryRepositoryInstance) {
    categoryRepositoryInstance = new CategoryRepository(db);
  }
  return categoryRepositoryInstance;
}
