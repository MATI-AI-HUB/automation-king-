import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface AiLogPayload {
  userId?: string;
  model: string;
  provider: string;
  promptVersion?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  status?: 'success' | 'error';
  errorMessage?: string;
}

export async function logAiCost(payload: AiLogPayload) {
  try {
    const supabaseAdmin = getAdmin();
    if (!supabaseAdmin) return;
    const { error } = await supabaseAdmin.from('ai_audit_log').insert({
      user_id: payload.userId || null,
      model: payload.model,
      provider: payload.provider,
      prompt_version: payload.promptVersion || null,
      input_tokens: payload.inputTokens,
      output_tokens: payload.outputTokens,
      cost_usd: payload.costUsd,
      latency_ms: payload.latencyMs,
      status: payload.status || 'success',
      error_message: payload.errorMessage || null,
    });

    if (error) {
      console.error('Failed to insert AI audit log:', error.message);
    }
  } catch (err) {
    console.error('Unexpected error in logAiCost:', err);
  }
}
