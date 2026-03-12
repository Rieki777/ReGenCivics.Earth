import express, { Request, Response, NextFunction } from "express";
import { sdk } from "../_core/sdk";

const router = express.Router();

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

// POST /api/admin/farcaster/intent
// Option A: builds and returns a warpcast.com compose intent URL, no API key required
router.post("/intent", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
  res.json({ url });
});

export default router;
