# Ingest switch-over checklist

Goal: GitHub Actions `news-ingest.yml` and any other ingest path must never run at the same time.

Repository variable (Settings → Secrets and variables → Actions → Variables):

- `INGEST_ENABLED` — default treated as true; set to `false` to skip the GitHub job.

The workflow job has `if: ${{ vars.INGEST_ENABLED != 'false' }}`. CI itself is unchanged.

## Switch GitHub ingest OFF (keep CI)

1. Confirm the replacement path is healthy (published count, `/api/health`).
2. Set repository variable `INGEST_ENABLED=false`.
3. Wait 15 minutes (one cron interval) and confirm the News ingest workflow is skipped.
4. Only then enable the replacement path if it was paused.

## Switch GitHub ingest ON

1. Disable the other path first.
2. Confirm no in-flight ingest on the other path.
3. Set `INGEST_ENABLED=true` (or delete the variable).
4. Manually run News ingest once via `workflow_dispatch` and inspect the run.

## Never both

If both paths can write `articles`, stop. Do not overlap even for a canary cycle.
