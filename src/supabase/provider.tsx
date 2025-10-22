'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './index';

interface SupabaseProviderProps {
  children: ReactNode;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  session: Session | null;
  isUserLoading: boolean;
  userError: AuthError | null;
}

// Combined state for the Supabase context
export interface SupabaseContextState {
  areServicesAvailable: boolean; // True if Supabase client is available
  supabase: typeof supabase;
  // User authentication state
  user: User | null;
  session: Session | null;
  isUserLoading: boolean; // True during initial auth check
  userError: AuthError | null; // Error from auth listener
}

// Return type for useSupabase()
export interface SupabaseServicesAndUser {
  supabase: typeof supabase;
  user: User | null;
  session: Session | null;
  isUserLoading: boolean;
  userError: AuthError | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { 
  user: User | null;
  session: Session | null;
  isUserLoading: boolean;
  userError: AuthError | null;
}

// React Context
export const SupabaseContext = createContext<SupabaseContextState | undefined>(undefined);

/**
 * SupabaseProvider manages and provides Supabase services and user authentication state.
 */
export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({
  children,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    session: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Supabase auth state changes
  useEffect(() => {
    setUserAuthState({ user: null, session: null, isUserLoading: true, userError: null });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("SupabaseProvider: getSession error:", error);
        setUserAuthState({ user: null, session: null, isUserLoading: false, userError: error });
      } else {
        setUserAuthState({ 
          user: session?.user ?? null, 
          session, 
          isUserLoading: false, 
          userError: null 
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        setUserAuthState({ 
          user: session?.user ?? null, 
          session, 
          isUserLoading: false, 
          userError: null 
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Memoize the context value
  const contextValue = useMemo((): SupabaseContextState => {
    return {
      areServicesAvailable: true,
      supabase,
      user: userAuthState.user,
      session: userAuthState.session,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [userAuthState]);

  return (
    <SupabaseContext.Provider value={contextValue}>
      {children}
    </SupabaseContext.Provider>
  );
};

/**
 * Hook to access core Supabase services and user authentication state.
 * Throws error if used outside provider.
 */
export const useSupabase = (): SupabaseServicesAndUser => {
  const context = useContext(SupabaseContext);

  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider.');
  }

  if (!context.areServicesAvailable) {
    throw new Error('Supabase services not available.');
  }
  
  return {
    supabase: context.supabase,
    user: context.user,
    session: context.session,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Supabase client. */
export const useSupabaseClient = (): typeof supabase => {
  const { supabase } = useSupabase();
  return supabase;
};

type MemoSupabase <T> = T & {__memo?: boolean};

export function useMemoSupabase<T>(factory: () => T, deps: DependencyList): T | (MemoSupabase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoSupabase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, session, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, session, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const context = useContext(SupabaseContext);

  if (context === undefined) {
    throw new Error('useUser must be used within a SupabaseProvider.');
  }
  
  const { user, session, isUserLoading, userError } = useSupabase();
  return { user, session, isUserLoading, userError };
};



