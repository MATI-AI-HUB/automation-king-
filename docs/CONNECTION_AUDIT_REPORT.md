# A-to-Z Connection Audit — Banglar Voice / automation-king-

**Date:** 2026-09-27
**Auditor:** MonkeyCode-AI Coding Agent
**Repo:** `https://github.com/MATI-AI-HUB/automation-king-`
**Canonical owner email:** `matiailearninghub@gmail.com`
**Vercel Hobby owner:** `matiailearninghub-3927`
**Domain:** `www.banglarvoice24news.com`

This report cross-checks GitHub, Vercel Hobby, and Supabase from repo files plus operator screenshots. No second Gmail was logged into Vercel or Supabase. No Vercel CLI deploy token was used.

---

## 0. Authority

| Item | Required | Observed | Verdict |
|---|---|---|---|
| Git author email | `matiailearninghub@gmail.com` | Latest origin commit `ba487aa` authored by `MATI-AI-HUB <matiailearninghub@gmail.com>` | PASS |
| Local git identity before this pass | must match owner | Was `monkeycode-ai@chaitin.com` in `.git/config` | FAIL then FIXED locally (`git config user.email`) |
| Vercel account | Hobby `matiailearninghub-3927` | Screenshot: team switcher shows only this Hobby account | PASS |
| Extra Vercel team / co-authorized Gmail | none | Screenshot: "Teams you create and join appear here" empty; no second team | PASS — do not add another Gmail |
| GitHub remote | `MATI-AI-HUB/automation-king-` | `origin` points here | PASS |

**Action taken:** local `user.email` set to `matiailearninghub@gmail.com`. Commits from this pass use that identity. Vercel Hobby does not accept a second authorized Gmail; no CLI login / team invite was attempted.

---

## 1. GitHub layer

| Check | Result |
|---|---|
| Default branch | `main` tracks `origin/main` at `ba487aa` |
| Submodules | none (`.gitmodules` absent) |
| Duplicate Edge Function deploy workflows | `supabase-deploy.yml` fired on every `push:main` and raced `supabase-functions-deploy.yml` | FIXED — duplicate workflow disabled |
| Node in CI | was `20` (deprecation) | FIXED — `22` to match `frontend/.nvmrc` |
| `supabase/config.toml` | missing at repo root | FIXED — `project_id = "fqqdpngmftoddffvdukn"` + per-function `verify_jwt` |
| Hardcoded LLM / service-role secrets in source | not introduced this pass | PASS (keys stay in Vercel / GitHub Secrets) |

---

## 2. Vercel layer (Hobby)

Evidence: operator screenshots of `vercel.com/matiai` Project Settings.

| Setting | Observed | Required | Verdict |
|---|---|---|---|
| Account | `matiailearninghub-3927` Hobby | same | PASS |
| Project | `automation-king` | same | PASS |
| Project ID | `prj_aoTzgNp8gLeKLgOqRjU2JTB7IK7Q` | keep; do not recreate | PASS |
| Framework | Next.js | Next.js | PASS |
| Root Directory | `frontend` | `frontend` (monorepo) | PASS |
| Include files outside root | Enabled | Enabled | PASS |
| Skip deployments (no root-dir change) | Enabled | OK for monorepo | PASS |
| Node.js | **24.x** | repo `.nvmrc` = `22` | WARN — dashboard 24 vs repo 22; Vercel auto-detects `.nvmrc` on build if not overridden |
| Build / Install / Output | not overridden in dashboard; `frontend/vercel.json` supplies them | `npm run build`, `npm install --legacy-peer-deps`, `.next` | PASS (file-driven) |
| Git integration | Native GitHub (Production Checklist: Connect Git Repository checked) | Native only; no extra Vercel Deploy workflow | PASS |
| Custom domain | `www.banglarvoice24news.com` | linked | PASS |
| Recent production | rolled back 8h ago by `matiailearninghub-3927` | owner-only rollback | PASS |
| Preview branch | `chore/newsroom-production-hardening` preview `HoJbm9W9q` | Git-linked previews work | PASS |
| Observability | Edge requests ~86, function invocations ~40, error rate 0% (6h) | live | PASS |
| Duplicate CLI deploy | not used this pass | Hobby blocks extra OAuth | PASS |

**Do not:** create a second Vercel project, invite another Gmail, or add `VERCEL_TOKEN` / `VERCEL_ORG_ID` workflow. Native GitHub integration already deploys.

---

## 3. Supabase layer

Evidence: operator screenshots of Studio + `AUDIT_PROMPT.md` + repo `supabase/`.

| Check | Observed | Verdict |
|---|---|---|
| Linked GitHub | `MATI-AI-HUB/automation-king-` | PASS — already connected |
| Project ref in Studio | `fqqdpngmftoddffvdukn` (`https://fqqdpngmftoddffvdukn.supabase.co`) | PASS for the currently linked project |
| Region | Tokyo `ap-northeast-1`, compute `t3.nano` | PASS (matches screenshot) |
| Branch | `main` PRODUCTION | PASS |
| Status | Healthy | PASS |
| Last migration | `newsroom_automation` | PASS |
| Advisor | no issues | PASS |
| API gateway (60m) | 3 requests, 1 warning, 0 errors | WARN — very low traffic / some warnings |
| Postgres (60m) | 1 request, 1 error | WARN — investigate Studio logs |
| Log Query usage | Free 100 GB included, **174.23 GB used, 74.23 GB overage** | FAIL (cost) — enforcement after grace period start of 2027; cut noisy log scans |
| `AUDIT_PROMPT.md` "Prod Singapore `rcffuqkofvuezgbjcixj`" vs live Studio `fqqdpngmftoddffvdukn` | two project refs exist in docs | WARN — live GitHub-linked project is Tokyo `fqqdpngmftoddffvdukn`. Do not retarget Vercel env at a different ref without owner confirmation |
| Edge `verify_jwt` | was unset | FIXED in `supabase/config.toml` (pipeline/writer/cron/ai-process `false`; getApiKey/paywall/two-factor `true`) |

---

## 4. Code wiring (this pass)

| Area | Change | Status |
|---|---|---|
| Browser client | `frontend/lib/supabase/client.ts` — no placeholder keys | PASS |
| Server client | cookie-aware `@supabase/ssr` (`server.ts`) | PASS |
| Admin / service-role | single helper `frontend/lib/supabase/admin.ts` | PASS |
| Env guard | `frontend/lib/supabase/env.ts` | PASS |
| Public feed / live / videos / channels | shared anon client | PASS |
| Admin API routes | shared admin client | PASS |
| Middleware | skips crash when env missing; still gates `/admin` | PASS |
| Reverse proxy | `next.config.js` rewrites `/api/supabase/:path*` → linked Supabase URL | PASS |
| Worker | `SUPABASE_URL` fallback + no crash if key empty | PASS |
| Health | `/api/health` reports `supabase.configured` / `admin` | PASS |
| Frontend `tsc --noEmit` | 0 | PASS |
| Frontend `next lint` | 0 errors (2 pre-existing img warnings) | PASS |
| Worker `tsc --noEmit` | 0 | PASS |

---

## 5. Root-cause notes (live site vs template)

1. **Empty feed / template homepage** is env or data, not missing Git link. If Vercel Production `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` are unset or point at a project with zero `articles.status=published`, `/api/public/feed.json` returns 503/empty and the UI falls back.
2. **Hobby rollback 8h ago** is on the owner account; promoting the latest Git `main` after this push is the owner action in Vercel (Promote to production / re-enable auto-assign custom domains).
3. **Wrong git email** was local agent config only (`monkeycode-ai@chaitin.com`). It was not a Vercel team member. Fixed before commit/push.

---

## 6. Final checklist

| Step | Status |
|---|---|
| Wrong local git email removed | DONE |
| Correct email `matiailearninghub@gmail.com` set | DONE |
| No second Gmail invited to Vercel Hobby | DONE (not attempted) |
| Native GitHub → Vercel still the only frontend deploy path | DONE |
| Supabase GitHub integration left on `fqqdpngmftoddffvdukn` | DONE |
| Duplicate `supabase-deploy.yml` disabled | DONE |
| Code push to `MATI-AI-HUB/automation-king-` | this session |
| Vercel will pick up the branch/PR via existing Git integration | expected after push — no extra OAuth |
| Owner: confirm Production env URL is `https://fqqdpngmftoddffvdukn.supabase.co` | OWNER ACTION |
| Owner: reduce Supabase log-query scans (74 GB overage) | OWNER ACTION |
| Owner: after merge, Promote latest deployment if domain still on rollback | OWNER ACTION |

---

## 7. Sources

- Vercel docs: GitHub integration deploys without a second CLI identity.
- Supabase docs: `supabase/config.toml` `project_id` + `functions.<name>.verify_jwt`.
- Operator screenshots: Hobby settings (project id `prj_aoTzgNp8gLeKLgOqRjU2JTB7IK7Q`, root `frontend`, Node 24.x), Studio project `fqqdpngmftoddffvdukn`, log-query overage.
