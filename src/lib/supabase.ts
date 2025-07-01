import { createClient } from '@supabase/supabase-js';

// These should be environment variables in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase initialization:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl,
  key: supabaseAnonKey?.slice(0, 5) + '...' // Only log first 5 chars of key for security
});

let supabase;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  }
  });
} else {
  console.warn('Supabase environment variables are not set. Supabase client not initialized.');
  // Provide a mock/dummy client if needed, or just leave it undefined
  supabase = null;
}

export { supabase };