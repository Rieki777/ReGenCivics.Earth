/**
 * Seed `roleHolders` from `client/src/data/gameRoles.ts`.
 *
 * One row per role, `userId = NULL` (Rye fills these via the admin form).
 * Re-runnable: existing rows are matched on `roleSlug` and left alone, so
 * this is safe to run after edits to `gameRoles.ts` (it will only insert
 * missing roles, never overwrite a holder assignment).
 *
 * Run as:
 *   npx tsx scripts/seed-role-holders.ts
 *
 * Per spec section 4.1: this is the "table for sending unique messages"
 * Rye asked for, with `aliases` pre-populated so the LLM can match
 * variant references heard in a transcript back to the role.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

interface ParsedRole {
  title: string;
  characterName: string;
  circle: string;
  kind: "game" | "fund";
  hoursPerWeek?: number;
}

/**
 * Pull roles out of the TS source. We don't import the module directly
 * because gameRoles.ts uses path aliases (@/lib/...) and runtime icon
 * components that aren't valid in a tsx CLI script. Stable shallow
 * regex parse is enough since the file is hand-curated and we only need
 * a handful of string fields.
 */
function extractRoles(): ParsedRole[] {
  const file = readFileSync(
    join(REPO_ROOT, "client", "src", "data", "gameRoles.ts"),
    "utf8",
  );
  // Find the start of the array body and walk balanced braces to get
  // each role object's source.
  const arrayStart = file.indexOf("export const gameRoles");
  if (arrayStart === -1) return [];
  const eq = file.indexOf("=", arrayStart);
  const open = file.indexOf("[", eq);
  let depth = 0;
  let end = open;
  for (let i = open; i < file.length; i++) {
    if (file[i] === "[") depth++;
    else if (file[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = file.slice(open + 1, end);

  const objects: string[] = [];
  let braceDepth = 0;
  let start = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{") {
      if (braceDepth === 0) start = i;
      braceDepth++;
    } else if (ch === "}") {
      braceDepth--;
      if (braceDepth === 0 && start !== -1) {
        objects.push(body.slice(start, i + 1));
        start = -1;
      }
    }
  }

  const field = (src: string, name: string): string | null => {
    const re = new RegExp(`\\b${name}\\s*:\\s*(['"\\\`])`, "m");
    const m = src.match(re);
    if (!m) return null;
    const q = m[1];
    const startIdx = src.indexOf(q, m.index) + 1;
    let i = startIdx;
    while (i < src.length) {
      if (src[i] === "\\") { i += 2; continue; }
      if (src[i] === q) break;
      i++;
    }
    return src.slice(startIdx, i);
  };

  return objects
    .map((src) => {
      const title = field(src, "title");
      const characterName = field(src, "characterName") ?? "";
      const circle = field(src, "circle") ?? "";
      const kindStr = field(src, "kind");
      const hoursMatch = src.match(/\bhoursPerWeek\s*:\s*(\d+)/);
      if (!title) return null;
      return {
        title,
        characterName,
        circle,
        kind: kindStr === "fund" ? "fund" : "game",
        hoursPerWeek: hoursMatch ? Number(hoursMatch[1]) : undefined,
      } as ParsedRole;
    })
    .filter((r): r is ParsedRole => Boolean(r));
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildAliases(role: ParsedRole): string[] {
  // Aliases the LLM might hear in a transcript: the role title, the
  // character name (e.g. "The Gardener"), the character word without
  // the article, the circle ("Incubation Circle" -> "Incubation").
  const out = new Set<string>();
  out.add(role.title);
  if (role.characterName) {
    out.add(role.characterName);
    const stripped = role.characterName.replace(/^The\s+/i, "").trim();
    if (stripped && stripped !== role.characterName) out.add(stripped);
  }
  if (role.circle) {
    out.add(role.circle);
    const noCircle = role.circle.replace(/\s*Circle$/i, "").trim();
    if (noCircle && noCircle !== role.circle) out.add(noCircle);
  }
  return Array.from(out);
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set in .env. Aborting.");
    process.exit(1);
  }

  const roles = extractRoles();
  if (roles.length === 0) {
    console.error("No roles parsed from client/src/data/gameRoles.ts. Aborting.");
    process.exit(2);
  }
  console.log(`Parsed ${roles.length} roles from gameRoles.ts.`);

  const conn = await mysql.createConnection(url);
  try {
    let inserted = 0;
    let skipped = 0;
    for (const role of roles) {
      const slug = toSlug(role.title);
      const [existing] = await conn.execute(
        "SELECT id, userId FROM roleHolders WHERE roleSlug = ? LIMIT 1",
        [slug],
      );
      if ((existing as Array<{ id: number; userId: number | null }>).length > 0) {
        skipped += 1;
        continue;
      }
      const aliases = JSON.stringify(buildAliases(role));
      await conn.execute(
        `INSERT INTO roleHolders
          (roleSlug, roleTitle, kind, circle, userId, isActive, notifyEmail, notifyInApp, aliases)
         VALUES (?, ?, ?, ?, NULL, 1, 1, 1, ?)`,
        [slug, role.title, role.kind, role.circle || null, aliases],
      );
      inserted += 1;
      console.log(`  inserted roleHolder slug=${slug} (${role.kind})`);
    }

    console.log(`\nSeed complete: ${inserted} inserted, ${skipped} already present.`);
    if (skipped > 0) {
      console.log("Existing rows were left alone; this script never overwrites a holder assignment.");
    }
    console.log("Next: open /admin and use the Role Holders tab to set userId on filled roles.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
