/**
 * SQLite Database Connection
 * 
 * This module provides the core database connection and helper functions
 * for the offline-first Finance Tracker app.
 * 
 * Uses Expo SQLite SDK 56 async API.
 */

import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Open or get the existing database instance
 * Database is persisted locally and survives app restarts
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  // Open the database
  // The database file will be created if it doesn't exist
  dbInstance = await SQLite.openDatabaseAsync('finance_tracker.db');

  // Enable WAL mode for better concurrency
  await dbInstance.execAsync('PRAGMA journal_mode = WAL;');
  
  // Enable foreign keys
  await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

  return dbInstance;
}

/**
 * Get the current database instance
 * Throws error if database hasn't been opened yet
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call openDatabase() first.');
  }
  return dbInstance;
}

/**
 * Close the database connection
 * Should be called when the app is shutting down
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

/**
 * Check if database is initialized
 */
export function isDatabaseOpen(): boolean {
  return dbInstance !== null;
}
