// server/routes/presence.ts
// Lightweight in-memory presence tracking for active sessions.

import { Express, Request, Response } from "express";

interface Session {
  lastSeen: number;
}

// In-memory store of active sessions, keyed by session ID
const activeSessions = new Map<string, Session>();

// Sessions older than 5 minutes are considered stale
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Remove sessions that have not sent a heartbeat within the staleness window.
 */
function pruneStale(): void {
  const cutoff = Date.now() - STALE_THRESHOLD_MS;
  for (const [id, session] of activeSessions) {
    if (session.lastSeen < cutoff) {
      activeSessions.delete(id);
    }
  }
}

/**
 * Register presence routes with the Express app.
 */
export function registerPresenceRoutes(app: Express): void {
  /**
   * Heartbeat endpoint. Clients call this periodically to signal
   * they are still active.
   */
  app.post("/api/presence/heartbeat", (req: Request, res: Response) => {
    try {
      // Use an existing session cookie, or fall back to a generated ID
      const sessionId =
        (req.cookies && req.cookies["session_id"]) ||
        req.headers["x-session-id"] as string ||
        `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      activeSessions.set(sessionId, { lastSeen: Date.now() });

      res.json({ ok: true });
    } catch (error) {
      console.error("Presence heartbeat error:", error);
      res.status(500).json({ ok: false });
    }
  });

  /**
   * Returns the current active-user count after pruning stale sessions.
   * Includes momentum padding while user count is low.
   */
  app.get("/api/presence/count", (_req: Request, res: Response) => {
    try {
      pruneStale();
      const realCount = activeSessions.size;

      // Momentum padding: add a random offset of 13-21 to the real count.
      // TODO: Remove this padding once real active users consistently exceed 50.
      const padding = Math.floor(Math.random() * 9) + 13;
      const displayCount = realCount + padding;

      res.json({ count: displayCount });
    } catch (error) {
      console.error("Presence count error:", error);
      res.status(500).json({ count: 0 });
    }
  });
}
