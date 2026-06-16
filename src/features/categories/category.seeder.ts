/**
 * Default Category Seeder
 * 
 * Seeds default income and expense categories for new users.
 * Idempotent: Safe to run multiple times (checks each category individually).
 */

import { getDatabase } from '@/lib/db';
import { generateUUID } from '@/lib/utils/uuid';
import { getCurrentTimestamp } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import { getCategoryRepository } from './category.repository';
import { getSyncQueueRepository } from '@/features/sync/sync-queue.repository';
import type { Category, CategoryType, SeedResult } from './category.types';

/**
 * Default income categories
 */
const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'briefcase', color: '#10B981' },
  { name: 'Freelance', icon: 'laptop', color: '#10B981' },
  { name: 'Investment', icon: 'trending-up', color: '#10B981' },
  { name: 'Gift', icon: 'gift', color: '#10B981' },
  { name: 'Other Income', icon: 'plus-circle', color: '#10B981' },
];

/**
 * Default expense categories
 */
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'restaurant', color: '#EF4444' },
  { name: 'Transportation', icon: 'car', color: '#EF4444' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#EF4444' },
  { name: 'Entertainment', icon: 'film', color: '#EF4444' },
  { name: 'Bills & Utilities', icon: 'file-text', color: '#EF4444' },
  { name: 'Healthcare', icon: 'heart', color: '#EF4444' },
  { name: 'Education', icon: 'book', color: '#EF4444' },
  { name: 'Other Expense', icon: 'more-horizontal', color: '#EF4444' },
];

/**
 * Seed default categories for a user
 * 
 * Strategy: Idempotent per-category seeding
 * - Checks EACH default category individually
 * - Inserts only missing defaults
 * - Safe to call multiple times
 * - Protects against partial seeding failures
 * 
 * @param userId - User UUID
 * @returns Seed result with count of newly inserted categories
 */
export async function seedDefaultCategories(userId: string): Promise<SeedResult> {
  try {
    const db = getDatabase();
    const categoryRepo = getCategoryRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // Combine all default categories with their types
    const allDefaults = [
      ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, type: 'income' as CategoryType })),
      ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, type: 'expense' as CategoryType })),
    ];

    let insertedCount = 0;

    // Check and insert each default category individually
    for (const defaultCat of allDefaults) {
      // Check if this specific default category already exists
      const exists = await categoryRepo.defaultCategoryExists(
        userId,
        defaultCat.name,
        defaultCat.type
      );

      if (exists) {
        // Skip - already seeded
        logger.debug('Default category already exists, skipping', {
          name: defaultCat.name,
          type: defaultCat.type,
        });
        continue;
      }

      // Create missing default category
      const now = getCurrentTimestamp();
      const category: Category = {
        id: generateUUID(),
        user_id: userId,
        name: defaultCat.name,
        type: defaultCat.type,
        icon: defaultCat.icon,
        color: defaultCat.color,
        is_default: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        sync_status: 'pending',
      };

      await categoryRepo.create(category);

      // Add sync queue item for newly inserted default
      await syncQueueRepo.addSyncQueueItem({
        entity_name: 'categories',
        entity_id: category.id,
        operation: 'create',
        payload: category,
      });

      insertedCount++;
      logger.debug('Default category seeded', {
        name: defaultCat.name,
        type: defaultCat.type,
      });
    }

    logger.info('Default category seeding completed', {
      userId,
      insertedCount,
      totalDefaults: allDefaults.length,
    });

    return {
      success: true,
      insertedCount,
      totalDefaults: allDefaults.length,
    };
  } catch (error) {
    logger.error('Failed to seed default categories', error);
    return {
      success: false,
      error: 'Failed to seed default categories. Please try again.',
    };
  }
}
