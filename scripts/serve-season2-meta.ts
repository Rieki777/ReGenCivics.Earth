/**
 * Serves the production meta path on a local port so a crawler-style curl
 * can read Season 2 cards from raw HTML. /join is the standalone document.
 * Every other Season 2 URL goes through serveStatic, the same injector
 * production uses.
 *
 *   NODE_ENV=development npx tsx scripts/serve-season2-meta.ts
 */
import fs from "fs";
import path from "path";
import express from "express";
import { serveStatic } from "../server/_core/vite";
import { joinLandingHtml } from "../server/lib/joinRedirect";

const dist = path.resolve("dist/public");
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(path.resolve("client/index.html"), path.join(dist, "index.html"));

const app = express();
app.get("/join", (_req, res) => {
  res.status(200).type("html").send(joinLandingHtml());
});
serveStatic(app);

const port = Number(process.env.META_PORT ?? 4177);
app.listen(port, "127.0.0.1", () => {
  console.log(`season2 meta check listening on ${port}`);
});
