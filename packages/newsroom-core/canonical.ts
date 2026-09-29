export function canonicalUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('invalid_url');
  }
  url.hash = '';
  url.hostname = url.hostname.replace(/\.$/, '').toLowerCase();
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }
  const drop = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
  ]);
  const kept: string[] = [];
  url.searchParams.forEach((value, key) => {
    if (!drop.has(key.toLowerCase())) kept.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  kept.sort();
  url.search = kept.length ? `?${kept.join('&')}` : '';
  return url.toString();
}
