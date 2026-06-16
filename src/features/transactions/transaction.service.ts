/**
 * Transaction Service
 * 
 * Business logic for transaction management.
 * Orchestrates repository, validation, and sync queue operations.
 * Aligned with Phase 1 SQLite schema.
 * 
 * IMPORTANT: Service methods receive userId as parameter.
 * Do NOT use useAuth() hook in service layer (React hooks are for components only).
 */

import { getDatabase } from '@/lib/db';
import { generateUUID } from '@/lib/utils/uuid';
import { getCurrentTimestamp } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import { getTransactionRepository } from './transaction.repository';
import { getWalletRepository } from '@/features/wallets/wallet.repository';
import { getCategoryRepository } from '@/features/categories/category.repository';
import { getSyncQueueRepository } from '@/features/sync/sync-queue.repository';
import { validateCreateTransactionInput, validateUpdateTransactionInput } from './transaction.validation';
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionResult,
  MonthlySummary,
  TransactionWithNames,
  TransactionFilters,
} from './transaction.types';

/**
 * Create new transaction
 * 
 * Flow:
 * 1. Validate input
 * 2. Verify wallet exists and belongs to user
 * 3. If income/expense: verify category exists, belongs to user, matches type
 * 4. If transfer: verify destination wallet exists, belongs to user, ≠ source
 * 5. Generate UUID and timestamps
 * 6. Build transaction with sync_status: 'pending'
 * 7. Save to local SQLite first
 * 8. Add sync queue item
 * 9. Return transaction
 */
export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionResult<Transaction>> {
  try {
    // 1. Validate input
    const validation = validateCreateTransactionInput(input);
    if (!validation.valid) {
      const errorMessage = validation.errors.map((e) => e.message).join(', ');
      logger.warn('Transaction creation validation failed', { errors: validation.errors });
      return { success: false, error: errorMessage };
    }

    // Get database and repositories
    const db = getDatabase();
    const transactionRepo = getTransactionRepository(db);
    const walletRepo = getWalletRepository(db);
    const categoryRepo = getCategoryRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // 2. Verify wallet exists and belongs to user
    const wallet = await walletRepo.findById(input.wallet_id);
    if (!wallet || wallet.user_id !== userId) {
      logger.warn('Wallet not found or does not belong to user', {
        walletId: input.wallet_id,
        userId,
      });
      return { success: false, error: 'Wallet not found' };
    }

    // 3. Type-specific verification
    if (input.type === 'income' || input.type === 'expense') {
      // Verify category exists, belongs to user, and matches transaction type
      const category = await categoryRepo.findById(input.category_id!);
      if (!category || category.user_id !== userId) {
        logger.warn('Category not found or does not belong to user', {
          categoryId: input.category_id,
          userId,
        });
        return { success: false, error: 'Category not found' };
      }
      
      if (category.type !== input.type) {
        logger.warn('Category type does not match transaction type', {
          categoryType: category.type,
          transactionType: input.type,
        });
        return { 
          success: false, 
          error: `Cannot use ${category.type} category for ${input.type} transaction` 
        };
      }
    } else if (input.type === 'transfer') {
      // Verify destination wallet exists, belongs to user
      const destWallet = await walletRepo.findById(input.destination_wallet_id!);
      if (!destWallet || destWallet.user_id !== userId) {
        logger.warn('Destination wallet not found or does not belong to user', {
          destinationWalletId: input.destination_wallet_id,
          userId,
        });
        return { success: false, error: 'Destination wallet not found' };
      }
    }

    // 5. Generate UUID and timestamps
    const now = getCurrentTimestamp();
    const transactionId = generateUUID();

    // 6. Build transaction record
    const transaction: Transaction = {
      id: transactionId,
      user_id: userId,
      type: input.type,
      wallet_id: input.wallet_id,
      destination_wallet_id: input.destination_wallet_id ?? null,
      category_id: input.category_id ?? null,
      amount: input.amount,
      note: input.note ?? null,
      transaction_date: input.transaction_date,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'pending',
    };

    // 7. Save to local SQLite first
    await transactionRepo.create(transaction);

    // 8. Add sync queue item
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'transactions',
      entity_id: transactionId,
      operation: 'create',
      payload: transaction,
    });

    logger.info('Transaction created successfully', {
      transactionId,
      type: transaction.type,
      amount: transaction.amount,
    });

    // 9. Return result
    return { success: true, data: transaction };
  } catch (error) {
    logger.error('Failed to create transaction', error);
    return { success: false, error: 'Failed to create transaction. Please try again.' };
  }
}

/**
 * Update existing transaction
 * 
 * Flow:
 * 1. Validate input
 * 2. Check transaction exists and belongs to user
 * 3. Type is READ-ONLY (cannot be changed)
 * 4. If wallet_id changes: verify new wallet
 * 5. If destination_wallet_id changes: verify wallet, prevent same-wallet
 * 6. If category_id changes: verify category
 * 7. Update in local SQLite
 * 8. Add sync queue item
 * 9. Return updated transaction
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput
): Promise<TransactionResult<Transaction>> {
  try {
    // 1. Validate input
    const validation = validateUpdateTransactionInput(input);
    if (!validation.valid) {
      const errorMessage = validation.errors.map((e) => e.message).join(', ');
      logger.warn('Transaction update validation failed', { errors: validation.errors });
      return { success: false, error: errorMessage };
    }

    // Get database and repositories
    const db = getDatabase();
    const transactionRepo = getTransactionRepository(db);
    const walletRepo = getWalletRepository(db);
    const categoryRepo = getCategoryRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // 2. Check transaction exists and belongs to user
    const existingTransaction = await transactionRepo.findById(transactionId);
    if (!existingTransaction) {
      logger.warn('Transaction not found for update', { transactionId });
      return { success: false, error: 'Transaction not found' };
    }

    if (existingTransaction.user_id !== userId) {
      logger.warn('User attempted to update transaction belonging to another user', {
        transactionId,
        userId,
        ownerId: existingTransaction.user_id,
      });
      return { success: false, error: 'Transaction not found' };
    }

    // 4. Compute final state after update
    const finalWalletId = input.wallet_id ?? existingTransaction.wallet_id;
    const finalDestinationWalletId = input.destination_wallet_id !== undefined 
      ? input.destination_wallet_id 
      : existingTransaction.destination_wallet_id;
    const finalCategoryId = input.category_id !== undefined 
      ? input.category_id 
      : existingTransaction.category_id;

    // 5. Validate final state based on existing transaction type
    if (existingTransaction.type === 'income' || existingTransaction.type === 'expense') {
      // Income/Expense: category_id must not be null
      if (!finalCategoryId) {
        return { 
          success: false, 
          error: `${existingTransaction.type.charAt(0).toUpperCase() + existingTransaction.type.slice(1)} transaction requires a category` 
        };
      }

      // Income/Expense: destination_wallet_id must be null
      if (finalDestinationWalletId) {
        return { 
          success: false, 
          error: `${existingTransaction.type.charAt(0).toUpperCase() + existingTransaction.type.slice(1)} transaction cannot have a destination wallet` 
        };
      }

      // Verify category exists, belongs to user, and matches transaction type
      const category = await categoryRepo.findById(finalCategoryId);
      if (!category || category.user_id !== userId) {
        return { success: false, error: 'Category not found' };
      }
      
      if (category.type !== existingTransaction.type) {
        return { 
          success: false, 
          error: `Cannot use ${category.type} category for ${existingTransaction.type} transaction` 
        };
      }
    } else if (existingTransaction.type === 'transfer') {
      // Transfer: destination_wallet_id must not be null
      if (!finalDestinationWalletId) {
        return { 
          success: false, 
          error: 'Transfer transaction requires a destination wallet' 
        };
      }

      // Transfer: category_id must be null
      if (finalCategoryId) {
        return { 
          success: false, 
          error: 'Transfer transaction cannot have a category' 
        };
      }

      // Transfer: source and destination must be different
      if (finalWalletId === finalDestinationWalletId) {
        return { 
          success: false, 
          error: 'Source and destination wallets must be different' 
        };
      }

      // Verify destination wallet exists and belongs to user
      const destWallet = await walletRepo.findById(finalDestinationWalletId);
      if (!destWallet || destWallet.user_id !== userId) {
        return { success: false, error: 'Destination wallet not found' };
      }
    }

    // 6. If wallet_id changes: verify new wallet exists and belongs to user
    if (input.wallet_id && input.wallet_id !== existingTransaction.wallet_id) {
      const wallet = await walletRepo.findById(input.wallet_id);
      if (!wallet || wallet.user_id !== userId) {
        return { success: false, error: 'Wallet not found' };
      }
    }

    // 7. Prepare update payload
    const now = getCurrentTimestamp();
    const updates: any = {
      ...input,
      sync_status: 'pending',
      updated_at: now,
    };

    // Update in local SQLite
    await transactionRepo.update(transactionId, updates);

    // Get updated transaction
    const updatedTransaction = await transactionRepo.findById(transactionId);
    if (!updatedTransaction) {
      throw new Error('Failed to retrieve updated transaction');
    }

    // 8. Add sync queue item
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'transactions',
      entity_id: transactionId,
      operation: 'update',
      payload: updatedTransaction,
    });

    logger.info('Transaction updated successfully', {
      transactionId,
      type: updatedTransaction.type,
    });

    // 9. Return result
    return { success: true, data: updatedTransaction };
  } catch (error) {
    logger.error('Failed to update transaction', error);
    return { success: false, error: 'Failed to update transaction. Please try again.' };
  }
}

/**
 * Delete transaction (soft delete)
 * 
 * Flow:
 * 1. Check transaction exists and belongs to user
 * 2. Soft delete in local SQLite
 * 3. Add sync queue item
 * 4. Return success
 */
export async function deleteTransaction(
  userId: string,
  transactionId: string
): Promise<TransactionResult> {
  try {
    // Get database and repositories
    const db = getDatabase();
    const transactionRepo = getTransactionRepository(db);
    const syncQueueRepo = getSyncQueueRepository(db);

    // 1. Check transaction exists and belongs to user
    const existingTransaction = await transactionRepo.findById(transactionId);
    if (!existingTransaction) {
      logger.warn('Transaction not found for delete', { transactionId });
      return { success: false, error: 'Transaction not found' };
    }

    if (existingTransaction.user_id !== userId) {
      logger.warn('User attempted to delete transaction belonging to another user', {
        transactionId,
        userId,
        ownerId: existingTransaction.user_id,
      });
      return { success: false, error: 'Transaction not found' };
    }

    // 2. Soft delete
    const now = getCurrentTimestamp();
    await transactionRepo.softDelete(transactionId, now);

    // 3. Add sync queue item
    await syncQueueRepo.addSyncQueueItem({
      entity_name: 'transactions',
      entity_id: transactionId,
      operation: 'delete',
      payload: { id: transactionId, deleted_at: now },
    });

    logger.info('Transaction deleted successfully', {
      transactionId,
      type: existingTransaction.type,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete transaction', error);
    return { success: false, error: 'Failed to delete transaction. Please try again.' };
  }
}

/**
 * Get transactions with optional filters
 */
export async function getTransactions(
  userId: string,
  filters?: TransactionFilters
): Promise<TransactionResult<Transaction[]>> {
  try {
    const db = getDatabase();
    const transactionRepo = getTransactionRepository(db);

    let transactions: Transaction[];

    // Apply filters
    if (filters?.year && filters?.month) {
      transactions = await transactionRepo.findByUserIdAndMonth(
        userId,
        filters.year,
        filters.month
      );
    } else if (filters?.walletId) {
      transactions = await transactionRepo.findByWalletId(
        userId,
        filters.walletId,
        filters.limit
      );
    } else if (filters?.categoryId) {
      transactions = await transactionRepo.findByCategoryId(
        userId,
        filters.categoryId,
        filters.limit
      );
    } else if (filters?.type) {
      transactions = await transactionRepo.findByType(
        userId,
        filters.type,
        filters.limit
      );
    } else {
      transactions = await transactionRepo.findByUserId(userId, filters?.limit);
    }

    logger.debug('Transactions retrieved', { userId, count: transactions.length });

    return { success: true, data: transactions };
  } catch (error) {
    logger.error('Failed to retrieve transactions', error);
    return { success: false, error: 'Failed to load transactions. Please try again.' };
  }
}

/**
 * Get transactions with wallet/category names (for display)
 */
export async function getTransactionsWithNames(
  userId: string,
  year: number,
  month: number
): Promise<TransactionResult<TransactionWithNames[]>> {
  try {
    const db = getDatabase();
    const transactionRepo = getTransactionRepository(db);

    const transactions = await transactionRepo.findByUserIdWithNames(userId, year, month);

    logger.debug('Transactions with names retrieved', { userId, count: transactions.length });

    return { success: true, data: transactions };
  } catch (error) {
    logger.error('Failed to retrieve transactions with names', error);
    return { success: false, error: 'Failed to load transactions. Please try again.' };
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(
  userId: string,
  transactionId: string
): Promise<TransactionResult<Transaction>> {
  try {
    const db = getDatabase();
    const transactionRepo = getTransactionRepository(db);

    const transaction = await transactionRepo.findById(transactionId);

    if (!transaction) {
      logger.warn('Transaction not found', { transactionId });
      return { success: false, error: 'Transaction not found' };
    }

    // Check ownership
    if (transaction.user_id !== userId) {
      logger.warn('User attempted to access transaction belonging to another user', {
        transactionId,
        userId,
        ownerId: transaction.user_id,
      });
      return { success: false, error: 'Transaction not found' };
    }

    logger.debug('Transaction retrieved', { transactionId, type: transaction.type });

    return { success: true, data: transaction };
  } catch (error) {
    logger.error('Failed to retrieve transaction', error);
    return { success: false, error: 'Failed to load transaction. Please try again.' };
  }
}

/**
 * Get monthly summary (income, expense, net cashflow)
 */
export async function getMonthlySummary(
  userId: string,
  year: number,
  month: number
): Promise<TransactionResult<MonthlySummary>> {
  try {
    const db = getDatabase();
    const transactionRepo = getTransactionRepository(db);

    const income = await transactionRepo.getMonthlyIncomeTotal(userId, year, month);
    const expense = await transactionRepo.getMonthlyExpenseTotal(userId, year, month);
    const netCashflow = income - expense;

    const summary: MonthlySummary = {
      income,
      expense,
      netCashflow,
    };

    logger.debug('Monthly summary retrieved', { userId, year, month, summary });

    return { success: true, data: summary };
  } catch (error) {
    logger.error('Failed to retrieve monthly summary', error);
    return { success: false, error: 'Failed to load summary. Please try again.' };
  }
}
