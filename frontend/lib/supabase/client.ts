'use client';

import { createBrowserClient } from '@supabase/ssr';
import {
  getAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  missingSupabaseEnvMessage,
} from './env';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;
  if (!isSupabaseConfigured()) {
    throw new Error(missingSupabaseEnvMessage());
  }
  client = createBrowserClient(getSupabaseUrl(), getAnonKey());
  return client;
}

export { isSupabaseConfigured };
