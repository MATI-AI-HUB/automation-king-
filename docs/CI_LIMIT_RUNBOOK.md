# CI quota fallback: local verification runbook

This runbook is for periods when GitHub Actions jobs cannot start because the repository/account has exhausted its CI allowance. It does not replace required checks or authorize merging/deploying without the project's normal release approval.

## 1. Confirm the failure mode

1. Open the failed workflow run and each job.
2. If jobs have no steps and finish immediately, record that as an infrastructure/runner symptom, not proof of a code failure.
3. If logs show a command ran and failed, treat it as a real check failure and fix it.
4. Do not disable branch protection, mark checks successful manually, or use an empty workflow to bypass required checks.

## 2. Environment

Use Node.js 22, matching `.github/workflows/ci.yml`. Run from a clean checkout of the PR branch. Do not copy production secrets or PII into the test environment.

## 3. Frontend checks

```bash
cd frontend
node --version
npm --version
npm ci --legacy-peer-deps
npx tsc --noEmit
npm run lint
npm run build
npx vitest run
```

## 4. Worker checks

```bash
cd worker
npm ci --legacy-peer-deps
npx tsc --noEmit
npx vitest run
```

## 5. Additional checks

From repository root:

```bash
git grep -n -E 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' -- ':!*.md' ':!docs/**' ':!.github/**'
```

A no-match result is expected. Also run Gitleaks with the repository's configured baseline if the binary is available:

```bash
gitleaks detect --redact --baseline-path .gitleaks-baseline.json
```

Do not install untrusted binaries or upload repository contents to third-party scanners without approval.

## 6. Evidence record

For each command, record:
- commit SHA and working-tree status;
- exact command and tool versions;
- exit code and short relevant output;
- whether the command actually ran or was blocked by environment/network/quota.

A locally successful test is useful evidence but is not a GitHub Actions check. Keep PR status truthful. If dependencies cannot be installed because network access is unavailable, mark the check **NOT RUN** rather than passing it.

## 7. Release gate

Do not merge or deploy solely because local checks pass. First review the complete diff, confirm the CI outage is resolved or an authorized equivalent validation process is accepted, and obtain the normal approval. Production deployment, database migrations, secret changes, scheduled publishing and social posting remain separate approval-gated actions.
