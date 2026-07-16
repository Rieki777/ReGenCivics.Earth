#!/usr/bin/env node
/**
 * .env.example completeness guard (foundation audit Phase 1, finding D4).
 *
 * Every process.env.KEY the server or shared code reads must be documented in
 * .env.example, or a fresh environment provisioned from the example silently
 * loses features. Scans server/ + shared/ (runtime code; scripts/ one-shots
 * are exempt) and fails CI on undocumented keys.
 *
 * Run: node scripts/check-env-example.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Provided by the platform / test runner, never user-provisioned.
const IGNORE = new Set([
  "NODE_ENV", "CI", "VITEST", "PORT", "HOME", "PATH",
  "RAILWAY_ENVIRONMENT", "RAILWAY_PUBLIC_DOMAIN", "RAILWAY_GIT_COMMIT_SHA",
]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      yield* walk(full);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry)) {
      yield full;
    }
  }
}

const used = new Set();
for (const dir of ["server", "shared"]) {
  for (const file of walk(join(root, dir))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      used.add(m[1]);
    }
  }
}

const example = readFileSync(join(root, ".env.example"), "utf8");
const documented = new Set();
for (const m of example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)) {
  documented.add(m[1]);
}

const missing = [...used].filter((k) => !documented.has(k) && !IGNORE.has(k)).sort();

if (missing.length) {
  console.error("❌ process.env keys used in server/shared but missing from .env.example:");
  for (const k of missing) console.error(`   ${k}=`);
  console.error("Document them (name + one-line comment; no values) in .env.example.");
  process.exit(1);
}

console.log(`✅ .env.example documents all ${used.size - [...used].filter((k) => IGNORE.has(k)).length} runtime env keys (${documented.size} documented total).`);
