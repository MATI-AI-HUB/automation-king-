export type ConditionalHeaders = {
  etag?: string | null;
  lastModified?: string | null;
};

export function buildConditionalHeaders(prev: ConditionalHeaders): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/rss+xml, application/xml, text/xml' };
  if (prev.etag) headers['If-None-Match'] = prev.etag;
  if (prev.lastModified) headers['If-Modified-Since'] = prev.lastModified;
  return headers;
}

export function parseConditionalResponse(res: {
  status: number;
  headers: { get(name: string): string | null };
}): { notModified: boolean; etag: string | null; lastModified: string | null } {
  return {
    notModified: res.status === 304,
    etag: res.headers.get('etag'),
    lastModified: res.headers.get('last-modified'),
  };
}
