#!/usr/bin/env node
/**
 * One-shot IndexNow submission for pages that ship with a deploy.
 *
 * The server-side hook (server/lib/indexnow.ts) covers content created at
 * runtime, like forum posts. Static content added in a deploy has no such
 * trigger, so this script does it deterministically: run it once after the
 * deploy goes green (STEERING section 11, deterministic-first).
 *
 * Usage:
 *   node scripts/ping-indexnow.mjs --learn      # every Learn hub URL
 *   node scripts/ping-indexnow.mjs /fund /glossary
 *
 * On Git Bash for Windows, prefix explicit paths with MSYS_NO_PATHCONV=1.
 * MSYS rewrites any argument starting with "/" into a Windows path before node
 * ever sees it, so the paths silently vanish from the filter and the script
 * exits with its usage line. PowerShell and Linux shells need no prefix, and
 * --learn is unaffected either way.
 *
 * The key is read from server/lib/indexnow.ts so there is exactly one copy
 * of it in the repo, and it is verified by the matching file in
 * client/public/<key>.txt.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "regencivics.earth";

function readKey() {
  const src = readFileSync(resolve(root, "server/lib/indexnow.ts"), "utf8");
  const m = src.match(/INDEXNOW_KEY\s*=\s*"([a-f0-9]+)"/i);
  if (!m) throw new Error("INDEXNOW_KEY not found in server/lib/indexnow.ts");
  const key = m[1];
  if (!existsSync(resolve(root, `client/public/${key}.txt`))) {
    throw new Error(`Key file client/public/${key}.txt is missing; IndexNow would reject the ping`);
  }
  return key;
}

function learnPaths() {
  // Parse the slugs out of the shared content registry rather than importing
  // it, so this stays a plain node script with no build step.
  const src = readFileSync(resolve(root, "shared/learnContent.ts"), "utf8");
  const slugs = [...src.matchAll(/from "\.\/learn\/([a-z0-9-]+)"/g)].map((m) => m[1]);
  if (!slugs.length) throw new Error("No Learn slugs found in shared/learnContent.ts");
  return ["/learn", ...slugs.map((s) => `/learn/${s}`)];
}

const args = process.argv.slice(2);
const paths = args.includes("--learn") ? learnPaths() : args.filter((a) => a.startsWith("/"));

if (!paths.length) {
  console.error("Usage: node scripts/ping-indexnow.mjs [--learn] [/path ...]");
  process.exit(1);
}

const key = readKey();
const urlList = paths.map((p) => `https://${HOST}${p}`);

console.log(`[indexnow] submitting ${urlList.length} url(s):`);
for (const u of urlList) console.log(`  ${u}`);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList,
  }),
});

const body = await res.text().catch(() => "");
console.log(`[indexnow] ${res.status} ${res.statusText}${body ? ` ${body.slice(0, 200)}` : ""}`);
// 200 and 202 both mean accepted.
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
