/**
 * seed-ship-ioverlander.ts — import camping + water places from an iOverlander
 * CSV export into the ReGen Ship treasure map.
 *
 * Source: iOverlander (ioverlander.com). License: "Used with permission".
 * Rye secured permission on 2026-07-12 under a personal-use / people-we-know
 * scope, so these pins are CREW-GATED: the server (server/routes/ship.ts) only
 * returns source="ioverlander" rows to signed-in users, never to anonymous
 * visitors. The CSV itself is gitignored (data/ioverlander/) and lives only on
 * this machine + the production DB. Everything is removable in one query by
 * `source` (ADR-35).
 *
 * Only three things are treasure here (see classifyIoverlander): free/rough
 * camping → boondock, big-lot overnights → commercial_boondock, water → spring.
 * Services (fuel, propane, dump, laundry, mechanic, medical, restaurant, wifi,
 * showers, shopping, tourist attraction, lodging) are skipped. Everything lands
 * isVerified=false; crews promote the good ones. Idempotent on (source,
 * externalId), clipped to the Cascadia bioregion.
 *
 * Usage (from repo root), after dropping the export(s) into data/ioverlander/:
 *   npx tsx scripts/seed-ship-ioverlander.ts --dry-run
 *   npx tsx scripts/seed-ship-ioverlander.ts
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { inCascadiaPolygon, runImport, classifyIoverlander, type ImportRow } from "./ship-import-lib";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(REPO_ROOT, "data", "ioverlander");
const SOURCE = "ioverlander";
const LICENSE = "Used with permission";

/** Light plain-text clean for CSV free text (no server sanitizer in scripts). */
function clean(s: string | undefined | null, cap = 500): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, cap) : null;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "place";
}

/** Case-insensitive lookup: first header matching any candidate that has a value. */
function pick(row: Record<string, string>, lc: Record<string, string>, candidates: RegExp[]): string {
  for (const key of Object.keys(lc)) {
    if (candidates.some((re) => re.test(key)) && lc[key]?.trim()) return lc[key].trim();
  }
  return "";
}

const NAME = [/^name$/, /place.?name/, /title/];
const CATEGORY = [/^category$/, /^type$/, /^categories$/];
const DESC = [/^description$/, /^notes?$/, /^comments?$/, /^details$/];
const LAT = [/^lat/, /latitude/];
const LNG = [/^lon/, /^lng/, /longitude/];
const ID = [/^id$/, /place.?id/, /^gid$/, /^objectid$/];
const YEAR_ROUND = [/year.?round/, /open all year/];
const MAX_RIG = [/max.*(length|rig|rv)/, /(length|size).*(ft|feet|meter)/, /big.?rig/, /max.?vehicle/];

function toRow(raw: Record<string, string>): ImportRow | null {
  // Normalize header keys to lowercase once per row.
  const lc: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) lc[k.toLowerCase().trim()] = v ?? "";

  const category = pick(raw, lc, CATEGORY);
  const cls = classifyIoverlander(category);
  if (!cls) return null;

  const lat = parseFloat(pick(raw, lc, LAT));
  const lng = parseFloat(pick(raw, lc, LNG));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (!inCascadiaPolygon(lng, lat)) return null;

  const name = clean(pick(raw, lc, NAME), 200) || cls.type.replace("_", " ");
  const id = pick(raw, lc, ID);
  const externalId = id ? `ioverlander/${id}` : `${lat.toFixed(5)}/${lng.toFixed(5)}/${slugify(name)}`;
  const sourceUrl = id ? `https://ioverlander.com/places/${encodeURIComponent(id)}` : "https://ioverlander.com";

  let description = clean(pick(raw, lc, DESC));
  if (cls.hotSpring && (!description || !/hot spring/i.test(description))) {
    description = clean(`Hot springs. ${description ?? ""}`);
  }

  // accessNotes: the classifier's note (fee campgrounds, commercial lots) plus a
  // couple of amenity flags worth keeping.
  const notes: string[] = [];
  if (cls.accessNote) notes.push(cls.accessNote);
  if (pick(raw, lc, YEAR_ROUND).match(/^(yes|y|true|1|open)/i)) notes.push("Open year-round.");
  const accessNotes = notes.length ? notes.join(" ").slice(0, 2000) : null;

  const rigRaw = parseInt(pick(raw, lc, MAX_RIG), 10);
  const maxRigLengthFt = Number.isFinite(rigRaw) && rigRaw > 0 && rigRaw <= 100 ? rigRaw : null;

  return {
    name,
    type: cls.type,
    lat,
    lng,
    source: SOURCE,
    externalId,
    sourceUrl,
    sourceLicense: LICENSE,
    description,
    accessNotes,
    maxRigLengthFt,
    isVerified: false,
  };
}

async function main() {
  if (!existsSync(DATA_DIR)) {
    console.log(`No ${DATA_DIR} folder. Drop iOverlander CSV export(s) there, then re-run.`);
    return;
  }
  const files = readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith(".csv"));
  if (files.length === 0) {
    console.log(`No CSV files in ${DATA_DIR}. Drop iOverlander export(s) there, then re-run.`);
    return;
  }

  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  let scanned = 0, skipped = 0;
  for (const file of files) {
    const content = readFileSync(join(DATA_DIR, file), "utf-8");
    const records = parse(content, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true, trim: true }) as Record<string, string>[];
    if (records.length) console.log(`[ioverlander] ${file}: ${records.length} rows. Header: ${Object.keys(records[0]).join(" | ")}`);
    for (const rec of records) {
      scanned++;
      const row = toRow(rec);
      if (!row) { skipped++; continue; }
      if (seen.has(row.externalId)) continue;
      seen.add(row.externalId);
      rows.push(row);
    }
  }

  // Per-type breakdown so miscategorized services are easy to catch.
  const byType = rows.reduce<Record<string, number>>((acc, r) => ((acc[r.type] = (acc[r.type] ?? 0) + 1), acc), {});
  console.log(`[ioverlander] scanned ${scanned}, kept ${rows.length}, skipped ${skipped} (services/out-of-region). By type: ${JSON.stringify(byType)}`);

  await runImport("ioverlander", rows);
}

main().catch((e) => { console.error(e); process.exit(1); });
