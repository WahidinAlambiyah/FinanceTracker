import * as Crypto from 'expo-crypto';

/**
 * UUID Utility
 * 
 * Provides client-side UUID generation for offline-first architecture.
 * All database records use client-generated UUIDs to avoid ID conflicts
 * when syncing offline changes.
 * 
 * Uses expo-crypto's randomUUID() which generates RFC 4122 version 4 UUIDs.
 */

/**
 * Generates a UUID v4 string using expo-crypto
 * 
 * This is compatible with React Native and works offline.
 * UUIDs are suitable for primary keys in wallets, categories, transactions,
 * and sync queue records.
 * 
 * @returns A RFC 4122 version 4 UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * 
 * @example
 * ```typescript
 * const walletId = generateUUID();
 * const transactionId = generateUUID();
 * ```
 */
export function generateUUID(): string {
  return Crypto.randomUUID();
}

/**
 * Validates if a string is a valid UUID format
 * 
 * Checks RFC 4122 UUID format (with or without hyphens).
 * Useful for validating user input or data from external sources.
 * 
 * @param value - The string to validate
 * @returns true if the string is a valid UUID format
 * 
 * @example
 * ```typescript
 * isValidUUID("550e8400-e29b-41d4-a716-446655440000") // true
 * isValidUUID("invalid-uuid") // false
 * isValidUUID("") // false
 * ```
 */
export function isValidUUID(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  // RFC 4122 UUID regex (with hyphens)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return uuidRegex.test(value);
}
