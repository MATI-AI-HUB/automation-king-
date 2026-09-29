import { describe, expect, it } from 'vitest';
import { assertSafeHttpsUrl, isBlockedHost } from './ssrf';
import { assertResponseSize } from './limits';
import { assertSafeXml } from './xml-guard';
import { ingestAuth } from './ingest-key';
import { canonicalUrl } from './canonical';
import { dedupHash, titleSimilarity } from './dedup';
import { gateG1Grounding, gateG2Time, gateG4Image, gateG5Corroboration, gateG6Quality, runGates } from './gates';
import { classifySensitivityRules } from './sensitivity';
import { decidePublish } from './publish-decision';
import { buildConditionalHeaders, parseConditionalResponse } from './conditional-get';

describe('ssrf https-only', () => {
  it('blocks http and private hosts', () => {
    expect(() => assertSafeHttpsUrl('http://example.com/x')).toThrow('blocked_protocol');
    expect(() => assertSafeHttpsUrl('https://127.0.0.1/x')).toThrow('blocked_host');
    expect(isBlockedHost('10.1.1.1')).toBe(true);
    expect(() => assertSafeHttpsUrl('https://feeds.bbci.co.uk/rss.xml')).not.toThrow();
  });
});

describe('size and xml', () => {
  it('caps response size', () => {
    expect(() => assertResponseSize(2_000_001)).toThrow('response_too_large');
    expect(() => assertResponseSize(10)).not.toThrow();
  });
  it('rejects entity bombs', () => {
    expect(() => assertSafeXml('<!DOCTYPE foo [<!ENTITY x "a">]>')).toThrow();
    expect(() => assertSafeXml('<rss><item/></rss>')).not.toThrow();
  });
});

describe('ingest key', () => {
  it('unset is 500', () => {
    expect(ingestAuth('a', undefined)).toEqual({ ok: false, status: 500, error: 'ingest_unconfigured' });
  });
  it('wrong is 401', () => {
    expect(ingestAuth('nope', 'secret')).toEqual({ ok: false, status: 401, error: 'unauthorized' });
  });
  it('match ok', () => {
    expect(ingestAuth('secret', 'secret')).toEqual({ ok: true });
  });
});

describe('canonical and dedup', () => {
  it('strips tracking', () => {
    expect(canonicalUrl('https://Example.com/a/?utm_source=x')).toBe('https://example.com/a');
  });
  it('same canonical yields same hash', () => {
    const a = dedupHash('https://x.com/p?utm_source=a', 'Hello World');
    const b = dedupHash('https://x.com/p', 'hello world');
    expect(a).toBe(b);
  });
  it('similarity', () => {
    expect(titleSimilarity('france election results', 'france election results today')).toBeGreaterThan(0.4);
  });
});

describe('conditional get', () => {
  it('builds and parses', () => {
    const h = buildConditionalHeaders({ etag: '"1"', lastModified: 'Mon' });
    expect(h['If-None-Match']).toBe('"1"');
    const parsed = parseConditionalResponse({
      status: 304,
      headers: { get: (n: string) => (n === 'etag' ? '"1"' : null) },
    });
    expect(parsed.notModified).toBe(true);
  });
});

describe('gates unknown = fail', () => {
  it('G1 unknown', () => {
    expect(gateG1Grounding({}).pass).toBe(false);
  });
  it('G1 number mismatch fails', () => {
    expect(gateG1Grounding({ banglaText: '১২ dead 12', sourceText: 'no digits' }).pass).toBe(false);
  });
  it('G2 future fails', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(gateG2Time({ sourcePublishedAt: future }).pass).toBe(false);
  });
  it('G2 ok', () => {
    expect(gateG2Time({ sourcePublishedAt: new Date().toISOString() }).pass).toBe(true);
  });
  it('G4 missing image passes', () => {
    expect(gateG4Image({}).pass).toBe(true);
  });
  it('G5 tier2 needs two', () => {
    expect(gateG5Corroboration({ corroborationCount: 1, tier: 2 }).pass).toBe(false);
  });
  it('G6 unknown fails', () => {
    expect(gateG6Quality({}).pass).toBe(false);
  });
});

describe('publish decision fail-closed', () => {
  const good = {
    banglaText: '12 people',
    sourceText: '12 people in paris',
    sourcePublishedAt: new Date().toISOString(),
    headlinePlaces: ['paris'],
    bodyPlaces: ['paris'],
    corroborationCount: 2,
    tier: 2 as const,
    similarityToSource: 0.1,
    plagiarismMax: 0.35,
    clickbait: false,
    grammarOk: true,
    riskScore: 0.1,
    combinedText: 'trade talks in paris',
  };
  it('auto only when all pass', () => {
    expect(decidePublish(good).decision).toBe('auto');
  });
  it('sensitive never auto', () => {
    expect(decidePublish({ ...good, combinedText: 'murder in paris' }).decision).toBe('needs_review');
  });
  it('unknown risk never auto', () => {
    expect(decidePublish({ ...good, riskScore: null }).decision).toBe('needs_review');
  });
  it('gate fail never auto', () => {
    expect(decidePublish({ ...good, sourceText: null }).decision).toBe('needs_review');
  });
});

describe('sensitivity rules', () => {
  it('flags terrorism', () => {
    expect(classifySensitivityRules('terror attack downtown')).toContain('terrorism');
  });
  it('empty is none', () => {
    expect(classifySensitivityRules('')).toEqual([]);
  });
});

describe('runGates shape', () => {
  it('has six keys', () => {
    expect(Object.keys(runGates({}))).toEqual(['G1', 'G2', 'G3', 'G4', 'G5', 'G6']);
  });
});
