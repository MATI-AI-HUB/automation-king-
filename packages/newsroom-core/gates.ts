export type GateId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';

export type GateResult = { pass: boolean; score: number; reason: string };

export type GateInput = {
  banglaText?: string | null;
  sourceText?: string | null;
  sourcePublishedAt?: string | null;
  now?: Date;
  headline?: string | null;
  bodyPlaces?: string[];
  headlinePlaces?: string[];
  captionPlaces?: string[];
  imageLicense?: string | null;
  imageOurs?: boolean;
  imageVisionMatch?: boolean | null;
  corroborationCount?: number | null;
  tier?: 1 | 2;
  breaking?: boolean;
  rumor?: boolean;
  similarityToSource?: number | null;
  plagiarismMax?: number;
  clickbait?: boolean | null;
  grammarOk?: boolean | null;
};

const UNKNOWN = (id: GateId): GateResult => ({
  pass: false,
  score: 0,
  reason: `${id}_unknown`,
});

function knownString(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function gateG1Grounding(input: GateInput): GateResult {
  if (!knownString(input.banglaText) || !knownString(input.sourceText)) return UNKNOWN('G1');
  const source = input.sourceText.toLowerCase();
  const numbers = input.banglaText.match(/\d+/g) || [];
  for (const n of numbers) {
    if (!source.includes(n)) {
      return { pass: false, score: 0.2, reason: 'G1_unsupported_number' };
    }
  }
  return { pass: true, score: 0.9, reason: 'G1_ok' };
}

export function gateG2Time(input: GateInput): GateResult {
  if (!knownString(input.sourcePublishedAt)) return UNKNOWN('G2');
  const t = Date.parse(input.sourcePublishedAt);
  if (Number.isNaN(t)) return { pass: false, score: 0, reason: 'G2_invalid' };
  const now = (input.now ?? new Date()).getTime();
  if (t > now + 60_000) return { pass: false, score: 0, reason: 'G2_future' };
  const ageH = (now - t) / 3_600_000;
  if (ageH > 24) return { pass: false, score: 0.4, reason: 'G2_older_than_24h' };
  return { pass: true, score: 1, reason: 'G2_ok' };
}

export function gateG3Place(input: GateInput): GateResult {
  const sets = [input.headlinePlaces, input.bodyPlaces, input.captionPlaces];
  if (sets.every((s) => s === undefined)) return UNKNOWN('G3');
  const all = sets.flatMap((s) => s || []).map((p) => p.trim().toLowerCase()).filter(Boolean);
  if (all.length === 0) return UNKNOWN('G3');
  const uniq = new Set(all);
  if (uniq.size > 1 && all.length >= 2) {
    const countries = [...uniq];
    if (countries.length > 3) return { pass: false, score: 0.3, reason: 'G3_conflict' };
  }
  return { pass: true, score: 0.8, reason: 'G3_ok' };
}

export function gateG4Image(input: GateInput): GateResult {
  if (input.imageOurs === true) return { pass: true, score: 1, reason: 'G4_ours' };
  if (!input.imageLicense && input.imageOurs !== true) {
    return { pass: true, score: 1, reason: 'G4_no_image' };
  }
  const lic = (input.imageLicense || '').toLowerCase();
  const allowed = lic.includes('cc') || lic.includes('public domain') || lic.includes('permitted');
  if (!allowed) return { pass: false, score: 0, reason: 'G4_license_unclear' };
  if (input.imageVisionMatch === null || input.imageVisionMatch === undefined) {
    return UNKNOWN('G4');
  }
  if (input.imageVisionMatch === false) return { pass: false, score: 0.1, reason: 'G4_vision_mismatch' };
  return { pass: true, score: 0.9, reason: 'G4_ok' };
}

export function gateG5Corroboration(input: GateInput): GateResult {
  if (input.corroborationCount === null || input.corroborationCount === undefined || !input.tier) {
    return UNKNOWN('G5');
  }
  if (input.breaking || input.rumor) return { pass: false, score: 0.2, reason: 'G5_breaking_or_rumor' };
  if (input.tier === 1 && input.corroborationCount >= 1) return { pass: true, score: 1, reason: 'G5_tier1' };
  if (input.tier === 2 && input.corroborationCount >= 2) return { pass: true, score: 1, reason: 'G5_tier2' };
  return { pass: false, score: 0.3, reason: 'G5_insufficient' };
}

export function gateG6Quality(input: GateInput): GateResult {
  if (
    input.similarityToSource === null ||
    input.similarityToSource === undefined ||
    input.clickbait === null ||
    input.clickbait === undefined ||
    input.grammarOk === null ||
    input.grammarOk === undefined
  ) {
    return UNKNOWN('G6');
  }
  const max = input.plagiarismMax ?? 0.35;
  if (input.similarityToSource >= max) return { pass: false, score: 0.2, reason: 'G6_plagiarism' };
  if (input.clickbait) return { pass: false, score: 0.3, reason: 'G6_clickbait' };
  if (!input.grammarOk) return { pass: false, score: 0.3, reason: 'G6_grammar' };
  return { pass: true, score: 0.9, reason: 'G6_ok' };
}

export function runGates(input: GateInput): Record<GateId, GateResult> {
  return {
    G1: gateG1Grounding(input),
    G2: gateG2Time(input),
    G3: gateG3Place(input),
    G4: gateG4Image(input),
    G5: gateG5Corroboration(input),
    G6: gateG6Quality(input),
  };
}

export function allGatesPass(gates: Record<GateId, GateResult>): boolean {
  return (Object.keys(gates) as GateId[]).every((k) => gates[k].pass === true);
}
