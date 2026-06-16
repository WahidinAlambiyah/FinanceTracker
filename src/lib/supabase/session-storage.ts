/**
 * Secure Session Storage for Supabase Auth
 * 
 * Uses expo-secure-store to encrypt and store auth tokens securely.
 * This prevents plain-text token storage and protects against unauthorized access.
 * 
 * Security properties:
 * - Tokens stored encrypted on device (hardware-backed on modern devices)
 * - Not accessible to other apps
 * - Cleared on app uninstall
 * - Supabase automatically manages token refresh
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';

/**
 * Storage key for Supabase auth token
 * Format follows Supabase convention
 */
const STORAGE_KEY = 'supabase.auth.token';

/**
 * Secure Session Storage Adapter for Supabase
 * 
 * Implements the storage interface expected by Supabase Auth client.
 * All tokens (access token, refresh token) are stored encrypted.
 */
export class SecureSessionStorage {
  /**
   * Retrieve stored session data
   * 
   * @param key - Storage key
   * @returns Stored value (JSON string) or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      
      if (value) {
        logger.debug('Session loaded from secure storage');
      }
      
      return value;
    } catch (error) {
      logger.error('Failed to load session from secure storage', error);
      return null;
    }
  }

  /**
   * Store session data securely
   * 
   * @param key - Storage key
   * @param value - Value to store (JSON string from Supabase)
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
      logger.debug('Session saved to secure storage');
    } catch (error) {
      logger.error('Failed to save session to secure storage', error);
      throw error;
    }
  }

  /**
   * Remove session data
   * 
   * @param key - Storage key
   */
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      logger.debug('Session removed from secure storage');
    } catch (error) {
      logger.error('Failed to remove session from secure storage', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of secure session storage
 */
export const secureSessionStorage = new SecureSessionStorage();

/**
 * Clear all auth-related data from secure storage
 * 
 * Use this on logout to ensure complete cleanup.
 */
export async function clearAuthStorage(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    logger.info('Auth storage cleared');
  } catch (error) {
    logger.error('Failed to clear auth storage', error);
  }
}
