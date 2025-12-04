import { createClient } from '@supabase/supabase-js';

/**
 * @deprecated This legacy browser client is deprecated in favor of the modern
 * @supabase/ssr implementation. Please use `createClient()` from
 * `@/utils/supabase/client` instead for better Next.js 15 compatibility
 * and server-side rendering support.
 *
 * This file is kept for backward compatibility but should not be used in new code.
 */

// Browser client - for client-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Export configuration for use in other utilities
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};
