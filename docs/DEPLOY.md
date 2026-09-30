# Vercel + Supabase ডিপ্লয় গাইড (p1-owner-hardening)

প্রজেক্ট: `automation-king-lcb2`
রিপো: `MATI-AI-HUB/automation-king-`
প্রোডাকশন ব্রাঞ্চ: `main`
কাজের ব্রাঞ্চ: `p1-owner-hardening`

## ১. Vercel Settings — সঠিক মান

Dashboard: [Vercel](https://vercel.com) > Project `automation-king-lcb2` > Settings

| সেটিং | মান | কোথায় |
|---|---|---|
| Git | Connected repo `MATI-AI-HUB/automation-king-` | Settings > Git |
| Production Branch | `main` | Settings > Git > Production Branch |
| Root Directory | `frontend` | Settings > General > Root Directory |
| Framework | Next.js | Settings > General (auto-detect + `frontend/vercel.json` `framework: nextjs`) |
| Node.js Version | `20.x` | Settings > General; `frontend/package.json` `engines.node` + `frontend/.nvmrc` |
| Install Command | `npm ci` | `frontend/vercel.json` `installCommand` |
| Build Command | `npm run build` | `frontend/vercel.json` `buildCommand` |
| Output Directory | `.next` (Next.js ডিফল্ট — খালি রাখুন) | Settings > General |
| Ignored Build Step | `bash scripts/vercel-ignore.sh` | `frontend/vercel.json` `ignoreCommand` |
| Include files outside Root Directory | ON | Settings > General (monorepo git metadata) |

`frontend/.npmrc` এ `legacy-peer-deps=true` আছে, তাই `npm ci` vitest/vite peer conflict এড়ায়। Dashboard-এ আলাদা `--legacy-peer-deps` লাগবে না।

## ২. Click-by-Click (Dashboard-এ যা Agent বদলাতে পারে না)

Vercel Project Settings UI এই এজেন্ট থেকে বদলানো যায় না। Owner নিজে করুন:

1. [Vercel Dashboard](https://vercel.com/dashboard) খুলুন
2. Project **automation-king-lcb2** সিলেক্ট করুন
3. **Settings > Git**
   - Connected Git Repository = `MATI-AI-HUB/automation-king-`
   - **Production Branch = `main`**
4. **Settings > General**
   - **Root Directory = `frontend`** (Browse → `frontend` → Save)
   - Framework Preset = **Next.js**
   - Node.js Version = **20.x**
   - Install Command Override = `npm ci` (খালি রাখলে `vercel.json` চলবে)
   - Build Command Override = `npm run build`
5. **Settings > Environments** — Production domain `banglarvoice24news.com` latest Ready deployment-এ alias করা আছে কিনা দেখুন (Domains ট্যাব)
6. **Settings > Environment Variables** — নিচের নামগুলো Production + Preview এ যোগ করুন (মান Dashboard-এ, রিপোতে নয়)

## ৩. Environment variables (শুধু নাম)

Required:

- `NEXT_PUBLIC_SUPABASE_URL` — Public, Both. Prod মান: `https://rcffuqkofvuezgbjcixj.supabase.co` (Dev `fqqdpngmftoddffvdukn` মিক্স করবেন না)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public, Both
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only, Both
- `NEXT_PUBLIC_SITE_URL` — Public, Both (`https://banglarvoice24news.com`)

Server-only (প্রোড নিউজরুম):

- `NEWSROOM_INGEST_KEY`
- `SUPABASE_DB_URL`
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `GITHUB_DISPATCH_TOKEN`

Optional public:

- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- `NEXT_PUBLIC_PLAUSIBLE_SRC`
- `NEXT_PUBLIC_STREAM_URL`
- `NEXT_PUBLIC_API_URL` (production-এ খালি)

P0: `NEXT_PUBLIC_` প্রিফিক্সে `SERVICE_ROLE` / `SECRET` / `OPENAI_KEY` নেই। `NEXT_PUBLIC_ELEVENLABS_API_KEY` ও `NEXT_PUBLIC_CHAT_AI_KEY` ক্লায়েন্ট বান্ডলে যায় — প্রোডে মান দিবেন না।

পূর্ণ টেমপ্লেট: `frontend/.env.example`

## ৪. `vercel-ignore.sh` লজিক

ফাইল: `frontend/scripts/vercel-ignore.sh`

Vercel Ignored Build Step: **exit 0 = skip**, **exit 1 = build**।

1. `VERCEL_GIT_PREVIOUS_SHA` থাকলে এবং সেই commit রিপোতে থাকলে: `frontend/`-এ diff না থাকলে skip, থাকলে build।
2. না থাকলে `HEAD^` vs `HEAD` এ `frontend/` দেখে একই সিদ্ধান্ত।
3. Parent commit না থাকলে (প্রথম commit) → **build** (`exit 1`)।

Worker-only commit প্রোড ব্যান্ডউইথ/build minute বাঁচায়। Frontend ফাইল বদলালে সবসময় build হয়।

### Git log সিমুলেশন (এই ক্লোন)

`main`-এ এই মুহূর্তে ১টি commit (`7e22421 chore(security): enforce owner-only commit authority in CI`)। Parent নেই, `frontend/` আছে → script **BUILD** (`exit 1`)। `p1-owner-hardening`-এর পরের frontend commit-ও BUILD। Worker-only commit হলে SKIP।

টেস্ট: `cd frontend && npm test` (`../tests/vercel-ignore.test.ts`)।

## ৫. Supabase GitHub App — `RECENT BRANCH: No branches`

Supabase Dashboard-এ **RECENT BRANCH: No branches** দেখালে GitHub App ইন্টিগ্রেশন ভাঙা। এর মানে:

- Supabase GitHub App-এর repo permission (`contents` / `metadata`) নেই, অথবা
- App অন্য org/user-এ ইনস্টল, `MATI-AI-HUB/automation-king-` সিলেক্ট করা নেই, অথবা
- Preview branch tracking বন্ধ।

এটা Vercel ignore-step বাগ নয়। ফিক্স (owner, Dashboard):

1. GitHub > org `MATI-AI-HUB` > Settings > GitHub Apps > **Supabase** > Repository access = `automation-king-`
2. Supabase > Project Settings > Integrations > GitHub > Disconnect → Reconnect, repo সিলেক্ট
3. তারপর Preview branches তালিকায় আসবে

যতক্ষণ এটা ভাঙা, Edge Function auto-deploy GitHub থেকে চলবে না — `supabase functions deploy` ম্যানুয়াল বা `.github/workflows/supabase-functions-deploy.yml` দিয়ে চালান।

## ৬. Deploy verify

লোকাল:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

প্রোড (Vercel CLI, owner মেশিনে — এই এজেন্ট Vercel টোকেন রাখে না):

```bash
vercel --prod --confirm
```

প্রত্যাশিত: Ready, alias `banglarvoice24news.com` ও `automation-king-lcb2.vercel.app` latest deployment-এ।

Health:

```bash
curl -sS https://banglarvoice24news.com/api/health
```

`supabase_configured: true` এবং `status` `ok` বা `stale` (ডেটা পুরনো হলে)। `supabase_unconfigured` মানে env ভুল।

## ৭. Domain alias latest deployment-এ কি না

1. Vercel > Project > **Deployments** > Production filter > সর্বশেষ **Ready**
2. **Domains** ট্যাব: `banglarvoice24news.com` এবং `www` যদি থাকে
3. যদি পুরনো deployment-এ আটকে থাকে: সেই Ready row > `...` > **Promote to Production**
4. DNS: apex/CNAME Vercel nameserver বা `cname.vercel-dns.com`

## ৮. Rollback

1. Vercel > Deployments > আগের সবুজ Production row
2. `...` > **Instant Rollback** / **Promote to Production**
3. অথবা CLI: `vercel rollback [deployment-url] --yes`
4. Git revert শুধু `p1-owner-hardening`/`main`-এ PR দিয়ে — `main`-এ direct push নয়

## ৯. Hobby plan লিমিট

Public Hobby (যাচাই: Vercel > Settings > Billing):

- Bandwidth ~100 GB / month
- Build execution সীমিত (Hobby-তে ১টি concurrent build)
- Serverless duration Hobby-তে কম (Pro-এর চেয়ে)
- Cron / preview deployments কোটা আছে

`vercel-ignore.sh` worker-only commit skip করে build minute বাঁচায়। লিমিট ছুঁলে Dashboard Usage দেখুন; প্রোড নিউজ সাইটের জন্য Pro বিবেচনা করুন।

## ১০. CI vs owner-only authority

- `.github/workflows/ci.yml` — lint, typecheck, test, build (`p1-owner-hardening` + `main` + PR)
- `.github/workflows/authority-check.yml` — প্রতিটি commit author/committer = `matiailearninghub@gmail.com`

কনফ্লিক্ট নেই: আলাদা job। CI সবুজ হলেও authority-check লাল হবে যদি অন্য ইমেইল দিয়ে commit হয়। সব কমিট owner ইমেইলে করতে হবে।

## ১১. Deploy log screenshot instruction

Vercel > Project > Deployments > সর্বশেষ Production:

1. Build log খুলুন
2. স্ক্রিনে থাকতে হবে: Root Directory `frontend`, `npm ci`, `npm run build`, `Next.js`, exit 0
3. Ignored Build Step চললে: `No frontend/ changes ... skipping` (skip হলে) অথবা `frontend/ changed ... building`
4. এই স্ক্রিনশট PR-এ অ্যাটাচ করুন (Agent Vercel UI দেখতে পারে না)
