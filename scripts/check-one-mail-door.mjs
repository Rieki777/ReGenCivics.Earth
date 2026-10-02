#!/usr/bin/env node
/**
 * One door to the mail provider.
 *
 * Production sends go through server/_core/email.ts. This fails when any
 * other source file imports the SDK, constructs the client, calls
 * emails.send, or names the provider HTTP host.
 *
 * Inbound webhooks and the word "Resend" in a comment are allowed.
 * The webhook receives events. It does not send.
 *
 * Usage: node scripts/check-one-mail-door.mjs
 * Exit:  0 when the only door is server/_core/email.ts, 1 otherwise.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOOR = "server/_core/email.ts";
const SCAN_DIRS = ["client", "server", "shared", "scripts"];
const SELF = "scripts/check-one-mail-door.mjs";

/** @type {{ name: string, re: RegExp }[]} */
const RULES = [
  { name: "sdk import", re: /from\s+['"]resend['"]/ },
  { name: "sdk require", re: /require\(\s*['"]resend['"]\s*\)/ },
  { name: "client constructor", re: /\bnew\s+Resend\s*\(/ },
  { name: "provider host", re: /api\.resend\.com/ },
  { name: "emails.send", re: /\.emails\.send\s*\(/ },
];

/**
 * @param {string} relPosix
 * @param {string} line
 * @returns {string | null} rule name, or null when the line is allowed
 */
export function doorHit(relPosix, line) {
  if (relPosix === DOOR || relPosix === SELF) return null;
  for (const rule of RULES) {
    if (rule.re.test(line)) return rule.name;
  }
  return null;
}

function selfTest() {
  const badImport = doorHit("server/other.ts", 'import { Resend } from "resend";');
  const badSend = doorHit("server/other.ts", "await client.emails.send({ to })");
  const badHost = doorHit("server/other.ts", "fetch('https://api.resend.com/emails')");
  const doorOk = doorHit(DOOR, 'import { Resend } from "resend";');
  const commentOk = doorHit("server/webhooks/resend.ts", "Resend webhook event");
  const problems = [];
  if (badImport !== "sdk import") problems.push(`import outside the door reported ${badImport}`);
  if (badSend !== "emails.send") problems.push(`emails.send outside the door reported ${badSend}`);
  if (badHost !== "provider host") problems.push(`host outside the door reported ${badHost}`);
  if (doorOk !== null) problems.push("the door file was flagged");
  if (commentOk !== null) problems.push("a comment that names the provider was flagged");
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("self-test ok");
}

function walk(dir, out) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
      walk(rel, out);
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
      out.push(rel.split(path.sep).join("/"));
    }
  }
}

function scan() {
  /** @type {string[]} */
  const files = [];
  for (const dir of SCAN_DIRS) walk(dir, files);
  /** @type {string[]} */
  const hits = [];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const name = doorHit(rel, lines[i]);
      if (name) hits.push(`${rel}:${i + 1} ${name}`);
    }
  }
  if (hits.length > 0) {
    console.error(`mail door: ${hits.length} call(s) outside ${DOOR}`);
    for (const hit of hits) console.error(hit);
    process.exit(1);
  }
  console.log(`mail door ok (${files.length} files, only ${DOOR})`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  selfTest();
  scan();
}
