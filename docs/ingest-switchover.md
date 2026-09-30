# Ingest switch-over checklist

GitHub Actions `.github/workflows/news-ingest.yml` is the current ingest path (`npx tsx src/once.ts` every 15 minutes). Repository variable `INGEST_ENABLED` defaults to enabled when unset. Set it to `false` to stop GitHub ingest without disabling CI.

Never run two ingest writers at once.

## Turn GitHub ingest OFF (before enabling another path)

1. GitHub repo Settings → Variables → `INGEST_ENABLED` = `false`.
2. Confirm the next scheduled `News ingest` run logs "GitHub ingest disabled" and does not call `src/once.ts`.
3. Only then start the replacement path (Edge `news-pipeline` / `news-writer`, or another worker).
4. Watch `/api/health` `last_success_at` and published count for one interval.

## Turn GitHub ingest ON (only if the other path is stopped)

1. Stop the other writer (disable its cron / unschedule Edge functions).
2. Confirm no overlapping `news_pipeline_runs` inserts for 15 minutes.
3. Set `INGEST_ENABLED` = `true` (or delete the variable; unset means enabled).
4. Manually `workflow_dispatch` once, then re-enable the 15-minute schedule mentally by leaving the workflow file unchanged.

## Cards / public feed (must remain true on either path)

- Every card shows `source_name` (fallback `সূত্র`).
- Aggregated items keep source chip, `মূল সংবাদ` / `source_url` link, `image_credit`, Bangla relative time.
