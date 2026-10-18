# Production-readiness handoff (evidence snapshot: 2026-10-19)

This document records what was verifiable through repository metadata and source at the time of review. It is not a production change approval, database migration, or declaration that the live deployment matches the repository.

## Evidence labels

- **VERIFIED** — directly present in the repository/API response inspected.
- **USER-REPORTED** — supplied by the project owner; not independently reproduced here.
- **INFERRED** — reasonable conclusion from available evidence, not proof of runtime behavior.
- **NOT-VERIFIED** — requires deployment, provider, database, or runner access not established by this review.

## Repository and deployment state

| Item | Status | Evidence / next action |
|---|---|---|
| Main repository default branch | VERIFIED | `MATI-AI-HUB/automation-king-`, default branch `main`, observed HEAD `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`. This is a repository SHA, **not** a verified production deployment SHA. |
| Frontend manifest | VERIFIED | `frontend/package.json` declares Next.js `^15.5.25`, React `^18.3.1`, TypeScript `^5.9.3`, Vitest `^5.0.0`. These are semver ranges, not installed-version evidence. |
| Package manager / lockfile | VERIFIED | npm lockfile v3 exists at `frontend/package-lock.json`; CI uses Node.js 22 and `npm ci --legacy-peer-deps`. |
| Production deployment commit, environment scopes, current Vercel deployment | NOT-VERIFIED | Read-only provider/deployment access is required. Do not infer from `main` HEAD. |
| Supabase deployed schema, grants, RLS and migration ledger | NOT-VERIFIED | Read-only database/Supabase metadata evidence is required. No migration should be applied from this handoff. |
| Other developers' local dirty working tree | NOT-VERIFIED | Remote Git metadata cannot establish another person's local working tree state. |

## Existing pull requests and scope boundaries

- **PR #35** (open, not merged when inspected): e-paper archive, APK/CDN redirect, video fallback, TTS and auth hardening. Its body says `epaper_archive_storage` was applied; that is **USER-REPORTED in the PR description**, not independently verified against the live migration ledger. Do not duplicate or blindly merge this work.
- **PR #32** (open, not merged when inspected): public article views and server-side Supabase fallback. Its description refers to `public_articles_feed` and `public_article_detail`; actual deployed object names, definitions, grants and data projection remain **NOT-VERIFIED**. Do not add a service-role fallback or guessed view/function to work around RLS.
- **PR #36** (open Draft when inspected): SSR share destinations, canonical article URL prop, share tests, and CI runbook. It has not been merged or deployed. Its checks must not be treated as passing merely because the code or standalone URL smoke test exists.

## Share-link implementation: review contract

The proposed UI change builds Facebook, X, WhatsApp and Telegram URLs from the server-provided canonical article URL, URL-encodes title/URL values, and offers native share plus clipboard fallback. A standalone Node smoke test of a mirrored URL-builder implementation passed 4/4 cases; this is **not** execution of the project TSX tests and does not prove the application builds.

Before merge, run in a clean checkout using the committed lockfiles:

```sh
cd frontend
npm ci --legacy-peer-deps
npx tsc --noEmit
npm run lint
npm run build
npx vitest run
```

Also inspect the raw server response and hydrated browser for a real published article, a Bengali Unicode slug/title, punctuation, both share-button placements, and missing/invalid `NEXT_PUBLIC_SITE_URL`. Confirm preview canonical behavior. Do not use arbitrary request `Host` values to construct absolute share URLs. No full app build, typecheck, lint, or TSX test result is claimed by this handoff.

## APK release gate

The app repository's GitHub Releases API returned an empty list at the time inspected. Therefore a public signed release, version, checksum and trusted download target have **not** been verified. Keep any APK CTA disabled or explicitly unavailable until the release pipeline and artifact can be verified. A 200 response alone is insufficient. Test redirect behavior for untrusted targets and confirm the endpoint cannot be used as an open redirect. Never expose signing secrets.

## Supabase agent handoff contract — proposal only, no guessed schema

**Ownership:** application/worker agent owns code and tests; Supabase agent owns schema, grants, RLS, RPC and Storage policy proposals. Only one agent may author a database change.

Before implementing any schema-dependent code, Supabase agent must return the following using actual project metadata and migration history:

| Contract field | Required answer |
|---|---|
| Object identity | Exact schema-qualified table/view/function/policy/storage-bucket names and current definitions; explicitly resolve singular/plural names such as `public_article_detail` vs `public_articles_detail`. |
| Fields | Exact column names, PostgreSQL types, nullability, defaults, enum values, and generated type source. No inferred columns. |
| Caller identity | Anonymous, authenticated, editor/admin, or service role; exact grants and RLS policy predicates. |
| Public projection | Explicit allowlist of fields for public article list and public article detail; prove draft, embargoed, premium full-body, private reporter data, tokens and internal verification notes cannot be returned. |
| Paid/private projection | Separate authorized response shape and server-side entitlement rule; no reliance on client role flags. |
| API contract | Exact request/response shape, error semantics (missing vs forbidden vs backend/configuration failure), pagination and bounds. |
| Compatibility | Existing migration dependency, deploy order, backward compatibility, generated-type update and rollback/forward-fix strategy. |
| Cache contract | Which responses are public-cacheable vs private/no-store; invalidation on publish, correction, unpublish and entitlement change. |
| Evidence | Read-only query output or migration-ledger evidence, preview test cases, and rollback plan. Do not copy production PII or secrets into staging. |

**Current status:** no Supabase object names or field types are approved by this document. No SQL, grants, RLS changes, migrations, or generated types were changed.

## CI and offline validation

The repository CI workflow is triggered on pull requests targeting `main` and defines worker typecheck/tests, frontend typecheck/lint/build/tests, a JWT-pattern scan, and Gitleaks history scan. The observed run `https://github.com/MATI-AI-HUB/automation-king-/actions/runs/39163173529` showed jobs finishing with no steps executed; treat it as a runner/quota execution failure, **not** as evidence that tests passed or failed. Do not bypass branch protection or manually mark required checks successful.

If hosted CI quota remains exhausted, use a clean local clone or an authorized self-hosted runner with Node.js 22 and lockfiles. Record OS, Node/npm versions, commit SHA, exact command, exit code and log artifact. Run secret scanning locally with a trusted installed scanner. Keep external email, social, payment, publishing and webhook side effects disabled or sandboxed. No production credentials are needed for the frontend unit/type/lint/build checks unless the application configuration explicitly requires non-secret test placeholders.

## License and external-service inventory (initial, incomplete)

- **VERIFIED:** root repository metadata reports license key `other` / SPDX `NOASSERTION`; do not describe the repository as open-source until the actual root `LICENSE` terms and third-party asset rights are reviewed.
- **VERIFIED:** frontend manifest includes Next.js, React, Supabase JS/SSR, Sentry, Upstash Redis/Ratelimit, PostgreSQL client, Next Intl, Vite/Vitest, Tailwind CSS and related tooling. Their presence does not prove that all services are enabled in production.
- **VERIFIED:** workflows reference GitHub Actions and external artifact/download hosts; CI uses GitHub-hosted Ubuntu runners. These are external service dependencies, not “100% open-source”.
- **NOT-VERIFIED:** exact resolved dependency vulnerability/license report, Vercel plan eligibility, Supabase plan/region, Sentry/Upstash usage and commercial terms, SMTP/newsletter delivery, payment provider, analytics consent implementation, APK signer/release artifact, and production integration scopes. Generate a lockfile-based SBOM/license report and verify provider plans before commercial or white-label commitments.

## Production-safe rollout / rollback checklist

1. Capture current production deployment URL and SHA from the hosting provider; preserve the known-good deployment.
2. Confirm PR #35/#32 decisions and actual database migration ledger before selecting a merge order.
3. Run clean-lockfile CI locally or on an authorized runner; no bypass of branch protection.
4. Deploy to preview only after the repository owner authorizes it; use test fixtures and sandbox integrations.
5. Verify home, search, a published article, e-paper, login and admin guard; verify unknown routes are true 404s and backend/config failures are not disguised as 404s.
6. Verify raw HTML share destinations and browser hydration; test draft/premium leakage through HTML, RSC and JSON responses.
7. Confirm no external side effects, no private cache leakage, and no broken APK CTA/debug ad labels.
8. Obtain explicit production deployment approval before release. Observe error rate, cache behavior and share interactions after release.
9. Roll back the application to the known-good deployment if smoke checks regress. Treat database rollback separately; prefer compatible forward fixes and never delete data as a rollback shortcut.

## Measurements and current non-claims

- The owner-reported batch-1 median TTFB values are 2.320s (home), 1.339s (e-paper), 1.918s (search), and 2.163s (article); they have not been independently reproduced here.
- PageSpeed Insights score: **not measured** (owner reported API quota exhausted).
- Before/after performance, field p75 LCP/INP/CLS, raw response verification, preview smoke results, deployed commit SHA and production schema: **not measured / NOT-VERIFIED**.
- No merge, production deployment, live migration, secret rotation, scheduler change, social post or payment activation was performed as part of this handoff.

## Explicit approval required

Separate explicit approval is required for merge, production deployment, any live database/schema/grant/RLS change, secret rotation, scheduler/cron change, social publishing, newsletter bulk send, payment activation, production data export, or hosting/DNS/database cutover.
