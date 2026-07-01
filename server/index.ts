import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { generateCSRFToken } from "./_core/security";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // CSRF token endpoint - must come before static/catch-all routes
  app.get("/api/csrf-token", async (req, res) => {
    // Use existing session cookie or create a new session id
    let sessionId = (req.cookies && req.cookies["session_id"]) as string | undefined;
    if (!sessionId) {
      sessionId = randomUUID();
      res.cookie("session_id", sessionId, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
    }
    const csrfToken = await generateCSRFToken(sessionId);
    res.cookie("csrf_token", csrfToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ csrfToken });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
