# HANDOFF — অটো-পাবলিশ পাইপলাইন (T0–T3)

তারিখ: 2026-10-02
ব্রাঞ্চ: `wip/t0-t3-fixes`
নিয়ম: `.env` / `DATABASE_URL` / secret কমিট বা প্রিন্ট হয়নি। প্রোড DB-তে কমান্ড চালানো হয়নি। নতুন টেস্ট যোগ হয়নি।

পূর্ববর্তী যাচাই: `supabase/migrations/20261002000000_public_article_views.sql` প্রোডে apply হয়নি।

## এই সেশনে কী হলো

লক্ষ্য: প্রতি ~১৫ মিনিটে নতুন, ছবিসহ, সম্পূর্ণ খবর স্বয়ংক্রিয় published। পুরোনো ৬০৬ pending একসঙ্গে পাবলিশ হয় না।

### ১. `feed_fetch_http_403`

- ব্রাউজার-সদৃশ `User-Agent` + `Accept` + `Accept-Language` (`worker/src/lib/http.ts`, collector, cron-trigger)।
- প্রতি ফিডে retry + backoff (403/429-এ অতিরিক্ত দুই রাউন্ড)।
- একটি ফিড ফেইল করলে লুপ চলতে থাকে।
- বারবার 403: worker-এ ৩ সাইকেল পর `news_sources.enabled=false`; cron-এ রিট্রাই শেষেই disable।
- তালিকা: `news_sources` যেখানে `enabled=false` (SQL Editor-এ ইউজার দেখবেন)।

### ২. `ai_rewrite`

- কারণ লগ: missing env / invalid key / rate limit / model_not_found / empty / http।
- রিরাইট ব্যর্থ হলে আর্টিকেল `pending` — extractive কপি published হয় না (`fallback_not_publishable` যদি status=published)।

### ৩. ছবি

ক্রম: সোর্স RSS ছবি → Pexels (`PEXELS_API_KEY`) → branded fallback।
প্রতি ইনসার্টে: `featured_image`, `thumbnail_url`, `image_alt_bn`, `image_credit`, `image_license`।
Pexels/brand: `image_is_representational=true`; brand: `is_fallback=true`।
UI: হোম কার্ড + `/article/[slug]` এ «প্রতীকী ছবি»।
`next.config.js` remotePatterns: pexels, wikimedia, openverse, সাইট লোগো, ওয়াইল্ডকার্ড।

### ৪. অটো-পাবলিশ গেট

প্রকাশ শুধু যখন: AI rewrite সফল, `source_url` আছে, `content_hash` ডুপ্লিকেট নয়, ছবি আছে (fallback সহ), `ai_score`/`ai_confidence` থ্রেশহোল্ড, `risk_level=low`।
নইলে `pending`। আইটেম ৪৮ ঘণ্টার বেশি পুরোনো হলে skip। পুরোনো pending বাল্ক-পাবলিশ নেই।

### ৫. ফ্রন্টএন্ড রিড

পাবলিক ফিড/ডিটেইল শুধু `public_articles_feed` / `public_article_detail` (আর `articles` টেবিল নয়)।
`/article/[slug]` UUID `id` দিয়ে মেলে (`slug = id`)।
`og:image` + absolute canonical। `public_articles_feed`-এ `title_en` নেই।

### ৬. `news_pipeline_runs`

প্রতি সাইকেলে `fetched` / `queued` / `processed` / `published` + `details.error_types` / `error_message`।

## বাকি কাজ

1. প্রোডে ভিউ SQL apply করবেন না যতক্ষণ না আলাদা কনফার্ম (আগের HANDOFF)।
2. `PEXELS_API_KEY`, chat/Groq/OpenRouter কি, `AUTO_PUBLISH=true` ওয়ার্কার/ক্রনে সেট আছে কি না ইউজার যাচাই করবেন (মান এখানে নেই)।
3. SQL Editor কলাম লিস্ট এখনো পেস্ট হয়নি — প্রোড vs মাইগ্রেশন অমিল অপেক্ষমাণ।
4. ৪০৩-এ disable হওয়া সোর্স পরে ম্যানুয়ালি `enabled=true` করতে হতে পারে।
5. ভিউ apply-এর পর anon দিয়ে `/api/public/feed.json` ও article পেজ যাচাই।
