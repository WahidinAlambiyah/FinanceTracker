/**
 * Dashboard Type Definitions
 * 
 * Types for dashboard feature.
 */

import type { TransactionWithNames } from '@/features/transactions';

/**
 * Dashboard summary data
 */
export interface DashboardSummary {
  totalBalance: number;                    // Sum of all wallet balances (INTEGER Rupiah)
  monthlyIncome: number;                   // Current month income (INTEGER Rupiah)
  monthlyExpense: number;                  // Current month expense (INTEGER Rupiah)
  netCashflow: number;                     // monthlyIncome - monthlyExpense (INTEGER Rupiah)
  recentTransactions: TransactionWithNames[]; // Last 10 transactions
}

/**
 * Wallet balance with details
 */
export interface WalletBalance {
  wallet_id: string;
  wallet_name: string;
  wallet_type: string;
  balance: number; // Derived balance (INTEGER Rupiah)
}

/**
 * Dashboard operation result
 */
export interface DashboardResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
