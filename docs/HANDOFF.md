# HANDOFF — অটো-পাবলিশ পাইপলাইন (T0–T8)

তারিখ: 2026-10-02
ব্রাঞ্চ: `wip/t0-t3-fixes`
নিয়ম: `.env` / `DATABASE_URL` / secret কমিট বা প্রিন্ট হয়নি। প্রোড DB-তে SQL apply হয়নি। নতুন টেস্ট ফাইল যোগ হয়নি।

## আগের HANDOFF যেখানে ভুল ছিল

উদ্ধৃতি (পুরনো):
> লক্ষ্য: প্রতি ~১৫ মিনিটে নতুন, ছবিসহ, সম্পূর্ণ খবর স্বয়ংক্রিয় published।

কোড এখন: `PIPELINE_INTERVAL_MINUTES = 14`, Vercel cron `*/14 * * * *`, worker default `INTERVAL_MINUTES=14`।

উদ্ধৃতি (পুরনো):
> বারবার 403: worker-এ ৩ সাইকেল পর `news_sources.enabled=false`; cron-এ রিট্রাই শেষেই disable।

কোড এখন: cron ও worker একই নিয়ম — `news_pipeline_runs.details.sources[id].status === '403'` পরপর ৩ রানে `enabled=false`। `kill_switch` স্পর্শ হয় না। ইন-মেমোরি কাউন্টার নেই।

উদ্ধৃতি (পুরনো):
> প্রকাশ শুধু যখন: AI rewrite সফল, `source_url` আছে, `content_hash` ডুপ্লিকেট নয়, ছবি আছে (fallback সহ), `ai_score`/`ai_confidence` থ্রেশহোল্ড, `risk_level=low`।

কোড এখন: শেয়ার্ড `decidePublish` (`worker/src/lib/publish-gate.ts` canonical; `frontend/lib/publish-gate.ts` byte-identical)। প্রকাশ শুধু যখন `AUTO_PUBLISH=true`, সোর্স `enabled` ও `kill_switch=false`, https `source_url`, https ছবি এবং `is_fallback=false`, `rewriteMethod === 'ai'`, বাংলা বডি ≥ ২০০ অক্ষর, ৪৮ ঘণ্টার মধ্যে, `score >= MIN_AI_SCORE`। fallback ছবি publish হয় না। `ai_score` কলাম নেই; `ai_confidence = score/100`। `risk_level` কিওয়ার্ড থেকে; high = hold।

## এই সেশনে

### T0 — ১৪ মিনিট
- `PIPELINE_INTERVAL_MINUTES = 14` (`publish-gate.ts`)
- Vercel: `frontend/vercel.json` crons `*/14 * * * *` → `/api/newsroom/cron-trigger` (GET/POST)
- GitHub Actions: `.github/workflows/news-ingest.yml` `*/14 * * * *`
- overlapping run: `news_pipeline_runs.status='running'` লক, stale timeout ১০ মিনিট (`STALE_LOCK_MS`)
- `news_sources.interval_minutes` মান্য: due না হলে fetch হয় না
- cron `maxDuration = 60` s, internal deadline ৫৪ s

### T1–T3 — গেট, স্কোর, রিস্ক
- `decidePublish` → `{ action, reason, riskLevel, score }`
- স্কোর ০–১০০: বাংলা অনুপাত, দৈর্ঘ্য, শিরোনাম, ছবি, সোর্স, কপি-চেক, rewriteMethod
- `MIN_AI_CONFIDENCE` মুছে ফেলা হয়েছে
- high রিস্ক কখনো auto-publish নয়; medium শুধু AI + `score >= MIN_AI_SCORE + 10`

### T4 — ৪০৩
- UA/Accept/retry একই; এক ফিড ফেল করলে অন্যগুলো চলে
- ৩ consecutive 403 (`details.sources`) → `enabled=false` + log

### T5–T6 — ইউনিক / ভিউ
- নতুন (unapplied): `supabase/migrations/20261002120000_article_unique_indexes.sql`
- ভিউ ফাইল re-runnable: DROP + CREATE `WITH (security_invoker=true)` + GRANT; anon table GRANT শুধু ভিউ কলাম; `claims`/`fact_sources`/`review_reason`/`risk_level`/`ai_model`/`human_verified` নয়
- ফ্রন্টএন্ড শুধু `public_articles_feed` / `public_article_detail`

## প্রয়োজনীয় env নাম (মান নয়)

`AUTO_PUBLISH`, `MIN_AI_SCORE`, `FEED_403_DISABLE_THRESHOLD` (কোডে ৩, env override নেই), `INTERVAL_MINUTES`, `PEXELS_API_KEY`, `CHAT_AI_KEY`, `CHAT_AI_BASE_URL`, `CHAT_AI_MODEL` অথবা `GROQ_API_KEY` / `OPENROUTER_API_KEY`, `NEWSROOM_INGEST_KEY`, `CRON_SECRET`, `SUPABASE_URL` বা `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## মালিকের ম্যানুয়াল স্টেপ

1. প্রোডে apply করবেন না যতক্ষণ না আলাদা কনফার্ম: `20261002000000_public_article_views.sql`, `20261002120000_article_unique_indexes.sql` (ডুপ্লিকেট থাকলে ইউনিক ইনডেক্স ফেল করবে)।
2. Vercel ও worker-এ `AUTO_PUBLISH=true` সেট করুন; চাইলে `MIN_AI_SCORE` (ডিফল্ট ৪০)।
3. `PEXELS_API_KEY` ও chat/Groq/OpenRouter কি সেট করুন।
4. Vercel cron `CRON_SECRET` Bearer দিয়ে `/api/newsroom/cron-trigger` হিট করে।
5. ৪০৩-এ disable হওয়া সোর্স পরে `enabled=true` করতে হতে পারে।
6. ভিউ apply-এর পর anon দিয়ে `/api/public/feed.json` ও article পেজ যাচাই।
