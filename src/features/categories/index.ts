/**
 * Categories Feature Module
 * 
 * Barrel export for category feature.
 */

// Types
export type {
  Category,
  CategoryType,
  SyncStatus,
  CreateCategoryInput,
  UpdateCategoryInput,
  ValidationError,
  ValidationResult,
  CategoryResult,
  SeedResult,
} from './category.types';

// Validation
export { validateCreateCategoryInput, validateUpdateCategoryInput } from './category.validation';

// Repository
export { CategoryRepository, getCategoryRepository } from './category.repository';

// Seeder
export { seedDefaultCategories } from './category.seeder';

// Service
export {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  getCategoryCount,
} from './category.service';
