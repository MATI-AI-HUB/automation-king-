import { allGatesPass, runGates, type GateInput, type GateResult, type GateId } from './gates';
import { classifySensitivityRules, type SensitivityFlag } from './sensitivity';

export type PublishDecision = 'auto' | 'needs_review';

export type PublishInput = GateInput & {
  riskScore?: number | null;
  riskThreshold?: number;
  combinedText?: string;
};

export function decidePublish(input: PublishInput): {
  decision: PublishDecision;
  gates: Record<GateId, GateResult>;
  flags: SensitivityFlag[];
  reason: string;
} {
  const gates = runGates(input);
  const flags = classifySensitivityRules(input.combinedText || input.banglaText || input.headline || '');
  const risk = input.riskScore;
  const threshold = input.riskThreshold ?? 0.5;

  if (!allGatesPass(gates)) {
    return { decision: 'needs_review', gates, flags, reason: 'gate_fail' };
  }
  if (flags.length > 0) {
    return { decision: 'needs_review', gates, flags, reason: 'sensitive' };
  }
  if (risk === null || risk === undefined) {
    return { decision: 'needs_review', gates, flags, reason: 'risk_unknown' };
  }
  if (risk > threshold) {
    return { decision: 'needs_review', gates, flags, reason: 'risk_above_threshold' };
  }
  return { decision: 'auto', gates, flags, reason: 'all_pass' };
}
