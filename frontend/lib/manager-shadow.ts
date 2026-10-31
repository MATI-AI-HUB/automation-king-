import { createHmac } from 'node:crypto';

type NewsroomArticle = Record<string, unknown>;
type ManagerEventType = 'article.published' | 'article.unpublished';

const MAX_EVENT_BYTES = 16 * 1024;
const SEND_TIMEOUT_MS = 2500;

function requiredEnv(name: string): string {
  return (process.env[name] || '').trim();
}

function stablePart(value: unknown): string {
  return typeof value === 'string' && value.trim()
    ? value.trim().replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 120)
    : 'unknown';
}

export function buildManagerShadowEvent(
  article: NewsroomArticle,
  eventType: ManagerEventType,
  occurredAt = new Date().toISOString(),
) {
  const articleId = stablePart(article.id ?? article.slug);
  const version = stablePart(article.updated_at ?? article.published_at ?? article.created_at);
  return {
    event_id: `automation-king:article:${articleId}:${eventType}:${version}`,
    event_type: eventType,
    occurred_at: occurredAt,
    payload: {
      source: 'automation-king',
      article_id: typeof article.id === 'string' ? article.id : null,
      slug: typeof article.slug === 'string' ? article.slug : null,
      title: typeof article.title === 'string' ? article.title.slice(0, 500) : null,
      category: typeof article.category_key === 'string'
        ? article.category_key
        : typeof article.category === 'string' ? article.category : null,
      status: typeof article.status === 'string' ? article.status : null,
      published_at: typeof article.published_at === 'string' ? article.published_at : null,
      updated_at: typeof article.updated_at === 'string' ? article.updated_at : null,
    },
  };
}

/**
 * Best-effort shadow delivery only. It never publishes content and never affects
 * the existing newsroom revalidation response.
 */
export async function sendManagerShadowEvent(
  article: NewsroomArticle,
  eventType: ManagerEventType,
): Promise<void> {
  const endpoint = requiredEnv('MANAGER_INTEGRATION_INGEST_URL');
  const key = requiredEnv('MANAGER_INTEGRATION_KEY');
  if (!endpoint || key.length < 32) return;

  let target: URL;
  try {
    target = new URL(endpoint);
  } catch {
    return;
  }
  if (target.protocol !== 'https:') return;

  const body = JSON.stringify(buildManagerShadowEvent(article, eventType));
  if (Buffer.byteLength(body, 'utf8') > MAX_EVENT_BYTES) return;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', key)
    .update(`${timestamp}.${body}`, 'utf8')
    .digest('hex');

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-manager-integration-key': key,
        'x-manager-timestamp': timestamp,
        'x-manager-signature': `sha256=${signature}`,
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!response.ok && response.status !== 202) {
      // Do not log response bodies, request bodies, keys, or signatures.
      console.warn(JSON.stringify({
        event: 'manager_shadow_delivery_rejected',
        status: response.status,
      }));
    }
  } catch (error) {
    console.warn(JSON.stringify({
      event: 'manager_shadow_delivery_unavailable',
      reason: error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network_error',
    }));
  }
}
