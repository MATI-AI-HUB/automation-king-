import { describe, expect, it } from 'vitest';
import { isProductionSupabaseUrl, PRODUCTION_SUPABASE_REF, supabaseRefFromUrl } from '../lib/flags';

describe('supabase ref guards', () => {
  it('detects the production ref', () => {
    expect(supabaseRefFromUrl(`https://${PRODUCTION_SUPABASE_REF}.supabase.co`)).toBe(PRODUCTION_SUPABASE_REF);
    expect(isProductionSupabaseUrl(`https://${PRODUCTION_SUPABASE_REF}.supabase.co`)).toBe(true);
    expect(isProductionSupabaseUrl('https://fqqdpngmftoddffvdukn.supabase.co')).toBe(false);
  });
});
