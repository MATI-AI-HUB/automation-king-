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


## Execution report for requested steps 1–5 (2026-10-19)

This section records the work actually completed in this execution. “Blocked / not verified” is not a pass. No deployment or production mutation was attempted.

### 1. Review PR #36 and SSR share-link change

**Status: STATIC REVIEW COMPLETED; runtime verification remains open.**

- PR #36 is still open and Draft, targeting `main`; it has not been merged.
- Reviewed the PR patch and source for `frontend/components/share-buttons.tsx`, `frontend/app/article/[slug]/page.tsx`, the four unit tests, and the CI runbook.
- Both share-button placements in the article page receive `canonicalArticleUrl(a.slug)`.
- The URL builder uses fixed HTTPS destinations for Facebook, X, WhatsApp and Telegram and URL-encodes title/URL values. The initial destination does not derive from `window.location` or the request Host.
- Latest static-source recheck: canonical metadata, Open Graph URL, JSON-LD `mainEntityOfPage`, and both share-button placements now call the same `canonicalArticleUrl` helper. The helper URL-encodes the slug. Still test the rendered output with Bengali/Unicode slugs in a real preview response.
- No browser hydration, preview HTML, or actual social share dialog was tested.

### 2. Alternative test execution while CI quota is exhausted

**Status: PARTIAL — isolated Node smoke tests passed; project checks NOT RUN.**

- Recreated the PR URL-builder logic in a standalone Node.js test file because this execution environment could not clone GitHub (DNS resolution for `github.com` failed).
- Result: 4/4 smoke tests passed for Facebook URL parameter, X/Telegram Unicode title and URL, WhatsApp title plus URL, and unknown platform.
- This test was run against a standalone mirror of the implementation, **not** against the imported TSX source or Vitest test file.
- `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npx vitest run` were **NOT RUN**. No clean repository checkout or installed project dependencies were available, and network clone failed. No full app test/build result is claimed.
- GitHub Actions run `39163173529` has four failed jobs with no executed steps. This is not evidence that code checks passed or that a project command failed.
- No branch protection was bypassed and no check was manually marked successful.

### 3. Production deployment SHA and Supabase migration ledger

**Status: NOT VERIFIED — provider/database access required.**

- The observed repository `main` SHA was `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`; this does **not** establish which commit is deployed to production.
- No verified hosting-provider deployment record or production environment scope was available in this execution.
- No read-only Supabase connection or migration-ledger evidence was available. PR #35's description mentions `epaper_archive_storage`, and PR #32 describes public article views; those descriptions are not proof of deployed schema state.
- No production credentials were requested or exposed. No SQL, migration, grants, RLS, database or secret changes were made.

### 4. APK release, signature, checksum and download target

**Status: RELEASE GATE BLOCKED — no public release artifact verified.**

- The app repository GitHub Releases API returned an empty array (`[]`) at inspection time.
- The repository's `docs/APK_AUDIT.md` itself says no APK/AAB binary was available for static artifact audit and no APK SHA-256/signature was recorded.
- The static workflow review shows `.github/workflows/android-release.yml` builds signed Android App Bundles (AABs), while `.github/workflows/release-apks.yml` delegates to `build_apks.yml`. Workflow definitions alone do not prove a signed artifact was produced or published.
- The signing-verification and release workflows were **not dispatched**: CI quota was reported exhausted, and running a signing/release workflow would require separate authorization and secret-backed actions.
- Do not advertise a download endpoint as ready until the exact artifact, signer certificate/fingerprint, version, SHA-256 and trusted destination have been verified. No signing secret was read or changed.

### 5. Preview/live smoke tests and private/premium content leakage

**Status: NOT RUN — no usable preview deployment was provided/verified; live fetch was blocked.**

- Attempted to open the public homepage and likely robots/sitemap/API URLs with the available web fetcher. The homepage returned a cache-miss fetch error; the other URLs were inaccessible through that fetcher. This is a tooling/access limitation, not proof the site is down.
- A direct repository clone also failed because `github.com` DNS resolution was unavailable from the execution container.
- No preview URL, hosting-provider access, authenticated test accounts, or safe test fixtures were available. Therefore homepage/search/article/e-paper/login/admin checks, raw HTML/RSC/API inspection, cache-header verification, and draft/premium leakage tests were **NOT RUN**.
- Static review note for follow-up: `loadArticle` in the article page catches API exceptions and can return the same `missing` status used for a nonexistent article; verify whether backend/configuration failures are being misreported as 404s in runtime monitoring. This is a code-review concern, not a reproduced production incident.
- No public content was posted and no production deployment or data access was attempted.

### Consolidated status

| Step | Result | Gate to close |
|---|---|---|
| 1. PR #36 review | Static review done; runtime pending | Clean checkout, actual project tests, preview/browser review |
| 2. CI alternative | Standalone smoke 4/4; full project checks NOT RUN | Authorized local/self-hosted runner with lockfiles and dependencies |
| 3. Production SHA + Supabase ledger | NOT VERIFIED | Read-only hosting-provider and Supabase metadata access |
| 4. APK release gate | BLOCKED; no release/artifact verified | Published signed artifact, signer fingerprint, checksum, trusted URL |
| 5. Preview/security smoke | NOT RUN | Preview URL, test accounts/fixtures, raw-response and cache access |

**Final safety state:** PR #36 and PR #37 remain Draft/open; neither was merged. No production deployment, database migration, secret rotation, cron/scheduler change, social post, newsletter send or payment activation occurred. This report does not authorize those actions.
