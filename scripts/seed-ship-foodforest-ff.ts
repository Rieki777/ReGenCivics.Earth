/**
 * seed-ship-foodforest-ff.ts — import food forests, orchards, and notable
 * community stands from Falling Fruit into the ReGen Ship treasure map.
 *
 * Source: Falling Fruit (fallingfruit.org). License: CC-BY-NC-SA.
 *
 * ⚠ LICENSE NOTE: CC-BY-NC-SA is NON-COMMERCIAL. The treasure map is a free
 * community feature of a church program (Church of the Regenerative Earth), and
 * Rye is securing explicit blessing from the Falling Fruit Foundation (companion
 * Task 10). Every row keeps attribution (sourceUrl + sourceLicense) and is
 * removable in one query by `source = 'falling_fruit'`. Do not use this data in
 * any paid/commercial surface.
 *
 * Meaningful-filter: single street trees are noise. We keep entries that read as
 * a cluster — an explicit description, or a multi-type listing — and drop bare
 * single-tree points. Idempotent on (source, externalId).
 *
 * The Falling Fruit API needs an api_key. Provide it, or point --file at an
 * exported locations JSON array:
 *   FALLINGFRUIT_API_KEY=<key> npx tsx scripts/seed-ship-foodforest-ff.ts --dry-run
 *   npx tsx scripts/seed-ship-foodforest-ff.ts --file=<locations.json>
 *
 * If the source is unreachable the script logs guidance and exits 0 (non-fatal);
 * the curated importer also seeds marquee food forests near the anchorage.
 */
import { readFileSync } from "node:fs";
import { CASCADIA_BBOX, runImport, type ImportRow } from "./ship-import-lib";

const SOURCE = "falling_fruit";
const LICENSE = "CC-BY-NC-SA";
const API = "https://fallingfruit.org/api/0.3/locations";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

type FFLoc = {
  id: number;
  lat?: number;
  lng?: number;
  x?: number; // some exports use x=lng, y=lat
  y?: number;
  type_ids?: number[];
  description?: string | null;
  author?: string | null;
};

function toRow(l: FFLoc): ImportRow | null {
  const lat = l.lat ?? l.y;
  const lng = l.lng ?? l.x;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const desc = (l.description ?? "").trim();
  const typeCount = l.type_ids?.length ?? 0;
  // Meaningful-cluster heuristic: a real description, or several species listed.
  const isCluster = desc.length >= 20 || typeCount >= 3;
  if (!isCluster) return null;
  const name = desc.split(/[.\n]/)[0].slice(0, 80).trim() || "Food forest / orchard";
  return {
    name,
    type: "food_forest",
    lat,
    lng,
    source: SOURCE,
    externalId: String(l.id),
    sourceUrl: `https://fallingfruit.org/locations/${l.id}`,
    sourceLicense: LICENSE,
    description: desc ? desc.slice(0, 500) : "Community food source (Falling Fruit).",
    isVerified: false,
  };
}

async function fetchApi(apiKey: string): Promise<FFLoc[]> {
  // bounds = SW_lat,SW_lng,NE_lat,NE_lng
  const bounds = `${CASCADIA_BBOX.south},${CASCADIA_BBOX.west},${CASCADIA_BBOX.north},${CASCADIA_BBOX.east}`;
  const url = `${API}?api_key=${encodeURIComponent(apiKey)}&bounds=${encodeURIComponent(bounds)}&limit=5000`;
  const res = await fetch(url, { headers: { "User-Agent": "regen-civics-ship-map/1.0" } });
  if (!res.ok) throw new Error(`Falling Fruit API ${res.status} ${res.statusText}`);
  const json = await res.json();
  return Array.isArray(json) ? json : (json.locations ?? []);
}

async function main() {
  const file = arg("file");
  const apiKey = arg("api-key") ?? process.env.FALLINGFRUIT_API_KEY;
  let locs: FFLoc[];
  try {
    if (file) {
      const parsed = JSON.parse(readFileSync(file, "utf-8"));
      locs = Array.isArray(parsed) ? parsed : (parsed.locations ?? parsed.features ?? []);
    } else if (apiKey) {
      locs = await fetchApi(apiKey);
    } else {
      console.warn("[falling_fruit] No FALLINGFRUIT_API_KEY and no --file. Falling Fruit's API needs a key.");
      console.warn("  Get a key (fallingfruit.org) or export a locations JSON, then:");
      console.warn("    FALLINGFRUIT_API_KEY=<key> npx tsx scripts/seed-ship-foodforest-ff.ts");
      console.warn("    npx tsx scripts/seed-ship-foodforest-ff.ts --file=<locations.json>");
      console.warn("  Skipping (non-fatal): the curated importer seeds marquee food forests.");
      return;
    }
  } catch (err) {
    console.warn(`[falling_fruit] Source unreachable (${(err as Error).message}). Skipping (non-fatal).`);
    return;
  }
  const rows = locs.map(toRow).filter((r): r is ImportRow => r !== null);
  await runImport("falling_fruit", rows);
}

main().catch((e) => { console.error(e); process.exit(1); });
