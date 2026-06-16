/**
 * Database Module Entry Point
 * 
 * Exports all database-related functions and types
 */

export { openDatabase, getDatabase, closeDatabase, isDatabaseOpen } from './sqlite';
export { runMigrations, getExecutedMigrations } from './migrations';
export { initializeDatabase } from './init';
export type { InitResult } from './init';
export type { Migration } from './migrations';
