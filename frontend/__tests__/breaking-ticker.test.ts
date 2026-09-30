import { describe, expect, it, vi } from 'vitest';
import { readBreakingTicker, writeBreakingTicker } from '../lib/breaking-ticker';

describe('breaking ticker persistence', () => {
  it('reads singleton row id=1', async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { text_bn: 'জরুরি', is_active: true, updated_at: '2026-09-29T00:00:00.000Z' },
      error: null,
    }));
    const client = {
      rpc: vi.fn(),
      from: vi.fn(() => ({
        update: vi.fn(),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
      })),
    };
    const state = await readBreakingTicker(client);
    expect(state).toMatchObject({ active: true, text: 'জরুরি', persisted: true });
  });

  it('calls set_breaking_ticker then falls back to update', async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { text_bn: 'নতুন', is_active: true, updated_at: '2026-09-30T00:00:00.000Z' },
      error: null,
    }));
    const eqUpdate = vi.fn(async () => ({ error: null }));
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: 'PGRST202', message: 'could not find the function' },
    }));
    const client = {
      rpc,
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: eqUpdate })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
      })),
    };
    const state = await writeBreakingTicker(client, { active: true, text: 'নতুন' });
    expect(rpc).toHaveBeenCalled();
    expect(eqUpdate).toHaveBeenCalledWith('id', 1);
    expect(state.text).toBe('নতুন');
  });
});
