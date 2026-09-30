# HANDOFF — p1-owner-hardening (Vercel 100% + Supabase connect)

তারিখ: 2026-09-30
ব্রাঞ্চ: `p1-owner-hardening` → PR to `main`
Vercel project: `automation-king-lcb2`
Git author (বাধ্যতামূলক): `matiailearninghub@gmail.com`

## কী ঠিক হলো

- `frontend/vercel.json`: Framework Next.js, Install `npm ci`, Build `npm run build`, ignoreCommand `bash scripts/vercel-ignore.sh`
- Node **20.x**: `frontend/package.json` `engines`, `frontend/.nvmrc` (`22` থেকে নামানো)
- `frontend/.npmrc`: `legacy-peer-deps=true` যাতে `npm ci` Hobby/CI-তে peer conflict না করে
- `tests/vercel-ignore.test.ts`: skip vs build (non-main ref, HEAD^, `VERCEL_GIT_PREVIOUS_SHA`, worker-only, initial commit)
- Git log সিমুলেশন: `p1-owner-hardening` non-main → Vercel **SKIP**; `main` এ frontend diff → **BUILD**
- `frontend/.env.example`: সব `process.env.*` ইনভেন্টরি, Production/Preview/Both + Server-only/Public কমেন্ট, মান ছাড়া
- P0 স্ক্যান: `NEXT_PUBLIC_SERVICE_ROLE` / `NEXT_PUBLIC_*SECRET*` / `NEXT_PUBLIC_OPENAI_KEY` **নেই**
- CI: frontend job এখন `lint` → `typecheck` → `test` → `build`; ব্রাঞ্চ ট্রিগার `p1-owner-hardening`
- Owner-only `authority-check.yml` এর সাথে কনফ্লিক্ট নেই (আলাদা workflow)
- `docs/DEPLOY.md`: Dashboard মান, click-by-click, ignore logic, rollback, Hobby limit, GitHub App নোট

## Flutter APK compatibility

- URL hardcode নেই। `String.fromEnvironment('SUPABASE_URL')` / `SUPABASE_ANON_KEY` (`packages/supabase_core`, reporter/admin/studio config)
- Canonical endpoint: `--dart-define=SUPABASE_URL=https://<ref>.supabase.co` — প্রোডে `rcffuqkofvuezgbjcixj`
- Anon key পাবলিক-সেফ **শুধু RLS চালু থাকলে**
- Realtime: Reader + TV `breaking_ticker` চ্যানেলে সাবস্ক্রাইব করে; ওয়েব `components/breaking-marquee.tsx` একই টেবিল
- `device_tokens` টেবিল **স্কিমায় নেই**, ক্লায়েন্টেও নেই — fallback: টোকেন রেজিস্টার skip, ক্র্যাশ নয়। Push চাইলে নতুন টেবিল + RLS পরে

## কী বাকি (Supabase backend)

- GitHub App: Dashboard `RECENT BRANCH: No branches` = permission ভাঙা। Reconnect করুন (`docs/DEPLOY.md` §৫)
- Prod vs Dev ref মিক্স করবেন না। Prod = `rcffuqkofvuezgbjcixj`, Dev = `fqqdpngmftoddffvdukn`
- RLS যাচাই (SQL Editor, প্রোড):

```sql
SELECT * FROM pg_policies WHERE tablename IN ('ads','field_reports');
```

প্রত্যাশিত (মাইগ্রেশন অনুযায়ী multiple policies):

- `ads`: `anyone reads active ads`, `service manages ads`
- `field_reports`: `reporters insert own report`, `report owner or staff or published`, `owner edits own draft`, `editorial updates status`, `owner deletes own draft`, `admin deletes any report`

- `articles` খালি হলে `/api/public/feed.json` = `[]` → টেমপ্লেট UI। Env ঠিক থাকলেও কনটেন্ট seed করতে হবে
- Edge Functions GitHub auto-deploy GitHub App না-ফিক্স হওয়া পর্যন্ত ম্যানুয়াল
- Vercel Dashboard Root Directory / Production Branch এই এজেন্ট বদলায়নি — owner click-by-click (`docs/DEPLOY.md` §২)

## পরবর্তী deploy কীভাবে

1. এই PR রিভিউ + CI সবুজ + authority-check সবুজ
2. `main`-এ merge (direct push নয়)
3. Vercel Git integration `main` থেকে প্রোড বিল্ড করবে (`Root Directory=frontend` নিশ্চিত)
4. Verify: `curl -sS https://banglarvoice24news.com/api/health`
5. ব্যর্থ হলে Instant Rollback (`docs/DEPLOY.md` §৮)
6. CLI বিকল্প (owner টোকেন): `vercel --prod --confirm`

## Secret leak check (লোকাল)

```bash
grep -r "NEXT_PUBLIC_" --include="*.ts" --include="*.tsx" frontend/
```

`SERVICE_ROLE` / raw JWT `eyJhbGci...` পাবলিক কোডে থাকলে মার্জ করবেন না।
