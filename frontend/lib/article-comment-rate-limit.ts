import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Reuses the project's existing Upstash environment variables. This limiter is
// loaded only by the comment POST handler, so missing Redis config cannot break
// article rendering or the newsroom publishing pipeline.
const articleCommentRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '10 m'),
  analytics: false,
  prefix: 'banglarvoice_article_comments',
});

export default articleCommentRateLimit;
