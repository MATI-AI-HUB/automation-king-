import { createHash, timingSafeEqual } from 'node:crypto';

export function digestSha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function ingestKeyConfigured(expected: string | undefined): boolean {
  const key = (expected || '').trim();
  return key.length > 0 && key !== 'change-me';
}

export function ingestKeyMatches(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = digestSha256(provided);
  const b = digestSha256(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type IngestAuthResult =
  | { ok: true }
  | { ok: false; status: 500; error: 'ingest_unconfigured' }
  | { ok: false; status: 401; error: 'unauthorized' };

export function ingestAuth(provided: string, expected: string | undefined): IngestAuthResult {
  if (!ingestKeyConfigured(expected)) {
    return { ok: false, status: 500, error: 'ingest_unconfigured' };
  }
  if (!ingestKeyMatches(provided, (expected || '').trim())) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }
  return { ok: true };
}
