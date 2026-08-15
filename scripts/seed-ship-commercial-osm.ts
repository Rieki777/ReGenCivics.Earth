/**
 * seed-ship-commercial-osm.ts — import commercial boondocks from OpenStreetMap
 * via the Overpass API: highway rest areas, Walmarts, and Home Depots across
 * Cascadia. High-traffic paved sites where a rig can pass a quick legal night.
 *
 * Source: OpenStreetMap (© OpenStreetMap contributors). License: ODbL.
 * Everything lands isVerified=false with a field-honest access note (per-state
 * rest-area hour rules; check-the-signs guidance for retail lots). Crews and
 * admins promote the good ones. Idempotent on (source, externalId).
 *
 * Usage (from repo root):
 *   npx tsx scripts/seed-ship-commercial-osm.ts --dry-run
 *   npx tsx scripts/seed-ship-commercial-osm.ts
 */
import {
  CASCADIA_BBOX, inCascadiaPolygon, runImport, sleep, type ImportRow,
  classifyCommercial, commercialAccessNote,
} from "./ship-import-lib";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const SOURCE = "osm_overpass";
const LICENSE = "ODbL";
const PER_RUN_CAP = 3000;

type OverpassEl = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

async function queryStrip(south: number, north: number): Promise<OverpassEl[]> {
  const { west, east } = CASCADIA_BBOX;
  const bbox = `${south},${west},${north},${east}`;
  const ql = `[out:json][timeout:180];(` +
    `nwr["highway"="rest_area"](${bbox});` +
    `nwr["shop"]["brand:wikidata"="Q483551"](${bbox});` +
    `nwr["shop"]["brand:wikidata"="Q864407"](${bbox});` +
    `nwr["shop"]["name"~"walmart",i](${bbox});` +
    `nwr["shop"]["name"~"home depot",i](${bbox});` +
    `);out center 3000;`;
  const attempts = [0, 20000, 45000, 90000];
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

function displayName(fallback: string, tags: Record<string, string>): string {
  const name = tags.name?.trim();
  const city = tags["addr:city"]?.trim();
  if (name && city && !name.toLowerCase().includes(city.toLowerCase())) return `${name} · ${city}`;
  if (name) return name;
  if (city) return `${fallback} · ${city}`;
  return fallback;
}

async function main() {
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  // Commercial features are far sparser than springs; 5° strips are plenty
  // gentle on Overpass.
  const STRIP = 5.0;
  let clippedOut = 0;
  for (let s = CASCADIA_BBOX.south; s < CASCADIA_BBOX.north; s += STRIP) {
    const n = Math.min(s + STRIP, CASCADIA_BBOX.north);
    console.log(`Querying Overpass strip lat ${s.toFixed(1)}–${n.toFixed(1)}...`);
    const els = await queryStrip(s, n);
    let kept = 0;
    for (const el of els) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) continue;
      const tags = el.tags ?? {};
      const cls = classifyCommercial(tags);
      if (!cls) continue;
      if (!inCascadiaPolygon(lon, lat)) { clippedOut++; continue; }
      const externalId = `${el.type}/${el.id}`;
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      const descParts = [tags.description, tags.opening_hours ? `Hours: ${tags.opening_hours}` : "", tags.operator ? `Operator: ${tags.operator}` : ""].filter(Boolean);
      rows.push({
        name: displayName(cls.fallback, tags).slice(0, 200),
        type: "commercial_boondock",
        lat,
        lng: lon,
        source: SOURCE,
        externalId,
        sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        sourceLicense: LICENSE,
        description: descParts.length ? descParts.join(". ").slice(0, 500) : null,
        accessNotes: commercialAccessNote(cls.kind),
        isVerified: false,
      });
      kept++;
    }
    console.log(`  ${els.length} elements, kept ${kept}`);
    await sleep(12000); // be a good Overpass citizen between strips
    if (rows.length >= PER_RUN_CAP) {
      console.log(`  reached per-run cap (${PER_RUN_CAP}); stopping.`);
      break;
    }
  }
  console.log(`Clipped ${clippedOut} points outside the Cascadia boundary.`);
  await runImport("osm_overpass commercial", rows.slice(0, PER_RUN_CAP));
}

main().catch((e) => { console.error(e); process.exit(1); });
