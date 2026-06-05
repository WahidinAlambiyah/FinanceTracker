/**
 * Category Service
 * 
 * Business logic for category management.
 * Orchestrates repository, validation, seeder, and sync queue operations.
 * Aligned with Phase 1 SQLite schema.
 * 
 * IMPORTANT: Service methods receive userId as parameter.
 * Do NOT use useAuth() hook in service layer (React hooks are for components only).
 */

import { getDatabase } from '@/lib/db';
import { generateUUID } from '@/lib/utils/uuid';
import { getCurrentTimestamp } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import { getCategoryRepository } from './category.repository';
import { getSyncQueueRepository } from '@/features/sync/sync-queue.repository';
import { validateCreateCategoryInput, validateUpdateCategoryInput } from './category.validation';
import { seedDefaultCategories as runSeeder } from './category.seeder';
import type {
  Category,
  CategoryType,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryResult,
  SeedResult,
} from './category.types';

/**
 * Create new category
 * 
 * Flow:
 * 1. Validate input
 * 2. Check duplicate (same name + type for user)
 * 3. Generate UUID
 * 4. Save to local SQLite first
 * 5. Add sync queue item
 * 6. Return result to UI
 * 
 * @param userId - Current user ID
 * @param input - Category creation input
 * @returns Result with category data or error
 */
export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<CategoryResult<Category>> {
  try {
    // Validate input
    const validation = validateCreateCategoryInput(input);
    if (!validation.valid) {
      const errorMessage = validation.errors.map((e) => e.message).join(', ');
      logger.warn('Category creation validation failed', { errors: validation.errors });
      return { success: false, error: errorMessage };
    }

    // Get database and repositories
    const db = getDatabase();
    const categoryRepo = getCategoryRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // Check duplicate
    const exists = await categoryRepo.categoryExists(userId, input.name.trim(), input.type);
    if (exists) {
      logger.warn('Category with same name and type already exists', {
        userId,
        name: input.name,
        type: input.type,
      });
      return {
        success: false,
        error: 'Category with this name already exists for this type',
      };
    }

    // Generate UUID and timestamps
    const now = getCurrentTimestamp();
    const categoryId = generateUUID();

    // Build category record (user-created categories are NOT default)
    const category: Category = {
      id: categoryId,
      user_id: userId,
      name: input.name.trim(),
      type: input.type,
      icon: input.icon ?? null,
      color: input.color ?? null,
      is_default: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'pending',
    };

    // Save to local SQLite first
    await categoryRepo.create(category);

    // Add sync queue item
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'categories',
      entity_id: categoryId,
      operation: 'create',
      payload: category,
    });

    logger.info('Category created successfully', { categoryId, name: category.name });

    return { success: true, data: category };
  } catch (error) {
    logger.error('Failed to create category', error);
    return { success: false, error: 'Failed to create category. Please try again.' };
  }
}

/**
 * Update existing category
 * 
 * Note: type is NOT editable after creation
 * Note: is_default is NOT editable by user
 * 
 * Flow:
 * 1. Validate input
 * 2. Check category exists and belongs to user
 * 3. Check duplicate if name changed
 * 4. Update in local SQLite
 * 5. Add sync queue item
 * 6. Return updated category
 * 
 * @param userId - Current user ID
 * @param categoryId - Category UUID to update
 * @param input - Category update input
 * @returns Result with updated category or error
 */
export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<CategoryResult<Category>> {
  try {
    // Validate input
    const validation = validateUpdateCategoryInput(input);
    if (!validation.valid) {
      const errorMessage = validation.errors.map((e) => e.message).join(', ');
      logger.warn('Category update validation failed', { errors: validation.errors });
      return { success: false, error: errorMessage };
    }

    // Get database and repositories
    const db = getDatabase();
    const categoryRepo = getCategoryRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // Check category exists and belongs to user
    const existingCategory = await categoryRepo.findById(categoryId);
    if (!existingCategory) {
      logger.warn('Category not found for update', { categoryId });
      return { success: false, error: 'Category not found' };
    }

    if (existingCategory.user_id !== userId) {
      logger.warn('User attempted to update category belonging to another user', {
        categoryId,
        userId,
        ownerId: existingCategory.user_id,
      });
      return { success: false, error: 'Category not found' };
    }

    // Check duplicate if name changed
    if (input.name && input.name.trim() !== existingCategory.name) {
      const exists = await categoryRepo.categoryExists(userId, input.name.trim(), existingCategory.type);
      if (exists) {
        logger.warn('Category with same name and type already exists', {
          userId,
          name: input.name,
          type: existingCategory.type,
        });
        return {
          success: false,
          error: 'Category with this name already exists for this type',
        };
      }
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
    await categoryRepo.update(categoryId, updates);

    // Get updated category
    const updatedCategory = await categoryRepo.findById(categoryId);
    if (!updatedCategory) {
      throw new Error('Failed to retrieve updated category');
    }

    // Add sync queue item
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'categories',
      entity_id: categoryId,
      operation: 'update',
      payload: updatedCategory,
    });

    logger.info('Category updated successfully', { categoryId, name: updatedCategory.name });

    return { success: true, data: updatedCategory };
  } catch (error) {
    logger.error('Failed to update category', error);
    return { success: false, error: 'Failed to update category. Please try again.' };
  }
}

/**
 * Delete category (soft delete)
 * 
 * Note: Default categories CAN be deleted (approved for user flexibility)
 * Future: Phase 6 may add warning if category used by transactions
 * 
 * Flow:
 * 1. Check category exists and belongs to user
 * 2. Soft delete in local SQLite
 * 3. Add sync queue item
 * 4. Return success
 * 
 * @param userId - Current user ID
 * @param categoryId - Category UUID to delete
 * @returns Result with success or error
 */
export async function deleteCategory(
  userId: string,
  categoryId: string
): Promise<CategoryResult> {
  try {
    // Get database and repositories
    const db = getDatabase();
    const categoryRepo = getCategoryRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // Check category exists and belongs to user
    const existingCategory = await categoryRepo.findById(categoryId);
    if (!existingCategory) {
      logger.warn('Category not found for delete', { categoryId });
      return { success: false, error: 'Category not found' };
    }

    if (existingCategory.user_id !== userId) {
      logger.warn('User attempted to delete category belonging to another user', {
        categoryId,
        userId,
        ownerId: existingCategory.user_id,
      });
      return { success: false, error: 'Category not found' };
    }

    // Soft delete
    const now = getCurrentTimestamp();
    await categoryRepo.softDelete(categoryId, now);

    // Add sync queue item
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'categories',
      entity_id: categoryId,
      operation: 'delete',
      payload: { id: categoryId, deleted_at: now },
    });

    logger.info('Category deleted successfully', {
      categoryId,
      name: existingCategory.name,
      isDefault: existingCategory.is_default,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete category', error);
    return { success: false, error: 'Failed to delete category. Please try again.' };
  }
}

/**
 * Get categories for current user (optionally filtered by type)
 * 
 * @param userId - Current user ID
 * @param type - Optional category type filter
 * @returns Result with categories array or error
 */
export async function getCategories(
  userId: string,
  type?: CategoryType
): Promise<CategoryResult<Category[]>> {
  try {
    const db = getDatabase();
    const categoryRepo = getCategoryRepository(db);

    const categories = await categoryRepo.findByUserId(userId, type);

    logger.debug('Categories retrieved', { userId, type, count: categories.length });

    return { success: true, data: categories };
  } catch (error) {
    logger.error('Failed to retrieve categories', error);
    return { success: false, error: 'Failed to load categories. Please try again.' };
  }
}

/**
 * Get category by ID
 * 
 * @param userId - Current user ID
 * @param categoryId - Category UUID
 * @returns Result with category or error
 */
export async function getCategoryById(
  userId: string,
  categoryId: string
): Promise<CategoryResult<Category>> {
  try {
    const db = getDatabase();
    const categoryRepo = getCategoryRepository(db);

    const category = await categoryRepo.findById(categoryId);

    if (!category) {
      logger.warn('Category not found', { categoryId });
      return { success: false, error: 'Category not found' };
    }

    // Check ownership
    if (category.user_id !== userId) {
      logger.warn('User attempted to access category belonging to another user', {
        categoryId,
        userId,
        ownerId: category.user_id,
      });
      return { success: false, error: 'Category not found' };
    }

    logger.debug('Category retrieved', { categoryId, name: category.name });

    return { success: true, data: category };
  } catch (error) {
    logger.error('Failed to retrieve category', error);
    return { success: false, error: 'Failed to load category. Please try again.' };
  }
}

/**
 * Get category count for current user
 * 
 * @param userId - Current user ID
 * @returns Result with count or error
 */
export async function getCategoryCount(userId: string): Promise<CategoryResult<number>> {
  try {
    const db = getDatabase();
    const categoryRepo = getCategoryRepository(db);

    const count = await categoryRepo.countByUserId(userId);

    logger.debug('Category count retrieved', { userId, count });

    return { success: true, data: count };
  } catch (error) {
    logger.error('Failed to count categories', error);
    return { success: false, error: 'Failed to count categories. Please try again.' };
  }
}

/**
 * Seed default categories for current user
 * 
 * Lazy seeding strategy:
 * - Call on first category screen load if no categories exist
 * - Idempotent per-category seeding (safe to call multiple times)
 * - Inserts only missing defaults
 * - Adds sync queue item for each newly inserted default
 * 
 * @param userId - Current user ID
 * @returns Result with count of newly inserted categories
 */
export async function seedDefaultCategories(userId: string): Promise<SeedResult> {
  return await runSeeder(userId);
}
