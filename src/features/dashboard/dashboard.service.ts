/**
 * Dashboard Service
 * 
 * Business logic for dashboard data.
 * Combines balance calculations, monthly summaries, and recent transactions.
 * 
 * IMPORTANT: Service methods receive userId as parameter.
 * Do NOT use useAuth() hook in service layer (React hooks are for components only).
 */

import { getDatabase } from '@/lib/db';
import { logger } from '@/lib/utils/logger';
import { getBalanceRepository } from './balance.repository';
import { getMonthlySummary, getTransactionsWithNames } from '@/features/transactions';
import type { DashboardSummary, DashboardResult, WalletBalance } from './dashboard.types';

/**
 * Get dashboard summary data
 * 
 * Returns total balance, monthly summary, and recent transactions.
 */
export async function getDashboardSummary(userId: string): Promise<DashboardResult<DashboardSummary>> {
  try {
    const db = getDatabase();
    const balanceRepo = getBalanceRepository(db);

    // Get current month for monthly summary
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Calculate total balance across all wallets
    const totalBalance = await balanceRepo.calculateTotalBalance(userId);

    // Get monthly summary (income, expense, net cashflow)
    const monthlySummaryResult = await getMonthlySummary(userId, currentYear, currentMonth);
    if (!monthlySummaryResult.success || !monthlySummaryResult.data) {
      return {
        success: false,
        error: monthlySummaryResult.error || 'Failed to load monthly summary',
      };
    }

    const { income, expense, netCashflow } = monthlySummaryResult.data;

    // Get recent transactions (last 10, all types)
    const recentTransactionsResult = await getTransactionsWithNames(userId, currentYear, currentMonth);
    if (!recentTransactionsResult.success || !recentTransactionsResult.data) {
      return {
        success: false,
        error: recentTransactionsResult.error || 'Failed to load recent transactions',
      };
    }

    // Limit to 10 most recent
    const recentTransactions = recentTransactionsResult.data.slice(0, 10);

    const summary: DashboardSummary = {
      totalBalance,
      monthlyIncome: income,
      monthlyExpense: expense,
      netCashflow,
      recentTransactions,
    };

    logger.debug('Dashboard summary retrieved', { userId, totalBalance, income, expense });

    return { success: true, data: summary };
  } catch (error) {
    logger.error('Failed to get dashboard summary', error);
    return { success: false, error: 'Failed to load dashboard. Please try again.' };
  }
}

/**
 * Get wallet balances for all user's wallets
 * 
 * Returns array of wallet balances with details.
 */
export async function getWalletBalances(userId: string): Promise<DashboardResult<WalletBalance[]>> {
  try {
    const db = getDatabase();
    const balanceRepo = getBalanceRepository(db);

    const walletBalances = await balanceRepo.getWalletBalances(userId);

    logger.debug('Wallet balances retrieved', { userId, count: walletBalances.length });

    return { success: true, data: walletBalances };
  } catch (error) {
    logger.error('Failed to get wallet balances', error);
    return { success: false, error: 'Failed to load wallet balances. Please try again.' };
  }
}
