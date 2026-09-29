import { createHash } from 'node:crypto';
import { canonicalUrl } from './canonical';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function dedupHash(sourceUrl: string, title: string, entities: string[] = []): string {
  const url = canonicalUrl(sourceUrl);
  const t = title.trim().toLowerCase().replace(/\s+/g, ' ');
  const e = [...entities].map((x) => x.trim().toLowerCase()).filter(Boolean).sort().join('|');
  return sha256Hex(`${url}|${t}|${e}`);
}

export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const tb = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((w) => {
    if (tb.has(w)) inter += 1;
  });
  return inter / Math.max(ta.size, tb.size);
}
