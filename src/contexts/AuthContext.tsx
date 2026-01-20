'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Development auth bypass - skip all Supabase initialization
const DEV_BYPASS_AUTH =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionReady: boolean; // True only after we've definitively checked auth state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for dev bypass mode
const MOCK_DEV_USER = {
  id: 'dev-user-id',
  email: 'dev@localhost',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { full_name: 'Dev User' },
} as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(DEV_BYPASS_AUTH ? MOCK_DEV_USER : null);
  const [loading, setLoading] = useState(!DEV_BYPASS_AUTH);
  const [sessionReady, setSessionReady] = useState(DEV_BYPASS_AUTH); // Immediately ready in dev bypass mode
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  // Initialize Supabase client only on client-side
  const getSupabase = () => {
    if (!supabaseRef.current) {
      try {
        supabaseRef.current = createClient();
      } catch (err) {
        console.error('Supabase initialization failed:', err);
        throw err;
      }
    }
    return supabaseRef.current;
  };

  useEffect(() => {
    // Skip Supabase initialization entirely in dev bypass mode
    if (DEV_BYPASS_AUTH) {
      return;
    }

    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      try {
        const supabase = getSupabase();

        // Get initial session with retry logic (iterative to avoid stack overflow)
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 500;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const {
              data: { session },
              error,
            } = await supabase.auth.getSession();

            if (error) {
              console.error('Session error:', error);
              throw error;
            }

            if (mounted) {
              // Set user first
              setUser(session?.user ?? null);
              // Small delay to ensure state is propagated before components react
              await new Promise((resolve) => setTimeout(resolve, 50));
              // Mark session as definitively checked - this is the key flag
              // that tells consumers "we know the auth state now"
              setSessionReady(true);
              setLoading(false);
            }
            // Success - exit retry loop
            break;
          } catch (err) {
            console.error(`Error getting session (attempt ${attempt}/${MAX_RETRIES}):`, err);

            // If not the last attempt, wait and retry
            if (attempt < MAX_RETRIES) {
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            } else {
              // After all retries, set loading to false and mark session as checked
              // (user remains null, but we've definitively tried)
              if (mounted) {
                setSessionReady(true);
                setLoading(false);
              }
            }
          }
        }

        // Listen for auth changes
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) {
            setUser(session?.user ?? null);
            // Don't set loading to false here - it should already be false
            // This prevents unnecessary re-renders
          }
        });

        subscription = data.subscription;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to initialize authentication';
        console.error('Auth initialization error:', message);
        if (mounted) {
          setError(message);
          setSessionReady(true); // Even on error, we've checked
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (DEV_BYPASS_AUTH) {
      return { error: null };
    }
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (e) {
      return { error: e };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (DEV_BYPASS_AUTH) {
      return { error: null };
    }
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (e) {
      return { error: e };
    }
  };

  const signOut = async () => {
    if (DEV_BYPASS_AUTH) {
      return;
    }
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  const refreshSession = async () => {
    if (DEV_BYPASS_AUTH) {
      return;
    }
    try {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    } catch (e) {
      console.error('Error refreshing session:', e);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-xl">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-red-400">Configuration Error</h2>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap mb-4">{error}</p>
          <div className="text-xs text-slate-500 bg-black/20 p-3 rounded-lg">
            <p className="font-semibold mb-1">How to fix:</p>
            <p>
              Add the required environment variables to your Vercel project settings or .env.local
              file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, sessionReady, signIn, signUp, signOut, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
