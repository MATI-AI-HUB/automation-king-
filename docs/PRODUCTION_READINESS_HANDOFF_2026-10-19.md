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


## Follow-up execution log — 2026-10-19

This follow-up used GitHub repository read access and the available execution container. It stopped at the first external-access gate as requested; no external account token was guessed or added.

### Step A — clean checkout and real Vitest

**Status: ⛔ BLOCKED for clean checkout / project commands; static test-file verification completed.**

Evidence:
- Environment output: `node --version` → `v22.16.0`; `npm --version` → `10.9.2`; `git --version` → `2.47.3`.
- Command: `git ls-remote https://github.com/MATI-AI-HUB/automation-king-.git refs/heads/fix/ssr-share-links`
- Actual output: `fatal: unable to access 'https://github.com/MATI-AI-HUB/automation-king-.git/': Could not resolve host: github.com` (exit code 128).
- GitHub read-only connector verified PR #36 is open/Draft and its source branch contains `frontend/__tests__/share-buttons.test.tsx` importing `buildShareUrl` from the real component and defining four Vitest tests. The previous standalone mirror tests are not a substitute for these tests.
- Actual test file: https://github.com/MATI-AI-HUB/automation-king-/blob/fix/ssr-share-links/frontend/__tests__/share-buttons.test.tsx
- Workflow commands are defined in https://github.com/MATI-AI-HUB/automation-king-/blob/main/.github/workflows/ci.yml.
- `npm ci --legacy-peer-deps`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npx vitest run` were **not run** because a clean checkout could not be obtained. This step is not passed.
- Required unblock: the owner must authorize a GitHub Codespace or self-hosted runner with outbound access to GitHub and npm registry. No such runner/Codespace control is available to this agent in the current tool session.

### Step B — PR #36 preview verification

**Status: ⛔ BLOCKED — Vercel project/deployment access required.**

- No verified preview deployment URL or deployment record was available in this run.
- Need read-only Vercel project/deployment access to identify/create the PR preview, inspect deployment metadata and fetch preview HTML. Creating a preview deployment may trigger a build; owner authorization is required before invoking any deploy/build action.
- If using a token rather than an account connection, use a least-privileged read-only token where supported, supplied only through the authorized runner's secret store as `VERCEL_TOKEN`. Project/team identifiers may be supplied as `VERCEL_PROJECT_ID` and `VERCEL_TEAM_ID`; they are identifiers, not credentials. Do not paste bearer tokens into chat.
- Required tests once unblocked: canonical link, Open Graph URL, JSON-LD `mainEntityOfPage`, both share-button locations, and all four share destinations in fetched preview HTML/browser output.

### Step C — production SHA and Supabase migration ledger

**Status: ⛔ BLOCKED — hosting metadata and read-only database access required.**

- Repository `main` SHA remains a repository fact only; no Vercel production deployment SHA was verified.
- No Supabase connection was attempted because no read-only connection was provided. No live schema, RLS, grants or `supabase_migrations.schema_migrations` ledger query result is available.
- Required access: Vercel deployment metadata read-only; Supabase SQL read-only role restricted to catalog/schema/RLS/grants/migration-ledger inspection. Preferred runner secret name: `SUPABASE_READONLY_DATABASE_URL`. If SQL access cannot be granted and Supabase API access is used instead, an appropriately scoped read-only token may be configured as `SUPABASE_ACCESS_TOKEN`; do not expose service-role or owner credentials. Do not send credentials in chat.
- No migrations or database changes were performed.

### Step D — APK release gate

**Status: ⛔ BLOCKED for signed build; read-only release inventory checked.**

Evidence:
- App repository Releases API response at inspection: `[]`: https://api.github.com/repos/MATI-AI-HUB/banglarvoice-app/releases
- Existing static audit document says no APK/AAB artifact, SHA-256 or signature had been recorded: https://github.com/MATI-AI-HUB/automation-king-/blob/main/docs/APK_AUDIT.md
- No artifact/signature/checksum/version evidence is available, so no release is approved. Building/signing requires an authorized Android build environment and owner-managed signing configuration; no keystore or signing secret was accessed.
- If a candidate artifact is produced, first verify package, `versionCode`, `versionName`, signer certificate SHA-256 fingerprint, APK SHA-256 and artifact provenance. A GitHub Release may be prepared as a draft only after the owner authorizes upload/write access; publishing must remain separately gated.

### Step E — live smoke and leakage test

**Status: ⛔ BLOCKED — preview URL and safe test fixtures/accounts required.**

- No verified preview URL, non-production test account, or fixture containing controlled draft/premium test content was provided.
- Required fixtures: (1) public published article, (2) draft article, (3) premium/private article, (4) least-privileged reporter user, and (5) editor/admin test user, all non-production or explicitly approved test data. Do not provide production user passwords or private reporter data.
- Once access is authorized, test HTML/RSC/API response bodies and cache headers for anonymous, reporter, editor/admin, draft and premium cases; verify auth/admin guards and ensure private responses are not publicly cacheable. Record exact URL, HTTP status, relevant headers, and redacted response assertions without storing secrets or PII.
- No live/preview leakage test was executed; no claim of security pass is made.

### Owner action required to resume

Please authorize/provide these items through approved account/runner setup (not by pasting secrets into chat):

1. **GitHub Codespace or self-hosted runner:** read repository/PR #36 and run Node 22/npm commands; network egress to GitHub and npm registry.
2. **Vercel:** read-only project/deployment access; `VERCEL_TOKEN` in runner secret storage if an account connector is not used, plus `VERCEL_PROJECT_ID` and `VERCEL_TEAM_ID` if needed. Preview build/deploy execution requires separate explicit approval.
3. **Supabase:** read-only DB connection `SUPABASE_READONLY_DATABASE_URL` in runner secret storage, or explicitly scoped read-only `SUPABASE_ACCESS_TOKEN`; schema, policies, grants and migration-ledger queries only.
4. **APK signing:** do not send a keystore/password. Authorize an existing trusted release workflow/build environment; first inventory artifacts and metadata read-only. Draft Release upload needs explicit write authorization; publish requires separate approval.
5. **Smoke tests:** a verified preview URL and safe non-production fixture/test accounts for public, draft, premium, reporter and admin roles.

### Current overall state

| Step | Result | Evidence |
|---|---|---|
| A. Clean checkout + Vitest | ⛔ BLOCKED | Node/npm versions above; `git ls-remote` exit 128 due DNS; Vitest file exists in PR branch |
| B. Preview verification | ⛔ BLOCKED | No verified Vercel deployment URL/access |
| C. Production SHA + Supabase ledger | ⛔ BLOCKED | No provider deployment record or read-only DB result |
| D. APK release gate | ⛔ BLOCKED | Releases API returned `[]`; static audit says artifact/signature/hash absent |
| E. Leakage/smoke test | ⛔ BLOCKED | No verified preview/test fixtures/accounts |

No deployment, merge, live database mutation, secret rotation, cron change, APK signing, release upload/publication, social post, newsletter send or payment activation occurred in this follow-up.


## Access follow-up — Vercel connector scope check (2026-10-19)

**Status: ⛔ BLOCKED by Vercel authorization scope; no preview build was attempted.**

Read-only Vercel connector checks performed after the owner reported that Vercel access was prepared:
- `list_teams(limit=50)` returned `teams: []`.
- `list_projects(search="banglarvoice", limit=50)` returned one project record: `automation-king-lcb2`, project ID `prj_552hrMTjvldSlUHpcuqNqqNbhshb`, account ID `team_ePmukwxucleK8YT0jr1edKhL`.
- A subsequent read-only `GET /v9/projects/{idOrName}` attempt returned HTTP **403 forbidden**: `Not authorized: Trying to access resource under scope "matiailearninghub-3927". You must re-authenticate to this scope or use a token with access to this scope.`
- The connector returned request ID `sin1:sfo1::n6wrw-1792356056064-595561edf319` for the first 403. A scoped retry using slug `matiailearninghub-3927` also returned 403 (request ID `sin1:sfo1::t8sks-1792356061483-5378f464d7e4`).
- Because project details were forbidden, no deployment list, production deployment SHA, preview URL, or deployment HTML was retrieved. The available tool did not provide a working CLI fallback in this session.
- No preview deployment/build was triggered because the owner explicitly withheld preview-build approval.

**Required remediation:** reconnect/re-authorize the Vercel connection for the exact scope `matiailearninghub-3927` with read-only access to the Banglar Voice project/deployments, or configure a least-privileged Vercel token in the approved runner secret store. Do not paste the token into chat. Then retry read-only project/deployment lookup only. Creating a preview still requires separate explicit approval.

**Supabase:** the owner-reported `SUPABASE_READONLY_DATABASE_URL` has not been configured in a runner accessible to this agent; no database connection/query was made. Supabase integration is not yet connected in this session. Continue to wait for the owner to connect it or configure the read-only URL in the approved runner secret store.

**GitHub Codespace:** owner said they will prepare it; no Codespace URL/session was provided. The actual project command suite remains unrun. No secret values were requested or printed.

### Current access gate

| Resource | Observed evidence | Status |
|---|---|---|
| GitHub repo/PR read access | PR #36 and #37 metadata/source readable through GitHub connector | Available for static review |
| GitHub Codespace | No session URL or runner execution channel | ⛔ Wait for owner |
| Vercel project list | One candidate project returned | Partial read access |
| Vercel project/deployment details | HTTP 403 under scope `matiailearninghub-3927` | ⛔ Re-authorize exact scope |
| Supabase read-only database | No configured URL/session or query output | ⛔ Wait for owner |
| Preview build/deployment | Explicitly not approved by owner | ⛔ Do not run |
| Draft Release upload | Explicitly not authorized by owner | ⛔ Do not run |
| Leakage fixtures/accounts | Not ready per owner | ⛔ Do not run |

No deployment, build, database query/mutation, merge, APK signing, release upload/publication, secret rotation, scheduler change, or production action occurred in this follow-up.


## Repeated owner status / read-only retry — 2026-10-19

The owner repeated the same access status. No new Codespace session URL or Supabase connection was included, so those gates remain closed.

A read-only Vercel deployment-list retry was made against the already identified project `prj_552hrMTjvldSlUHpcuqNqqNbhshb` and team `team_ePmukwxucleK8YT0jr1edKhL`, with `target=production` and `limit=10`. It returned HTTP **403 forbidden**, scope `matiailearninghub-3927`, request ID `sin1:sfo1::xbq49-1792356149548-7ccebf5c71a7`. Therefore the production deployment SHA remains **NOT VERIFIED**. No deployment/build was triggered.

Next required input is not another status repetition: open/provide the authorized Codespace execution session, reauthorize the Vercel connection for the exact scope `matiailearninghub-3927`, and configure `SUPABASE_READONLY_DATABASE_URL` inside the approved runner secret store. No secret should be pasted into chat. Preview build remains unapproved, Draft Release upload remains unauthorized, and fixtures/test accounts remain unavailable. No external side effects occurred.


## Authorization retry in this chat environment — 2026-10-19

The owner asked for one more authorization confirmation attempt. Read-only authorization checks were performed; no credentials were requested in chat and no write action was taken.

### Vercel authentication identity

- `GET /v2/user` via the Vercel connector succeeded.
- Returned authenticated Vercel username: `matiailearninghub-3927`.
- Returned default team ID: `team_ePmukwxucleK8YT0jr1edKhL`.
- This confirms a Vercel account is connected to the chat's Vercel connector; it does **not** prove authorization for every project/resource.

### Project/deployment scope

- A read-only project listing scoped to `matiailearninghub-3927` failed with HTTP **403 forbidden**.
- Error: `Not authorized: Trying to access resource under scope "matiailearninghub-3927". You must re-authenticate to this scope or use a token with access to this scope.`
- Request ID: `sin1:sfo1::bbscn-1792356518673-8b95c3b3e1d9`.
- This confirms the Vercel connector is authenticated, but its current credential/scope is not authorized to list project resources for the requested scope. No project/deployment details or production commit SHA were returned.
- Do not repeat the same API call unchanged; the Vercel error explicitly advises re-authentication or a token with access to that scope.
- No preview build was triggered because preview-build authorization is still withheld.

### Supabase connector state

- The available connected tool inventory contains no Supabase database actions in this chat environment.
- Plugin directory lookup reports Supabase plugin ID `plugin_asdk_app_69d3e5ee6a708191baa733f7b8931995`, status available/enabled but `installed=false`. No active Supabase connection/session is available to run a read-only query from this agent.
- The owner plans to configure `SUPABASE_READONLY_DATABASE_URL` in an authorized Codespace/runner secret store. No such runner session or connection was provided, and no database query was attempted.
- Never paste the database URL/token into chat. Configure it only in the approved secret store, with a role restricted to read-only metadata/policy/grant/migration-ledger queries.

### Current access verdict

| Service | Verified in this chat | Still needed |
|---|---|---|
| Vercel account authentication | ✅ `GET /v2/user` succeeded; username and default team ID returned | Reauthorize connector/token for scope `matiailearninghub-3927` with read-only project/deployment access |
| Vercel project/deployment access | ⛔ HTTP 403; no production SHA available | Owner reconnects/re-authorizes the Vercel app for the exact scope, then agent retries read-only lookup |
| Supabase DB | ⛔ No active connector/tool or configured runner session | Connect the Supabase app or configure `SUPABASE_READONLY_DATABASE_URL` in the approved runner |
| GitHub Codespace | ⛔ No session/terminal access supplied | Owner opens/provides the authorized Codespace execution channel |
| Preview build | ⛔ Not authorized | Separate explicit approval remains required |
| Draft Release upload | ⛔ Not authorized | Separate explicit approval remains required |
| Non-production fixtures/test accounts | ⛔ Not ready | Safe fixtures and role-limited accounts required for leakage tests |

No build, deployment, database query/mutation, merge, release upload/publication, signing, secret rotation, scheduler change, or production modification occurred during this authorization retry.


## Supabase connector re-check — 2026-10-19

**Status: ✅ Supabase project connection verified; database review is partial and found security-advisor items.** This supersedes earlier statements that the Supabase connector was unavailable. The Supabase app is now connected in this chat and returned project data directly.

### Project identity evidence (read-only connector)
- Organization list returned organization `xchmxjjorhyaawffokqm` (`MATI-AI-HUB's`).
- Project list returned project ID/ref `fqqdpngmftoddffvdukn`, name `MATI-AI-HUB's Project`, region `ap-northeast-1`, status `ACTIVE_HEALTHY`.
- Database metadata: PostgreSQL 17 engine, version `17.6.1.166`, host `db.fqqdpngmftoddffvdukn.supabase.co`.
- Project detail retrieval succeeded for project ID `fqqdpngmftoddffvdukn`.
- No database URL, password, or token was requested or displayed in chat.

### Migration ledger (read-only SQL)
- `information_schema.tables` confirms `supabase_migrations.schema_migrations` exists.
- Ledger columns returned: `version text`, `statements ARRAY`, `name text`, `created_by text`, `idempotency_key text`, `rollback ARRAY`.
- Query `SELECT COUNT(*), MIN(version::text), MAX(version::text) FROM supabase_migrations.schema_migrations` returned: count **58**, first version `20260901000000`, latest version `20261018175840`.
- Latest row: `20261018175840 / epaper_archive_storage`; preceding recent entries include social/YouTube contract migrations from `20261016232622` through `20261015135836`.
- This verifies the live ledger content that the connector exposes. It does **not** prove every migration file in the repository has been applied, because a repository-to-ledger diff has not yet been computed from a clean checkout.

### Public schema and RLS evidence
- Verbose table inventory confirms `public.articles` has 1,419 rows and RLS enabled; `public.profiles` has RLS enabled. No row contents or PII were queried.
- `pg_policies` summary returned policy counts for public tables. A direct catalog query found 8 public tables with RLS enabled but no matching public-schema policy:
  `ai_gateway_key_state`, `ai_gateway_policies`, `ai_gateway_usage_events`, `social_content_calendar`, `social_platforms`, `social_post_metrics`, `social_posts`, `social_strategy_notes`.
- Absence of policies with RLS enabled ordinarily means API roles governed by RLS cannot access rows through those policies; do not remove RLS or add policies without checking intended service-only access and grants.
- Grant summary for `public` showed anon has 13 SELECT grants; authenticated has 28 SELECT, 15 INSERT, 13 UPDATE and 14 DELETE grants (plus some other privileges); service_role has broad privileges across 46 objects. This is a summary of direct table grants only, not a complete effective-privilege proof; default privileges, inherited roles, functions, views and schema usage need separate review.
- Supabase Security Advisor result (observed timestamp `2026-10-18T20:51:27.206Z`) includes:
  - 24 `rls_enabled_no_policy` findings across multiple schemas, including the 8 public tables listed above and backup/private/maintenance/env_guard/s3_security_baseline tables.
  - 6 `authenticated_security_definer_function_executable` findings, including `current_app_role()`, `newsroom_record_review_decision(...)`, `newsroom_submit_for_verification(...)`, `platform_role()`, `requeue_failed_news(...)`, and `submit_field_report(...)`. These require intended-access review, not blind revocation.
  - 1 `auth_leaked_password_protection` warning: leaked-password protection disabled.
- No policies, grants, functions, passwords, or project settings were modified. No migrations were applied.

### Current verdict
- Supabase connection in this chat: **VERIFIED**.
- Project identity and active status: **VERIFIED**.
- Migration ledger exists and has 58 rows through `20261018175840`: **VERIFIED**.
- All repository migrations applied: **NOT VERIFIED** pending repository migration diff.
- Full RLS/grants security review: **PARTIAL**; findings above require targeted least-privilege review.
- Production database was accessed only for project metadata and read-only catalog/ledger queries; no row-level article/profile content was retrieved.

### Evidence query labels
- `migration_ledger`: `information_schema.tables` lookup for `supabase_migrations.schema_migrations` returned one matching row.
- `ledger_count_latest`: 58 / `20260901000000` / `20261018175840`.
- `latest_migrations`: latest 10 rows returned; newest is `20261018175840 / epaper_archive_storage`.
- `rls_enabled_without_policy`: 8 public tables listed above.
- `public_grants_summary`: direct-grant totals above.
- `get_advisors(type=security)`: 24 no-policy findings, 6 SECURITY DEFINER execute warnings, 1 leaked-password protection warning.

No production write, deployment, merge, secret rotation, cron change, release upload, or social publishing occurred.


# Release Verification Round — 2026-10-19 (read-only)

**Scope:** Supabase project `fqqdpngmftoddffvdukn` (PostgreSQL 17, ap-northeast-1), GitHub repository `MATI-AI-HUB/automation-king-` main, Vercel production metadata. No SQL writes, migration, grant/policy change, deployment, or release upload performed.

## Status summary

| Work item | Status | Evidence / result |
|---|---|---|
| 1. Migration inventory and exact version diff | ❌ MISMATCHES FOUND; remediation blocked pending audit | GitHub recursive tree SHA `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`; 56 migration SQL files vs 58 live ledger rows; 47 exact version matches; 9 repo versions absent from ledger and 11 ledger versions absent from repo exact-version list. |
| 1. Stored checksum vs file content | ⛔ BLOCKED / NOT REPRESENTED | Live ledger columns are version, statements ARRAY, name, created_by, idempotency_key, rollback ARRAY. No checksum column exists. Git blob SHA values are available, but cannot be compared to a ledger checksum that is not stored. Statement-count/byte evidence exists below; no hash equivalence claimed. |
| 2a. RLS-enabled/no-policy findings | ✅ Catalog and grants reviewed; intent partially inferred | Advisor returned 24 findings. All 24 advisor tables are inventoried below. No direct anon/authenticated/PUBLIC table grants found for those 24; service-role-only/internal objects are provisionally safe from those grants, but intended access needs owner confirmation. Additional `realtime.messages` has RLS enabled, no policy, and anon/authenticated grants/schema USAGE; P1 investigate separately. |
| 2b. SECURITY DEFINER functions | ✅ Metadata and selected function bodies reviewed; hardening follow-up | Six advisor functions are listed below. All owners postgres. Four have empty search_path; `newsroom_submit_for_verification` has `pg_catalog, public`; `requeue_failed_news` has `pg_catalog, pg_temp`. Body checks found role/ownership gates in reviewed functions; no code was changed. |
| 2c. Leaked-password protection | ⚠️ Finding confirmed; change not made | Security Advisor warning `auth_leaked_password_protection` says disabled. Enablement is a project Auth setting and requires explicit approval. |
| 3. Effective grants/RPC and article/profile policy audit | ✅ Read-only catalog review completed; some grants are overbroad candidates | Public anon/auth table grants, schema USAGE, callable public functions, and policies for articles/profiles and selected public objects are recorded below. |
| 4. Vercel production SHA | ⛔ BLOCKED: 403 | Read-only deployment list request returned HTTP 403 for scope `matiailearninghub-3927`, request ID `sin1:sfo1::ll6c7-1792357189199-ebc1692d17b2`. Production SHA cannot be verified. Dashboard: https://vercel.com/dashboard . Need a read-scoped Vercel token or reauthorization in that exact scope; do not paste tokens in chat. |
| CI/Codespace full frontend suite | ⛔ NEXT-ROUND PREREQUISITE | No Codespace terminal session in this execution. Full npm ci, tsc, lint, build, and Vitest suite remain unrun. |

## 1. Migration completeness — evidence and full inventory

Repository tree endpoint: https://api.github.com/repos/MATI-AI-HUB/automation-king-/git/trees/main?recursive=1
Human-readable directory: https://github.com/MATI-AI-HUB/automation-king-/tree/main/supabase/migrations
Main SHA: `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`
Live ledger query: `SELECT version, name, cardinality(statements), octet_length(array_to_string(statements,E'\\n')) FROM supabase_migrations.schema_migrations ORDER BY version;`
Observed ledger: 58 rows; first `20260901000000 init_schema`; latest `20261018175840 epaper_archive_storage`.

### Repository files (all 56)

| Version prefix | File | Git blob SHA-1 | Comparison |
|---|---|---|---|
| `20260901000000` | `20260901000000_init_schema.sql` | `d9b95c6d5710d8e97c7a006e05d8b0d00d52d79c` | MATCH |
| `20260901000001` | `20260901000001_storage.sql` | `c553b7997eb542f6b6e2915a233ce2d5ff65e32e` | MATCH |
| `20260909000001` | `20260909000001_security.sql` | `c854c6aac95da9e4a41612fa87306558037acfcd` | MATCH |
| `20260909` | `20260909_revenue_hooks.sql` | `34663d31291fab60c688ec76625f83b7aab4f110` | MATCH |
| `20260912000001` | `20260912000001_db_optimization.sql` | `81b26fed77f5d8685ea52e5e9dc35cbb7f8f924c` | MATCH |
| `20260912` | `20260912_ai_audit_log.sql` | `184238cb2a52d16335cfdd98422597c494c19264` | MATCH |
| `20260920` | `20260920_source_registry.sql` | `45beb60ec428829d057839987478c8d22c7f89d2` | MATCH |
| `20260925` | `20260925_newsroom_automation.sql` | `680bfd142c4cd673832d500976f14e9216d22cbc` | MATCH |
| `20260929000001` | `20260929000001_platform_contract.sql` | `e65cd636ae4f71bf22cb766e9236735517182569` | MATCH |
| `20260929` | `20260929_articles_rls_pgcron.sql` | `b1d9cb4f09ad6890cdfbd6bad06536a36a4580d0` | MATCH |
| `20261001000000` | `20261001000000_grant_articles_access.sql` | `9f4f89ea59f6468eec9cee9abd52252674956b55` | MATCH |
| `20261002000000` | `20261002000000_public_article_views.sql` | `a3503f5c7af0c3fe8262285181fd3f806ae557bb` | MATCH |
| `20261002120000` | `20261002120000_article_unique_indexes.sql` | `2a5a3d9ad09d492d09e5b01a54697ac67fd076b7` | MATCH |
| `20261005100000` | `20261005100000_atomic_news_pipeline_lock.sql` | `481482123be689ee8f25196c49b41ab612ed02d9` | MATCH |
| `20261005210000` | `20261005210000_source_expansion.sql` | `44c3cc4d930b61d27a49ef9341baf0646f832ddf` | MATCH |
| `20261005220000` | `20261005220000_public_feed_grant.sql` | `5ea09597e02f387d68dd70514ad166a5d61122da` | MATCH |
| `20261006070000` | `20261006070000_harden_pipeline_lock_rpc.sql` | `0ab45ec4cee13d103cd3684134fb9b4e28d0dd82` | MATCH |
| `20261006090000` | `20261006090000_social_posts_audit.sql` | `93f32d4d5ee7220a4be0b03242dc3c6da9f330d3` | MATCH |
| `20261006101852` | `20261006101852_epaper_editions.sql` | `fb974563c9411304a78464b41113fb91d7f1ae18` | MATCH |
| `20261006101925` | `20261006101925_epaper_edition_pages.sql` | `96c2d981c462a7f4129d2ee52823a042e40d2ef3` | MATCH |
| `20261006170000` | `20261006170000_epaper_editions.sql` | `67513324ab62ab3b96a003986dc7f250e1bae8da` | MATCH |
| `20261006190000` | `20261006190000_quarantine_low_quality_articles.sql` | `45eb9236fb4d4d3db105729307b3144adce4132f` | MATCH |
| `20261006191500` | `20261006191500_brand_card_images.sql` | `4633cfc85a58d5b1fe08bb5043ae46ae94a1bb7a` | MATCH |
| `20261007000000` | `20261007000000_security_hardening_report.sql` | `dd51ea389ec63560cbe64dbae2f8e47dd75755f8` | MATCH |
| `20261007000001` | `20261007000001_fix_search_path.sql` | `4ddffc6245b5e9d3cfa04ea8716a5dbe5d202f52` | MATCH |
| `20261007000002` | `20261007000002_consolidate_policies.sql` | `1002ddf43e6cdd3fe6bd3d34c05e30d461951b46` | MATCH |
| `20261007000003` | `20261007000003_move_extensions.sql` | `e1e7e0f5c2b380720a7da0ea8fe6515d23120ab7` | MATCH |
| `20261008000000` | `20261008000000_ai_gateway.sql` | `5e5f1ff0a89c1f5cc0df9c9d06f7a2c5408bfd6a` | MATCH |
| `20261008000001` | `20261008000001_ai_gateway_enrollment.sql` | `3c69fa770b6240606053f6f522043be0e89edcc2` | MATCH |
| `20261008185200` | `20261008185200_vault_backed_production_scheduler.sql` | `87a752e54f32e24d96717591a3a70bfdef80a99a` | MATCH |
| `20261008190500` | `20261008190500_article_image_rights_audit.sql` | `12cd0f870d3270f2be4f1dfda623b32f9f76672a` | MATCH |
| `20261009022004` | `20261009022004_independent_gemini_fallback.sql` | `92954ce66a195b7494bff8d309584859ac8eb137` | MATCH |
| `20261009023526` | `20261009023526_newsroom_failed_retry_scheduler.sql` | `f230e54451c715f9b0984685a7f60223ceb366b5` | MATCH |
| `20261009030000` | `20261009030000_source_health_observability.sql` | `894d673567c739b8263e812ea7849d4da27ec09d` | MATCH |
| `20261009030100` | `20261009030100_record_source_probe.sql` | `21c15484941522df5751e5c731b426332d275239` | MATCH |
| `20261009040000` | `20261009040000_world_class_sources_and_schedule.sql` | `5c9bacee132299bc95c8f69df3ca9a9b1dbf2674` | MATCH |
| `20261009150000` | `20261009150000_security_and_retry_scheduler.sql` | `fa055ac52a9397fb2b6112061bf2b73cd32b7ef1` | MATCH |
| `20261010000000` | `20261010000000_vault_wrappers.sql` | `306e9a2e5a4ece47515cd1f57a193d3ac5d36180` | MATCH |
| `20261010010000` | `20261010010000_sync_unversioned_objects.sql` | `fcf818e64207b1cfc31c23e03cbbb3905e6fbf0e` | MATCH |
| `20261011000001` | `20261011000001_add_slug_title.sql` | `c9327920ec60a14bf146fa1cb2835aa016e0f42c` | MATCH |
| `20261012000001` | `20261012000001_fix_data_quality.sql` | `b69c5da81ad9e5d6f65864263fe16aea5e5335aa` | MATCH |
| `20261012000003` | `20261012000003_fix_null_slugs.sql` | `d81a2365b1da740385a32440aecf48a62eeac12b` | MATCH |
| `20261012000004` | `20261012000004_fix_rls_anon.sql` | `d10ef093d178f40b4bbcfac7409648d0ec0faaf5` | MATCH |
| `20261012000005` | `20261012000005_fix_feed_columns_and_anon.sql` | `6c375f58f927dab286c573defea0d8dee5881cc7` | MATCH |
| `20261012000010` | `20261012000010_premium_rls_and_ai_policy.sql` | `f87ed6b86ea265ca69abf4ed591ade7bbae5647a` | MATCH |
| `20261012000020` | `20261012000020_social_platform_registry.sql` | `7906866dccffe75fd2126309e0c034ecf3aba371` | MATCH |
| `20261013034809` | `20261013034809_social_manager_tables.sql` | `c94e7746778226cefe65f556ca79d01d85e99da5` | MATCH |
| `20261013140000` | `20261013140000_social_readiness_limits.sql` | `8d8eb4e35ce447e5e3724b25c3eb8f31ff999cdb` | NO LEDGER VERSION/NAME MATCH — audit; do not apply |
| `20261015000000` | `20261015000000_social_platform_contract.sql` | `048eea5d0d218868270a0e90ffbb7fde4032cd83` | VERSION MISMATCH; same logical name in ledger |
| `20261015210000` | `20261015210000_social_reconciliation_audit.sql` | `48eb252ba39177e1f9d8b1d46c5deb837ecbb5bd` | VERSION MISMATCH; same logical name in ledger |
| `20261015213000` | `20261015213000_epaper_cron_route.sql` | `eaef4115fcf92066bea9b711361d23317700e641` | VERSION MISMATCH; same logical name in ledger |
| `20261016003500` | `20261016003500_epaper_cron_secret_alias.sql` | `36b4d431fc1b002f6df7475d85f2fec023d524fb` | VERSION MISMATCH; same logical name in ledger |
| `20261016005000` | `20261016005000_youtube_inventory_contract.sql` | `38a80624a44a8875e144e75cb2b6fee16bb1c64f` | VERSION MISMATCH; same logical name in ledger |
| `20261016005100` | `20261016005100_youtube_sync_schedule.sql` | `2dab342dff2b8c8a7af35b53519150873056c765` | VERSION MISMATCH; same logical name in ledger |
| `20261016011500` | `20261016011500_youtube_quarantine_contract.sql` | `7fad37be7c407336c561f907f1f489cabd7f7762` | VERSION MISMATCH; same logical name in ledger |
| `20261017053000` | `20261017053000_social_vault_contract.sql` | `e22e841de4160c2779414b0e8bb7e32c8bdd5ca0` | VERSION MISMATCH; same logical name in ledger |

### Repo version absent from live ledger (9)

| Repo version | Repo file | Same logical name found in ledger | Interpretation |
|---|---|---|---|
| `20261013140000` | `20261013140000_social_readiness_limits.sql` | — | No matching ledger name/version; likely unapplied or removed from ledger; audit first. |
| `20261015000000` | `20261015000000_social_platform_contract.sql` | 20261015135836 (social_platform_contract) | Timestamp/version differs; compare SQL before remediation. |
| `20261015210000` | `20261015210000_social_reconciliation_audit.sql` | 20261015144502 (social_reconciliation_audit) | Timestamp/version differs; compare SQL before remediation. |
| `20261015213000` | `20261015213000_epaper_cron_route.sql` | 20261015150835 (epaper_cron_route) | Timestamp/version differs; compare SQL before remediation. |
| `20261016003500` | `20261016003500_epaper_cron_secret_alias.sql` | 20261015183528 (epaper_cron_secret_alias) | Timestamp/version differs; compare SQL before remediation. |
| `20261016005000` | `20261016005000_youtube_inventory_contract.sql` | 20261015184837 (youtube_inventory_contract) | Timestamp/version differs; compare SQL before remediation. |
| `20261016005100` | `20261016005100_youtube_sync_schedule.sql` | 20261015184844 (youtube_sync_schedule) | Timestamp/version differs; compare SQL before remediation. |
| `20261016011500` | `20261016011500_youtube_quarantine_contract.sql` | 20261015194444 (youtube_quarantine_contract) | Timestamp/version differs; compare SQL before remediation. |
| `20261017053000` | `20261017053000_social_vault_contract.sql` | 20261016232622 (social_vault_contract) | Timestamp/version differs; compare SQL before remediation. |

### Live ledger version absent from exact repo version (11)

| Ledger version | Ledger name | Same logical name in repo | Interpretation |
|---|---|---|---|
| `20261013041043` | `social_manager_schedule` | — | Orphan ledger entry; source migration absent from current main branch; recover from history/release artifact before any remediation. |
| `20261015135836` | `social_platform_contract` | 20261015000000 (20261015000000_social_platform_contract.sql) | Version mismatch with same-name repo file; audit SQL contents. |
| `20261015144502` | `social_reconciliation_audit` | 20261015210000 (20261015210000_social_reconciliation_audit.sql) | Version mismatch with same-name repo file; audit SQL contents. |
| `20261015150835` | `epaper_cron_route` | 20261015213000 (20261015213000_epaper_cron_route.sql) | Version mismatch with same-name repo file; audit SQL contents. |
| `20261015183528` | `epaper_cron_secret_alias` | 20261016003500 (20261016003500_epaper_cron_secret_alias.sql) | Version mismatch with same-name repo file; audit SQL contents. |
| `20261015184837` | `youtube_inventory_contract` | 20261016005000 (20261016005000_youtube_inventory_contract.sql) | Version mismatch with same-name repo file; audit SQL contents. |
| `20261015184844` | `youtube_sync_schedule` | 20261016005100 (20261016005100_youtube_sync_schedule.sql) | Version mismatch with same-name repo file; audit SQL contents. |
| `20261015194444` | `youtube_quarantine_contract` | 20261016011500 (20261016011500_youtube_quarantine_contract.sql) | Version mismatch with same-name repo file; audit SQL contents. |
| `20261016223348` | `social_youtube_vault_contract` | — | Orphan ledger entry; source migration absent from current main branch; recover from history/release artifact before any remediation. |
| `20261016232622` | `social_vault_contract` | 20261017053000 (20261017053000_social_vault_contract.sql) | Version mismatch with same-name repo file; audit SQL contents. |
| `20261018175840` | `epaper_archive_storage` | — | Orphan ledger entry; source migration absent from current main branch; recover from history/release artifact before any remediation. |

### Migration interpretation and checksum limitation

- Eight of the nine repo-only version prefixes have same-name ledger entries at different timestamps (examples: `social_platform_contract`, `social_reconciliation_audit`, `epaper_cron_route`, YouTube contracts and `social_vault_contract`). This is a **version/name drift**, not evidence by itself that their SQL did not run. Compare the exact SQL stored in the ledger and repository before proposing any reconciliation.
- Repo file `20261013140000_social_readiness_limits.sql` has no exact version or same-name ledger row. It is the clearest candidate for “repo-only / possibly unapplied”; **do not apply it**. Proposal only after SQL review and confirmation of live schema.
- Ledger rows `20261013041043 social_manager_schedule`, `20261016223348 social_youtube_vault_contract`, and `20261018175840 epaper_archive_storage` have no same-name migration file in current `main`. The remaining exact-version absences have same-name repo files at other versions. Treat all as audit/orphan candidates, not automatic deletion.
- The live migration table has no checksum column. It stores statements arrays; statement counts/bytes can be compared, but a true checksum comparison is **not available from the schema as defined**. Do not claim checksum pass.
- No migration was applied or reconciled.

## 2a. RLS enabled but no policy — all 24 Advisor findings

Advisor remediation reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
Observed at: 2026-10-18T21:00:43.066Z.
Classification rule: “provisionally safe/internal” means no direct table grant to anon/authenticated/PUBLIC was found in `information_schema.role_table_grants`; it does not prove the business intent. “Risky” means an API role has a direct grant without an RLS policy.

| Schema.table | Owner | Direct grants to anon/authenticated/service_role/PUBLIC | Classification |
|---|---|---|---|
| `backup.articles_20261002` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `backup.news_pipeline_runs_20261002` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `env_guard.marker` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `maintenance.security_hardening_report` | `postgres` | service_role:DELETE, service_role:INSERT, service_role:REFERENCES, service_role:SELECT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `private.ai_gateway_health_summaries` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `public.ai_gateway_key_state` | `postgres` | service_role:DELETE, service_role:INSERT, service_role:REFERENCES, service_role:SELECT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `public.ai_gateway_policies` | `postgres` | service_role:DELETE, service_role:INSERT, service_role:REFERENCES, service_role:SELECT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `public.ai_gateway_usage_events` | `postgres` | service_role:DELETE, service_role:INSERT, service_role:REFERENCES, service_role:SELECT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `public.social_content_calendar` | `postgres` | service_role:DELETE, service_role:INSERT, service_role:REFERENCES, service_role:SELECT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `public.social_platforms` | `postgres` | service_role:DELETE, service_role:INSERT, service_role:REFERENCES, service_role:SELECT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `public.social_post_metrics` | `postgres` | service_role:DELETE, service_role:INSERT, service_role:REFERENCES, service_role:SELECT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `public.social_posts` | `postgres` | service_role:DELETE, service_role:INSERT, service_role:REFERENCES, service_role:SELECT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `public.social_strategy_notes` | `postgres` | service_role:DELETE, service_role:INSERT, service_role:REFERENCES, service_role:SELECT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.column_acl_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.default_acl_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.function_acl_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.policy_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.relation_acl_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.rls_flags_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.s3_0b_default_acl_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.source_name_backfill_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.storage_policy_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.storage_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |
| `s3_security_baseline.trigger_snapshot` | `postgres` | (no direct grants to listed roles) | PROVISIONALLY SAFE / INTERNAL — no anon/authenticated/PUBLIC table grant |

**Separate catalog anomaly not in the 24 Advisor findings:** `realtime.messages` has RLS enabled and zero policies; direct grants include anon/authenticated/service_role INSERT, SELECT, UPDATE, and schema USAGE is granted to anon/authenticated/service_role. This may be a Supabase Realtime internal authorization design, but current catalog evidence does not show a policy. **P1 investigate with Realtime configuration/usage owner before changing it.** Do not add a generic policy blindly.

### Draft policy SQL

No policy SQL is proposed for the 24 Advisor tables yet: catalog grants show none of them has direct anon/authenticated/PUBLIC table grants, so a guessed policy could unnecessarily expose internal backups, security snapshots, Auth internals, or service-only AI/social state. Confirm the intended API access first. For `realtime.messages`, a generic policy is unsafe without the channel/topic authorization model; review only, no SQL executed.

## 2b. SECURITY DEFINER function review (6 Advisor warnings)

Advisor remediation reference: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

| Function | Owner | search_path config | Execute roles observed | Verdict |
|---|---|---|---|---|
| `current_app_role()` | postgres | `search_path=""` | `authenticated, service_role` | P2 likely intended helper for RLS; fully qualified references and empty search_path observed |
| `newsroom_record_review_decision(p_article_id uuid, p_decision text, p_article_version_hash text, p_reason text, p_authority_approval boolean)` | postgres | `search_path=""` | `authenticated, service_role` | P2 review; guards observed for editor/chief_editor/admin, valid decisions, version hash, authority approval |
| `newsroom_submit_for_verification(p_article_id uuid)` | postgres | `search_path="pg_catalog, public"` | `authenticated, service_role` | P2 harden search_path to empty + fully qualify references; role/ownership checks observed |
| `platform_role()` | postgres | `search_path=""` | `authenticated, service_role` | P2 likely intended helper for RLS; fully qualified references and empty search_path observed |
| `requeue_failed_news(p_limit integer)` | postgres | `search_path=pg_catalog, pg_temp` | `authenticated, service_role` | P1 least-privilege review; authenticated execution mutates queue though role guard checks admin/chief_editor |
| `submit_field_report(p_report_id uuid)` | postgres | `search_path=""` | `authenticated, service_role` | P2 intended owner/draft check observed; authenticated RPC is write operation |

Additional body evidence:
- `current_app_role()`: SQL body selects only the caller's profile role using `id = auth.uid()`; SECURITY DEFINER, `SET search_path TO ''`, schema-qualified `public.profiles`. Authenticated execution appears intentional as an RLS helper.
- `platform_role()`: maps `current_app_role()` to normalized role labels; SECURITY DEFINER, empty search_path, qualified function reference. Appears to be an RLS helper.
- `newsroom_record_review_decision(...)`: requires authenticated user and desk_editor/chief_editor/admin role; validates decision values, workflow row, article-version hash, active policy and authority approval before writes. Search path empty; authenticated EXECUTE appears intended, but retain as a P2 review item due to privileged workflow mutation.
- `newsroom_submit_for_verification(uuid)`: requires auth.uid and allowed editorial role, enforces reporter ownership, rejects published/archived/retracted content, hashes content and queues verification. It currently uses `search_path = pg_catalog, public`; harden to empty path with fully qualified references in a reviewed migration.
- `requeue_failed_news(integer)`: mutates failed queue rows; body allows service_role/postgres and otherwise only admin/chief_editor. Authenticated EXECUTE is a P1 least-privilege decision: if no manual editor retry is required, restrict EXECUTE to service_role; if required, document and test that capability.
- `submit_field_report(uuid)`: updates only a matching caller-owned draft to pending_review; empty search_path and owner/status predicate observed. Authenticated execution appears intentional, with P2 explicit-auth guard as a readability/hardening option.

### Leaked password protection

Advisor: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
Observed warning: leaked-password protection disabled. Proposed fix: enable the Auth leaked-password protection setting after owner approval and test login/signup behavior; **not enabled in this read-only round**.

## 3. Effective permissions audit

### Public schema direct table/view grants (anon/authenticated/PUBLIC)

| Object | Grantee | Privileges |
|---|---|---|
| `ads` | authenticated | DELETE,INSERT,UPDATE |
| `ads_public` | anon | SELECT |
| `ads_public` | authenticated | SELECT |
| `ai_audit_log` | authenticated | SELECT |
| `articles` | anon | SELECT |
| `articles` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `audit_log` | authenticated | SELECT |
| `breaking_ticker` | anon | SELECT |
| `breaking_ticker` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `epaper_editions` | anon | SELECT |
| `epaper_editions` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `field_reports` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `live_sessions` | authenticated | DELETE,INSERT,UPDATE |
| `live_sessions_public` | anon | SELECT |
| `live_sessions_public` | authenticated | SELECT |
| `news_ops_hourly` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `news_pipeline_runs` | authenticated | SELECT |
| `news_sources` | authenticated | DELETE,INSERT,REFERENCES,TRIGGER,TRUNCATE,UPDATE |
| `news_sources_public` | anon | SELECT |
| `news_sources_public` | authenticated | SELECT |
| `newsroom_ai_runs` | authenticated | SELECT |
| `newsroom_audit_events` | authenticated | SELECT |
| `newsroom_claims` | authenticated | SELECT |
| `newsroom_evidence` | authenticated | SELECT |
| `newsroom_media_assets` | authenticated | SELECT |
| `newsroom_review_decisions` | authenticated | SELECT |
| `newsroom_story_workflows` | authenticated | SELECT |
| `newsroom_verification_policies` | authenticated | SELECT |
| `notifications` | anon | SELECT |
| `notifications` | authenticated | DELETE,INSERT,SELECT |
| `profiles` | authenticated | INSERT |
| `profiles_safe` | authenticated | SELECT |
| `public_article_detail` | anon | SELECT |
| `public_article_detail` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public_article_previews` | anon | SELECT |
| `public_article_previews` | authenticated | SELECT |
| `public_articles_feed` | anon | SELECT |
| `public_articles_feed` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public_source_registry` | anon | SELECT |
| `public_source_registry` | authenticated | SELECT |
| `reading_history` | anon | SELECT |
| `reading_history` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `source_registry` | authenticated | DELETE,INSERT,UPDATE |
| `subscriptions` | authenticated | SELECT |
| `videos` | anon | SELECT |
| `videos` | authenticated | DELETE,INSERT,SELECT,UPDATE |

Counts observed from `information_schema.role_table_grants` across public objects:
- anon: SELECT on 13 objects.
- authenticated: SELECT on 28, INSERT on 15, UPDATE on 13, DELETE on 14, plus 5 REFERENCES, 5 TRIGGER, and 5 TRUNCATE grants.
- service_role: broad privileges across 46 objects for each listed table privilege family; treat service_role as highly privileged and never expose its key.
- `information_schema.role_usage_grants` returned no rows for public schema objects in this query. Schema-level `has_schema_privilege` separately shows anon/authenticated/service_role have USAGE on `public`; anon/authenticated also have USAGE on `realtime` and `storage`.

### Public functions callable by anon/authenticated (effective privilege checks)

| Function(args) | Return | SECURITY DEFINER | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE | search_path |
|---|---|---:|---:|---:|---:|---|
| `current_app_role()` | app_role | yes | no | yes | yes | `search_path=""` |
| `newsroom_record_review_decision(p_article_id uuid, p_decision text, p_article_version_hash text, p_reason text, p_authority_approval boolean)` | jsonb | yes | no | yes | yes | `search_path=""` |
| `newsroom_submit_for_verification(p_article_id uuid)` | jsonb | yes | no | yes | yes | `search_path="pg_catalog, public"` |
| `platform_role()` | text | yes | no | yes | yes | `search_path=""` |
| `requeue_failed_news(p_limit integer)` | integer | yes | no | yes | yes | `search_path=pg_catalog, pg_temp` |
| `set_slug_if_null()` | trigger | no | yes | yes | yes | `search_path=pg_catalog, pg_temp` |
| `set_updated_at()` | trigger | no | yes | yes | yes | `search_path=public` |
| `submit_field_report(p_report_id uuid)` | void | yes | no | yes | yes | `search_path=""` |
| `touch_source_registry()` | trigger | no | yes | yes | yes | `search_path=""` |

**Unexpected/overbroad grant candidates (review, do not change):**
- `public.public_article_detail` and `public.public_articles_feed` are security-invoker views but authenticated has DELETE/INSERT/UPDATE and other table-like privileges on them. Underlying RLS may still block writes; nonetheless view privileges should normally be reduced to the intended SELECT-only API contract. P1 review.
- `anon` has SELECT on `notifications` and `reading_history`, but their policies shown below do not grant anon row access: notifications has authenticated user-only SELECT; reading_history requires authenticated auth.uid ownership or service_role. These anon grants appear unnecessary; P2 revoke proposal after checking client compatibility.
- Trigger-returning functions `set_slug_if_null()`, `set_updated_at()`, and `touch_source_registry()` are executable by anon/authenticated via default/public ACLs. Trigger functions cannot be called as ordinary RPCs, but default EXECUTE grants are unnecessary surface; P2 revoke PUBLIC/anon/authenticated and retain owner/service as needed after checking trigger behavior.
- `public.profiles_safe` view selects `id, full_name, district, verified, created_at` from profiles. It currently has no anon SELECT grant; authenticated SELECT grant exists. Confirm that the included district/name fields are appropriate for all authenticated readers before any grant expansion.

### Articles and profiles — policy logic only, no row content read

| Table | RLS | Grants | Relevant SELECT policy | Anonymous conclusion |
|---|---|---|---|---|
| `public.articles` | enabled | anon SELECT; authenticated SELECT/INSERT/UPDATE/DELETE | `status='published' AND (is_premium=false OR private.has_active_premium_subscription())` for anon/authenticated | Logged-out anon can read only published non-premium rows, assuming the premium-check function returns false without an authenticated entitlement. Draft/pending/unpublished rows are excluded by the SELECT policy. Premium access is mediated by the entitlement function. |
| `public.profiles` | enabled | no anon grant; authenticated INSERT; service_role broad | SELECT policy only for authenticated own profile or editorial staff; UPDATE policy only own row and role must remain unchanged | Anon cannot SELECT profiles: no table grant and no anon policy. Authenticated INSERT grant has no matching INSERT policy in the inspected policy list, so RLS should deny inserts unless another applicable policy is added. |

Relevant inspected policies:
| Table | Policy | Roles | Command | Predicate |
|---|---|---|---|---|
| `articles` | editorial insert unpublished articles | {authenticated} | INSERT | `—` |
| `articles` | editorial update unpublished articles | {authenticated} | UPDATE | `((current_app_role() = ANY (ARRAY['desk_editor'::app_role, 'chief_editor'::app_role, 'admin'::app_role])) AND (status = ANY (ARRAY['draft'::text, 'pending'::text, 'submitted'::text, 'approved'::text, 'archived'::text, 'retracted'::text])))` |
| `articles` | read published articles by entitlement | {anon,authenticated} | SELECT | `((status = 'published'::text) AND ((is_premium = false) OR ( SELECT private.has_active_premium_subscription() AS has_active_premium_subscription)))` |
| `articles` | reporters insert own original drafts | {authenticated} | INSERT | `—` |
| `articles` | reporters update own drafts | {authenticated} | UPDATE | `((platform_role() = 'reporter'::text) AND (author_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['draft'::text, 'pending'::text, 'submitted'::text])))` |
| `breaking_ticker` | admin update ticker | {authenticated} | UPDATE | `(current_app_role() = 'admin'::app_role)` |
| `breaking_ticker` | public read active ticker | {public} | SELECT | `(is_active = true)` |
| `epaper_editions` | allow all for service | {service_role} | ALL | `true` |
| `epaper_editions` | public read | {anon,authenticated} | SELECT | `(is_published = true)` |
| `notifications` | service inserts notifications | {service_role} | INSERT | `—` |
| `notifications` | user marks own read | {authenticated} | UPDATE | `(user_id = ( SELECT auth.uid() AS uid))` |
| `notifications` | user reads own notifications | {authenticated} | SELECT | `(user_id = ( SELECT auth.uid() AS uid))` |
| `profiles` | profiles read own or editorial | {authenticated} | SELECT | `((id = ( SELECT auth.uid() AS uid)) OR (current_app_role() = ANY (ARRAY['staff_reporter'::app_role, 'desk_editor'::app_role, 'chief_editor'::app_role, 'admin'::app_role])))` |
| `profiles` | profiles update own fields | {authenticated} | UPDATE | `(id = ( SELECT auth.uid() AS uid))` |
| `reading_history` | service manages reading history | {public} | ALL | `(( SELECT auth.role() AS role) = 'service_role'::text)` |
| `reading_history` | user deletes own reading history | {authenticated} | DELETE | `(( SELECT auth.uid() AS uid) = user_id)` |
| `reading_history` | user reads own reading history | {authenticated} | SELECT | `(( SELECT auth.uid() AS uid) = user_id)` |
| `reading_history` | user updates own reading history | {authenticated} | UPDATE | `(( SELECT auth.uid() AS uid) = user_id)` |
| `reading_history` | user writes own reading history | {authenticated} | INSERT | `—` |
| `videos` | editorial manage videos | {authenticated} | ALL | `(current_app_role() = ANY (ARRAY['desk_editor'::app_role, 'chief_editor'::app_role, 'admin'::app_role]))` |
| `videos` | public read published videos | {public} | SELECT | `(status = ANY (ARRAY['published'::text, 'live'::text]))` |

Views `public_article_detail` and `public_articles_feed` are marked `security_invoker=true` and filter to `status='published'`; underlying articles RLS still applies. `public_article_previews` is a table with an anon/auth SELECT policy `true`; confirm its columns contain only intentionally public preview data before any further content expansion. No article/profile row data was queried.

## 4. Vercel production SHA — blocked

- Attempted read-only `GET /v7/deployments` for team `team_ePmukwxucleK8YT0jr1edKhL`, target production, limit 10.
- HTTP **403 forbidden**, scope `matiailearninghub-3927`; request ID `sin1:sfo1::ll6c7-1792357189199-ebc1692d17b2`.
- Project detail endpoint had also returned 403 in the preceding run. No production deployment SHA or verified deployment URL could be retrieved.
- Expected GitHub main SHA to compare: `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`.
- Required access: reconnect/re-authorize Vercel connector for read-only deployments in exact scope `matiailearninghub-3927`, or configure a least-privileged `VERCEL_TOKEN` with read-only deployment/project scope in the approved Codespace/runner secret store. Do **not** paste the token into chat. Once access works, retry GET/list only and compare all 40 SHA characters.
- Dashboard: https://vercel.com/dashboard

## Priority list (proposals only)

- **P1:** reconcile migration version/name drift without applying anything; review `realtime.messages` RLS/grants; decide whether authenticated users should execute `requeue_failed_news`; reduce DML grants on public article views after tests.
- **P2:** move `newsroom_submit_for_verification` to empty search_path with fully qualified references; review authenticated SECURITY DEFINER RPC allowlist; remove unnecessary anon SELECT on `notifications`/`reading_history`; tighten trigger-function EXECUTE ACLs; verify public preview/view columns.
- **P2 / owner approval:** enable leaked-password protection and test Auth behavior.
- **Next-round prerequisites:** Vercel read-only scope authorization or `VERCEL_TOKEN` in runner secret store; an accessible Node 22 GitHub Codespace to run `npm ci`, TypeScript, lint, build and Vitest; no production writes. No migration, grant/policy changes, deployment or release upload were performed in this round.


## Appendix — complete live migration ledger (all 58 rows)

Read-only query: `SELECT version, name, cardinality(statements) AS statement_count, octet_length(array_to_string(statements, E'\\n')) AS stored_sql_bytes FROM supabase_migrations.schema_migrations ORDER BY version;`

| Ledger version | Ledger name | Stored statement count | Stored SQL bytes (joined statements) |
|---|---|---:|---:|
| `20260901000000` | `init_schema` | 78 | 22695 |
| `20260901000001` | `storage` | 12 | 5541 |
| `20260909` | `revenue_hooks` | 25 | 5553 |
| `20260909000001` | `security` | 14 | 2902 |
| `20260912` | `ai_audit_log` | 6 | 1222 |
| `20260912000001` | `db_optimization` | 6 | 942 |
| `20260920` | `source_registry` | 10 | 2910 |
| `20260925` | `newsroom_automation` | 31 | 8156 |
| `20260929` | `articles_rls_pgcron` | 10 | 1555 |
| `20260929000001` | `platform_contract` | 31 | 6856 |
| `20261001000000` | `grant_articles_access` | 3 | 893 |
| `20261002000000` | `public_article_views` | 13 | 2368 |
| `20261002120000` | `article_unique_indexes` | 7 | 2207 |
| `20261005100000` | `atomic_news_pipeline_lock` | 7 | 2336 |
| `20261005210000` | `source_expansion` | 3 | 1841 |
| `20261005220000` | `public_feed_grant` | 4 | 305 |
| `20261006070000` | `harden_pipeline_lock_rpc` | 6 | 693 |
| `20261006090000` | `social_posts_audit` | 7 | 1379 |
| `20261006101852` | `epaper_editions` | 7 | 835 |
| `20261006101925` | `epaper_edition_pages` | 1 | 100 |
| `20261006170000` | `epaper_editions` | 7 | 967 |
| `20261006190000` | `quarantine_low_quality_articles` | 1 | 734 |
| `20261006191500` | `brand_card_images` | 1 | 1046 |
| `20261007000000` | `security_hardening_report` | 11 | 1216 |
| `20261007000001` | `fix_search_path` | 5 | 4289 |
| `20261007000002` | `consolidate_policies` | 5 | 3635 |
| `20261007000003` | `move_extensions` | 10 | 4469 |
| `20261008000000` | `ai_gateway` | 19 | 3913 |
| `20261008000001` | `ai_gateway_enrollment` | 6 | 2344 |
| `20261008185200` | `vault_backed_production_scheduler` | 11 | 3598 |
| `20261008190500` | `article_image_rights_audit` | 6 | 543 |
| `20261009022004` | `independent_gemini_fallback` | 6 | 1531 |
| `20261009023526` | `newsroom_failed_retry_scheduler` | 3 | 1000 |
| `20261009030000` | `source_health_observability` | 6 | 1450 |
| `20261009030100` | `record_source_probe` | 3 | 1912 |
| `20261009040000` | `world_class_sources_and_schedule` | 12 | 4488 |
| `20261009150000` | `security_and_retry_scheduler` | 13 | 3756 |
| `20261010000000` | `vault_wrappers` | 6 | 1805 |
| `20261010010000` | `sync_unversioned_objects` | 140 | 53088 |
| `20261011000001` | `add_slug_title` | 10 | 1306 |
| `20261012000001` | `fix_data_quality` | 5 | 477 |
| `20261012000003` | `fix_null_slugs` | 9 | 994 |
| `20261012000004` | `fix_rls_anon` | 7 | 447 |
| `20261012000005` | `fix_feed_columns_and_anon` | 10 | 1381 |
| `20261012000010` | `premium_rls_and_ai_policy` | 4 | 299 |
| `20261012000020` | `social_platform_registry` | 1 | 6641 |
| `20261013034809` | `social_manager_tables` | 1 | 3409 |
| `20261013041043` | `social_manager_schedule` | 1 | 2638 |
| `20261015135836` | `social_platform_contract` | 1 | 258 |
| `20261015144502` | `social_reconciliation_audit` | 1 | 1122 |
| `20261015150835` | `epaper_cron_route` | 1 | 867 |
| `20261015183528` | `epaper_cron_secret_alias` | 1 | 881 |
| `20261015184837` | `youtube_inventory_contract` | 1 | 1162 |
| `20261015184844` | `youtube_sync_schedule` | 1 | 834 |
| `20261015194444` | `youtube_quarantine_contract` | 1 | 550 |
| `20261016223348` | `social_youtube_vault_contract` | 1 | 1717 |
| `20261016232622` | `social_vault_contract` | 1 | 2036 |
| `20261018175840` | `epaper_archive_storage` | 1 | 625 |

This table is the full live ledger inventory. The repository file inventory and full Git blob SHA values are in section 1 above. Stored statement counts/byte sizes are useful diff signals, but they are not cryptographic checksums; no checksum column is present in the live ledger.

## Follow-up: moderated article comments and commit identity
**Observation time:** 2026-10-18 21:24 UTC (2026-10-19 03:24 Bangladesh time)

- Implementation is isolated in [Draft PR #38](https://github.com/MATI-AI-HUB/automation-king-/pull/38) because PR #37 remains documentation-only.
- Current main/base SHA at inspection: `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`. PR #38 head SHA: `0369167d6157c66dd86e349c96fc49ab41ec33bb`.
- Live Supabase project `fqqdpngmftoddffvdukn` was queried read-only at `2026-10-18T21:19:53.937027Z`; `public.article_comments` did not exist at that time. The new migration is proposal-only and has not been applied.
- PR #38 adds a moderated comment table/API/UI, an editorial queue at `/admin/comments`, input validation, a honeypot, rate limiting, and unit tests. The public API uses only the existing publishable/anon key and RLS; no service-role key is exposed.
- All 17 commits in the implementation branch were individually inspected through the connected GitHub integration: author login and committer login are `MATI-AI-HUB` for every commit, and no commit message contains a `Co-authored-by` trailer. The integration returns raw author email as unavailable/null, so exact email `matiailearninghub@gmail.com` is **not independently verified**.
- Repository commit search found two historical main-history commits containing `Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>`: `df30825579612232b78c01adb6dc92f255fd58d6` and `a157076b1c65be908fe9f3110e53c8b03896a8a4`. Main history was not rewritten and no force-push was performed; that destructive operation requires explicit approval and a recovery plan.
- Current head CI status lookup returned no statuses and PR workflow-run lookup returned no runs. Project tests/build/typecheck and live/staging RLS tests remain **NOT RUN**.
- Vercel read-only project/deployment access remains blocked by HTTP 403 for scope `matiailearninghub-3927`; production-serving SHA remains **UNVERIFIED**.
- Aggregate-only live article metadata query at `2026-10-18T21:25:58.358489Z` showed 589 `published`, 821 `pending`, and 10 `draft` articles; the newest `published_at` was `2026-10-18T21:15:19.160Z`. This is evidence of recent database publishing activity, not a full website, cron, or end-to-end publishing health test.
- No production SQL, migration, grant/policy change, environment variable, merge, or deployment was performed. Comment feature is implemented in the draft PR only; the existing news publishing path remains unchanged by this work.

## Fresh follow-up: PR #38 security corrections, CI state, and Vercel scope resolution
**Observation time:** 2026-10-18 21:41 UTC (2026-10-19 03:41 Bangladesh time)

### Current implementation state
- PR #38 remains Draft/open and separate from this documentation-only PR: https://github.com/MATI-AI-HUB/automation-king-/pull/38
- Current reviewed implementation head: `7970f5dde7f88c1cec5f0de4e8910c28bb6fa203`. Current main/base SHA remains `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`.
- The public comment POST route and Upstash-only rate-limit module were removed from the proposal. The browser now submits using the existing publishable/anon Supabase client; the database owns the write boundary.
- The proposed migration adds column-scoped grants, public comment-read checks tied to parent article visibility, an atomic per-IP rate-limit trigger (3 submissions per 10 minutes, serialized by transaction advisory lock), fail-closed behavior if the gateway IP header is unavailable, and a trigger that owns moderation actor/timestamp and allows only pending-to-approved/rejected transitions.
- Admin moderation now confirms that a pending row was actually changed; the queue supports deletion of pending comments.
- Added a disposable PostgreSQL 17 CI job and schema/RLS script covering anonymous and authenticated roles, premium entitlement, direct-insert bypass, concurrent rate limiting, moderator metadata spoofing, rejection visibility, article unpublish, and article-delete cascade. **Test source is not test evidence.**

### CI evidence
- GitHub Actions run [39168758906](https://github.com/MATI-AI-HUB/automation-king-/actions/runs/39168758906) was created for an earlier branch head. All five jobs (worker, frontend, secret scan, Gitleaks, and the new PostgreSQL schema job) were observed as failed with zero reported steps. Job-step queries returned empty step lists; log downloads returned 404 `BlobNotFound`. A rerun of failed jobs showed the same no-step pattern.
- Latest head `7970f5dde7f88c1cec5f0de4e8910c28bb6fa203` returned no commit statuses and no PR-triggered workflow run in the current integration lookup.
- Therefore current-head typecheck, lint, build, unit tests, schema replay, RLS tests, and concurrency tests are **NOT RUN / BLOCKED**, not passed. The available evidence does not establish whether the failure is runner availability, workflow permissions, or another GitHub Actions service issue; no logs were available to diagnose the cause.
- Local test execution is unavailable in this runtime: no repository checkout/network access, Docker, or Supabase CLI. No live/production write test was attempted.

### Fresh Vercel read-only verification — supersedes the earlier 403 note
- The Vercel authenticated user is `matiailearninghub@gmail.com`, username `matiailearninghub-3927`, plan `hobby`. The team listing returned no Teams. The earlier 403 came from explicitly supplying the personal-account scope as `teamId`; using the default personal-account scope worked.
- Project `automation-king-lcb2`, project ID `prj_552hrMTjvldSlUHpcuqNqqNbhshb`.
- Production deployment `dpl_4fE7EQeZdKKcxXtNe9o3UNbuCt86` is `READY`, created `2026-10-17T00:54:44.329Z`. Its alias list includes `www.banglarvoice24news.com` and `banglarvoice24news.com`; the apex alias redirects to `www`.
- Production-serving Git SHA is **VERIFIED** as `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae` on `main`. Raw Git metadata for that exact commit confirms author and committer email `matiailearninghub@gmail.com`; the commit is unsigned (`verified=false`, reason `unsigned`). No deployment was created, promoted, canceled, or changed.
- Environment-variable presence was checked by name only, with decryption disabled. Existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured for production and preview. No new environment variable or secret is needed by the current database-trigger design; no values were decrypted, copied, or printed.

### Supabase / migration boundary
- Read-only query at `2026-10-18T21:33:43.046757Z` returned `to_regclass('public.article_comments') = NULL`. The proposed migration remains unapplied to production.
- Latest observed live migration-ledger version is `20261018175840`; proposed `20261018212000_article_comments.sql` sorts after that observed version. The existing migration mismatches recorded earlier remain unresolved and are not repaired by this feature.
- Supabase branch listing returned only the existing `main` branch with status `MIGRATIONS_FAILED`; no isolated staging branch was available. No paid branch/resource was created.
- No production SQL/migration, grants/policies, Vault secret, Auth configuration, scheduler, queue, or environment variable was changed.

### Commit identity limits
- GitHub authenticated login remains `MATI-AI-HUB`, matching repository ownership and `.github/CODEOWNERS`; no new `Co-authored-by` trailer was added.
- The Vercel account email matches `matiailearninghub@gmail.com`, but that does **not** independently prove the GitHub raw author/committer email. The GitHub connector returns raw email as null/unavailable, and this runtime cannot reach GitHub for a read-only clone/raw Git inspection. Exact GitHub author/committer email and signature verification remain **UNVERIFIED**.
- Historical co-author trailers were not rewritten. No rebase, amend, history rewrite, or force-push was performed.

### Release status
- **IMPLEMENTED (proposal):** comments UI, direct Supabase submission, RLS/trigger controls, editorial moderation, PostgreSQL 17 test job.
- **VERIFIED:** current Vercel production alias/deployment SHA and existing public Supabase browser configuration presence.
- **NOT RUN / BLOCKED:** all current-head CI checks, migration replay, role-based RLS tests, and end-to-end regression.
- **NOT APPLIED:** production migration, production app deployment, or any live database/configuration change.

## Final verification refresh — current PR head and raw Git metadata
**Observation time:** 2026-10-18 21:45 UTC (2026-10-19 03:45 Bangladesh time)

### Current branch and commit identity
- Current PR #38 head: `075a6c74a175b697ff1e04b5928165557d8f6726`; base/main: `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`; 33 commits ahead of main.
- The raw GitHub REST commit objects were read for the 33 commits on the PR branch. All 33 have author login `MATI-AI-HUB`, committer login `MATI-AI-HUB`, author email `matiailearninghub@gmail.com`, and committer email `matiailearninghub@gmail.com`. No commit message in the branch contains a `Co-authored-by` trailer.
- GitHub reports all 33 commits as `verified=false`, reason `unsigned`; therefore email/account association is verified, but cryptographic commit signatures are absent. Branch protection could not be read (HTTP 403, integration permission); ruleset listing reports GitHub Pro/public-repository restriction for this private repository, so any signature-enforcement policy remains unverified.
- Exact historical main-history co-author SHAs were rechecked from raw GitHub commit metadata: `df30825579612232b78c01adb6dc92f255fd58d6` and `a157076b1c65be908fe9f3110e53c8b03896a8a4`. Both contain `Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>`. A co-author trailer is attribution, not proof of account compromise. No historical commit was rewritten, amended, rebased, or force-pushed.

### Current CI status
- Latest-head run: [39169118024](https://github.com/MATI-AI-HUB/automation-king-/actions/runs/39169118024), head `075a6c74a175b697ff1e04b5928165557d8f6726`. It completed as failure in about three seconds; all five jobs report empty step lists. Step/log queries provide no logs. Earlier runs and one rerun show the same pre-step failure pattern.
- Current-head typecheck, lint, build, unit tests, schema replay, RLS tests, concurrency tests, and article/publishing regressions are **NOT RUN / BLOCKED**, not passed. Available evidence does not distinguish runner/billing/permission failure from another GitHub Actions service issue.

### Fresh migration and production boundary
- Main migration inventory was refreshed through GitHub's contents API at main SHA `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`: 56 repository SQL files. Read-only live ledger query returned 58 rows; 47 exact version matches. Latest repository migration version is `20261017053000`; latest live ledger version is `20261018175840`. Proposed `20261018212000_article_comments.sql` sorts after both. Prior mismatches remain unresolved; no repair was performed.
- A fresh read-only Supabase query at `2026-10-18T21:44:19.486411Z` returned `to_regclass('public.article_comments') = NULL`; migration remains unapplied.
- Vercel production alias/deployment SHA remains verified from the preceding section: deployment `dpl_4fE7EQeZdKKcxXtNe9o3UNbuCt86`, `READY`, aliases include apex and www, SHA `d3cb0c9a4bfcfd2557250d8c6498a8236377b9ae`.
- The proposed database rate-limit trigger uses Supabase's documented PostgREST request-header pattern. Actual project-gateway resistance to a client-supplied `X-Forwarded-For` still needs an end-to-end isolated-staging test. No isolated Supabase staging branch exists in the available listing; no paid branch/resource was created.
- No new environment variable is needed for the current design. Existing public Supabase URL/anon-key variable presence was checked by name only; values were not decrypted or copied.

### Status summary
- **VERIFIED:** 33 branch commit author/committer emails and logins; no co-author trailers on this branch; production Vercel serving SHA; fresh main/ledger inventory and absence of the proposed live table.
- **IMPLEMENTED / PROPOSED:** comment UI, direct Supabase submission, RLS/column grants, database rate-limit and moderation triggers, editorial moderation queue, PostgreSQL 17 test job.
- **NOT RUN / BLOCKED:** current-head CI tests and end-to-end Supabase gateway IP-header spoof test.
- **NOT APPLIED:** production migration, app deployment, Vault/secret change, grant/policy change, Auth setting, scheduler, queue, or any production write.

## Repository-wide historical commit metadata sweep
**Scope:** current `main` history, read through GitHub's raw commits API in pages of 100; 491 commits returned across five non-empty pages.

- **Current PR #38 branch (33 commits):** all 33 author/committer logins are `MATI-AI-HUB`; all 33 raw author/committer emails are exactly `matiailearninghub@gmail.com`; no `Co-authored-by` trailer exists in this branch. All 33 commits are unsigned (`verified=false`, reason `unsigned`).
- **Current main history (491 commits):** 481 commits are unsigned and 10 have GitHub API signature verification `verified=true`, reason `valid`. Those 10 are GitHub `web-flow` generated merge commits with the requested Gmail as author and `noreply@github.com` as committer; they are platform-generated committers, not co-author trailers. Exact SHAs: `e2f3b8339ec7df3bd6d8765f4164bb94f08cf2a5`, `4b2398dd554ac015fd0402d95d45d178f4680a6b`, `19e0a6c554c8493e268f2a21a733115c066cc409`, `ccd35e84fed5cbb110dbd8d67aea42a559330e2d`, `fe1140be7dc4613da6ca93439f2587506507ef41`, `53ad7f1826f77cbf426c6c2c9fcd77ef76d848b3`, `b0ac325269c343108b0d77e6eb8898561a17d415`, `1f59a0fd4d84dc1d6519cc6edcf9764b54fbd326`, `b6aee74aa83d4dac9c4480a822221991da3198f5`, and `b2f9ef9eeb0094012215829d312fca3d9b199769`.
- Five older main-history commits use the non-target author/committer email string `3.31898859e+08+MATI-AI-HUB@users.noreply.github.com`: `7e476a245e5cfa66369ac1d23199e462134ad7cd`, `2399daf51918ad32f9ab7c9e8a7b437032e47837`, `99a0174664b97cbefc7cae4899556c0fbd57b3fb`, `06831c30f3c7d45bad9785dd28648a7549c7433a`, and `cef76ba6d02e3aa8464308ef01734c7a907eb910`. This is not the standard `331898859+MATI-AI-HUB@users.noreply.github.com` form; GitHub's API returns no linked author/committer login for these records. The metadata alone does not prove unauthorized access, but these historical commits do not meet the literal exact-Gmail-only condition and should remain a separate attribution review.
- Repository-wide commit search found exactly two `Co-authored-by` trailers, both `monkeycode-ai <monkeycode-ai@chaitin.com>`, at SHAs `df30825579612232b78c01adb6dc92f255fd58d6` and `a157076b1c65be908fe9f3110e53c8b03896a8a4`.
- Therefore the **new PR branch meets the requested email/no-co-author condition**, but the literal same condition is **not true of all historical main commits**. The historical exceptions are documented only; no rewrite, amend, rebase, or force-push was authorized or performed.
- Branch-protection read returned HTTP 403 from the GitHub integration. Repository ruleset listing returned a plan restriction for this private repository. The policy requirement for signed commits could not be independently checked; the PR branch commits themselves are confirmed unsigned.

## Final implementation correction — comments are now independent of related feed
**Observation time:** 2026-10-18 21:48 UTC (2026-10-19 03:48 Bangladesh time)

- Current PR #38 head is `1031f46c3bba8b6ff0c9db4f23923eae1d4b3802`, 35 commits ahead of `main`. The comment component is now rendered directly in `frontend/app/article/[slug]/page.tsx`, immediately before `RelatedArticles`; `RelatedArticles` no longer imports/renders comments and returns `null` when its own feed has no items. This removes the parent/child failure coupling and duplicate-render path identified during review.
- Raw GitHub commit metadata was refreshed for all 35 branch commits: all author/committer logins are `MATI-AI-HUB`; all author/committer emails are `matiailearninghub@gmail.com`; no co-author trailers; all commits are unsigned. Historical main-history exceptions remain unchanged and documented above.
- Latest current-head workflow run is [39169427334](https://github.com/MATI-AI-HUB/automation-king-/actions/runs/39169427334). All five jobs failed within about two seconds, with empty `runner_name`, zero steps, and no logs. Current-head tests remain **NOT RUN / BLOCKED**; this is not evidence that code tests failed or passed.
- Fresh read-only Supabase query at `2026-10-18T21:48:36.079002Z`: `public.article_comments` remains absent; ledger has 58 rows and latest version `20261018175840`. No migration or database write was performed.
- No new environment variable, secret, Vercel deployment, Supabase branch, or production change was made. Actual Supabase gateway `X-Forwarded-For` spoof resistance remains untested end-to-end because no isolated staging branch is available.

## Privacy follow-up — rate-limit key pseudonymization
**Observation time:** 2026-10-18 21:50 UTC (2026-10-19 03:50 Bangladesh time)

- The proposed migration no longer persists the raw client IP. It parses the request IP from Supabase PostgREST request headers, derives a deterministic 64-bit pseudonymous key, and stores only that key plus the occurrence timestamp in the private rate-limit table. The key is used for the per-IP advisory lock and 3-per-10-minute count. This is pseudonymization, not a cryptographic identity token.
- The disposable PostgreSQL schema test now asserts the table has `client_key bigint` and no `client_ip` column, in addition to direct-insert and concurrent-request limit tests.
- Current PR #38 head: `7df1fe030479bdce7d39db074dfbb7e7201a612b`, 38 commits ahead of main. Raw commit API refresh: all 38 author/committer logins `MATI-AI-HUB`, all author/committer emails `matiailearninghub@gmail.com`, no co-author trailers, all unsigned.
- Latest observed Actions run [39169600513](https://github.com/MATI-AI-HUB/automation-king-/actions/runs/39169600513) is on prior head `fcc11135f8e903b743577cf96ff7548f85de874a` and failed before any steps. The new current head's workflow result is pending/has not yet been returned by the current run lookup. No tests are claimed passed.
- Production remains unchanged; the latest live read-only query at `2026-10-18T21:48:36.079002Z` found no `public.article_comments` table and 58 migration-ledger rows with latest version `20261018175840`. No new environment variable, secret, staging resource, or deployment was created.
