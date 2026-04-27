/**
 * SSE route registration. One per-user push channel that the client
 * subscribes to and TanStack Query invalidates against. See
 * server/_core/sse.ts for the broadcaster.
 */

import type { Express, Request, Response } from 'express';
import { sdk } from '../_core/sdk';
import { subscribeUser, activeStreamCount } from '../_core/sse';
import { logger } from '../_core/logger';

const log = logger('sse-route');

export function registerSseRoutes(app: Express) {
  app.get('/api/sse/user-stream', async (req: Request, res: Response) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      // Unauth: return 204 so the client treats this as a non-event
      // (no retry storm). Client polling fallback handles signed-out
      // updates anyway since they're not personalized.
      return res.status(204).end();
    }

    const cleanup = subscribeUser(user.id, res);
    req.on('close', cleanup);
    req.on('aborted', cleanup);
    // We never call res.end() server-side; the connection stays open
    // until the client disconnects.
  });

  // Lightweight admin metric. Only the owner can poll this.
  app.get('/api/sse/_metrics', async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'admin only' });
      }
    } catch {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    return res.json(activeStreamCount());
  });

  log.info('SSE routes registered');
}
