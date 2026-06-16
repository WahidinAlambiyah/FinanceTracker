/**
 * Supabase Client Configuration
 * 
 * Initializes the Supabase client with secure session storage.
 * This client is used for authentication and future remote sync operations.
 * 
 * Environment Variables Required:
 * - EXPO_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous key
 * 
 * Security:
 * - Auth tokens stored encrypted via expo-secure-store
 * - RLS policies enforce user data isolation on server
 */

import { createClient } from '@supabase/supabase-js';
import { secureSessionStorage } from './session-storage';
import { logger } from '../utils/logger';

// Load environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment configuration
if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Supabase configuration missing', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
  throw new Error(
    'Supabase configuration is incomplete. Please check your .env file.'
  );
}

/**
 * Supabase Client Instance
 * 
 * Configured with:
 * - Custom secure storage for auth tokens
 * - Auto-refresh for expired tokens
 * - Persistent session across app restarts
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use secure storage instead of default AsyncStorage
    storage: secureSessionStorage,
    
    // Auto-refresh tokens before expiration
    autoRefreshToken: true,
    
    // Persist session across app restarts
    persistSession: true,
    
    // Detect session from URL (for web, not needed for mobile but harmless)
    detectSessionInUrl: false,
  },
});

/**
 * Initialize Supabase client
 * 
 * Call this early in app lifecycle to restore session if available.
 * This is handled automatically by the auth context.
 */
export async function initializeSupabase(): Promise<void> {
  try {
    // Supabase client auto-loads session from storage on creation
    const { data } = await supabase.auth.getSession();
    
    if (data.session) {
      logger.info('Supabase session restored');
    } else {
      logger.info('No existing Supabase session');
    }
  } catch (error) {
    logger.error('Failed to initialize Supabase', error);
  }
}

// Export configured client as default
export default supabase;
