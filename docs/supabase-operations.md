# Supabase operations inventory

Production ref `rcffuqkofvuezgbjcixj` (do not run tests against it). Staging ref `fqqdpngmftoddffvdukn`. No keys, URLs with credentials, or personal data.

Confidence: CERTAIN = seen in source at file:line. INFERRED = implied by schema/RLS but not called. UNKNOWN = not verified.

CRITICAL: no Flutter or browser client uses `service_role`. Worker, Edge Functions, and Next.js server routes do.

| # | component | object | verb | expected role | columns | filters | file:line | confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | web | articles | SELECT | anon | * | status=published, published_at not null | frontend/app/api/public/feed.json/route.ts:45 | CERTAIN |
| 2 | web | published_articles_safe | SELECT | anon | * | view preferred, fallback articles | frontend/lib/supabase/published-articles.ts:33 | CERTAIN |
| 3 | web | articles | SELECT | anon | id,title_bn,excerpt_bn,published_at,source_name | published | frontend/app/rss.xml/route.ts:21 | CERTAIN |
| 4 | web | articles | SELECT | anon | * | id=slug AND published (via helper) | frontend/lib/api.ts:253 | CERTAIN |
| 5 | web | videos | SELECT | anon | id,title_bn,title_en,category_key,thumbnail_url,video_url,embed_url,youtube_id,duration_sec,is_live,view_count,published_at | status in published,live | frontend/lib/api.ts:288 | CERTAIN |
| 6 | web | videos | SELECT | anon | * | status in published,live | frontend/app/api/public/videos.json/route.ts:24 | CERTAIN |
| 7 | web | breaking_ticker | SELECT | anon | * | is_active=true | frontend/components/breaking-marquee.tsx:49 | CERTAIN |
| 8 | web | breaking_ticker | realtime topic | anon | * | table breaking_ticker | frontend/components/breaking-marquee.tsx:69 | CERTAIN |
| 9 | web | breaking_ticker | SELECT | anon | UNKNOWN | UNKNOWN | frontend/app/api/public/live.json/route.ts:19 | CERTAIN |
| 10 | web | channels | SELECT | anon | UNKNOWN | UNKNOWN | frontend/app/api/public/channels.json/route.ts:18 | CERTAIN |
| 11 | web | profiles | SELECT | authenticated (admin/chief_editor/desk_editor) | role | id=auth.uid() | frontend/middleware.ts:64 | CERTAIN |
| 12 | web | profiles | SELECT | authenticated (same) | role | id=user.id | frontend/lib/server/require-admin.ts:29 | CERTAIN |
| 13 | web | articles | UPDATE | service (after admin session+aal2) | status,published_at,updated_at | id | frontend/app/api/admin/approve/route.ts:20 | CERTAIN |
| 14 | web | articles | UPDATE | service (after admin session+aal2) | status,updated_at | id | frontend/lib/supabase/mutations.ts:41 | CERTAIN |
| 15 | web | articles | SELECT | service (after admin session+aal2) | id,title_bn,content_bn,category_key,source_name,source_url,thumbnail_url,ai_confidence,created_at,status,review_status,editorial_status | status in pending,submitted,approved,draft | frontend/app/api/admin/pending/route.ts:24 | CERTAIN |
| 16 | web | RPC set_breaking_ticker | EXECUTE | service (after admin session+aal2) | p_text | id=1 implied | frontend/app/api/admin/breaking/route.ts:24 | CERTAIN |
| 17 | web | breaking_ticker | SELECT | service (after admin session+aal2) | text_bn,is_active,updated_at | id=1 | frontend/app/api/admin/breaking/route.ts:67 | CERTAIN |
| 18 | web | breaking_ticker | UPDATE | service (after admin session+aal2) | is_active | id=1 | frontend/app/api/admin/breaking/route.ts:31 | CERTAIN |
| 19 | web | api_vault | SELECT | service (after admin session+aal2) | id,service_name,environment,is_active,last_tested,usage_percent,created_at,updated_at | none | frontend/app/api/admin/api-keys/route.ts:14 | CERTAIN |
| 20 | web | RPC create_api_key | EXECUTE | service (after admin session+aal2) | p_service_name,p_environment,p_key_value | n/a | frontend/app/api/admin/api-keys/route.ts:49 | CERTAIN |
| 21 | web | RPC delete_api_key | EXECUTE | service (after admin session+aal2) | p_service_name,p_environment | n/a | frontend/app/api/admin/api-keys/[id]/route.ts:96 | CERTAIN |
| 22 | web | RPC decrypt_vault_secret | EXECUTE | service (after admin session+aal2) | p_secret_id | n/a | frontend/app/api/admin/api-keys/[id]/test/route.ts:28 | CERTAIN |
| 23 | web | verification_queue | SELECT | service (after requireAdmin) | queue cols | status, range | frontend/app/api/admin/verification/queue/route.ts:26 | CERTAIN |
| 24 | web | verification_queue | UPDATE | service (after requireAdmin) | status | id | frontend/app/api/admin/verification/[id]/approve/route.ts:39 | CERTAIN |
| 25 | web | verification_audit | INSERT | service (after requireAdmin) | UNKNOWN | n/a | frontend/app/api/admin/verification/[id]/approve/route.ts:64 | CERTAIN |
| 26 | web | articles | INSERT | service (ingest key, not user JWT) | title_bn,content_bn,status,source_* | n/a | frontend/app/api/newsroom/ingest/route.ts:201 | CERTAIN |
| 27 | web | articles | SELECT | service | id,status | source_url / content_hash | frontend/app/api/newsroom/ingest/route.ts:173 | CERTAIN |
| 28 | web | articles | SELECT | service | count | status=published | frontend/app/api/health/route.ts:46 | CERTAIN |
| 29 | web | RPC news_pipeline_last_success | EXECUTE | service or anon | none | n/a | frontend/app/api/health/route.ts:40 | CERTAIN |
| 30 | web | news_pipeline_runs | SELECT | service | completed_at,created_at,status,stage,published,error_message | UNKNOWN | frontend/app/api/health/route.ts:53 | CERTAIN |
| 31 | web | ai_audit_log | SELECT | anon (server createClient uses anon) | * | order created_at | frontend/app/admin/analytics/page.tsx:12 | CERTAIN |
| 32 | web | auth.users | LIST | service (Auth admin API) | users | perPage 200 | frontend/lib/control/user-service.ts:35 | CERTAIN |
| 33 | web | notifications | UPDATE | authenticated | is_read | id | frontend/lib/supabase/mutations.ts:8 | CERTAIN |
| 34 | web | auth MFA TOTP | enroll/challenge/verify/unenroll | authenticated | factor | n/a | frontend/lib/auth/mfa.ts:26 | CERTAIN |
| 35 | worker | articles | SELECT | service | id | status=published, published_at gte 1h | worker/src/lib/pipeline.ts:15 | CERTAIN |
| 36 | worker | articles | SELECT | service | id,status | source_url / content_hash | worker/src/lib/ingest.ts:101 | CERTAIN |
| 37 | worker | articles | INSERT | service | title_bn,... source_name,source_url | n/a | worker/src/lib/ingest.ts:132 | CERTAIN |
| 38 | worker | news_pipeline_runs | INSERT | service | stage,status,counts | n/a | worker/src/lib/pipeline.ts:62 | CERTAIN |
| 39 | worker | news_pipeline_runs | SELECT | service | completed_at,created_at | status=success | worker/src/lib/pipeline.ts:110 | CERTAIN |
| 40 | worker | ai_audit_log | INSERT | service | UNKNOWN | n/a | worker/src/lib/ai-logger.ts:27 | CERTAIN |
| 41 | worker | articles | SELECT | service | source_name | status=published, created_at gte 24h | worker/src/agents/specialists/diversity.ts:30 | CERTAIN |
| 42 | worker | source_registry | SELECT | service | daily_cap_pct | name_bn | worker/src/agents/specialists/diversity.ts:37 | CERTAIN |
| 43 | Reader | GET /api/public/feed.json | HTTP | anon | feed items | n/a | mobile_monorepo/apps/reader_app/lib/src/config.dart:30 | CERTAIN |
| 44 | Reader | GET /api/public/live.json | HTTP | anon | entries | n/a | mobile_monorepo/apps/reader_app/lib/src/config.dart:33 | CERTAIN |
| 45 | Reader | GET /api/public/videos.json | HTTP | anon | videos | n/a | mobile_monorepo/apps/reader_app/lib/src/config.dart:36 | CERTAIN |
| 46 | Admin | POST /auth/v1/token?grant_type=password | HTTP | anon | email,password | n/a | mobile_monorepo/apps/admin_app/lib/src/services/admin_session.dart:34 | CERTAIN |
| 47 | Admin | profiles | SELECT | authenticated | role | id=eq.{user} | mobile_monorepo/apps/admin_app/lib/src/services/admin_session.dart:54 | CERTAIN |
| 48 | Admin | GET /api/admin/pending | HTTP | admin/chief_editor/desk_editor + aal2 | items | n/a | mobile_monorepo/apps/admin_app/lib/src/config.dart:17 | CERTAIN |
| 49 | Admin | POST /api/admin/approve | HTTP | same | id | n/a | mobile_monorepo/apps/admin_app/lib/src/config.dart:18 | CERTAIN |
| 50 | Admin | POST /api/admin/reject | HTTP | same | id | n/a | mobile_monorepo/apps/admin_app/lib/src/config.dart:19 | CERTAIN |
| 51 | Admin | GET/POST /api/admin/breaking | HTTP | same | active,text | n/a | mobile_monorepo/apps/admin_app/lib/src/config.dart:21 | CERTAIN |
| 52 | Reporter | POST /auth/v1/token?grant_type=password | HTTP | anon | email,password | n/a | mobile_monorepo/apps/reporter_app/lib/src/services/reporter_session.dart:94 | CERTAIN |
| 53 | Reporter | profiles | SELECT | authenticated | role,full_name,phone,verified | id=eq.{user} | mobile_monorepo/apps/reporter_app/lib/src/services/reporter_session.dart:113 | CERTAIN |
| 54 | Reporter | field_reports | INSERT | citizen_reporter / staff_reporter | reporter_id,title,description,media_urls,location,lat,lng,captured_at,status | n/a | mobile_monorepo/apps/reporter_app/lib/src/services/offline_queue.dart:144 | CERTAIN |
| 55 | Reporter | field_reports | realtime topic | authenticated | * | postgres_changes | mobile_monorepo/apps/reporter_app/lib/src/services/realtime_field_reports.dart:47 | CERTAIN |
| 56 | Studio | POST /auth/v1/token | HTTP | anon | email,password | n/a | mobile_monorepo/apps/studio_app/lib/src/services/studio_session.dart:114 | CERTAIN |
| 57 | Studio | profiles | SELECT | authenticated | role,full_name,phone,verified | id=eq.{user} | mobile_monorepo/apps/studio_app/lib/src/services/studio_session.dart:137 | CERTAIN |
| 58 | TV | GET /api/public/stream.json | HTTP | anon | UNKNOWN | n/a | mobile_monorepo/apps/tv_app/lib/src/config.dart:19 | CERTAIN |
| 59 | TV | GET /api/public/schedule.json | HTTP | anon | UNKNOWN | n/a | mobile_monorepo/apps/tv_app/lib/src/config.dart:20 | CERTAIN |
| 60 | TV | GET /api/public/channels.json | HTTP | anon | UNKNOWN | n/a | mobile_monorepo/apps/tv_app/lib/src/config.dart:21 | CERTAIN |
| 61 | edge two-factor | auth MFA | enroll/challenge/verify/unenroll | authenticated | totp | n/a | supabase/functions/two-factor/index.ts:24 | CERTAIN |
| 62 | edge news-writer | articles | INSERT/SELECT | service | UNKNOWN | source_url | supabase/functions/news-writer/index.ts:447 | CERTAIN |
| 63 | edge news-writer | news_ingest_queue | SELECT/UPDATE | service | UNKNOWN | UNKNOWN | supabase/functions/news-writer/index.ts:571 | CERTAIN |
| 64 | edge news-pipeline | news_ingest_queue | SELECT/UPDATE | service | UNKNOWN | UNKNOWN | supabase/functions/news-pipeline/index.ts:183 | CERTAIN |
| 65 | edge news-pipeline | news_pipeline_runs | INSERT | service | UNKNOWN | n/a | supabase/functions/news-pipeline/index.ts:222 | CERTAIN |
| 66 | edge getApiKey | api_vault | SELECT | service | UNKNOWN | UNKNOWN | supabase/functions/getApiKey/index.ts:58 | CERTAIN |
| 67 | edge ai-process-report | field_reports | SELECT/UPDATE | service | UNKNOWN | UNKNOWN | supabase/functions/ai-process-report/index.ts:95 | CERTAIN |
| 68 | edge ai-process-report | notifications | INSERT | service | UNKNOWN | n/a | supabase/functions/ai-process-report/index.ts:183 | CERTAIN |
| 69 | edge paywall | subscriptions | SELECT | authenticated JWT via service client | UNKNOWN | UNKNOWN | supabase/functions/paywall/index.ts:39 | CERTAIN |
| 70 | edge paywall | reading_history | INSERT | authenticated JWT via service client | UNKNOWN | UNKNOWN | supabase/functions/paywall/index.ts:54 | CERTAIN |
| 71 | edge backup-cron | audit_log | INSERT | service | action,detail | n/a | supabase/functions/backup-cron/index.ts:121 | CERTAIN |
| 72 | storage | bucket field-media | INSERT | citizen_reporter,staff_reporter | object name | folder[1]=auth.uid() | supabase/storage.sql:44 | CERTAIN |
| 73 | storage | bucket field-media | SELECT | owner or staff_reporter/desk_editor/chief_editor/admin | object | folder[1]=uid or staff role | supabase/storage.sql:54 | CERTAIN |
| 74 | storage | bucket field-media | INSERT | staff_reporter+ | object | folder[1]=staff | supabase/storage.sql:66 | CERTAIN |
| 75 | storage | bucket thumbnails | SELECT | anon | object | public bucket | supabase/storage.sql:20 | INFERRED |
| 76 | storage | bucket logos | SELECT | anon | object | public bucket | supabase/storage.sql:23 | INFERRED |
| 77 | schema | RPC submit_field_report | EXECUTE | citizen_reporter/staff_reporter | p_report_id | own draft | supabase/schema.sql:437 | CERTAIN |
| 78 | schema | RPC set_user_role | EXECUTE | admin | p_user_id,p_role | n/a | supabase/schema.sql:427 | CERTAIN |
| 79 | schema | RPC current_app_role | EXECUTE | authenticated | none | n/a | supabase/schema.sql:217 | CERTAIN |
| 80 | schema | handle_new_user trigger | INSERT profiles | trigger on auth.users | id,full_name,phone | n/a | supabase/schema.sql:378 | CERTAIN |

Flags / gaps (owners):

- Client INSERT into profiles: none found in app code. Trigger creates the row. CERTAIN for web/worker/flutter search.
- Hard DELETE on articles/reading_history in clients: none found. Reject uses status=archived.
- `review_status` column: used with fallback; may be absent on production (feature-detect). UNKNOWN until Supabase agent confirms.
- `published_articles_safe` view: not in current migrations. Code prefers it, falls back. PENDING: Supabase agent.
- staff_reporter storage "reads only own and staff/": schema policy currently lets staff_reporter read any field-media (`storage.sql:61`). Flag for Supabase agent. CERTAIN mismatch vs desired matrix.
- YouTube oauth-callback uses service_role without requireAdmin in-route (cookie oauth). frontend/app/api/youtube/oauth-callback/route.ts:8 CERTAIN.
- Admin stats/reporters routes are in-memory mocks, no DB. frontend/app/api/admin/stats/route.ts CERTAIN.
