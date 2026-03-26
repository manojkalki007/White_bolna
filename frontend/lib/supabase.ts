import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client.
 * Only uses the ANON key — safe to expose to the browser.
 * Supabase Row Level Security (RLS) enforces data access.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'cogniflow_session',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
