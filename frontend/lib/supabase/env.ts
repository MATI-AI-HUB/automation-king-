function trim(value: string | undefined): string {
  return (value ?? '').trim();
}

export function getSupabaseUrl(): string {
  return trim(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getAnonKey(): string {
  return trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getServiceRoleKey(): string {
  return trim(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getAnonKey();
  if (!url || !key) return false;
  if (!url.startsWith('https://')) return false;
  if (url.includes('YOUR-PROJECT-REF')) return false;
  if (url.includes('placeholder.supabase.co')) return false;
  if (key.includes('YOUR-ANON-KEY') || key === 'placeholder-key') return false;
  return true;
}

export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(getServiceRoleKey());
}

export function missingSupabaseEnvMessage(): string {
  return (
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Set them in Vercel → Project Settings → Environment Variables on the existing Hobby project.'
  );
}
