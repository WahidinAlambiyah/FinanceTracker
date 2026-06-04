/**
 * Database Initialization
 * 
 * Handles database setup on app startup.
 * Must be called before any database operations.
 */

import { openDatabase } from './sqlite';
import { runMigrations } from './migrations';

export interface InitResult {
  success: boolean;
  error?: string;
}

/**
 * Initialize the database and run migrations
 * Call this on app startup before showing main screens
 * 
 * @returns InitResult indicating success or failure
 */
export async function initializeDatabase(): Promise<InitResult> {
  try {
    console.log('Initializing database...');
    
    // Step 1: Open database connection
    const db = await openDatabase();
    console.log('✓ Database opened');
    
    // Step 2: Run migrations (wrapped in exclusive transactions)
    await runMigrations(db);
    console.log('✓ Migrations completed');
    
    console.log('Database initialization complete');
    return { success: true };
  } catch (error) {
    // Log technical error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Database initialization failed:', errorMessage);
    console.error('Full error:', error);
    
    // Return generic error for user display
    return {
      success: false,
      error: 'Failed to initialize local database',
    };
  }
}
