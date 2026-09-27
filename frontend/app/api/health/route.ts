import { NextResponse } from 'next/server';
import { isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.env.NODE_ENV === 'production' ? 'Live' : 'Dev',
    version: '1.0.0',
    supabase: {
      configured: isSupabaseConfigured(),
      admin: isSupabaseAdminConfigured(),
    },
  });
}
