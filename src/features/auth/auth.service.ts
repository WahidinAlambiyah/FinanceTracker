/**
 * Authentication Service
 * 
 * Handles all authentication operations using Supabase Auth.
 * Provides user-friendly error messages and offline handling.
 * 
 * Security:
 * - Passwords never logged
 * - Tokens stored encrypted via SecureStore
 * - Error messages sanitized for users
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  AuthSession,
  AuthUser,
} from './auth.types';

/**
 * Map Supabase auth errors to user-friendly messages
 * 
 * @param error - Supabase error object or message
 * @returns User-friendly error message
 */
function mapAuthError(error: any): string {
  if (!error) return 'An unknown error occurred';

  const errorMessage = typeof error === 'string' ? error : error.message || '';
  const errorLower = errorMessage.toLowerCase();

  // Network/connection errors
  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection.';
  }

  // Invalid credentials
  if (errorLower.includes('invalid login') || errorLower.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }

  // User already exists
  if (errorLower.includes('already registered') || errorLower.includes('already exists')) {
    return 'An account with this email already exists.';
  }

  // Email validation
  if (errorLower.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }

  // Password validation
  if (errorLower.includes('password') && errorLower.includes('short')) {
    return 'Password must be at least 8 characters long.';
  }

  // Rate limiting
  if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
    return 'Too many attempts. Please try again later.';
  }

  // Email not confirmed (if email confirmation is enabled)
  if (errorLower.includes('email not confirmed')) {
    return 'Please verify your email address before logging in.';
  }

  // Generic fallback
  return 'Authentication failed. Please try again.';
}

/**
 * Register a new user account
 * 
 * @param credentials - Email and password
 * @returns Auth response with session or error
 * 
 * Requirements: REQ-AUTH-001
 */
export async function register(
  credentials: RegisterCredentials
): Promise<AuthResponse<AuthSession>> {
  try {
    logger.info('User registration attempt');

    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      const userMessage = mapAuthError(error);
      logger.warn('Registration failed', { reason: error.message });
      return { data: null, error: userMessage };
    }

    if (!data.session) {
      // Email confirmation may be required
      logger.info('Registration successful, email confirmation may be required');
      return {
        data: null,
        error: 'Account created. Please check your email to verify your account.',
      };
    }

    logger.info('User registered successfully');
    return { data: data.session, error: null };
  } catch (error) {
    const userMessage = mapAuthError(error);
    logger.error('Registration error', error);
    return { data: null, error: userMessage };
  }
}

/**
 * Login with email and password
 * 
 * @param credentials - Email and password
 * @returns Auth response with session or error
 * 
 * Requirements: REQ-AUTH-002
 */
export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse<AuthSession>> {
  try {
    logger.info('User login attempt');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      const userMessage = mapAuthError(error);
      logger.warn('Login failed', { reason: error.message });
      return { data: null, error: userMessage };
    }

    if (!data.session) {
      logger.warn('Login succeeded but no session returned');
      return { data: null, error: 'Login failed. Please try again.' };
    }

    logger.info('User logged in successfully');
    return { data: data.session, error: null };
  } catch (error) {
    const userMessage = mapAuthError(error);
    logger.error('Login error', error);
    return { data: null, error: userMessage };
  }
}

/**
 * Logout current user
 * 
 * Clears local session and signs out from Supabase.
 * 
 * @returns Auth response indicating success or error
 * 
 * Requirements: REQ-AUTH-003
 */
export async function logout(): Promise<AuthResponse> {
  try {
    logger.info('User logout attempt');

    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Logout failed', error);
      return { data: null, error: 'Logout failed. Please try again.' };
    }

    logger.info('User logged out successfully');
    return { data: null, error: null };
  } catch (error) {
    logger.error('Logout error', error);
    return { data: null, error: 'Logout failed. Please try again.' };
  }
}

/**
 * Get current session
 * 
 * Retrieves active session from storage. Returns null if no session or expired.
 * Handles offline gracefully.
 * 
 * @returns Current session or null
 * 
 * Requirements: REQ-AUTH-004
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      logger.warn('Failed to get current session', { reason: error.message });
      return null;
    }

    if (!data.session) {
      return null;
    }

    // Check if session is expired
    const expiresAt = data.session.expires_at;
    if (expiresAt && Date.now() / 1000 > expiresAt) {
      logger.debug('Session expired, attempting refresh');
      return await refreshSession();
    }

    return data.session;
  } catch (error) {
    // Offline or network error - return null
    logger.warn('Session check failed (possibly offline)');
    return null;
  }
}

/**
 * Get current authenticated user
 * 
 * @returns Current user or null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch (error) {
    logger.warn('Failed to get current user');
    return null;
  }
}

/**
 * Refresh the current session
 * 
 * Attempts to refresh an expired access token using the refresh token.
 * Requires internet connection.
 * 
 * @returns Refreshed session or null
 */
export async function refreshSession(): Promise<AuthSession | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      logger.warn('Session refresh failed', { reason: error.message });
      return null;
    }

    if (!data.session) {
      return null;
    }

    logger.debug('Session refreshed successfully');
    return data.session;
  } catch (error) {
    logger.warn('Session refresh error (possibly offline)');
    return null;
  }
}

/**
 * Check if user is authenticated
 * 
 * Quick check without network request.
 * Uses locally stored session.
 * 
 * @returns true if session exists and valid
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return session !== null;
}
