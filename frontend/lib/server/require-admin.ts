import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

const ALLOWED_ROLES = ['admin', 'chief_editor', 'desk_editor'];

export type AuthUser = { id: string; email: string; role: string };

export async function requireAdmin(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) return null;
  return { id: user.id, email: user.email || '', role: profile.role };
}
