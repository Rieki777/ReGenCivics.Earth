import express, { Request, Response, NextFunction } from "express";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";

const router = express.Router();

const BUFFER_BASE = "https://api.bufferapp.com/1";

// Admin auth middleware for Express routes
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

function getToken(): string | null {
  return ENV.bufferAccessToken || null;
}

// GET /api/admin/buffer/profiles
router.get("/profiles", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(503).json({ error: "Buffer not configured" });
    return;
  }

  try {
    const response = await fetch(`${BUFFER_BASE}/profiles.json?access_token=${encodeURIComponent(token)}`);
    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: text });
      return;
    }
    const profiles = await response.json();
    res.json(profiles);
  } catch (err) {
    console.error("[Buffer] profiles error:", err);
    res.status(500).json({ error: "Failed to fetch Buffer profiles" });
  }
});

// POST /api/admin/buffer/post
router.post("/post", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(503).json({ error: "Buffer not configured" });
    return;
  }

  const { text, link, profileIds, scheduledAt } = req.body as {
    text: string;
    link?: string;
    profileIds: string[];
    scheduledAt?: string;
  };

  if (!text || !Array.isArray(profileIds) || profileIds.length === 0) {
    res.status(400).json({ error: "text and profileIds are required" });
    return;
  }

  const results: Array<{ profileId: string; success: boolean; updateId?: string; error?: string }> = [];

  for (const profileId of profileIds) {
    try {
      const params = new URLSearchParams();
      params.append("access_token", token);
      params.append("profile_ids[]", profileId);
      params.append("text", text);
      if (link) params.append("media[link]", link);
      if (scheduledAt) {
        params.append("scheduled_at", scheduledAt);
        params.append("now", "false");
      } else {
        params.append("now", "true");
      }

      const response = await fetch(`${BUFFER_BASE}/updates/create.json`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        results.push({ profileId, success: false, error: text });
      } else {
        const data = await response.json() as { updates?: Array<{ id?: string }>; update?: { id?: string } };
        const updateId =
          data.update?.id ??
          (Array.isArray(data.updates) && data.updates[0]?.id ? data.updates[0].id : undefined);
        results.push({ profileId, success: true, updateId });
      }
    } catch (err) {
      results.push({ profileId, success: false, error: String(err) });
    }
  }

  res.json({ results });
});

export default router;
