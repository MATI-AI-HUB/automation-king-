import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ALLOWED_ROLES = ['admin', 'chief_editor', 'desk_editor'] as const;

export type AuthUser = { id: string; email: string; role: string };

export async function requireAdmin(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options) } catch {}
          })
        },
      },
    }
  );

  // Optimized: getClaims() - No network call, local JWT verify
  const { data: claimsData } = await sb.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;
  const email = claimsData?.claims?.email as string | undefined;
  if (!userId) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || !ALLOWED_ROLES.includes(profile.role as any)) return null;

  return { id: userId, email: email || '', role: profile.role };
}
