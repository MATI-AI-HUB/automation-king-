# Flutter repair plan (Reader, Admin, Reporter)

No large rewrite. Source-only: no APKs in this workspace. Classification from `docs/APK_AUDIT.md`.

Historically published anon key rotation: hardcoded anon JWTs were removed from admin/reporter/studio `config.dart`. Clients take `--dart-define=SUPABASE_URL` and `SUPABASE_ANON_KEY` only. **Rotate the published anon key in the Supabase dashboard** because it was in git history. Do not put `service_role` in any APK.

## Reader — RELEVANT-BROKEN

Broken:

- Talks to `https://banglarvoice24news.com/api/public/feed.json` (and live/videos). Domain currently not serving this app (`DEPLOYMENT_NOT_FOUND` historically).
- No Auth; public JSON only. Cards must show source name + Bangla relative time (web feed now supplies `source_name`).

Minimal fixes:

1. Point `API_BASE` / Settings override at a live preview origin once Vercel Hobby is unblocked.
2. Keep reading `/api/public/feed.json`; do not add a second REST client for `articles`.
3. After domain is live, smoke: published cards, source chip, no draft rows.

## Admin — RELEVANT-BROKEN

Broken:

- Password login via `auth/v1/token` then `rest/v1/profiles?select=role` (`admin_session.dart`). No Auth MFA / aal2.
- Calls `/api/admin/pending|approve|reject|breaking|stats|reporters|health` with a stored access token. Those routes now require session + role + aal2 for admin/chief_editor.
- Stats/reporters/health are still mock JSON on the web.

Minimal fixes:

1. After password grant, if `aal` is not `aal2`, prompt TOTP (`/auth/v1/factors` + challenge/verify) before storing the token.
2. Send `Authorization: Bearer <access_token>` on every `/api/admin/*` call.
3. Do not embed `service_role`. Keep role allow-list `admin|chief_editor|desk_editor`.

## Reporter — RELEVANT-BROKEN

Broken:

- Inserts `field_reports` as `pending_review` via raw REST (`offline_queue.dart:144`) instead of draft + `submit_field_report` RPC. RLS insert policy requires citizen/staff and own `reporter_id`.
- `submitEndpoint` still points at PocketBase `/api/collections/articles/records`.
- Live/Agora paths optional; EXIF strip not verified in this workspace.
- Realtime listener is scaffold, not started from `main_reporter.dart`.

Minimal fixes:

1. Insert status `draft`, then RPC `submit_field_report`.
2. Remove PocketBase submit URL or gate it behind a dead flag.
3. Storage: `field-media/{auth.uid()}/...` only; never another reporter's prefix.

Studio and TV remain RELEVANT-WORKING as source.
