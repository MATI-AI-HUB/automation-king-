# HANDOFF — public_article_views যাচাই (প্রোডে apply হয়নি)

তারিখ: 2026-10-02
ব্রাঞ্চ: `wip/t0-t3-fixes`
ফাইল: `supabase/migrations/20261002000000_public_article_views.sql`
নিয়ম: এই মাইগ্রেশন প্রোডাকশন DB-তে প্রয়োগ করা হয়নি। `.env` / `DATABASE_URL` / secret ছাপা বা কমিট হয়নি।

## ১. মাইগ্রেশন থেকে টেবিল কলাম (সব আছে)

পুরোনো মাইগ্রেশন পড়া হয়েছে। নতুন timestamp মাইগ্রেশন লাগেনি। পুরোনো ফাইল বদলানো হয়নি।

### `public.articles`

| কলাম | তৈরি হয় |
|---|---|
| id, title_bn, title_en, content_bn, content_en, thumbnail_url, category, status, published_at, created_at | `20260901000000_init_schema.sql` |
| excerpt_bn, category_key, featured_image, source_name, source_url, image_credit, canonical_url | `20260925_newsroom_automation.sql` |
| origin | `20260929_platform_contract.sql` |

অনুপস্থিত: **নেই**

### `public.news_pipeline_runs`

`20260925_newsroom_automation.sql`: `completed_at`, `created_at`, `status`, `published` — সব আছে।

অনুপস্থিত: **নেই**

## ২. নতুন কলাম মাইগ্রেশন

প্রস্তাব নেই। রিপো স্কিমায় ভিউ যে কলাম সিলেক্ট করে, সেগুলো আগের মাইগ্রেশনেই আছে।

## ৩. প্রোড SQL Editor তালিকা

ইউজার পেস্ট করেননি (প্লেসহোল্ডার: `[এখানে SQL Editor-এর রেজাল্ট পেস্ট করুন]`)।
মাইগ্রেশন-vs-প্রোড অমিল দেখানো যায়নি। প্রোডে কোনো কমান্ড চালানো হয়নি।

প্রোডে চালানোর SQL (ইউজার নিজে SQL Editor-এ):

```sql
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'articles'
order by ordinal_position;

select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'news_pipeline_runs'
order by ordinal_position;
```

## ৪. ভিউ

ফাইল ঠিক করা হয়নি — কলাম মিসিং নেই। `public_articles_feed`-এ `title_en` নেই (নিয়ম অনুযায়ী)।

- `public_articles_feed`: id, title_bn, excerpt_bn, content_bn, category, category_key, thumbnail_url, featured_image, status, published_at, source_name, source_url, image_credit, canonical_url, origin
- `public_article_detail`: উপরের সব + title_en, content_en, created_at
- `news_pipeline_last_success()`: `completed_at`/`created_at`, `status` in ('success','partial'), `published`

## ৫. frontend / worker grep

মিলছে।

| ব্যবহার | সোর্স | সিলেক্ট |
|---|---|---|
| `frontend/lib/supabase/published-articles.ts` `PUBLISHED_ARTICLE_COLUMNS` | `public_articles_feed` | ভিউয়ের সাথে হুবহু; `title_en` নেই |
| `PUBLIC_ARTICLE_DETAIL_COLUMNS` | `public_article_detail` | ভিউয়ের সাথে হুবহু |
| `frontend/__tests__/feed-route.test.ts` | `public_articles_feed` | মিল |
| `frontend/app/api/health/route.ts` | `news_pipeline_last_success` + `news_pipeline_runs` | completed_at, created_at, status, published (+ stage, error_message — টেবিলে আছে, ভিউ নয়) |
| `worker/src/lib/ingest.ts` | `articles` (service_role insert/select) | ভিউ ব্যবহার করে না; টেবিল কলাম মাইগ্রেশনে আছে |

হোমপেজ EN `title_en` ফিড ভিউতে নেই → `title_bn` ফলব্যাক। ডিটেইল ভিউতে `title_en` আছে।

## এই সেশনে কোড ডিফ

নেই (শুধু এই HANDOFF)।

## বাকি কাজ

1. ইউজার প্রোড SQL Editor রেজাল্ট পেস্ট করুন — তারপর মাইগ্রেশন-vs-প্রোড অমিল ধরা যাবে।
2. মিললেও `20261002000000_public_article_views.sql` প্রোডে apply করবেন না যতক্ষণ না আলাদা কনফার্ম।
3. প্রোডে `articles` কলাম কম থাকলে আলাদা নতুন-timestamp মাইগ্রেশন; পুরোনো ফাইল না বদলানো।
4. ভিউ apply-এর পর anon দিয়ে `/api/public/feed.json` ও article ডিটেইল যাচাই।
