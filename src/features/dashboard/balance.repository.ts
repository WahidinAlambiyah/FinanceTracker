/**
 * Balance Repository
 * 
 * Calculates wallet balances from transactions.
 * Balance is DERIVED ONLY - never stored, never mutated.
 * 
 * Formula:
 * current_balance = opening_balance + income - expense - transfers_out + transfers_in
 * 
 * Where:
 * - opening_balance: From wallets table
 * - income: Sum WHERE type = 'income' AND wallet_id = wallet.id
 * - expense: Sum WHERE type = 'expense' AND wallet_id = wallet.id
 * - transfers_out: Sum WHERE type = 'transfer' AND wallet_id = wallet.id (source)
 * - transfers_in: Sum WHERE type = 'transfer' AND destination_wallet_id = wallet.id (destination)
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export interface WalletBalance {
  wallet_id: string;
  wallet_name: string;
  wallet_type: string;
  balance: number; // Derived balance (INTEGER Rupiah)
}

let balanceRepositoryInstance: BalanceRepository | null = null;

class BalanceRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Calculate current balance for a single wallet
   * 
   * Returns derived balance based on opening_balance and all transactions.
   */
  async calculateWalletBalance(userId: string, walletId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{
      opening_balance: number;
      total_income: number;
      total_expense: number;
      total_transfers_out: number;
      total_transfers_in: number;
    }>(
      `SELECT 
        w.opening_balance,
        COALESCE(SUM(CASE 
          WHEN t.type = 'income' AND t.wallet_id = ? THEN t.amount 
          ELSE 0 
        END), 0) as total_income,
        COALESCE(SUM(CASE 
          WHEN t.type = 'expense' AND t.wallet_id = ? THEN t.amount 
          ELSE 0 
        END), 0) as total_expense,
        COALESCE(SUM(CASE 
          WHEN t.type = 'transfer' AND t.wallet_id = ? THEN t.amount 
          ELSE 0 
        END), 0) as total_transfers_out,
        COALESCE(SUM(CASE 
          WHEN t.type = 'transfer' AND t.destination_wallet_id = ? THEN t.amount 
          ELSE 0 
        END), 0) as total_transfers_in
      FROM wallets w
      LEFT JOIN transactions t ON (
        (t.wallet_id = w.id OR t.destination_wallet_id = w.id) 
        AND t.deleted_at IS NULL
        AND t.user_id = ?
      )
      WHERE w.id = ? 
        AND w.user_id = ? 
        AND w.deleted_at IS NULL
      GROUP BY w.id, w.opening_balance`,
      [walletId, walletId, walletId, walletId, userId, walletId, userId]
    );

    if (!result) {
      return 0;
    }

    // Calculate derived balance
    const balance =
      result.opening_balance +
      result.total_income -
      result.total_expense -
      result.total_transfers_out +
      result.total_transfers_in;

    return balance;
  }

  /**
   * Calculate total balance across all user's wallets
   * 
   * Returns sum of all derived wallet balances.
   */
  async calculateTotalBalance(userId: string): Promise<number> {
    const wallets = await this.db.getAllAsync<{ id: string }>(
      `SELECT id FROM wallets WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    let totalBalance = 0;

    for (const wallet of wallets) {
      const balance = await this.calculateWalletBalance(userId, wallet.id);
      totalBalance += balance;
    }

    return totalBalance;
  }

  /**
   * Get balances for all user's wallets
   * 
   * Returns array of wallet balances with wallet details.
   */
  async getWalletBalances(userId: string): Promise<WalletBalance[]> {
    const wallets = await this.db.getAllAsync<{
      id: string;
      name: string;
      type: string;
    }>(
      `SELECT id, name, type FROM wallets WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
      [userId]
    );

    const walletBalances: WalletBalance[] = [];

    for (const wallet of wallets) {
      const balance = await this.calculateWalletBalance(userId, wallet.id);

      walletBalances.push({
        wallet_id: wallet.id,
        wallet_name: wallet.name,
        wallet_type: wallet.type,
        balance,
      });
    }

    return walletBalances;
  }
}

/**
 * Get balance repository singleton instance
 */
export function getBalanceRepository(db: SQLiteDatabase): BalanceRepository {
  if (!balanceRepositoryInstance) {
    balanceRepositoryInstance = new BalanceRepository(db);
  }
  return balanceRepositoryInstance;
}
