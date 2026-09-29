# DB expectations (code as of branch 260929-feat-code-readiness-hardened-db)

Paste this block to the Supabase assistant. Names only. No secrets.

```
TABLES READ
- articles
- published_articles_safe (view preferred; fallback articles)
- breaking_ticker
- videos
- channels
- profiles
- api_vault
- verification_queue
- ai_verifications
- verification_audit
- news_pipeline_runs
- news_ingest_queue
- ai_audit_log
- source_registry
- field_reports
- notifications
- subscriptions
- reading_history
- login_attempts
- audit_log
- live_sessions

TABLES WRITTEN
- articles (INSERT worker/ingest; UPDATE approve/reject/verification/ticker-adjacent)
- breaking_ticker (UPDATE is_active; RPC set_breaking_ticker writes text_bn)
- api_vault (UPDATE metadata; RPC create/delete/decrypt)
- verification_queue (UPDATE)
- verification_audit (INSERT)
- news_pipeline_runs (INSERT)
- news_ingest_queue (UPDATE)
- ai_audit_log (INSERT)
- field_reports (INSERT reporter; UPDATE edge)
- notifications (INSERT edge; UPDATE is_read client)
- reading_history (INSERT edge paywall)
- login_attempts (INSERT edge)
- audit_log (INSERT)
- profiles (trigger handle_new_user INSERT only; client UPDATE own fields; no client INSERT)

VIEWS
- published_articles_safe  (ASSUMED; code feature-detects; not in current migrations)

RPCS
- set_breaking_ticker(p_text text) returns boolean
- create_api_key(p_service_name, p_environment, p_key_value)
- delete_api_key(p_service_name, p_environment)
- decrypt_vault_secret(p_secret_id)
- news_pipeline_last_success()
- submit_field_report(p_report_id)
- set_user_role(p_user_id, p_role)
- current_app_role()
- platform_role()   (migration file exists, not confirmed applied)

STORAGE BUCKETS
- field-media (private)
- thumbnails (public)
- logos (public)

review_status SEMANTICS (ASSUMED, not confirmed)
- queue uses review_status OR editorial_status
- code treats empty as in-queue
- known values: auto_unverified, pending_review
- articles.status text; pending/submitted/approved/draft in admin queue
- needs_review mapping requested as status='submitted' (NOT wired until you confirm)

PUBLIC FEED SELECT (frontend/app/api/public/feed.json/route.ts)
relation: published_articles_safe else articles
columns: *  (then mapped in JS)
filters if fallback table: status='published', published_at IS NOT NULL, published_at <= now()
JS reads: id, category_key, category, source_name, title_bn, excerpt_bn, content_bn, origin, published_at, thumbnail_url, featured_image, source_url, canonical_url, image_credit

PUBLIC RSS SELECT (frontend/app/rss.xml/route.ts)
relation: published_articles_safe else articles
columns: id, title_bn, excerpt_bn, published_at, source_name
filters if fallback: status='published', published_at IS NOT NULL

SITEMAP
no direct DB select; calls api.articles() -> GET /api/public/feed.json (same * as feed)
uses mapped: slug (=id), published_at

ARTICLE PAGE (frontend/lib/api.ts article())
relation: published_articles_safe else articles
columns: *
filter: id = slug (uuid), plus published filters on fallback
JS reads: id, title_bn, title_en, content_bn, content_en, category, thumbnail_url, featured_image, excerpt_bn, status, published_at, created_at, source_url, source_name, image_credit, origin

WORKER articles INSERT columns
title_bn, title_en, content_bn, content_en, excerpt_bn, category, category_key, status, editorial_status, verification_status, human_verified, source_type, source_language, source_name, source_url, canonical_url, content_hash, thumbnail_url, featured_image, image_alt_bn, image_credit, media_type, ai_confidence, ai_model, fact_sources, published_at, updated_at

ADMIN APPROVE UPDATE (current)
status, published_at, updated_at  WHERE id
PREPARED not wired: publish_mode, approved_by, approved_at

ADMIN REJECT UPDATE
status='archived', updated_at  WHERE id

ADMIN PENDING SELECT
id, title_bn, content_bn, category_key, source_name, source_url, thumbnail_url, ai_confidence, created_at, status
plus optional: review_status, editorial_status
status IN (pending, submitted, approved, draft)
```
