import "dotenv/config";
import * as Sentry from "@sentry/node";
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import express from "express";
import compression from "compression";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes, CHAT_SYSTEM_PROMPT } from "./oauth";
import { streamLLM } from "./llm";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerTrackingRoutes } from "../trackingRoutes";
import { registerResendWebhookRoutes } from "../webhooks/resend";
import * as db from "../db";
import { sendEmail } from "./email";
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
  app.use('/api/chat/stream', rateLimitMiddleware(60 * 1000, 20));
  app.use('/api/auth/email/request', rateLimitMiddleware(60 * 1000, 5));
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
  
  // OAuth + email auth routes
  registerOAuthRoutes(app);

  // AI chat streaming endpoint
  app.post('/api/chat/stream', async (req, res) => {
    const { messages, userPath } = req.body as {
      messages?: Array<{ role: string; content: string }>;
      userPath?: string;
    };
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const PATH_GREETINGS: Record<string, string> = {
      investor: "This user is an Investor interested in funding regenerative land projects. Tailor responses to highlight investment opportunities, returns, and project due diligence.",
      land_project: "This user has a Land Project and wants to build a regenerative community. Tailor responses to highlight how to list their project, connect with investors, and use the platform's tools.",
      ally: "This user is an Alliance Partner  -  an organization supporting regenerative projects. Tailor responses to partnership opportunities, co-creation, and how to contribute expertise or resources.",
      player: "This user is a Player who wants to do Quests and co-create the Infinite Game. Tailor responses to quests, game mechanics, contribution opportunities, and community participation.",
    };

    const pathContext = userPath && PATH_GREETINGS[userPath]
      ? `\n\n## USER CONTEXT\n${PATH_GREETINGS[userPath]}`
      : "";

    try {
      const llmMessages = [
        { role: 'system' as const, content: CHAT_SYSTEM_PROMPT + pathContext },
        ...messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-20)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ];

      await streamLLM({ messages: llmMessages }, (text) => {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      });

      res.write('data: [DONE]\n\n');
    } catch (err) {
      console.error('[chat/stream] error:', err);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    } finally {
      res.end();
    }
  });
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
  // Sentry error handler (must come after all routes)
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

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

// ─── Scheduled email processor ─────────────────────────────────────────────
async function processScheduledEmails() {
  try {
    const due = await db.getDueScheduledEmails();
    const now = new Date();
    for (const item of due) {
      if (new Date(item.scheduledFor) > now) continue; // not yet due
      try {
        const htmlBody = item.body
          .split(/\n\n+/)
          .map((p: string) => `<p style="margin:0 0 12px 0">${p.trim().replace(/\n/g, '<br/>')}</p>`)
          .join('');
        await sendEmail({
          to: item.recipientEmail,
          subject: item.subject,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">${htmlBody}</div>`,
          replyTo: process.env.EMAIL_REPLY_TO,
        });
        await db.updateScheduledEmailStatus(item.id, 'sent', new Date());
        console.log(`[ScheduledEmail] Sent id=${item.id} to ${item.recipientEmail}`);
      } catch (err) {
        await db.updateScheduledEmailStatus(item.id, 'failed');
        console.error(`[ScheduledEmail] Failed id=${item.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[ScheduledEmail] Processor error:', err);
  }
}

// Run every minute
setInterval(processScheduledEmails, 60_000);
