import * as Crypto from 'expo-crypto';

/**
 * Generates a UUID v4 string using expo-crypto
 * This is compatible with React Native and works offline
 */
export function generateUUID(): string {
  return Crypto.randomUUID();
}
