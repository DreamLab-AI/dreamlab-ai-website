import { createClient } from '@supabase/supabase-js';

// These should be environment variables in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Security: Removed logging of API keys and URLs in production
if (import.meta.env.DEV) {
  console.log('Supabase initialization:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    // Never log actual values, even in development
  });
}

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