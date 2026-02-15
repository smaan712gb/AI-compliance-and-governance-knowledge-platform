import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export const rateLimiters = {
  ai: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "ratelimit:ai",
  }),
  aiAuthenticated: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    prefix: "ratelimit:ai-auth",
  }),
  api: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "ratelimit:api",
  }),
  subscribe: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "ratelimit:subscribe",
  }),
};

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
