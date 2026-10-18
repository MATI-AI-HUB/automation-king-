// Banglar Voice — Facebook social scheduler (Supabase Edge Function).
// Triggered by pg_cron every 5 minutes. Timing rules (08:00–22:00 Dhaka,
// 25 posts / rolling 24h, 33–45 minute jittered gap) are enforced atomically
// in Postgres by public.claim_next_social_post; this function only publishes
// the claimed article and records the outcome.
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE_URL = "https://www.banglarvoice24news.com";
const GRAPH_VERSION = "v21.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function graph(path: string, body: Record<string, string>) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "not_configured" }, 500);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const secret = async (name: string): Promise<string | null> => {
    const { data } = await supabase.rpc("get_decrypted_secret", { p_secret_name: name });
    return typeof data === "string" && data.length > 0 ? data : null;
  };

  const cronSecret = await secret("CRON_SECRET");
  const supplied = req.headers.get("x-cron-secret") ?? "";
  if (!cronSecret || !timingSafeEqual(supplied, cronSecret)) {
    return json({ error: "unauthorized" }, 401);
  }

  const { data: claimed, error: claimError } = await supabase.rpc("claim_next_social_post", {
    p_platform: "facebook",
  });
  if (claimError) return json({ error: "claim_failed" }, 500);

  const post = Array.isArray(claimed) ? claimed[0] : null;
  if (!post) return json({ status: "idle" });

  const finish = (status: "published" | "failed" | "skipped", externalId?: string, error?: string) =>
    supabase.rpc("complete_social_post", {
      p_post_id: post.post_id,
      p_status: status,
      p_external_post_id: externalId ?? null,
      p_error: error ?? null,
    });

  try {
    const [pageId, token] = await Promise.all([
      secret("SOCIAL_FACEBOOK_PAGE_ID"),
      secret("SOCIAL_FACEBOOK_PAGE_TOKEN"),
    ]);
    if (!pageId || !token) {
      await finish("skipped", undefined, "missing Facebook credentials");
      return json({ status: "skipped", reason: "missing_credentials" });
    }

    const caption = [post.title_bn, post.excerpt_bn].filter(Boolean).join("\n\n").slice(0, 450);
    const published = await graph(`${pageId}/photos`, {
      url: `${BASE_URL}/api/social-card/${post.article_id}`,
      caption,
      alt_text_custom: String(post.title_bn ?? "").slice(0, 200),
      access_token: token,
    });

    const postId = typeof published.data?.post_id === "string" ? published.data.post_id : published.data?.id;
    if (published.response.status !== 200 || !postId) {
      await finish("failed", undefined, published.data?.error?.message ?? "Facebook publish failed");
      return json({ status: "failed" }, 502);
    }

    await finish("published", postId);

    // Link goes in the first comment (link-free posts get better reach); a
    // comment failure must never undo a successful publish.
    const link = `${BASE_URL}/article/${encodeURIComponent(post.slug || post.article_id)}`;
    await graph(`${postId}/comments`, { message: link, access_token: token }).catch(() => null);

    return json({ status: "published", article_id: post.article_id });
  } catch (error) {
    await finish("failed", undefined, error instanceof Error ? error.message : "unexpected error");
    return json({ status: "failed" }, 500);
  }
});
