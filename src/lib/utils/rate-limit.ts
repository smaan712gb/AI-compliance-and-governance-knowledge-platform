import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

let _limiters: Record<string, Ratelimit> | null = null;

function getLimiters() {
  if (!_limiters) {
    const redis = getRedis();
    _limiters = {
      ai: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "ratelimit:ai",
      }),
      aiAuthenticated: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 h"),
        prefix: "ratelimit:ai-auth",
      }),
      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        prefix: "ratelimit:api",
      }),
      subscribe: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "ratelimit:subscribe",
      }),
    };
  }
  return _limiters;
}

export async function checkAIRateLimit(
  identifier: string,
  isAuthenticated: boolean,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (!isRedisConfigured()) {
    return { success: true, remaining: 999, reset: 0 };
  }
  const limiters = getLimiters();
  const limiter = isAuthenticated ? limiters.aiAuthenticated : limiters.ai;
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export async function checkAPIRateLimit(
  identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (!isRedisConfigured()) {
    return { success: true, remaining: 999, reset: 0 };
  }
  const limiters = getLimiters();
  const result = await limiters.api.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export async function checkSubscribeRateLimit(
  identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (!isRedisConfigured()) {
    return { success: true, remaining: 999, reset: 0 };
  }
  const limiters = getLimiters();
  const result = await limiters.subscribe.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
