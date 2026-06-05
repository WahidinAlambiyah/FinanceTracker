/**
 * Transaction Validation
 * 
 * Manual validation functions for transaction management.
 * No Zod, no React Hook Form - follows wallet/category pattern.
 */

import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  ValidationResult,
  ValidationError,
} from './transaction.types';

/**
 * Validate transaction creation input
 * 
 * Rules:
 * - type: required, must be 'income' | 'expense' | 'transfer'
 * - wallet_id: required, non-empty
 * - amount: required, > 0, INTEGER Rupiah
 * - transaction_date: required, valid ISO timestamp
 * - Income/Expense: category_id required, destination_wallet_id must be null
 * - Transfer: destination_wallet_id required, category_id must be null, source ≠ destination
 * - note: optional, max 500 chars
 */
export function validateCreateTransactionInput(
  input: CreateTransactionInput
): ValidationResult {
  const errors: ValidationError[] = [];

  // Type validation
  if (!input.type) {
    errors.push({ field: 'type', message: 'Transaction type is required' });
  } else if (!['income', 'expense', 'transfer'].includes(input.type)) {
    errors.push({ field: 'type', message: 'Invalid transaction type' });
  }

  // Wallet ID validation
  if (!input.wallet_id || input.wallet_id.trim() === '') {
    errors.push({ field: 'wallet_id', message: 'Wallet is required' });
  }

  // Amount validation
  if (typeof input.amount !== 'number') {
    errors.push({ field: 'amount', message: 'Amount must be a number' });
  } else if (input.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
  } else if (input.amount !== Math.floor(input.amount)) {
    errors.push({ field: 'amount', message: 'Amount must be an integer (no decimals)' });
  }

  // Transaction date validation
  if (!input.transaction_date) {
    errors.push({ field: 'transaction_date', message: 'Transaction date is required' });
  } else {
    const date = new Date(input.transaction_date);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'transaction_date', message: 'Invalid transaction date' });
    }
  }

  // Type-specific validation
  if (input.type === 'income' || input.type === 'expense') {
    // Income/Expense requires category_id
    if (!input.category_id || input.category_id.trim() === '') {
      const typeLabel = input.type.charAt(0).toUpperCase() + input.type.slice(1);
      errors.push({ 
        field: 'category_id', 
        message: `${typeLabel} transaction requires a category` 
      });
    }
    
    // Income/Expense must NOT have destination_wallet_id
    if (input.destination_wallet_id) {
      const typeLabel = input.type.charAt(0).toUpperCase() + input.type.slice(1);
      errors.push({ 
        field: 'destination_wallet_id', 
        message: `${typeLabel} transaction cannot have a destination wallet` 
      });
    }
  } else if (input.type === 'transfer') {
    // Transfer requires destination_wallet_id
    if (!input.destination_wallet_id || input.destination_wallet_id.trim() === '') {
      errors.push({ 
        field: 'destination_wallet_id', 
        message: 'Transfer transaction requires a destination wallet' 
      });
    }
    
    // Transfer must NOT have category_id
    if (input.category_id) {
      errors.push({ 
        field: 'category_id', 
        message: 'Transfer transaction cannot have a category' 
      });
    }
    
    // Transfer: source and destination must be different
    if (input.wallet_id && input.destination_wallet_id && 
        input.wallet_id === input.destination_wallet_id) {
      errors.push({ 
        field: 'destination_wallet_id', 
        message: 'Source and destination wallets must be different' 
      });
    }
  }

  // Note validation (optional, but max 500 chars if provided)
  if (input.note && input.note.length > 500) {
    errors.push({ field: 'note', message: 'Note must be 500 characters or less' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate transaction update input
 * 
 * Similar rules as create, but all fields optional
 * Type is NOT validated (read-only on edit)
 */
export function validateUpdateTransactionInput(
  input: UpdateTransactionInput
): ValidationResult {
  const errors: ValidationError[] = [];

  // Wallet ID validation (if provided)
  if (input.wallet_id !== undefined && input.wallet_id.trim() === '') {
    errors.push({ field: 'wallet_id', message: 'Wallet cannot be empty' });
  }

  // Amount validation (if provided)
  if (input.amount !== undefined) {
    if (typeof input.amount !== 'number') {
      errors.push({ field: 'amount', message: 'Amount must be a number' });
    } else if (input.amount <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
    } else if (input.amount !== Math.floor(input.amount)) {
      errors.push({ field: 'amount', message: 'Amount must be an integer (no decimals)' });
    }
  }

  // Transaction date validation (if provided)
  if (input.transaction_date !== undefined) {
    const date = new Date(input.transaction_date);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'transaction_date', message: 'Invalid transaction date' });
    }
  }

  // Same-wallet transfer check (if both wallet_id and destination_wallet_id provided)
  if (input.wallet_id && input.destination_wallet_id && 
      input.wallet_id === input.destination_wallet_id) {
    errors.push({ 
      field: 'destination_wallet_id', 
      message: 'Source and destination wallets must be different' 
    });
  }

  // Note validation (if provided)
  if (input.note !== undefined && input.note && input.note.length > 500) {
    errors.push({ field: 'note', message: 'Note must be 500 characters or less' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
