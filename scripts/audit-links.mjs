#!/usr/bin/env node
/**
 * Link + anchor integrity guard (ship gate).
 *
 * Scans client/src for internal navigation targets and in-page anchors, then
 * verifies every one resolves:
 *   - internal route links must match a <Route path> in client/src/App.tsx
 *     (static or :param), or be a real static file under client/public.
 *   - #fragment links must have a matching id / name / getElementById somewhere
 *     in the source (a place they can land).
 *
 * Exits 1 (fails the gate) if any unresolved link or dangling anchor is found
 * that is not in the allowlist. Exits 0 when clean.
 *
 * Run: node scripts/audit-links.mjs
 * Self-contained: uses only node:fs, no repo imports (the repo package.json
 * trips node's package self-resolution, so do not `require` repo modules here).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, resolve } from "node:path";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(repo, "client/src");
const publicDir = join(repo, "client/public");
const appTsx = join(srcDir, "App.tsx");

// --- Allowlist: links that are known-acceptable and should not fail the gate.
// Keep this short and justified. Each entry is matched against the raw link.
const ALLOW = [];

// --- 1. Build the route table from App.tsx <Route path="..."> declarations.
const appSrc = readFileSync(appTsx, "utf8");
const staticRoutes = new Set();
const paramMatchers = [];
for (const m of appSrc.matchAll(/<Route\s+path=(?:\{)?["'`]([^"'`]+)["'`]/g)) {
  const p = m[1];
  if (p.includes(":")) {
    const rx =
      "^" +
      p.replace(/:[^/]+\?/g, "[^/]*").replace(/:[^/]+/g, "[^/]+").replace(/\//g, "\\/") +
      "\\/?$";
    paramMatchers.push(new RegExp(rx));
  } else {
    staticRoutes.add((p.replace(/\/$/, "") || "/"));
  }
}

// --- 2. Walk source files.
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.endsWith(".bak")) continue;
    const fp = join(dir, name);
    const st = statSync(fp);
    if (st.isDirectory()) walk(fp, out);
    else if ([".tsx", ".ts", ".jsx"].includes(extname(name)) && !name.endsWith(".d.ts")) out.push(fp);
  }
  return out;
}
const files = walk(srcDir);

// --- 3. Collect anchor landing targets and link/anchor references.
const anchorTargets = new Set();
const linkRefs = []; // {file,line,raw,path,hash}
const anchorRefs = []; // {file,line,raw,hash}

const linkPatterns = [
  /\b(?:href|to)\s*=\s*["'`](\/[^"'`]*)["'`]/g,
  /\b(?:href|to)\s*=\s*\{\s*["'`](\/[^"'`{}]*)["'`]\s*\}/g,
  /\b(?:setLocation|navigate|push|replace|setHref)\(\s*["'`](\/[^"'`]*)["'`]/g,
  /<Redirect\s+to=["'`](\/[^"'`]*)["'`]/g,
  /\bhref\s*=\s*["'`](#[^"'`]*)["'`]/g,
];

for (const f of files) {
  const text = readFileSync(f, "utf8");
  const rel = f.replace(repo + "/", "");
  for (const m of text.matchAll(/\bid\s*=\s*["'`]([A-Za-z0-9_-]+)["'`]/g)) anchorTargets.add(m[1]);
  for (const m of text.matchAll(/\bid\s*=\s*\{\s*["'`]([A-Za-z0-9_-]+)["'`]\s*\}/g)) anchorTargets.add(m[1]);
  for (const m of text.matchAll(/\bname\s*=\s*["'`]([A-Za-z0-9_-]+)["'`]/g)) anchorTargets.add(m[1]);
  for (const m of text.matchAll(/getElementById\(\s*["'`]([A-Za-z0-9_-]+)["'`]/g)) anchorTargets.add(m[1]);

  const lineOf = (idx) => text.slice(0, idx).split("\n").length;
  for (const re of linkPatterns) {
    for (const m of text.matchAll(re)) {
      const val = m[1];
      const line = lineOf(m.index);
      if (val.startsWith("#")) anchorRefs.push({ file: rel, line, raw: val, hash: val.slice(1) });
      else {
        const [path, hash] = val.split("#");
        linkRefs.push({ file: rel, line, raw: val, path: path.replace(/\/$/, "") || "/", hash: hash || null });
      }
    }
  }
}

// --- 4. Validation helpers.
const externalPrefixes = ["http://", "https://", "mailto:", "tel:", "//", "data:", "blob:"];
const apiPrefix = (p) => /^\/(api|assets|sw\.js|registerSW)/.test(p);
const hasFileExt = (p) => /\.[a-z0-9]{2,5}$/i.test(p.split("?")[0]);
const publicFileExists = (p) => existsSync(join(publicDir, p.split("?")[0].replace(/^\//, "")));
const isDynamic = (raw) => raw.includes("${") || raw.includes("{"); // template/computed segment

function routeResolves(l) {
  const p = l.path;
  if (externalPrefixes.some((x) => p.startsWith(x))) return true;
  if (apiPrefix(p)) return true;
  // Static-file link (has an extension): must exist under client/public.
  if (hasFileExt(p)) return publicFileExists(p);
  // Build the concrete candidate path: drop hash/query, replace any ${...}
  // template segment with a placeholder so it can be matched against :param
  // routes. This is the ONLY path tested. A sub-path of an exact static route
  // (e.g. /campaigns/<id> under the exact /campaigns) must NOT pass, so there
  // is deliberately no "prefix" shortcut here.
  const base = (isDynamic(l.raw) ? l.raw : p).split("#")[0].split("?")[0];
  const candidate = base.replace(/\$\{[^}]*\}/g, "x").replace(/\/$/, "") || "/";
  if (staticRoutes.has(candidate)) return true;
  if (paramMatchers.some((rx) => rx.test(candidate))) return true;
  return false;
}

const allowed = (raw) => ALLOW.some((a) => raw === a || raw.startsWith(a));

const uniq = (arr, key) => {
  const seen = new Set();
  return arr.filter((x) => (seen.has(key(x)) ? false : seen.add(key(x))));
};

const badLinks = uniq(
  linkRefs.filter((l) => l.path.startsWith("/") && !routeResolves(l) && !allowed(l.raw)),
  (x) => x.raw + x.file + x.line
);
const badAnchors = uniq(
  anchorRefs.filter((a) => a.hash && !/^[0-9]/.test(a.hash) && !anchorTargets.has(a.hash) && !allowed(a.raw)),
  (x) => x.raw + x.file + x.line
);
const badCrossPageAnchors = uniq(
  linkRefs.filter((l) => l.hash && !/^[0-9]/.test(l.hash) && !anchorTargets.has(l.hash)),
  (x) => x.raw + x.file + x.line
);

// --- 5. Report + exit code.
console.log("Link + anchor integrity guard");
console.log(
  `  files=${files.length} routes=${staticRoutes.size}+${paramMatchers.length}param ` +
    `links=${linkRefs.length} anchors=${anchorRefs.length} targets=${anchorTargets.size}`
);

let failed = false;
function report(title, items, fmt) {
  if (items.length === 0) return;
  failed = true;
  console.log(`\n✗ ${title}: ${items.length}`);
  for (const it of items) console.log("    " + fmt(it));
}
report("Internal links to routes that do not exist", badLinks, (l) => `${l.raw}  <-  ${l.file}:${l.line}`);
report("Same-page anchors with no matching id/name", badAnchors, (a) => `${a.raw}  <-  ${a.file}:${a.line}`);
report("Cross-page anchor fragments not found anywhere", badCrossPageAnchors, (a) => `${a.raw}  <-  ${a.file}:${a.line}`);

if (failed) {
  console.log("\nGATE FAILED. Fix the links above, or add a justified entry to ALLOW in scripts/audit-links.mjs.");
  process.exit(1);
}
console.log("\n✓ All internal links and anchors resolve.");
process.exit(0);
