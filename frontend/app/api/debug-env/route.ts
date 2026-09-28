import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.NEWSROOM_INGEST_KEY || '';
  const cron = process.env.CRON_SECRET || '';
  const db = process.env.SUPABASE_DB_URL || '';
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const sec = process.env.SUPABASE_SECRET_KEY || '';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  return NextResponse.json({
    deploy_info: {
      vercel_env: process.env.VERCEL_ENV || 'unknown',
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7),
      deployment_id: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
    },
    newsroom_key: {
      length: key.length,
      first8: key.slice(0, 8),
      last8: key.slice(-8),
      isChangeMe: key === 'change-me',
      isWhitespaceOnly: key.length > 0 && key.trim().length === 0,
      hasWhitespace: /\s/.test(key),
    },
    cron_secret: {
      length: cron.length,
      first8: cron.slice(0, 8),
    },
    supabase: {
      url_length: url.length,
      db_url_length: db.length,
      service_role_length: svc.length,
      secret_key_length: sec.length,
    },
    timestamp: new Date().toISOString(),
  });
}
