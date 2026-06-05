/**
 * Authentication Context
 * 
 * Provides global auth state and actions to the entire app.
 * Manages session lifecycle and auth state changes.
 * 
 * Usage:
 * ```typescript
 * const { user, isAuthenticated, signIn, signOut } = useAuth();
 * ```
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import * as authService from './auth.service';
import type {
  AuthContextValue,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from './auth.types';

/**
 * Auth Context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider Component
 * 
 * Wraps the app to provide auth state and actions.
 * Listens for auth state changes from Supabase.
 * Restores session on mount if available.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  /**
   * Update auth state
   */
  const updateState = useCallback((session: Session | null) => {
    setState({
      user: session?.user ?? null,
      session,
      isLoading: false,
      isAuthenticated: session !== null,
    });
  }, []);

  /**
   * Initialize auth state on mount
   * Restore session from secure storage if available
   */
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        logger.debug('Initializing auth state');
        const session = await authService.getCurrentSession();
        
        if (mounted) {
          updateState(session);
        }
      } catch (error) {
        logger.error('Auth initialization failed', error);
        if (mounted) {
          updateState(null);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [updateState]);

  /**
   * Listen for auth state changes
   * Handles sign in, sign out, token refresh, etc.
   */
  useEffect(() => {
    logger.debug('Setting up auth state listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        logger.debug('Auth state changed', { event });

        switch (event) {
          case 'SIGNED_IN':
            logger.info('User signed in');
            updateState(session);
            break;

          case 'SIGNED_OUT':
            logger.info('User signed out');
            updateState(null);
            break;

          case 'TOKEN_REFRESHED':
            logger.debug('Token refreshed');
            updateState(session);
            break;

          case 'USER_UPDATED':
            logger.debug('User updated');
            updateState(session);
            break;

          default:
            // Handle other events (PASSWORD_RECOVERY, etc.)
            logger.debug('Auth event handled', { event });
            updateState(session);
        }
      }
    );

    // Cleanup listener on unmount
    return () => {
      logger.debug('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [updateState]);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse<Session>> => {
      const result = await authService.login(credentials);
      
      if (result.data) {
        updateState(result.data);
      }
      
      return result;
    },
    [updateState]
  );

  /**
   * Register new user
   */
  const signUp = useCallback(
    async (credentials: RegisterCredentials): Promise<AuthResponse<Session>> => {
      const result = await authService.register(credentials);
      
      if (result.data) {
        updateState(result.data);
      }
      
      return result;
    },
    [updateState]
  );

  /**
   * Sign out current user
   */
  const signOut = useCallback(async (): Promise<AuthResponse> => {
    const result = await authService.logout();
    
    if (!result.error) {
      updateState(null);
    }
    
    return result;
  }, [updateState]);

  /**
   * Refresh current session
   */
  const refreshSession = useCallback(
    async (): Promise<AuthResponse<Session>> => {
      const session = await authService.refreshSession();
      
      if (session) {
        updateState(session);
        return { data: session, error: null };
      }
      
      return { data: null, error: 'Failed to refresh session' };
    },
    [updateState]
  );

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * 
 * @returns Auth context value
 * @throws Error if used outside AuthProvider
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { user, isAuthenticated, signOut } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <Text>Not logged in</Text>;
 *   }
 *   
 *   return (
 *     <View>
 *       <Text>Welcome {user?.email}</Text>
 *       <Button onPress={signOut} title="Logout" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Export context for testing
export { AuthContext };
