/**
 * useUserStream
 *
 * Opens an EventSource against /api/sse/user-stream and dispatches
 * incoming `invalidate` events into the TanStack Query cache. Replaces
 * the high-frequency polling pattern in NotificationBell, the
 * navigation unread badge, and LiveActivityFeed.
 *
 * Designed to be called once near the top of the React tree (App.tsx).
 * Polling on individual queries can stay as a slow-cadence fallback for
 * the case where SSE is blocked (corporate proxy, browser extension)
 * or after a transient disconnect.
 *
 * Server-side broadcaster: server/_core/sse.ts.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type InvalidatePayload = { type: 'invalidate'; keys: string[] };
type PingPayload = { type: 'ping' };
type SsePayload = InvalidatePayload | PingPayload;

const ENDPOINT = '/api/sse/user-stream';

export function useUserStream(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    if (typeof EventSource === 'undefined') return; // unsupported (e.g. SSR)

    let es: EventSource | null = null;
    let cancelled = false;
    let backoff = 1000; // ms — doubles on failure, caps at 30s

    const open = () => {
      if (cancelled) return;
      try {
        es = new EventSource(ENDPOINT, { withCredentials: true });
      } catch {
        // Fall back to polling-only path. The retry loop won't fire either.
        return;
      }

      es.onopen = () => {
        backoff = 1000;
      };

      es.onmessage = (event) => {
        let payload: SsePayload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (payload.type !== 'invalidate') return;
        for (const key of payload.keys) {
          // Match any query whose first key element starts with the
          // invalidated topic. This lets a single push key like
          // "notifications" invalidate ["notifications"], ["notifications", "unread"],
          // etc.
          queryClient.invalidateQueries({
            predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === key,
          });
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;
        const delay = backoff;
        backoff = Math.min(backoff * 2, 30_000);
        setTimeout(open, delay);
      };
    };

    open();

    return () => {
      cancelled = true;
      es?.close();
      es = null;
    };
  }, [enabled, queryClient]);
}
