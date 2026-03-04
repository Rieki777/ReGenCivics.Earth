/**
 * Cache Initialization
 * Initializes Redis connection on server startup
 */

import { initializeCache, shutdownCache } from './cache';

/**
 * Initialize cache on server startup
 */
export async function initCacheOnStartup(): Promise<void> {
  console.log('[Server] Initializing cache...');
  await initializeCache();
  console.log('[Server] Cache initialized');
}

/**
 * Shutdown cache on server shutdown
 */
export async function shutdownCacheOnShutdown(): Promise<void> {
  console.log('[Server] Shutting down cache...');
  await shutdownCache();
  console.log('[Server] Cache shutdown complete');
}

/**
 * Setup graceful shutdown handlers
 */
export function setupCacheShutdownHandlers(): void {
  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received, shutting down cache...');
    await shutdownCacheOnShutdown();
    process.exit(0);
  });

  // Handle SIGINT
  process.on('SIGINT', async () => {
    console.log('[Server] SIGINT received, shutting down cache...');
    await shutdownCacheOnShutdown();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('[Server] Uncaught exception:', error);
    await shutdownCacheOnShutdown();
    process.exit(1);
  });

  // Handle unhandled rejections
  process.on('unhandledRejection', async (reason) => {
    console.error('[Server] Unhandled rejection:', reason);
    await shutdownCacheOnShutdown();
    process.exit(1);
  });
}
