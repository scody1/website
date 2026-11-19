import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseClient(dynamicUrl?: string, dynamicKey?: string): SupabaseClient | null {
  const url = dynamicUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = dynamicKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key);
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}
