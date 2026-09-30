import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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
      issuer: "BanglarVoice",
      friendlyName: user.email ?? user.id,
    });
    if (error || !data) return json({ error: error?.message ?? "could not enroll totp" }, 500);
    return json({
      factor_id: data.id,
      qr_code: data.totp.qr_code,
      secret: data.totp.secret,
      otpauth_url: data.totp.uri,
    });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? body.token ?? "");
  const factorId = String(body.factor_id ?? body.factorId ?? "");

  if (action === "challenge") {
    const { data, error } = await client.auth.mfa.challenge({ factorId });
    if (error || !data) return json({ error: error?.message ?? "challenge failed" }, 400);
    return json({ challenge_id: data.id, expires_at: data.expires_at });
  }

  if (action === "verify") {
    const challengeId = String(body.challenge_id ?? body.challengeId ?? "");
    const { data, error } = await client.auth.mfa.verify({ factorId, challengeId, code });
    if (error) return json({ error: error.message, valid: false }, 400);
    return json({ valid: true, aal: data?.user?.aal ?? "aal2" });
  }

  if (action === "unenroll" || action === "disable") {
    const { error } = await client.auth.mfa.unenroll({ factorId });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "unknown action" }, 404);
});
