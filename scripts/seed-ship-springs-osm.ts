/**
 * seed-ship-springs-osm.ts — import springs, waterfalls, and drinking water from
 * OpenStreetMap via the Overpass API, into the ReGen Ship treasure map.
 *
 * Source: OpenStreetMap (© OpenStreetMap contributors). License: ODbL.
 * Imported as isVerified=false (styled translucent on the map); an admin or a
 * crew in the field promotes the good ones to the verified "treasure" tier.
 *
 * Meaningful-filter: springs and waterfalls are kept whether named or not (they
 * are the treasure). amenity=drinking_water is kept only when named, to avoid
 * seeding every unnamed roadside fountain. Idempotent on (source, externalId).
 *
 * Usage (from repo root):
 *   npx tsx scripts/seed-ship-springs-osm.ts --dry-run
 *   npx tsx scripts/seed-ship-springs-osm.ts
 */
import { CASCADIA_BBOX, inCascadiaPolygon, runImport, sleep, type ImportRow } from "./ship-import-lib";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const SOURCE = "osm_overpass";
const LICENSE = "ODbL";
// Cap per strip so every latitude band (including the northern voyage zone and
// Washington) is represented, not just whichever strip we happen to query first.
const PER_STRIP_CAP = 900;
const PER_RUN_CAP = 6000;

type OverpassEl = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function classify(tags: Record<string, string>): { type: string; fallback: string } | null {
  if (tags.natural === "spring") return { type: "spring", fallback: "Spring" };
  if (tags.waterway === "waterfall") return { type: "waterfall", fallback: "Waterfall" };
  if (tags.amenity === "drinking_water") return { type: "spring", fallback: "Drinking water" };
  return null;
}

async function queryStrip(south: number, north: number): Promise<OverpassEl[]> {
  const { west, east } = CASCADIA_BBOX;
  const bbox = `${south},${west},${north},${east}`;
  const ql = `[out:json][timeout:180];(` +
    `node["natural"="spring"](${bbox});` +
    `node["waterway"="waterfall"](${bbox});` +
    `way["waterway"="waterfall"](${bbox});` +
    `node["amenity"="drinking_water"](${bbox});` +
    `);out center 3000;`;
  // Overpass rate-limits (429) and times out (504) under load. Retry across
  // mirrors with escalating backoff; give up on the strip after a few tries so
  // one flaky strip does not abort the whole import.
  const attempts = [0, 20000, 45000, 90000]; // backoff before each try
  for (let i = 0; i < attempts.length; i++) {
    const endpoint = ENDPOINTS[i % ENDPOINTS.length];
    if (attempts[i]) { console.log(`  backing off ${attempts[i] / 1000}s before retry...`); await sleep(attempts[i]); }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "regen-civics-ship-map/1.0 (rieki.cordon@gmail.com)" },
        body: "data=" + encodeURIComponent(ql),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status} from ${endpoint}`);
      const json = (await res.json()) as { elements?: OverpassEl[] };
      return json.elements ?? [];
    } catch (err) {
      console.warn(`  ${endpoint} failed (${(err as Error).message})`);
    }
  }
  console.warn(`  strip ${south.toFixed(1)}–${north.toFixed(1)} skipped after retries.`);
  return [];
}

async function main() {
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  // Batch the bbox into ~2.5° latitude strips to respect Overpass limits.
  const STRIP = 2.5;
  let clippedOut = 0;
  for (let s = CASCADIA_BBOX.south; s < CASCADIA_BBOX.north; s += STRIP) {
    const n = Math.min(s + STRIP, CASCADIA_BBOX.north);
    console.log(`Querying Overpass strip lat ${s.toFixed(1)}–${n.toFixed(1)}...`);
    const els = await queryStrip(s, n);
    let kept = 0;
    for (const el of els) {
      if (kept >= PER_STRIP_CAP) break;
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) continue;
      const tags = el.tags ?? {};
      const cls = classify(tags);
      if (!cls) continue;
      const name = tags.name?.trim();
      if (cls.fallback === "Drinking water" && !name) continue; // cut fountain noise
      // Clip to the bioregion so the rectangular bbox does not drag in Great
      // Basin (Utah/Nevada) springs that are geographically not Cascadia.
      if (!inCascadiaPolygon(lon, lat)) { clippedOut++; continue; }
      const externalId = `${el.type}/${el.id}`;
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      const notesParts = [tags.description, tags.access ? `Access: ${tags.access}` : "", tags.operator ? `Operator: ${tags.operator}` : ""].filter(Boolean);
      rows.push({
        name: name || cls.fallback,
        type: cls.type,
        lat,
        lng: lon,
        source: SOURCE,
        externalId,
        sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        sourceLicense: LICENSE,
        description: notesParts.length ? notesParts.join(". ").slice(0, 500) : null,
        isVerified: false,
      });
      kept++;
    }
    console.log(`  ${els.length} elements, kept ${kept}`);
    await sleep(12000); // be a good Overpass citizen; avoid 429s between strips
    if (rows.length >= PER_RUN_CAP) {
      console.log(`  reached per-run cap (${PER_RUN_CAP}); stopping.`);
      break;
    }
  }
  console.log(`Clipped ${clippedOut} points outside the Cascadia boundary.`);
  await runImport("osm_overpass", rows.slice(0, PER_RUN_CAP));
}

main().catch((e) => { console.error(e); process.exit(1); });
