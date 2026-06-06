/**
 * Reports Type Definitions
 * 
 * Types for reports feature.
 */

import type { MonthlySummary } from '@/features/transactions';
import type { WalletBalance } from '@/features/dashboard';

/**
 * Category breakdown (income or expense)
 */
export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_color: string | null;
  total: number;        // Sum of amounts (INTEGER Rupiah)
  count: number;        // Number of transactions
  percentage: number;   // Percentage of total (0-100)
}

/**
 * Monthly report data
 */
export interface MonthlyReport {
  overview: MonthlySummary;                 // Income, expense, net cashflow
  expenseByCategory: CategoryBreakdown[];   // Expense breakdown
  incomeByCategory: CategoryBreakdown[];    // Income breakdown
  walletBalances: WalletBalance[];          // Current wallet balances (derived)
}

/**
 * Reports operation result
 */
export interface ReportsResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
