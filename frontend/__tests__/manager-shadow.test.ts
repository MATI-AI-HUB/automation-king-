import { describe, expect, it } from 'vitest';
import { buildManagerShadowEvent } from '../lib/manager-shadow';

describe('Manager shadow newsroom event contract', () => {
  const article = {
    id: '4e3a3e2a-1234-4567-8901-123456789abc',
    slug: 'sample-story',
    title: 'Sample headline',
    category_key: 'national',
    status: 'published',
    published_at: '2026-10-31T08:00:00.000Z',
    updated_at: '2026-10-31T08:01:00.000Z',
  };

  it('creates the Manager receiver event envelope and stable dedupe id', () => {
    const first = buildManagerShadowEvent(article, 'article.published', '2026-10-31T08:02:00.000Z');
    const second = buildManagerShadowEvent(article, 'article.published', '2026-10-31T08:03:00.000Z');
    expect(first).toEqual(second);
    expect(first.event_id).toBe(
      'automation-king:article:4e3a3e2a-1234-4567-8901-123456789abc:article.published:2026-10-31T08:01:00.000Z',
    );
    expect(first.event_type).toBe('article.published');
    expect(first.occurred_at).toBe('2026-10-31T08:02:00.000Z');
    expect(first.payload).toMatchObject({
      source: 'automation-king',
      article_id: article.id,
      slug: article.slug,
      title: article.title,
      status: 'published',
    });
  });

  it('does not include arbitrary article fields or credentials', () => {
    const event = buildManagerShadowEvent({
      ...article,
      access_token: 'must-not-leak',
      body: 'full article body must not be copied',
      internal_notes: 'private',
    }, 'article.published', '2026-10-31T08:02:00.000Z');
    expect(JSON.stringify(event)).not.toContain('must-not-leak');
    expect(JSON.stringify(event)).not.toContain('full article body');
    expect(JSON.stringify(event)).not.toContain('private');
  });

  it('supports unpublished events without changing public publishing state', () => {
    const event = buildManagerShadowEvent(
      { ...article, status: 'archived' },
      'article.unpublished',
      '2026-10-31T08:02:00.000Z',
    );
    expect(event.event_type).toBe('article.unpublished');
    expect(event.payload.status).toBe('archived');
  });
});
