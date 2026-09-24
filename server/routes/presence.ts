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
  for (const [id, session] of Array.from(activeSessions.entries())) {
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
      const cookieSession =
        req.cookies && typeof req.cookies["session_id"] === "string"
          ? (req.cookies["session_id"] as string)
          : undefined;
      const headerSession = req.headers["x-session-id"];
      const headerId =
        typeof headerSession === "string" && headerSession.length > 0
          ? headerSession
          : undefined;
      const sessionId =
        cookieSession ||
        headerId ||
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
   * Honest count only — no momentum / display padding.
   */
  app.get("/api/presence/count", (_req: Request, res: Response) => {
    try {
      pruneStale();
      const count = activeSessions.size;
      res.json({ count });
    } catch (error) {
      console.error("Presence count error:", error);
      res.status(500).json({ count: 0 });
    }
  });
}
