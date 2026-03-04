import "dotenv/config";
import express from "express";
import compression from "compression";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerTrackingRoutes } from "../trackingRoutes";
import { registerResendWebhookRoutes } from "../webhooks/resend";
import { cspMiddleware, securityHeadersMiddleware, rateLimitMiddleware } from "./security";
import path from "path";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Gzip compression for all responses (reduces transfer size by 60-80%)
  app.use(compression({
    level: 6, // balanced speed vs compression ratio
    threshold: 1024, // only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress SSE streams
      if (req.headers['accept'] === 'text/event-stream') return false;
      return compression.filter(req, res);
    }
  }));

  // Security middleware
  app.use(cspMiddleware);
  app.use(securityHeadersMiddleware);
  app.set('trust proxy', 1);
  
  // Rate limiting on public endpoints
  app.use('/api/trpc/newsletter.subscribe', rateLimitMiddleware(15 * 60 * 1000, 5));
  app.use('/api/trpc/application.submit', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/investor.submit', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/inquiry.submit', rateLimitMiddleware(60 * 60 * 1000, 10));
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Static file endpoints
  app.get('/sitemap.xml', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/public/sitemap.xml'));
  });
  app.get('/robots.txt', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/public/robots.txt'));
  });
  app.get('/llms.txt', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/public/llms.txt'));
  });
  app.get('/llms-full.txt', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/public/llms-full.txt'));
  });
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Email tracking routes
  registerTrackingRoutes(app);
  // Resend webhook routes
  registerResendWebhookRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Security: CSP, Rate Limiting, Input Sanitization enabled`);
  });
}

startServer().catch(console.error);
