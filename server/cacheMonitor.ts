/**
 * Cache Monitoring and Health Checks
 * Provides utilities for monitoring cache performance and health
 */

import { isCacheAvailable } from './cache';

interface CacheStats {
  available: boolean;
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  uptime: number;
  lastUpdated: Date;
}

let cacheStats = {
  totalRequests: 0,
  totalHits: 0,
  totalMisses: 0,
  startTime: Date.now(),
};

/**
 * Record cache hit
 */
export function recordCacheHit(): void {
  cacheStats.totalRequests++;
  cacheStats.totalHits++;
}

/**
 * Record cache miss
 */
export function recordCacheMiss(): void {
  cacheStats.totalRequests++;
  cacheStats.totalMisses++;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const uptime = Date.now() - cacheStats.startTime;
  const totalRequests = cacheStats.totalRequests || 1; // Avoid division by zero
  const hitRate = (cacheStats.totalHits / totalRequests) * 100;
  const missRate = (cacheStats.totalMisses / totalRequests) * 100;

  return {
    available: isCacheAvailable(),
    hitRate: parseFloat(hitRate.toFixed(2)),
    missRate: parseFloat(missRate.toFixed(2)),
    totalRequests: cacheStats.totalRequests,
    totalHits: cacheStats.totalHits,
    totalMisses: cacheStats.totalMisses,
    uptime,
    lastUpdated: new Date(),
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheStats = {
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
    startTime: Date.now(),
  };
}

/**
 * Log cache statistics
 */
export function logCacheStats(): void {
  const stats = getCacheStats();
  console.log('[Cache Stats]', {
    available: stats.available,
    hitRate: `${stats.hitRate}%`,
    missRate: `${stats.missRate}%`,
    totalRequests: stats.totalRequests,
    totalHits: stats.totalHits,
    totalMisses: stats.totalMisses,
    uptime: `${(stats.uptime / 1000).toFixed(2)}s`,
  });
}

/**
 * Health check for cache
 */
export async function cacheHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unavailable';
  message: string;
  stats: CacheStats;
}> {
  const stats = getCacheStats();

  if (!stats.available) {
    return {
      status: 'unavailable',
      message: 'Cache is not available',
      stats,
    };
  }

  // Consider cache degraded if hit rate is below 50%
  if (stats.hitRate < 50 && stats.totalRequests > 100) {
    return {
      status: 'degraded',
      message: `Cache hit rate is low (${stats.hitRate}%)`,
      stats,
    };
  }

  return {
    status: 'healthy',
    message: 'Cache is healthy',
    stats,
  };
}

/**
 * Start periodic cache statistics logging
 */
export function startCacheMonitoring(intervalMs: number = 60000): ReturnType<typeof setInterval> {
  console.log(`[Cache] Starting cache monitoring (every ${intervalMs}ms)`);
  
  return setInterval(() => {
    logCacheStats();
  }, intervalMs);
}

/**
 * Stop cache monitoring
 */
export function stopCacheMonitoring(timer: ReturnType<typeof setInterval>): void {
  clearInterval(timer);
  console.log('[Cache] Cache monitoring stopped');
}
