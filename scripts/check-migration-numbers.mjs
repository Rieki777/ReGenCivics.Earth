#!/usr/bin/env node
/**
 * Migration number guard (foundation audit Phase 1, finding C4).
 *
 * The migration runner orders files by full filename, so two migrations
 * sharing an NNNN prefix apply in alphabetical-description order rather than
 * intent order. History already contains 14 duplicated prefixes; those are
 * grandfathered below because applied history is keyed by filename and must
 * never be renamed. Any NEW duplicate fails this check.
 *
 * Run: node scripts/check-migration-numbers.mjs   (CI runs this on every push)
 */
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = readdirSync(join(root, "drizzle")).filter((f) => /^\d{4}_.+\.sql$/.test(f));

// Frozen as of 2026-07-16. Do not add to this list; pick the next free number.
const GRANDFATHERED = new Set([
  "0041", "0043", "0044", "0045", "0057", "0074", "0091", "0093",
  "0137", "0153", "0163", "0164", "0173", "0179",
]);

const byPrefix = new Map();
for (const f of files) {
  const prefix = f.slice(0, 4);
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
  byPrefix.get(prefix).push(f);
}

const offenders = [...byPrefix.entries()].filter(
  ([prefix, group]) => group.length > 1 && !GRANDFATHERED.has(prefix)
);

// A grandfathered prefix growing a THIRD (or fourth) file is also a new collision.
const grownGrandfathered = [...byPrefix.entries()].filter(([prefix, group]) => {
  if (!GRANDFATHERED.has(prefix)) return false;
  const allowed = prefix === "0163" ? 3 : 2;
  return group.length > allowed;
});

if (offenders.length || grownGrandfathered.length) {
  console.error("❌ Duplicate migration numbers detected. Every migration needs a unique NNNN prefix.");
  for (const [prefix, group] of [...offenders, ...grownGrandfathered]) {
    console.error(`   ${prefix}: ${group.join(", ")}`);
  }
  const max = Math.max(...files.map((f) => parseInt(f.slice(0, 4), 10)));
  console.error(`   Next free number: ${String(max + 1).padStart(4, "0")}`);
  process.exit(1);
}

const max = Math.max(...files.map((f) => parseInt(f.slice(0, 4), 10)));
console.log(`✅ Migration numbering clean (${files.length} files, next free: ${String(max + 1).padStart(4, "0")})`);
