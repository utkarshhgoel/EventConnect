import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let isValidUrl = false;
try {
  if (supabaseUrl) {
    new URL(supabaseUrl);
    isValidUrl = true;
  }
} catch (e) {
  console.warn('Invalid Supabase URL provided.');
}

if (!supabaseUrl || !supabaseAnonKey || !isValidUrl) {
  console.warn('Missing or invalid Supabase environment variables. Please check your .env file or Vercel environment variables.');
}

export const supabase = createClient(
  isValidUrl ? supabaseUrl : 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
