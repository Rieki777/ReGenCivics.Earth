#!/usr/bin/env node
// Static link + anchor integrity audit over the regen-civics client source.
// Verifies: every internal navigation target resolves to a known route, and
// every in-page anchor (#fragment) has a matching id/name somewhere it can land.
// Run from outside the repo: node link-audit.mjs <repoRoot>
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const repo = process.argv[2] || "/sessions/blissful-dreamy-davinci/mnt/regen-civics-clean";
const srcDir = join(repo, "client/src");
const routes = JSON.parse(readFileSync(join(repo, ".claude/skills/regen-qa-crawl/routes.json"), "utf8")).routes;

// Build route matchers. Static routes match exactly; :param routes become regex.
const staticRoutes = new Set();
const paramMatchers = [];
for (const r of routes) {
  if (r.hasParam) {
    const rx = "^" + r.path.replace(/:[^/]+\?/g, "[^/]*").replace(/:[^/]+/g, "[^/]+").replace(/\//g, "\\/") + "\\/?$";
    paramMatchers.push(new RegExp(rx));
  } else {
    staticRoutes.add(r.path.replace(/\/$/, "") || "/");
  }
}
// External / non-route prefixes that are legitimately not internal SPA routes.
const externalPrefixes = ["http://", "https://", "mailto:", "tel:", "//", "data:", "blob:"];
// Known API / asset paths that are not SPA routes but are valid hrefs.
const apiOrAsset = (p) => /^\/(api|assets|images|fonts|sitemap|robots|manifest|icon|apple-touch|sw\.js|registerSW)/.test(p);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    const st = statSync(fp);
    if (st.isDirectory()) walk(fp, out);
    else if ([".tsx", ".ts", ".jsx"].includes(extname(name)) && !name.endsWith(".d.ts") && !name.includes(".bak")) out.push(fp);
  }
  return out;
}

const files = walk(srcDir);

// Collect all ids/anchors that exist anywhere (a fragment can land here).
const anchorTargets = new Set();
// Collect internal link references with location.
const linkRefs = []; // {file, line, raw, path, hash}
const anchorRefs = []; // {file, line, raw, hash}

const linkPatterns = [
  /\b(?:href|to)\s*=\s*["'`](\/[^"'`]*)["'`]/g,                       // href="/x" to="/x"
  /\b(?:href|to)\s*=\s*\{\s*["'`](\/[^"'`{}]*)["'`]\s*\}/g,           // href={"/x"}
  /\b(?:setLocation|navigate|push|replace|setHref)\(\s*["'`](\/[^"'`]*)["'`]/g, // setLocation('/x')
  /<Redirect\s+to=["'`](\/[^"'`]*)["'`]/g,
  /\bhref\s*=\s*["'`](#[^"'`]*)["'`]/g,                                // href="#frag"
];

for (const f of files) {
  const text = readFileSync(f, "utf8");
  const lines = text.split("\n");
  const rel = f.replace(repo + "/", "");
  // ids that can be anchor landing targets
  for (const m of text.matchAll(/\bid\s*=\s*["'`]([A-Za-z0-9_-]+)["'`]/g)) anchorTargets.add(m[1]);
  for (const m of text.matchAll(/\bid\s*=\s*\{\s*["'`]([A-Za-z0-9_-]+)["'`]\s*\}/g)) anchorTargets.add(m[1]);
  for (const m of text.matchAll(/\bname\s*=\s*["'`]([A-Za-z0-9_-]+)["'`]/g)) anchorTargets.add(m[1]);
  // scrollIntoView/getElementById string targets also imply a fragment id exists
  for (const m of text.matchAll(/getElementById\(\s*["'`]([A-Za-z0-9_-]+)["'`]/g)) anchorTargets.add(m[1]);

  const lineOf = (idx) => text.slice(0, idx).split("\n").length;
  for (const re of linkPatterns) {
    for (const m of text.matchAll(re)) {
      const val = m[1];
      const line = lineOf(m.index);
      if (val.startsWith("#")) {
        anchorRefs.push({ file: rel, line, raw: val, hash: val.slice(1) });
      } else {
        const [path, hash] = val.split("#");
        linkRefs.push({ file: rel, line, raw: val, path: path.replace(/\/$/, "") || "/", hash: hash || null });
      }
    }
  }
}

// Validate internal link paths against the route table.
const routeKnown = (p) => {
  if (externalPrefixes.some((x) => p.startsWith(x))) return true;
  if (apiOrAsset(p)) return true;
  const clean = (p.split("?")[0].replace(/\/$/, "") || "/");
  if (staticRoutes.has(clean)) return true;
  if (clean === "" || clean === "/") return true;
  if (paramMatchers.some((rx) => rx.test(clean))) return true;
  return false;
};

const badLinks = linkRefs.filter((l) => !routeKnown(l.path) && l.path.startsWith("/"));
// Anchor fragments that have no landing target anywhere in source.
const badAnchors = anchorRefs.filter((a) => a.hash && !anchorTargets.has(a.hash) && !/^[0-9]/.test(a.hash));
// Cross-page anchor links like /bionomics#local-food-economies: check fragment exists somewhere.
const crossPageAnchors = linkRefs.filter((l) => l.hash);
const badCrossPageAnchors = crossPageAnchors.filter((l) => !anchorTargets.has(l.hash) && !/^[0-9]/.test(l.hash));

const uniq = (arr, key) => {
  const seen = new Set(); const out = [];
  for (const x of arr) { const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
};

console.log("=== LINK + ANCHOR INTEGRITY AUDIT ===");
console.log(`files scanned: ${files.length}`);
console.log(`internal link refs: ${linkRefs.length} | same-page anchor refs: ${anchorRefs.length}`);
console.log(`distinct anchor landing targets (ids/names): ${anchorTargets.size}`);
console.log("");
console.log(`## Links to UNKNOWN routes (would 404 / hit NotFound): ${uniq(badLinks, x=>x.path+x.file).length}`);
for (const l of uniq(badLinks, x=>x.path+x.file+x.line)) console.log(`  ${l.path}   <-  ${l.file}:${l.line}  (raw: ${l.raw})`);
console.log("");
console.log(`## Same-page anchor links with NO matching id/name: ${uniq(badAnchors, x=>x.hash+x.file).length}`);
for (const a of uniq(badAnchors, x=>x.hash+x.file+x.line)) console.log(`  #${a.hash}   <-  ${a.file}:${a.line}`);
console.log("");
console.log(`## Cross-page anchor links whose fragment id is NOWHERE in source: ${uniq(badCrossPageAnchors, x=>x.raw+x.file).length}`);
for (const a of uniq(badCrossPageAnchors, x=>x.raw+x.file+x.line)) console.log(`  ${a.raw}   <-  ${a.file}:${a.line}`);
