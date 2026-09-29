import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

function callerClient(req: Request) {
  const authorization = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const action = new URL(req.url).pathname.split("/").pop() ?? "";
  const client = callerClient(req);
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  if (action === "enable" || action === "enroll") {
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "BanglarVoice",
    });
    if (error || !data) return json({ error: error?.message ?? "enroll_failed" }, 500);
    return json({
      factorId: data.id,
      secret: data.totp.secret,
      qr_code: data.totp.qr_code,
      otpauth_url: data.totp.uri,
    });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "");
  const factorId = String(body.factorId ?? "");

  if (action === "verify" || action === "challenge") {
    const { data: factors, error: listError } = await client.auth.mfa.listFactors();
    if (listError) return json({ error: listError.message }, 500);
    const totp = (factors?.totp ?? []).find((f) => f.id === factorId) ?? (factors?.totp ?? [])[0];
    if (!totp) return json({ error: "no_totp_factor" }, 400);
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: totp.id });
    if (challengeError || !challenge) return json({ error: challengeError?.message ?? "challenge_failed" }, 400);
    const { error: verifyError } = await client.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) return json({ valid: false, error: verifyError.message }, 400);
    return json({ valid: true, ok: true });
  }

  if (action === "disable" || action === "unenroll") {
    const { data: factors, error: listError } = await client.auth.mfa.listFactors();
    if (listError) return json({ error: listError.message }, 500);
    const totp = (factors?.totp ?? []).find((f) => f.id === factorId) ?? (factors?.totp ?? [])[0];
    if (!totp) return json({ error: "no_totp_factor" }, 400);
    const { error } = await client.auth.mfa.unenroll({ factorId: totp.id });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "unknown action" }, 404);
});
