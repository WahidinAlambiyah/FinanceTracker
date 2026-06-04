/**
 * Environment Configuration
 * 
 * Access environment variables through this module.
 * Uses EXPO_PUBLIC_ prefix for client-side environment variables.
 * 
 * Make sure to:
 * 1. Copy .env.example to .env
 * 2. Fill in your actual Supabase credentials
 * 3. Never commit .env to version control
 */

export const env = {
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  },
} as const;

/**
 * Validates that required environment variables are set
 * Call this on app startup to fail fast if config is missing
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!env.supabase.url) {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  }

  if (!env.supabase.anonKey) {
    missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
