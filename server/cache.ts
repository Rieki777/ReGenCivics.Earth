/**
 * Redis Cache Utility
 * Provides caching layer for frequently accessed database queries
 * Expected performance improvement: 50% faster API responses
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from './_core/logger';

const log = logger('cache');

let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
export async function initializeCache(): Promise<void> {
  if (isConnected) {
    log.debug('Redis already connected');
    return;
  }

  // Check if Redis is available (optional feature)
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    log.info('Redis not configured, caching disabled');
    return;
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            log.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis max retries exceeded');
          }
          return retries * 100;
        },
      },
    });

    redisClient.on('error', (error: Error) => {
      log.error('Redis error', error);
    });

    redisClient.on('connect', () => {
      log.info('Redis connected');
      isConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    log.warn('Failed to initialize Redis', { error: String(error) });
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redisClient || !isConnected) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      log.debug('hit', { key });
      return JSON.parse(value) as T;
    }
    log.debug('miss', { key });
    return null;
  } catch (error) {
    log.error('get error', error, { key });
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600
): Promise<void> {
  if (!redisClient || !isConnected) {
    return;
  }

  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    log.debug('set', { key, ttlSeconds });
  } catch (error) {
    log.error('set error', error, { key });
  }
}

/**
 * Delete value from cache
 */
export async function cacheDel(key: string): Promise<void> {
  if (!redisClient || !isConnected) {
    return;
  }

  try {
    await redisClient.del(key);
    log.debug('deleted', { key });
  } catch (error) {
    log.error('delete error', error, { key });
  }
}

/**
 * Delete multiple keys from cache
 */
export async function cacheDelMany(keys: string[]): Promise<void> {
  if (!redisClient || !isConnected || keys.length === 0) {
    return;
  }

  try {
    await redisClient.del(keys);
    log.debug('deleted multiple keys', { count: keys.length });
  } catch (error) {
    log.error('delete many error', error, { count: keys.length });
  }
}

/**
 * Clear all cache
 */
export async function cacheClear(): Promise<void> {
  if (!redisClient || !isConnected) {
    return;
  }

  try {
    await redisClient.flushDb();
    log.warn('cleared all cache');
  } catch (error) {
    log.error('clear error', error);
  }
}

/**
 * Get or set cache (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // If not in cache, fetch from source
  log.debug('fetching', { key });
  const value = await fetcher();

  // Store in cache
  await cacheSet(key, value, ttlSeconds);

  return value;
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  // Blog posts
  blogPosts: () => 'blog:posts',
  blogPost: (slug: string) => `blog:post:${slug}`,
  
  // Opportunities
  opportunities: () => 'opportunities:list',
  opportunity: (id: string) => `opportunity:${id}`,
  
  // Applications
  applications: () => 'applications:public',
  application: (id: string) => `application:${id}`,
  
  // Projects
  projects: () => 'projects:list',
  project: (id: string) => `project:${id}`,
  
  // Campaigns
  campaigns: () => 'campaigns:list',
  campaign: (id: string) => `campaign:${id}`,
  
  // Team
  team: () => 'team:members',
  
  // Seasons
  seasons: () => 'seasons:list',
  season: (id: string) => `season:${id}`,
  
  // General
  user: (id: string) => `user:${id}`,
  stats: () => 'stats:global',
};

/**
 * Cache TTL constants (in seconds)
 */
export const cacheTTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 60 * 60, // 1 hour
  VERY_LONG: 24 * 60 * 60, // 24 hours
};

/**
 * Redis sliding-window rate limit check.
 * Uses a sorted set per key, members are timestamps, scores are timestamps.
 * Returns { allowed, count, resetAt } so callers can craft useful error messages.
 * Falls back gracefully (allows) when Redis is unavailable.
 */
export async function redisRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; count: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const resetAt = now + windowMs;

  if (!redisClient || !isConnected) {
    return { allowed: true, count: 0, resetAt };
  }

  try {
    const multi = redisClient.multi();
    multi.zRemRangeByScore(key, 0, windowStart);                  // drop expired timestamps
    multi.zAdd(key, { score: now, value: uniqueMember(now) });    // record current request
    multi.zCard(key);                                              // count active requests
    multi.expire(key, Math.ceil(windowMs / 1000) + 1);            // auto-expire key

    const results = await multi.exec();
    const count = ((results?.[2] as unknown) as number) ?? 0;

    return { allowed: count <= maxRequests, count, resetAt };
  } catch {
    // Redis error, fail open so rate limit never breaks the app
    return { allowed: true, count: 0, resetAt };
  }
}

/**
 * A sorted-set member no other request shares. A bare timestamp let two
 * requests in the same millisecond collapse into one entry, so the second
 * went uncounted.
 */
function uniqueMember(now: number): string {
  return `${now}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The slice of a Redis MULTI the keyed limit uses, so a test can pass a fake client. */
export interface KeyedLimitMulti {
  zRemRangeByScore(key: string, min: number, max: number): KeyedLimitMulti;
  zAdd(key: string, member: { score: number; value: string }): KeyedLimitMulti;
  zCard(key: string): KeyedLimitMulti;
  zRangeWithScores(key: string, start: number, stop: number): KeyedLimitMulti;
  expire(key: string, seconds: number): KeyedLimitMulti;
  exec(): Promise<unknown[] | null | undefined>;
}

/** The slice of the Redis client the keyed limit uses. */
export interface KeyedLimitRedis {
  multi(): KeyedLimitMulti;
  zRem(key: string, member: string): Promise<unknown>;
}

/**
 * A sliding-window limit that counts only the requests it lets through
 * (server/rate-limit.ts checkKeyedLimit, for the sign-in link per email).
 *
 * redisRateLimit records every request before it counts, refused ones
 * included. That suits a per-IP limit, where only the caller's own network
 * pays. On a key someone else can ask for (an email address), it let a
 * stranger send one request every few minutes and keep the address over the
 * limit forever: each refusal pushed the window forward again, so the owner
 * never got a new link (security review 2026-09-28).
 *
 * Here a refused request is removed again straight after it is counted, so
 * it never extends the window. resetAt is when the oldest counted request
 * leaves the window, which is when one more would pass. Fails open on a
 * Redis error, like redisRateLimit.
 */
export async function redisKeyedLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  client: KeyedLimitRedis | null = redisClient && isConnected ? (redisClient as unknown as KeyedLimitRedis) : null,
  now: number = Date.now()
): Promise<{ allowed: boolean; count: number; resetAt: number }> {
  if (!client) return { allowed: true, count: 0, resetAt: now + windowMs };
  const member = uniqueMember(now);
  try {
    const results = await client
      .multi()
      .zRemRangeByScore(key, 0, now - windowMs)
      .zAdd(key, { score: now, value: member })
      .zCard(key)
      .zRangeWithScores(key, 0, 0)
      .expire(key, Math.ceil(windowMs / 1000) + 1)
      .exec();
    const count = Number(results?.[2] ?? 0);
    if (count <= maxRequests) return { allowed: true, count, resetAt: now + windowMs };

    // Refused: take this request back out, so it never counts toward the window.
    await client.zRem(key, member);
    const oldest = results?.[3] as Array<{ score: number | string }> | undefined;
    const oldestScore = Number(oldest?.[0]?.score);
    const resetAt = Number.isFinite(oldestScore) && oldestScore < now ? oldestScore + windowMs : now + windowMs;
    return { allowed: false, count: count - 1, resetAt };
  } catch {
    return { allowed: true, count: 0, resetAt: now + windowMs };
  }
}

/**
 * Shutdown cache connection
 */
export async function shutdownCache(): Promise<void> {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      log.info('Redis connection closed');
      isConnected = false;
    } catch (error) {
      log.error('shutdown error', error);
    }
  }
}

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
  return isConnected && redisClient !== null;
}
