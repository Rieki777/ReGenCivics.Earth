/**
 * seed-ship-hotsprings.ts — import thermal (hot) springs from the public-domain
 * NOAA/NGDC "Thermal Springs of the United States" inventory, filtered to the
 * US-Cascadia bbox, into the ReGen Ship treasure map.
 *
 * Source: NOAA National Geophysical Data Center thermal springs inventory.
 * License: public_domain. Imported as isVerified=false, type=spring, with
 * "hot spring" noted in the description and the surface temperature when present.
 *
 * The dataset's hosted location has moved over the years, so the source URL is
 * configurable. Point it at a CSV or GeoJSON copy:
 *   npx tsx scripts/seed-ship-hotsprings.ts --url=<csv-or-geojson-url> --dry-run
 *   npx tsx scripts/seed-ship-hotsprings.ts --file=<local-path>
 *   NOAA_THERMAL_URL=<url> npx tsx scripts/seed-ship-hotsprings.ts
 *
 * CSV is expected to carry latitude/longitude/name(+optional temperature_c)
 * columns (case-insensitive, common aliases handled). GeoJSON points are read
 * from feature geometry + properties. If the source is unreachable the script
 * logs guidance and exits 0 (non-fatal) — the curated importer also seeds the
 * marquee Cascadia hot springs, so the map is populated regardless.
 */
import { readFileSync } from "node:fs";
import { runImport, type ImportRow } from "./ship-import-lib";

const DEFAULT_URL = "https://www.ngdc.noaa.gov/hazard/data/publications/thermal-springs/thermal-springs.csv";
const SOURCE = "noaa_thermal";
const LICENSE = "public_domain";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : NaN;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const split = (l: string) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.slice(0, -1).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? l.split(",");
  const header = split(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(row).find((rk) => rk === k || rk.includes(k));
    if (found && row[found]) return row[found];
  }
  return "";
}

function rowsFromCsv(text: string): ImportRow[] {
  return parseCsv(text)
    .map((r, i): ImportRow | null => {
      const lat = num(pick(r, ["latitude", "lat"]));
      const lng = num(pick(r, ["longitude", "lon", "lng", "long"]));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const name = pick(r, ["name", "spring", "feature", "site"]) || "Thermal spring";
      const tempC = pick(r, ["temperature_c", "temp_c", "temperature", "temp_celsius"]);
      const id = pick(r, ["id", "gid", "objectid"]) || String(i);
      const temp = tempC ? ` Surface temperature about ${tempC}°C.` : "";
      return {
        name, type: "spring", lat, lng, source: SOURCE, externalId: `noaa-${id}`,
        sourceUrl: DEFAULT_URL, sourceLicense: LICENSE,
        description: `Hot spring (NOAA thermal springs inventory).${temp}`.trim(),
        isVerified: false,
      };
    })
    .filter((r): r is ImportRow => r !== null);
}

function rowsFromGeoJson(text: string): ImportRow[] {
  const gj = JSON.parse(text) as { features?: Array<{ geometry?: { type: string; coordinates: number[] }; properties?: Record<string, unknown> }> };
  return (gj.features ?? [])
    .map((f, i): ImportRow | null => {
      if (f.geometry?.type !== "Point") return null;
      const [lng, lat] = f.geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const p = f.properties ?? {};
      const name = String(p.name ?? p.NAME ?? p.Spring ?? "Thermal spring");
      const id = String(p.id ?? p.gid ?? p.OBJECTID ?? i);
      return {
        name, type: "spring", lat, lng, source: SOURCE, externalId: `noaa-${id}`,
        sourceUrl: DEFAULT_URL, sourceLicense: LICENSE,
        description: "Hot spring (NOAA thermal springs inventory).",
        isVerified: false,
      };
    })
    .filter((r): r is ImportRow => r !== null);
}

async function main() {
  const file = arg("file");
  const url = arg("url") ?? process.env.NOAA_THERMAL_URL ?? DEFAULT_URL;
  let text: string;
  try {
    if (file) {
      text = readFileSync(file, "utf-8");
    } else {
      const res = await fetch(url, { headers: { "User-Agent": "regen-civics-ship-map/1.0" } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      text = await res.text();
    }
  } catch (err) {
    console.warn(`[noaa_thermal] Source unreachable (${(err as Error).message}).`);
    console.warn("  The NOAA thermal-springs dataset URL has moved before. Provide a working copy:");
    console.warn("    npx tsx scripts/seed-ship-hotsprings.ts --url=<csv-or-geojson-url>");
    console.warn("    npx tsx scripts/seed-ship-hotsprings.ts --file=<local-path>");
    console.warn("  Skipping (non-fatal): the curated importer seeds the marquee Cascadia hot springs.");
    return;
  }
  const trimmed = text.trimStart();
  const rows = trimmed.startsWith("{") || trimmed.startsWith("[") ? rowsFromGeoJson(text) : rowsFromCsv(text);
  await runImport("noaa_thermal", rows);
}

main().catch((e) => { console.error(e); process.exit(1); });
