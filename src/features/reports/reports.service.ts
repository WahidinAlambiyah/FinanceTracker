/**
 * Reports Service
 * 
 * Business logic for financial reports.
 * Combines monthly summaries, category breakdowns, and wallet balances.
 * 
 * IMPORTANT: Service methods receive userId as parameter.
 * Do NOT use useAuth() hook in service layer (React hooks are for components only).
 */

import { getDatabase } from '@/lib/db';
import { logger } from '@/lib/utils/logger';
import { getReportsRepository } from './reports.repository';
import { getMonthlySummary } from '@/features/transactions';
import { getWalletBalances } from '@/features/dashboard';
import type { MonthlyReport, ReportsResult } from './reports.types';

/**
 * Get monthly report data
 * 
 * Returns overview, category breakdowns, and wallet balances.
 */
export async function getMonthlyReport(
  userId: string,
  year: number,
  month: number
): Promise<ReportsResult<MonthlyReport>> {
  try {
    const db = getDatabase();
    const reportsRepo = getReportsRepository(db);

    // Get monthly overview (income, expense, net cashflow)
    const overviewResult = await getMonthlySummary(userId, year, month);
    if (!overviewResult.success || !overviewResult.data) {
      return {
        success: false,
        error: overviewResult.error || 'Failed to load monthly summary',
      };
    }

    // Get expense by category
    const expenseByCategory = await reportsRepo.getExpenseByCategory(userId, year, month);

    // Get income by category
    const incomeByCategory = await reportsRepo.getIncomeByCategory(userId, year, month);

    // Get wallet balances (current, not historical)
    const walletBalancesResult = await getWalletBalances(userId);
    if (!walletBalancesResult.success || !walletBalancesResult.data) {
      return {
        success: false,
        error: walletBalancesResult.error || 'Failed to load wallet balances',
      };
    }

    const report: MonthlyReport = {
      overview: overviewResult.data,
      expenseByCategory,
      incomeByCategory,
      walletBalances: walletBalancesResult.data,
    };

    logger.debug('Monthly report retrieved', {
      userId,
      year,
      month,
      expenseCategories: expenseByCategory.length,
      incomeCategories: incomeByCategory.length,
    });

    return { success: true, data: report };
  } catch (error) {
    logger.error('Failed to get monthly report', error);
    return { success: false, error: 'Failed to load report. Please try again.' };
  }
}
