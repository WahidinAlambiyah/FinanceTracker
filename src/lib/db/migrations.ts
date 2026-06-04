/**
 * Database Migration Runner
 * 
 * Handles database schema migrations in an idempotent way.
 * Migrations are tracked in the `migrations` table and run only once.
 * 
 * Migration strategy:
 * - Each migration has a unique name
 * - Migrations run in order
 * - Executed migrations are recorded
 * - Re-running is safe (idempotent)
 */

import * as SQLite from 'expo-sqlite';
import { INITIAL_SCHEMA, MIGRATION_001_INITIAL_SCHEMA } from './schema';

export interface Migration {
  name: string;
  sql: string;
}

/**
 * List of all migrations in execution order
 * Add new migrations to the end of this array
 */
const migrations: Migration[] = [
  {
    name: MIGRATION_001_INITIAL_SCHEMA,
    sql: INITIAL_SCHEMA,
  },
];

/**
 * Check if a migration has already been executed
 */
async function isMigrationExecuted(
  db: SQLite.SQLiteDatabase,
  migrationName: string
): Promise<boolean> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM migrations WHERE name = ?',
    migrationName
  );
  return (result?.count ?? 0) > 0;
}

/**
 * Record that a migration has been executed
 */
async function recordMigration(
  db: SQLite.SQLiteDatabase,
  migrationName: string
): Promise<void> {
  const executedAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO migrations (name, executed_at) VALUES (?, ?)',
    migrationName,
    executedAt
  );
}

/**
 * Initialize the migrations table if it doesn't exist
 * This must run before any other migration
 */
async function initializeMigrationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL
    );
  `);
}

/**
 * Run all pending migrations
 * This is idempotent - safe to call multiple times
 * 
 * @param db - The database instance
 * @throws Error if any migration fails
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // First, ensure migrations table exists
  await initializeMigrationsTable(db);

  // Run each migration if not already executed
  for (const migration of migrations) {
    const executed = await isMigrationExecuted(db, migration.name);
    
    if (!executed) {
      console.log(`Running migration: ${migration.name}`);
      
      try {
        // Execute the migration SQL
        await db.execAsync(migration.sql);
        
        // Record successful execution
        await recordMigration(db, migration.name);
        
        console.log(`✓ Migration completed: ${migration.name}`);
      } catch (error) {
        console.error(`✗ Migration failed: ${migration.name}`, error);
        throw new Error(`Migration failed: ${migration.name} - ${error}`);
      }
    } else {
      console.log(`Skipping already executed migration: ${migration.name}`);
    }
  }
  
  console.log('All migrations completed successfully');
}

/**
 * Get list of executed migrations
 * Useful for debugging and verification
 */
export async function getExecutedMigrations(
  db: SQLite.SQLiteDatabase
): Promise<{ name: string; executed_at: string }[]> {
  try {
    return await db.getAllAsync<{ name: string; executed_at: string }>(
      'SELECT name, executed_at FROM migrations ORDER BY id ASC'
    );
  } catch (error) {
    // If migrations table doesn't exist yet, return empty array
    return [];
  }
}
