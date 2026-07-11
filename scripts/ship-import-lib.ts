/**
 * Shared helpers for the ReGen Ship treasure-map importers.
 *
 * Every imported row is idempotent on the (source, externalId) composite unique
 * index (migration 0177): re-running an importer upserts by origin id instead of
 * duplicating pins. Human verification is never flipped by a re-import — if an
 * admin verified (or unverified) a row, that sticks; imports only refresh the
 * factual fields (name, coordinates, description, attribution).
 *
 * The US-Cascadia bbox mirrors client/src/pages/ship/shipMapConfig.ts.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

export const CASCADIA_BBOX = { west: -126.0, south: 39.5, east: -110.5, north: 49.5 } as const;

export function inBbox(lng: number, lat: number): boolean {
  return (
    Number.isFinite(lng) && Number.isFinite(lat) &&
    lng >= CASCADIA_BBOX.west && lng <= CASCADIA_BBOX.east &&
    lat >= CASCADIA_BBOX.south && lat <= CASCADIA_BBOX.north
  );
}

// Approximate US-Cascadia boundary ring, loaded once from the shared GeoJSON.
// Used to clip bulk imports to the bioregion so the rectangular bbox does not
// drag in Great Basin (Utah/Nevada) points that are geographically not Cascadia.
let _ring: Array<[number, number]> | null = null;
function cascadiaRing(): Array<[number, number]> {
  if (_ring) return _ring;
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const gj = JSON.parse(readFileSync(join(repoRoot, "shared", "data", "cascadia-boundary.geojson"), "utf-8"));
  _ring = gj.features[0].geometry.coordinates[0] as Array<[number, number]>;
  return _ring;
}

/** Ray-casting point-in-polygon against the approximate Cascadia boundary. */
export function inCascadiaPolygon(lng: number, lat: number): boolean {
  const ring = cascadiaRing();
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export type ImportRow = {
  name: string;
  type: string;
  lat: number;
  lng: number;
  source: string;
  externalId: string;
  sourceUrl?: string | null;
  sourceLicense?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  imageUrl?: string | null;
  maxRigLengthFt?: number | null;
  accessNotes?: string | null;
  waterQualityUrl?: string | null;
  region?: string | null;
  isVerified?: boolean;
};

/** Deterministic, unique, stable slug derived from name + source + externalId. */
export function importSlug(row: Pick<ImportRow, "name" | "source" | "externalId">): string {
  const base = row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || "location";
  const suffix = `${row.source}-${row.externalId}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${suffix}`.slice(0, 195);
}

export async function connect(): Promise<mysql.Connection> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env.");
    process.exit(1);
  }
  return mysql.createConnection(url);
}

/**
 * Upsert one location by (source, externalId). Returns "inserted" | "updated".
 * On UPDATE we deliberately do NOT touch isVerified / verifiedCount /
 * lastVerifiedAt so human verification survives a re-import.
 */
export async function upsertLocation(conn: mysql.Connection, row: ImportRow): Promise<"inserted" | "updated"> {
  const slug = importSlug(row);
  const [existing] = await conn.execute(
    "SELECT id FROM ship_locations WHERE source = ? AND externalId = ? LIMIT 1",
    [row.source, row.externalId],
  );
  if (Array.isArray(existing) && existing.length > 0) {
    await conn.execute(
      `UPDATE ship_locations
         SET name = ?, type = ?, lat = ?, lng = ?, sourceUrl = ?, sourceLicense = ?,
             description = ?, websiteUrl = ?, imageUrl = ?, maxRigLengthFt = ?,
             accessNotes = ?, waterQualityUrl = ?, region = ?
       WHERE source = ? AND externalId = ?`,
      [
        row.name, row.type, row.lat, row.lng, row.sourceUrl ?? null, row.sourceLicense ?? null,
        row.description ?? null, row.websiteUrl ?? null, row.imageUrl ?? null, row.maxRigLengthFt ?? null,
        row.accessNotes ?? null, row.waterQualityUrl ?? null, row.region ?? null,
        row.source, row.externalId,
      ],
    );
    return "updated";
  }
  await conn.execute(
    `INSERT INTO ship_locations
       (name, slug, type, source, sourceUrl, sourceLicense, externalId, lat, lng, bioregion, region,
        description, websiteUrl, imageUrl, maxRigLengthFt, accessNotes, waterQualityUrl, isVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'cascadia', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      row.name, slug, row.type, row.source, row.sourceUrl ?? null, row.sourceLicense ?? null, row.externalId,
      row.lat, row.lng, row.region ?? null, row.description ?? null, row.websiteUrl ?? null, row.imageUrl ?? null,
      row.maxRigLengthFt ?? null, row.accessNotes ?? null, row.waterQualityUrl ?? null, row.isVerified ? 1 : 0,
    ],
  );
  return "inserted";
}

/**
 * Batched idempotent upsert: one INSERT ... ON DUPLICATE KEY UPDATE per batch,
 * keyed on the (source, externalId) unique index. Fast for large imports (the
 * OSM run can be thousands of rows). isVerified is set only on INSERT — a
 * re-import never flips human verification (the UPDATE clause omits it).
 */
export async function bulkUpsert(conn: mysql.Connection, rows: ImportRow[], batchSize = 200): Promise<number> {
  let affected = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, 'cascadia', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())").join(", ");
    const params: unknown[] = [];
    for (const r of batch) {
      params.push(
        r.name, importSlug(r), r.type, r.source, r.sourceUrl ?? null, r.sourceLicense ?? null, r.externalId,
        r.lat, r.lng, r.region ?? null, r.description ?? null, r.websiteUrl ?? null, r.imageUrl ?? null,
        r.maxRigLengthFt ?? null, r.accessNotes ?? null, r.waterQualityUrl ?? null, r.isVerified ? 1 : 0,
      );
    }
    const sql =
      `INSERT INTO ship_locations
         (name, slug, type, source, sourceUrl, sourceLicense, externalId, lat, lng, bioregion, region,
          description, websiteUrl, imageUrl, maxRigLengthFt, accessNotes, waterQualityUrl, isVerified, createdAt, updatedAt)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), type = VALUES(type), lat = VALUES(lat), lng = VALUES(lng),
         sourceUrl = VALUES(sourceUrl), sourceLicense = VALUES(sourceLicense), description = VALUES(description),
         websiteUrl = VALUES(websiteUrl), imageUrl = VALUES(imageUrl), maxRigLengthFt = VALUES(maxRigLengthFt),
         accessNotes = VALUES(accessNotes), waterQualityUrl = VALUES(waterQualityUrl), region = VALUES(region),
         updatedAt = NOW()`;
    const [res] = await conn.query(sql, params);
    affected += (res as { affectedRows?: number }).affectedRows ?? 0;
    console.log(`  batch ${i / batchSize + 1}: ${batch.length} rows`);
  }
  return affected;
}

/** Run an importer's rows through the upsert, or print them under --dry-run. */
export async function runImport(sourceLabel: string, rows: ImportRow[]) {
  const DRY_RUN = process.argv.includes("--dry-run");
  const withinBbox = rows.filter((r) => inBbox(r.lng, r.lat));
  const dropped = rows.length - withinBbox.length;
  console.log(`[${sourceLabel}] ${withinBbox.length} rows in bbox${dropped ? `, ${dropped} dropped outside bbox` : ""}${DRY_RUN ? " (dry run)" : ""}`);
  if (DRY_RUN) {
    for (const r of withinBbox.slice(0, 25)) console.log(`  would upsert: ${r.type} "${r.name}" @ ${r.lat.toFixed(3)},${r.lng.toFixed(3)} [${r.source}/${r.externalId}]`);
    if (withinBbox.length > 25) console.log(`  ... and ${withinBbox.length - 25} more`);
    return;
  }
  const conn = await connect();
  try {
    const affected = await bulkUpsert(conn, withinBbox);
    console.log(`[${sourceLabel}] Done. ${withinBbox.length} rows upserted (${affected} insert/update row-ops).`);
  } finally {
    await conn.end();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
