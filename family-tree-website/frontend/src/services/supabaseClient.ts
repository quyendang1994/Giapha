import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
  );
}

/**
 * Ensure auth session persists across page reloads.
 * - persistSession: keep session in storage
 * - autoRefreshToken: refresh tokens automatically
 * - detectSessionInUrl: handle OAuth redirect callback URL
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // Keep session across reloads
    persistSession: true,
    autoRefreshToken: true,

    // Crucial for OAuth callback (reads access_token/code from URL)
    detectSessionInUrl: true,

    // Recommended for SPA OAuth (more reliable across reloads)
    flowType: 'pkce',

    // Make storage key explicit/stable
    storageKey: 'family-tree-website-auth',
  },
});
