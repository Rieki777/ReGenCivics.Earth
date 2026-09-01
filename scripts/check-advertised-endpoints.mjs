#!/usr/bin/env node
/**
 * Every URL this hub advertises must have something that answers it.
 *
 * WHY THIS EXISTS. Amora forks POSTed to `hub.regencivics.earth/api/feedback/ingest`
 * every fifteen minutes and nothing on this side ever listened. There was no
 * handler for that path, and the host `hub.regencivics.earth` has no DNS record
 * at all, so it was never even a 404. It went unnoticed for weeks because
 * nothing checks that an address we publish is an address we answer.
 *
 * A published URL is a promise. This is the cheapest possible enforcement of it.
 *
 * WHAT IT CHECKS
 *   1. Every `https://regencivics.earth/<path>` literal in the source resolves
 *      to either a client route in App.tsx or a server handler.
 *   2. Every `/api/...` literal in the fork-facing modules (shared/ and the
 *      hypha bridge) has a server handler.
 *   3. Any reference to a `hub.` subdomain is reported outright, because that
 *      host does not resolve.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   It does not claim to find every route. Express routers mounted with a
 *   prefix, tRPC procedures and dynamically built paths are not all visible to
 *   a regex. Anything it cannot decide is reported as UNRESOLVED and COUNTED,
 *   never silently dropped, because zero-because-unmeasured and
 *   zero-because-clean are the same output and opposite facts.
 *
 * Usage:  node scripts/check-advertised-endpoints.mjs
 * Exit:   0 clean, 1 something advertised has no answer.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["client/src", "server", "shared", "scripts"];
const FORK_FACING = ["shared", "server/lib/hypha-bridge"];

/** Paths that are served as files or by a prerender rather than by a route. */
const STATIC_OK = [
  /^\/blog(\/|$)/,          // scripts/prerender-blog.mjs emits these
  /^\/llms(-full)?\.txt$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/offline\.html$/,
  /^\/assets\//,
  /^\/images\//,
];

function walk(dir, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
      walk(rel, out);
    } else if (/\.(ts|tsx|mjs|js|json|txt|md)$/.test(e.name)) {
      out.push(rel);
    }
  }
  return out;
}

// This file names the broken host in its own header to explain why it exists,
// so without excluding itself the checker fails on its own documentation. It
// did, on the first clean run.
const SELF = "check-advertised-endpoints.mjs";
const files = SCAN_DIRS.flatMap((d) => walk(d)).filter((f) => !f.endsWith(SELF));
const read = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };

// ── What the server answers ──────────────────────────────────────────────────
const serverPaths = new Set();
for (const f of files.filter((f) => f.startsWith("server"))) {
  const s = read(f);
  for (const m of s.matchAll(/\bapp\.(?:get|post|put|patch|delete|all|use)\(\s*["'`](\/[^"'`]*)["'`]/g)) {
    serverPaths.add(m[1]);
  }
}

// ── What the client routes ───────────────────────────────────────────────────
const clientPaths = new Set();
{
  const s = read("client/src/App.tsx");
  // Both spellings: path="/x" and path={"/x"}
  for (const m of s.matchAll(/path=\{?["'`](\/[^"'`]*)["'`]\}?/g)) clientPaths.add(m[1]);
}

/** Does a concrete path match a registered pattern, allowing :params? */
/**
 * Does a REAL router mount cover this path?
 *
 * A one-segment mount does not count. `app.use("/api", ...)` is middleware, not
 * a route, and treating it as cover made every unknown /api path "unresolved"
 * instead of failing. The gate then could not fail on the very case it was
 * built for: /api/feedback/ingest would have been swallowed exactly like this.
 * Caught by injecting a fake route and watching the gate stay green.
 */
function coveredByMount(p, patterns) {
  for (const sp of patterns) {
    const q = sp.replace(/\/+$/, "");
    if (q === "" || q === "/") continue;
    if (q.split("/").filter(Boolean).length < 2) continue; // one segment is middleware
    if (p === q || p.startsWith(q + "/")) return true;
  }
  return false;
}

function matches(concrete, patterns) {
  const c = concrete.replace(/\/+$/, "") || "/";
  for (const p of patterns) {
    const q = p.replace(/\/+$/, "") || "/";
    if (q === c) return true;
    if (!q.includes(":") && !q.includes("*")) continue;
    const rx = new RegExp("^" + q.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/:[A-Za-z0-9_]+/g, "[^/]+").replace(/\*/g, ".*") + "$");
    if (rx.test(c)) return true;
  }
  return false;
}

const fails = [];
const unresolved = [];
let checked = 0;

// ── 1 + 3. Absolute internal URLs ────────────────────────────────────────────
const seen = new Map(); // url -> first file that names it
for (const f of files) {
  const s = read(f);
  // Scheme optional on purpose. A welcome-aboard quest told every new member to
  // visit "regencivics.earth/foundations" with no https://, and the first version
  // of this checker did not see it because the regex demanded a scheme. Copy is
  // where bare hostnames live, and copy is what members read.
  // The host must be the apex or hub., NOT any subdomain. Without the
  // preceding boundary this matched assets.regencivics.earth/quests and
  // reported the CDN asset host as a missing app route: two false alarms on
  // the first triage, which is how a checker gets muted.
  for (const m of s.matchAll(/(?:^|[^A-Za-z0-9.-])(?:https:\/\/)?((?:hub\.)?regencivics\.earth(?:\/[a-zA-Z0-9\/_.:-]*)?)/g)) {
    // Strip trailing prose punctuation. These hostnames appear mid-sentence in
    // copy, so "visit regencivics.earth/donate." captured the full stop as part
    // of the path and reported a route nobody wrote.
    const key = m[1].replace(/[.,;:!?)\]]+$/, "");
    // A URL in a comment is documentation, not a promise. The same rule the
    // /api scan uses. Without it this gate failed on the sentence in
    // scripts/gate.mjs that explains why the gate exists, which is a checker
    // refusing its own reason for existing.
    const nl = s.lastIndexOf("\n", m.index);
    const eol = s.indexOf("\n", m.index);
    const line = s.slice(nl + 1, eol === -1 ? undefined : eol);
    if (/^\s*(\/\/|\*|\/\*|#|>)/.test(line)) continue;
    if (!seen.has(key)) seen.set(key, f);
  }
}

for (const [url, where] of seen) {
  checked++;
  if (url.includes("hub.regencivics.earth")) {
    fails.push({ url, where, why: "the host hub.regencivics.earth has no DNS record; it cannot answer anything" });
    continue;
  }
  const p = (url.split("regencivics.earth")[1] || "/") || "/";
  if (p === "/" || p === "") continue;
  // A last segment with a file extension is an ASSET, not a route. Dropping the
  // scheme requirement swept in 121 image filenames and buried the two real dead
  // links in noise, which is its own way of reporting nothing.
  if (/\.[a-zA-Z0-9]{2,5}$/.test(p)) continue;
  if (STATIC_OK.some((rx) => rx.test(p))) continue;
  if (p.startsWith("/api/")) {
    if (!matches(p, serverPaths)) {
      // A prefix mount (app.use("/api", router)) hides the rest, so this is a
      // question rather than a verdict.
      if (coveredByMount(p, serverPaths)) {
        unresolved.push({ url, where, why: "under a mounted prefix; a regex cannot see the sub-route" });
      } else {
        fails.push({ url, where, why: "no server handler answers this path" });
      }
    }
    continue;
  }
  if (!matches(p, clientPaths) && !matches(p, serverPaths)) {
    unresolved.push({ url, where, why: "no client route or server handler matched; may be a redirect or a doc link" });
  }
}

// ── 2. Fork-facing /api literals ─────────────────────────────────────────────
for (const dir of FORK_FACING) {
  for (const f of walk(dir)) {
    if (/\.test\.(ts|tsx|mjs)$/.test(f)) continue;
    const s = read(f);
    for (const m of s.matchAll(/["'`](\/api\/[a-zA-Z0-9/_:-]+)["'`]/g)) {
      // A path DESCRIBED in a comment is not a path PROMISED by code.
      // `/api/platform/info` appears here only in prose, once saying a job
      // "used to read" it, and the gate called both mentions a broken promise.
      // A checker that cannot tell history from a claim is a checker that
      // gets muted.
      const nl = s.lastIndexOf("\n", m.index);
      const eol = s.indexOf("\n", m.index);
      const line = s.slice(nl + 1, eol === -1 ? undefined : eol);
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      checked++;
      const p = m[1];
      if (matches(p, serverPaths)) continue;
      if (coveredByMount(p, serverPaths)) {
        unresolved.push({ url: p, where: f, why: "under a mounted prefix; a regex cannot see the sub-route" });
        continue;
      }
      fails.push({ url: p, where: f, why: "fork-facing path with no server handler" });
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
const plural = (n, s) => `${n} ${s}${n === 1 ? "" : "s"}`;

if (fails.length) {
  console.log(`\n\u2717 advertised-endpoints: ${plural(fails.length, "address")} this hub publishes with nothing to answer.\n`);
  for (const f of fails) {
    console.log(`  ${f.url}`);
    console.log(`    named in : ${f.where}`);
    console.log(`    problem  : ${f.why}\n`);
  }
}

// Counted and printed, never silently dropped.
if (unresolved.length) {
  console.log(`  ${plural(unresolved.length, "address")} NOT RESOLVED by this checker (reported, not passed):`);
  for (const u of unresolved.slice(0, 20)) console.log(`    ${u.url}  [${u.where}]  ${u.why}`);
  if (unresolved.length > 20) console.log(`    ... and ${unresolved.length - 20} more`);
  console.log("");
}

if (!fails.length) {
  console.log(
    `\u2713 advertised-endpoints: ${checked} address(es) examined, ` +
    `${serverPaths.size} server handlers and ${clientPaths.size} client routes known, ` +
    `${unresolved.length} not resolved.`,
  );
}

process.exit(fails.length ? 1 : 0);
