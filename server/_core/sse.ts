/**
 * Per-user Server-Sent Events broadcaster.
 *
 * Replaces the per-feature polling pattern (NotificationBell, navigation
 * unread badge, LiveActivityFeed) with a single push channel keyed by
 * userId. Any server-side code that mutates a user's notification, unread
 * count, or activity feed calls `pushToUser(userId, { type: 'invalidate',
 * keys: ['notifications'] })` and every active EventSource for that user
 * receives the event. The client uses it to invalidate the matching
 * TanStack Query cache, triggering an immediate refetch.
 *
 * Polling still runs as a fallback at a much slower cadence (set on the
 * client query); SSE replaces the high-frequency loop, not all checks.
 *
 * Limitations of this minimal implementation:
 *  - In-memory only. Multiple replicas (e.g. Railway autoscale beyond 1)
 *    won't share streams. For now we run a single instance; revisit if
 *    we scale horizontally.
 *  - No replay buffer. If the client misses an event during reconnect,
 *    the polling fallback eventually catches up.
 *  - Heartbeat every 25s to keep proxy connections alive.
 */

import type { Response } from 'express';
import { logger } from './logger';

const log = logger('sse');

type ActiveStream = {
  userId: number;
  res: Response;
  heartbeat: NodeJS.Timeout;
};

/**
 * userId -> set of active connections. A user may have multiple tabs /
 * devices open; each gets its own Response in the set.
 */
const streams: Map<number, Set<ActiveStream>> = new Map();

export type SsePayload =
  | { type: 'invalidate'; keys: string[] }
  | { type: 'ping' };

/**
 * Open an SSE stream for a user. Caller is responsible for setting the
 * SSE headers + keepalive once. Returns a cleanup that the caller wires
 * to req.on('close').
 */
export function subscribeUser(userId: number, res: Response): () => void {
  // Standard SSE response headers.
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Disable response buffering on intermediaries (Nginx, etc).
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Send a hello so the client's onopen fires immediately.
  writeEvent(res, { type: 'ping' });

  // Heartbeat keeps the connection from being closed by idle proxies.
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // Stream is gone; let the close handler clean up.
    }
  }, 25_000);

  const stream: ActiveStream = { userId, res, heartbeat };
  let bucket = streams.get(userId);
  if (!bucket) {
    bucket = new Set();
    streams.set(userId, bucket);
  }
  bucket.add(stream);

  log.debug('subscribed', { userId, totalForUser: bucket.size });

  return () => {
    clearInterval(heartbeat);
    const set = streams.get(userId);
    if (set) {
      set.delete(stream);
      if (set.size === 0) streams.delete(userId);
    }
    log.debug('unsubscribed', { userId, remainingForUser: set?.size ?? 0 });
  };
}

/**
 * Push a payload to every active stream for a user. No-op when the user
 * has no open streams. Errors writing to a single stream are logged and
 * the stream is removed; one bad client doesn't break others.
 */
export function pushToUser(userId: number, payload: SsePayload): void {
  const bucket = streams.get(userId);
  if (!bucket || bucket.size === 0) return;
  for (const stream of Array.from(bucket)) {
    try {
      writeEvent(stream.res, payload);
    } catch (err) {
      log.warn('write failed, dropping stream', { userId, err: String(err) });
      clearInterval(stream.heartbeat);
      bucket.delete(stream);
      if (bucket.size === 0) streams.delete(userId);
    }
  }
}

function writeEvent(res: Response, payload: SsePayload): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * Returns the number of active streams across all users. Useful for an
 * admin metrics endpoint or a smoke-test sanity check.
 */
export function activeStreamCount(): { users: number; streams: number } {
  let total = 0;
  for (const set of streams.values()) total += set.size;
  return { users: streams.size, streams: total };
}
