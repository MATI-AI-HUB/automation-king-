import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getAnonKey,
  getServiceRoleKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from './env';

const AUTH_OFF = { persistSession: false, autoRefreshToken: false } as const;

export function createAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key || !isSupabaseAdminConfigured()) {
    throw new Error('Supabase admin creds missing');
  }
  return createClient(url, key, { auth: AUTH_OFF });
}

export function createAnonClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getAnonKey();
  if (!url || !key || !isSupabaseConfigured()) {
    throw new Error('Supabase env vars not configured');
  }
  return createClient(url, key, { auth: AUTH_OFF });
}

export function tryCreateAnonClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createAnonClient();
}

export function tryCreateAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) return null;
  return createAdminClient();
}
