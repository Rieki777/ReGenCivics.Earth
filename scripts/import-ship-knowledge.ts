/**
 * Import a markdown knowledge pack into the Shipwright's knowledge base.
 *
 * THE EASY PATH for teaching the Shipwright in bulk: write plain markdown,
 * run one command. (For one-off facts, use the admin UI: /admin/ship ->
 * Shipwright tab -> "Teach the Shipwright".)
 *
 * Usage:
 *   npx tsx scripts/import-ship-knowledge.ts                                    # default pack
 *   npx tsx scripts/import-ship-knowledge.ts ship-knowledge/anything.md         # any pack
 *   npx tsx scripts/import-ship-knowledge.ts --dry-run                          # preview only
 *
 * Pack format (see ship-knowledge/2006-fleetwood-revolution-le.md):
 *   ## Title | system: engine | source: where it came from | type: manual
 *   Body until the next ## heading becomes the chunk content.
 *
 * system: chassis engine propane electrical plumbing slides generator appliances
 *         starlink water_filtration tires_brakes hvac general      (default general)
 * type:   manual service_bulletin forum_wisdom                     (default manual)
 *
 * Idempotent by title: existing titles are UPDATED with the pack's latest text,
 * new titles are inserted. Chunks land approved (isApproved=1) because running
 * this script is itself the human approval; flip any chunk off in the admin UI.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "node:fs";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const packPath = process.argv.filter((a) => !a.startsWith("--"))[2] ?? "ship-knowledge/2006-fleetwood-revolution-le.md";

const SYSTEMS = new Set([
  "chassis", "engine", "propane", "electrical", "plumbing", "slides", "generator",
  "appliances", "starlink", "water_filtration", "tires_brakes", "hvac", "general",
]);
const SOURCE_TYPES = new Set(["manual", "service_bulletin", "forum_wisdom"]);

type Chunk = { title: string; content: string; system: string; sourceRef: string | null; sourceType: string };

function parsePack(md: string): Chunk[] {
  const chunks: Chunk[] = [];
  for (const section of md.split(/^## /m).slice(1)) {
    const newline = section.indexOf("\n");
    const header = (newline === -1 ? section : section.slice(0, newline)).trim();
    const body = (newline === -1 ? "" : section.slice(newline + 1)).trim();
    if (!header || !body) continue;

    const parts = header.split("|").map((p) => p.trim());
    const title = parts[0].slice(0, 255);
    let system = "general";
    let sourceRef: string | null = null;
    let sourceType = "manual";
    for (const part of parts.slice(1)) {
      const [key, ...rest] = part.split(":");
      const value = rest.join(":").trim();
      if (key.trim() === "system" && SYSTEMS.has(value)) system = value;
      if (key.trim() === "source" && value) sourceRef = value.slice(0, 512);
      if (key.trim() === "type" && SOURCE_TYPES.has(value)) sourceType = value;
    }
    chunks.push({ title, content: body.slice(0, 8000), system, sourceRef, sourceType });
  }
  return chunks;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("ERROR: DATABASE_URL not set. Check your .env."); process.exit(1); }

  const chunks = parsePack(readFileSync(packPath, "utf-8"));
  if (!chunks.length) { console.error(`No ## sections found in ${packPath}`); process.exit(1); }
  console.log(`[import-ship-knowledge] ${chunks.length} chunks in ${packPath}${DRY_RUN ? " (dry run)" : ""}`);

  if (DRY_RUN) {
    for (const c of chunks) console.log(`  would upsert: [${c.system}] ${c.title} (${c.sourceType}${c.sourceRef ? `, ${c.sourceRef}` : ""})`);
    return;
  }

  const conn = await mysql.createConnection(url);
  let inserted = 0, updated = 0;
  try {
    for (const c of chunks) {
      const [existing] = await conn.execute("SELECT id FROM ship_knowledge_chunks WHERE title = ? LIMIT 1", [c.title]);
      if (Array.isArray(existing) && existing.length > 0) {
        await conn.execute(
          "UPDATE ship_knowledge_chunks SET `content` = ?, `system` = ?, `sourceType` = ?, `sourceRef` = ?, `isApproved` = 1 WHERE `title` = ?",
          [c.content, c.system, c.sourceType, c.sourceRef, c.title],
        );
        updated++;
        console.log(`  ~ [${c.system}] ${c.title}`);
      } else {
        await conn.execute(
          "INSERT INTO ship_knowledge_chunks (`title`, `content`, `system`, `sourceType`, `sourceRef`, `tags`, `isApproved`, `createdAt`) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), 1, NOW())",
          [c.title, c.content, c.system, c.sourceType, c.sourceRef, JSON.stringify([])],
        );
        inserted++;
        console.log(`  + [${c.system}] ${c.title}`);
      }
    }
    console.log(`[import-ship-knowledge] done: ${inserted} inserted, ${updated} updated`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
