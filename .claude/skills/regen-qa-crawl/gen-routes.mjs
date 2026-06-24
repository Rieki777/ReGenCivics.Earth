#!/usr/bin/env node
// Generate routes.json from client/src/App.tsx.
// Usage: node gen-routes.mjs > routes.json
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const appPath = resolve(here, "../../../client/src/App.tsx");
const src = readFileSync(appPath, "utf8");

const routes = [];
const re = /<Route\s+path=(?:\{)?["'`]([^"'`]+)["'`]/g;
let m;
while ((m = re.exec(src)) !== null) {
  const path = m[1];
  const hasParam = path.includes(":");
  // Heuristic: a route whose JSX body is only a Redirect/replace is navigation-only.
  const tail = src.slice(m.index, m.index + 220);
  const redirectOnly = /Redirect\s+to=|window\.location\.(replace|href)/.test(tail);
  routes.push({
    path,
    hasParam,
    redirectOnly,
    needsAuth: /^\/admin/.test(path) || path === "/profile" || path === "/messages" || path.startsWith("/my-applications"),
  });
}

// De-dupe, keep order.
const seen = new Set();
const out = routes.filter((r) => (seen.has(r.path) ? false : seen.add(r.path)));
process.stdout.write(JSON.stringify({ generatedFrom: "client/src/App.tsx", count: out.length, routes: out }, null, 2) + "\n");
