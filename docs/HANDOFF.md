# HANDOFF 2026-09-30

Branch: `260929-feat-code-readiness-hardened-db`
Owner commits: `MATI-AI-HUB <matiailearninghub@gmail.com>`
Rule: nothing under `supabase/migrations/` until `CONFIRM: production`. No secrets in git.

This clone started on `main` (7e22421) with no prior feature-branch drafts. Work below is new on this branch.

## P1 Preserve
- Drafts written to `supabase/prepared/` and `supabase/rollbacks/` (not migrations).
- Commit `174b6e6` MATI-AI-HUB <matiailearninghub@gmail.com> pushed to `origin/260929-feat-code-readiness-hardened-db`.
- Draft PR: PENDING — `gh` not logged in. Open: https://github.com/MATI-AI-HUB/automation-king-/pull/new/260929-feat-code-readiness-hardened-db

## P2 Inventory
- DONE: `docs/supabase-operations.md`, `docs/supabase-operations.json`
- No client `service_role` (CRITICAL none). Server/worker/edge use it.
- PENDING Supabase agent: confirm `published_articles_safe`, `review_status`, storage staff_reporter read-any vs own+staff/.

## P3 Vercel ignore
- DONE: `frontend/scripts/vercel-ignore.sh` skips every branch except `main`, then skips when `frontend/` unchanged.
- Tests: `frontend/__tests__/vercel-ignore.test.ts`

## P4 Server-route auth
- DONE: `requireAdminDetailed` session + role + aal2 (admin/chief_editor; desk_editor via `DESK_EDITOR_REQUIRE_AAL2`, default off).
- Wired on approve/reject/pending/breaking/api-keys.
- Control/verification already called `requireAdmin`; they inherit aal2 via the new helper.
- Tests: `frontend/__tests__/admin-guard.test.ts`, `admin-routes-auth.test.ts`

## P5 Flags
- DONE: no client profile INSERT helper; notifications update only `is_read`; reject/archive not DELETE; public reads prefer `published_articles_safe`.
- Queue statuses include submitted/approved/published/retracted mapping with column fallback.

## P6 Ticker
- DONE: admin breaking route calls `set_breaking_ticker(p_text text)` (existing signature). Feature-detect; `persisted` flag.
- Contract: `supabase/prepared/set_breaking_ticker_contract.sql`
- ASK Supabase agent: additive `p_active boolean` not applied.

## P7 MFA
- DONE: web login TOTP challenge; `/api/auth/mfa`; edge `two-factor` no longer writes `profiles.two_factor_secret`.
- NOTE: merging to main deploys functions.

## P8 Backup
- DONE: extended `.github/workflows/backup-automation.yml` (ACL kept, public+auth+storage, age/openssl, size + `pg_restore -l`, mask URL, client>=server, 3-day toc artifact).
- Docs: `docs/restore.md`. Not run.

## P9 Staging matrix
- DONE: `frontend/__tests__/staging-role-matrix.test.ts` aborts without `STAGING_*` and refuses production ref.
- On-demand CI job `staging-role-matrix` via `workflow_dispatch`.
- Do not run live until secrets confirmed.

## P10 Ingest switch
- DONE: `vars.INGEST_ENABLED` (skip when `false`). Checklist: `docs/ingest-switchover.md`.
- Source chip / মূল সংবাদ / image credit / Bangla time already in feed mapping; every card gets `source_name` (fallback সূত্র in feed.json).

## P11 Flutter
- DONE plan only: `docs/flutter-repair-plan.md` + anon key rotation note.

## P12 Status
- Vercel: UNKNOWN in this environment (no Vercel token). Previous finding: Hobby quota / DEPLOYMENT_NOT_FOUND on banglarvoice24news.com. No retry loop.
- Domain mapping: UNKNOWN (docs still list banglarvoice24news.com).
- CI: local tests run on this branch; GitHub CI UNKNOWN until push.

## Next action for you
1. Open a draft PR from https://github.com/MATI-AI-HUB/automation-king-/pull/new/260929-feat-code-readiness-hardened-db (`gh` not authenticated here). Do not merge to main.
2. Create repo variable `INGEST_ENABLED=true` (or leave unset).
3. Confirm backup secrets `BACKUP_AGE_RECIPIENT` or `BACKUP_OPENSSL_PASSPHRASE` exist — do not run backup yet.
4. Do not merge to main (deploys Edge Functions).
5. Supabase agent: `published_articles_safe`, optional `set_breaking_ticker(p_text, p_active)`, storage policy tightening.
