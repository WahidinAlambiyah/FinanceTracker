/**
 * Category Validation Functions (Manual - No Zod)
 * 
 * Manual validation for category inputs.
 * Returns user-friendly validation errors.
 * Aligned with Phase 1 SQLite schema.
 */

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ValidationResult,
  ValidationError,
  CategoryType,
} from './category.types';

/**
 * Valid category types (must match SQLite CHECK constraint)
 */
const VALID_CATEGORY_TYPES: CategoryType[] = ['income', 'expense'];

/**
 * Validate string is not empty
 */
function isNonEmptyString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate category type
 */
function isValidCategoryType(type: any): boolean {
  return VALID_CATEGORY_TYPES.includes(type);
}

/**
 * Validate hex color code (e.g., "#2563EB")
 */
function isValidHexColor(color: any): boolean {
  if (typeof color !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate CreateCategoryInput
 * 
 * Required fields:
 * - name: non-empty string, max 50 chars
 * - type: valid category type ('income' or 'expense')
 * 
 * Optional fields:
 * - icon: string or null
 * - color: valid hex color (#RRGGBB) or null
 * 
 * @param input - Category creation input
 * @returns Validation result with errors if invalid
 */
export function validateCreateCategoryInput(input: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate name
  if (!isNonEmptyString(input.name)) {
    errors.push({ field: 'name', message: 'Category name is required' });
  } else if (input.name.trim().length > 50) {
    errors.push({ field: 'name', message: 'Category name must be 50 characters or less' });
  }

  // Validate type
  if (!isValidCategoryType(input.type)) {
    errors.push({
      field: 'type',
      message: `Category type must be one of: ${VALID_CATEGORY_TYPES.join(', ')}`,
    });
  }

  // Validate icon (optional)
  if (input.icon !== undefined && input.icon !== null && !isNonEmptyString(input.icon)) {
    errors.push({ field: 'icon', message: 'Icon must be a non-empty string or null' });
  }

  // Validate color (optional)
  if (input.color !== undefined && input.color !== null) {
    if (!isValidHexColor(input.color)) {
      errors.push({ field: 'color', message: 'Color must be a valid hex code (e.g., #2563EB) or null' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate UpdateCategoryInput
 * 
 * All fields are optional (at least one must be provided).
 * type is NOT editable after creation.
 * 
 * @param input - Category update input
 * @returns Validation result with errors if invalid
 */
export function validateUpdateCategoryInput(input: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if at least one field is provided
  const hasFields =
    input.name !== undefined ||
    input.icon !== undefined ||
    input.color !== undefined;

  if (!hasFields) {
    errors.push({ field: 'general', message: 'At least one field must be provided for update' });
  }

  // Validate name (optional)
  if (input.name !== undefined) {
    if (!isNonEmptyString(input.name)) {
      errors.push({ field: 'name', message: 'Category name must be a non-empty string' });
    } else if (input.name.trim().length > 50) {
      errors.push({ field: 'name', message: 'Category name must be 50 characters or less' });
    }
  }

  // Validate icon (optional)
  if (input.icon !== undefined && input.icon !== null && !isNonEmptyString(input.icon)) {
    errors.push({ field: 'icon', message: 'Icon must be a non-empty string or null' });
  }

  // Validate color (optional)
  if (input.color !== undefined && input.color !== null) {
    if (!isValidHexColor(input.color)) {
      errors.push({ field: 'color', message: 'Color must be a valid hex code (e.g., #2563EB) or null' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
