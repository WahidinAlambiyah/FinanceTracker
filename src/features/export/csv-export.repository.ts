import type { SQLiteDatabase } from 'expo-sqlite';

import type { CsvExportTransactionSourceRow } from './csv-export.types';

export class CsvExportRepository {
  constructor(private db: SQLiteDatabase) {}

  async findActiveTransactionRowsForUser(
    userId: string
  ): Promise<CsvExportTransactionSourceRow[]> {
    return await this.db.getAllAsync<CsvExportTransactionSourceRow>(
      `SELECT
        t.type,
        t.amount,
        t.note,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        t.sync_status,
        w.name as wallet_name,
        dw.name as destination_wallet_name,
        c.name as category_name
      FROM transactions t
      LEFT JOIN wallets w
        ON t.wallet_id = w.id
        AND w.user_id = t.user_id
        AND w.deleted_at IS NULL
      LEFT JOIN wallets dw
        ON t.destination_wallet_id = dw.id
        AND dw.user_id = t.user_id
        AND dw.deleted_at IS NULL
      LEFT JOIN categories c
        ON t.category_id = c.id
        AND c.user_id = t.user_id
        AND c.deleted_at IS NULL
      WHERE t.user_id = ?
        AND t.deleted_at IS NULL
      ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [userId]
    );
  }
}

export function createCsvExportRepository(db: SQLiteDatabase): CsvExportRepository {
  return new CsvExportRepository(db);
}
