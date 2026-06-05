/**
 * Wallet Validation Functions (Manual - No Zod)
 * 
 * Manual validation for wallet inputs.
 * Returns user-friendly validation errors.
 */

import type {
  CreateWalletInput,
  UpdateWalletInput,
  ValidationResult,
  ValidationError,
  WalletType,
} from './wallet.types';

/**
 * Valid wallet types
 */
const VALID_WALLET_TYPES: WalletType[] = ['cash', 'bank', 'ewallet', 'investment', 'other'];

/**
 * Valid currency codes (for now, only IDR supported)
 */
const VALID_CURRENCIES = ['IDR'];

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
 * Validate currency code
 */
function isValidCurrency(currency: any): boolean {
  return VALID_CURRENCIES.includes(currency);
}

/**
 * Validate hex color code (e.g., "#2563EB")
 */
function isValidHexColor(color: any): boolean {
  if (typeof color !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate CreateWalletInput
 * 
 * Required fields:
 * - name: non-empty string, max 100 chars
 * - type: valid wallet type
 * - opening_balance: integer (Rupiah)
 * 
 * Optional fields:
 * - currency: valid currency code (default: 'IDR')
 * - icon: string or null
 * - color: valid hex color or null
 * - notes: string or null, max 500 chars
 * - is_active: boolean (default: true)
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

  // Validate currency (optional, default 'IDR')
  if (input.currency !== undefined && !isValidCurrency(input.currency)) {
    errors.push({
      field: 'currency',
      message: `Currency must be one of: ${VALID_CURRENCIES.join(', ')}`,
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

  // Validate notes (optional)
  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string or null' });
    } else if (input.notes.length > 500) {
      errors.push({ field: 'notes', message: 'Notes must be 500 characters or less' });
    }
  }

  // Validate is_active (optional, default true)
  if (input.is_active !== undefined && typeof input.is_active !== 'boolean') {
    errors.push({ field: 'is_active', message: 'is_active must be a boolean' });
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
  const hasFields =
    input.name !== undefined ||
    input.type !== undefined ||
    input.currency !== undefined ||
    input.icon !== undefined ||
    input.color !== undefined ||
    input.notes !== undefined ||
    input.is_active !== undefined;

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

  // Validate currency (optional)
  if (input.currency !== undefined && !isValidCurrency(input.currency)) {
    errors.push({
      field: 'currency',
      message: `Currency must be one of: ${VALID_CURRENCIES.join(', ')}`,
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

  // Validate notes (optional)
  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string or null' });
    } else if (input.notes.length > 500) {
      errors.push({ field: 'notes', message: 'Notes must be 500 characters or less' });
    }
  }

  // Validate is_active (optional)
  if (input.is_active !== undefined && typeof input.is_active !== 'boolean') {
    errors.push({ field: 'is_active', message: 'is_active must be a boolean' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
