/**
 * Transaction Feature Module
 * 
 * Barrel export for transaction management
 */

// Types
export type {
  Transaction,
  TransactionType,
  SyncStatus,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionResult,
  MonthlySummary,
  TransactionWithNames,
  TransactionFilters,
  ValidationError,
  ValidationResult,
} from './transaction.types';

// Validation
export { validateCreateTransactionInput, validateUpdateTransactionInput } from './transaction.validation';

// Repository
export { getTransactionRepository } from './transaction.repository';

// Service
export {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactions,
  getTransactionsWithNames,
  getTransactionById,
  getMonthlySummary,
} from './transaction.service';
