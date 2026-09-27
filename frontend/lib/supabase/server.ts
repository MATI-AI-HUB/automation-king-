import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  getAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  missingSupabaseEnvMessage,
} from './env';

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(missingSupabaseEnvMessage());
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; middleware refreshes the session.
        }
      },
    },
  });
}
