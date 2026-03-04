/**
 * Redis Cache Utility
 * Provides caching layer for frequently accessed database queries
 * Expected performance improvement: 50% faster API responses
 */

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
export async function initializeCache(): Promise<void> {
  if (isConnected) {
    console.log('[Cache] Redis already connected');
    return;
  }

  // Check if Redis is available (optional feature)
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('[Cache] Redis not configured, caching disabled');
    return;
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.error('[Cache] Redis reconnection failed after 10 attempts');
            return new Error('Redis max retries exceeded');
          }
          return retries * 100;
        },
      },
    });

    redisClient.on('error', (error: Error) => {
      console.error('[Cache] Redis error:', error);
    });

    redisClient.on('connect', () => {
      console.log('[Cache] Redis connected');
      isConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.warn('[Cache] Failed to initialize Redis:', error);
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
      console.log('[Cache] Hit:', key);
      return JSON.parse(value) as T;
    }
    console.log('[Cache] Miss:', key);
    return null;
  } catch (error) {
    console.error('[Cache] Get error:', error);
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
    console.log('[Cache] Set:', key, `(TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error('[Cache] Set error:', error);
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
    console.log('[Cache] Deleted:', key);
  } catch (error) {
    console.error('[Cache] Delete error:', error);
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
    console.log('[Cache] Deleted multiple keys:', keys.length);
  } catch (error) {
    console.error('[Cache] Delete many error:', error);
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
    console.log('[Cache] Cleared all cache');
  } catch (error) {
    console.error('[Cache] Clear error:', error);
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
  console.log('[Cache] Fetching:', key);
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
 * Shutdown cache connection
 */
export async function shutdownCache(): Promise<void> {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      console.log('[Cache] Redis connection closed');
      isConnected = false;
    } catch (error) {
      console.error('[Cache] Shutdown error:', error);
    }
  }
}

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
  return isConnected && redisClient !== null;
}
