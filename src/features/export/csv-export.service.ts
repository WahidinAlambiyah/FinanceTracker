import type { SQLiteDatabase } from 'expo-sqlite';

import { transactionRowsToCsv } from './csv-format';
import { CsvExportRepository } from './csv-export.repository';

export class CsvExportService {
  constructor(private repository: CsvExportRepository) {}

  async buildTransactionsCsvForUser(userId: string): Promise<string> {
    const rows = await this.repository.findActiveTransactionRowsForUser(userId);
    return transactionRowsToCsv(rows);
  }
}

export function createCsvExportService(db: SQLiteDatabase): CsvExportService {
  return new CsvExportService(new CsvExportRepository(db));
}
