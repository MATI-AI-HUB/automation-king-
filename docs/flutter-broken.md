# Flutter plan (Reader / Admin / Reporter) — plan only

Classification from `docs/APK_AUDIT.md` plus current Dart. No large rewrite in this branch.

## Historic anon key

Hardcoded anon JWTs previously lived as `defaultValue` in admin/reporter/studio `config.dart` and were removed. **Rotate the historically published anon key** in the Supabase dashboard. Do not put `service_role` in any APK. Current Dart uses `--dart-define=SUPABASE_URL` and `SUPABASE_ANON_KEY` only.

No APK/AAB binaries exist in this workspace.

## Reader — RELEVANT-BROKEN

| Broken | Minimal fix |
|---|---|
| Realtime ticker callback is empty; no SELECT of `breaking_ticker` | On start / postgres_changes, GET `/rest/v1/breaking_ticker?select=text_bn,is_active&is_active=eq.true` with anon key and render `text_bn` |
| Articles come from site JSON `/api/public/feed.json`, not PostgREST | Keep JSON as contract until domain is live; do not silently mix table reads |
| Saved list is local SharedPreferences | Defer `reading_history` until `reader` role exists in production schema |
| Client no-op without dart-define | Inject rotated anon key at build |

## Admin — RELEVANT-BROKEN

| Broken | Minimal fix |
|---|---|
| Password grant via raw HTTP; SDK session unused | `signInWithPassword` then reuse SDK session; on non-aal2 prompt TOTP challenge, `refreshSession`, retry once |
| Logout is SharedPreferences only | `signOut` / POST `/auth/v1/logout` |
| Editorial writes go to `/api/admin/*` (now session+role+aal2 on web) | Send Bearer access token; do not embed service_role |
| Ticker toggle hit in-memory web route; now RPC `set_breaking_ticker` | Keep `/api/admin/breaking` after web persist lands |
| Empty dart-define builds a broken auth URL | Fail closed if URL/key missing |

## Reporter — RELEVANT-BROKEN

| Broken | Minimal fix |
|---|---|
| Does not compile: missing `ReporterConfig.liveStartUri/liveStatsUri/liveEndUri` | Add URI helpers **or** drop live screens from the tree |
| Does not compile: missing `ReporterConfig.agoraConfigured` | Add flag or remove Agora screens |
| Dual clients; SDK never booted from `main_reporter.dart` | Init one client; reuse JWT |
| INSERT `field_reports` with `status=pending_review` vs draft/RPC submit | INSERT draft then RPC `submit_field_report` |
| No storage upload; `media_urls` is a local path label | Upload to `field-media/{uid}/...` then store object paths |
| Realtime helper never started | Start after login |
| No AUTH_SIGNOUT | Same as Admin |

Studio and TV remain RELEVANT-WORKING as source (UI scaffold / public JSON). TV ticker callback is empty like Reader.
