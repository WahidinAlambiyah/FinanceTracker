/**
 * Wallet Validation Functions (Manual - No Zod)
 * 
 * Manual validation for wallet inputs.
 * Returns user-friendly validation errors.
 * Aligned with Phase 1 SQLite schema.
 */

import type {
  CreateWalletInput,
  UpdateWalletInput,
  ValidationResult,
  ValidationError,
  WalletType,
} from './wallet.types';

/**
 * Valid wallet types (must match SQLite CHECK constraint)
 */
const VALID_WALLET_TYPES: WalletType[] = ['cash', 'bank', 'ewallet', 'other'];

/**
 * Validate string is not empty
 */
function isNonEmptyString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate integer
 */
function isInteger(value: any): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Validate wallet type
 */
function isValidWalletType(type: any): boolean {
  return VALID_WALLET_TYPES.includes(type);
}

/**
 * Validate CreateWalletInput
 * 
 * Required fields:
 * - name: non-empty string, max 100 chars
 * - type: valid wallet type
 * - opening_balance: integer (Rupiah)
 * 
 * @param input - Wallet creation input
 * @returns Validation result with errors if invalid
 */
export function validateCreateWalletInput(input: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate name
  if (!isNonEmptyString(input.name)) {
    errors.push({ field: 'name', message: 'Wallet name is required' });
  } else if (input.name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Wallet name must be 100 characters or less' });
  }

  // Validate type
  if (!isValidWalletType(input.type)) {
    errors.push({
      field: 'type',
      message: `Wallet type must be one of: ${VALID_WALLET_TYPES.join(', ')}`,
    });
  }

  // Validate opening_balance
  if (!isInteger(input.opening_balance)) {
    errors.push({ field: 'opening_balance', message: 'Opening balance must be a valid integer (Rupiah)' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate UpdateWalletInput
 * 
 * All fields are optional (at least one must be provided).
 * opening_balance is NOT editable after creation.
 * 
 * @param input - Wallet update input
 * @returns Validation result with errors if invalid
 */
export function validateUpdateWalletInput(input: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if at least one field is provided
  const hasFields = input.name !== undefined || input.type !== undefined;

  if (!hasFields) {
    errors.push({ field: 'general', message: 'At least one field must be provided for update' });
  }

  // Validate name (optional)
  if (input.name !== undefined) {
    if (!isNonEmptyString(input.name)) {
      errors.push({ field: 'name', message: 'Wallet name must be a non-empty string' });
    } else if (input.name.trim().length > 100) {
      errors.push({ field: 'name', message: 'Wallet name must be 100 characters or less' });
    }
  }

  // Validate type (optional)
  if (input.type !== undefined && !isValidWalletType(input.type)) {
    errors.push({
      field: 'type',
      message: `Wallet type must be one of: ${VALID_WALLET_TYPES.join(', ')}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
