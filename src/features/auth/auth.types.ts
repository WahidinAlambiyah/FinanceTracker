/**
 * Authentication Type Definitions
 * 
 * TypeScript interfaces for authentication-related data structures.
 */

import type { Session, User } from '@supabase/supabase-js';

/**
 * Auth session from Supabase
 * Re-export Supabase Session type directly to avoid drift
 */
export type AuthSession = Session;

/**
 * Auth user from Supabase
 * Re-export Supabase User type directly
 */
export type AuthUser = User;

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration credentials
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword?: string; // Used for client-side validation only
}

/**
 * Auth service response wrapper
 */
export interface AuthResponse<T = void> {
  data: T | null;
  error: string | null;
}

/**
 * Auth state for context
 */
export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Auth context actions
 */
export interface AuthActions {
  signIn: (credentials: LoginCredentials) => Promise<AuthResponse<Session>>;
  signUp: (credentials: RegisterCredentials) => Promise<AuthResponse<Session>>;
  signOut: () => Promise<AuthResponse>;
  refreshSession: () => Promise<AuthResponse<Session>>;
}

/**
 * Combined auth context value
 */
export type AuthContextValue = AuthState & AuthActions;
