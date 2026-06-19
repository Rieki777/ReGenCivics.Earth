/**
 * Cache Initialization
 * Initializes Redis connection on server startup
 */

import * as Sentry from '@sentry/node';
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

  // Handle uncaught exceptions. Report to Sentry and flush BEFORE exit:
  // process.exit(1) would otherwise kill the process before Sentry sends the
  // event over the network, so these crashes never reached the dashboard.
  process.on('uncaughtException', async (error) => {
    console.error('[Server] Uncaught exception:', error);
    Sentry.captureException(error);
    await Sentry.flush(2000).catch(() => {});
    await shutdownCacheOnShutdown();
    process.exit(1);
  });

  // Handle unhandled rejections (same flush-before-exit reasoning).
  process.on('unhandledRejection', async (reason) => {
    console.error('[Server] Unhandled rejection:', reason);
    Sentry.captureException(reason);
    await Sentry.flush(2000).catch(() => {});
    await shutdownCacheOnShutdown();
    process.exit(1);
  });
}
