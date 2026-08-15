/**
 * Seed the treasure-map pins the suggested-voyage routes sail through
 * (The Three Chakras, The Springs for Two, the honeymoon and lunar routes).
 *
 * Idempotent: upserts by slug (same pattern as seed-ship-locations.ts). All
 * pins here are public landmarks, so they seed VERIFIED and the First Mate can
 * chart them by id. Two pre-existing pins are flipped to verified on purpose
 * because the routes depend on them and both are public now: the Sanctuary
 * (her published docking home, see /ship/theme) and Umpqua Hot Springs (a
 * well-known public site). Rye refines pins in production.
 *
 * Usage:
 *   npx tsx scripts/seed-ship-route-pins.ts --dry-run
 *   npx tsx scripts/seed-ship-route-pins.ts
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");

type Loc = {
  name: string;
  slug: string;
  type: string;
  lat: number;
  lng: number;
  description?: string;
};

// New pins for the routes. All public landmarks, seeded verified.
const LOCATIONS: Loc[] = [
  {
    name: "Ashland Tuesday Farmers Market",
    slug: "ashland-tuesday-farmers-market",
    type: "event_venue",
    lat: 42.1944,
    lng: -122.687,
    description: "The Rogue Valley growers market, Tuesday mornings in Ashland. Fill the galley with organic produce for the whole voyage.",
  },
  {
    name: "Mount Ashland Meadows",
    slug: "mount-ashland-meadows",
    type: "geology",
    lat: 42.0808,
    lng: -122.7156,
    description: "Ridge meadows high on Mount Ashland, the heart center of the Three Chakras route. Wildflowers in summer, long views over the valley.",
  },
  {
    name: "Jackson WellSprings",
    slug: "jackson-wellsprings-ashland",
    type: "spring",
    lat: 42.2196,
    lng: -122.7365,
    description: "Warm mineral pools and a sauna just north of Ashland. The soak that closes the heart day.",
  },
  {
    name: "Mount Shasta Headwaters Spring",
    slug: "mount-shasta-headwaters-spring",
    type: "spring",
    lat: 41.3287,
    lng: -122.3174,
    description: "The cold headwaters spring at Mount Shasta City Park. Drink from the root of the mountain and fill your bottles for the voyage.",
  },
  {
    name: "Lake Siskiyou",
    slug: "lake-siskiyou",
    type: "lake",
    lat: 41.305,
    lng: -122.351,
    description: "Calm flatwater under Mount Shasta. The root route's optional paddleboard morning.",
  },
  {
    name: "Rogue Gorge at Union Creek",
    slug: "rogue-gorge-union-creek",
    type: "geology",
    lat: 42.9067,
    lng: -122.45,
    description: "The young Rogue thundering through a narrow lava slot, ringed by old forest.",
  },
  {
    name: "Natural Bridge of the Rogue",
    slug: "natural-bridge-rogue",
    type: "geology",
    lat: 42.889,
    lng: -122.465,
    description: "The Rogue disappears into a lava tube and rises again downstream.",
  },
  {
    name: "Lightning Spring, Crater Lake",
    slug: "lightning-spring-crater-lake",
    type: "spring",
    lat: 42.928,
    lng: -122.168,
    description: "A cold spring below the west rim of Crater Lake. The crown water the routes gather: some to drink, some to carry home. Filter to your comfort.",
  },
  {
    name: "Lemolo Lake",
    slug: "lemolo-lake",
    type: "lake",
    lat: 43.31,
    lng: -122.205,
    description: "A quiet forest reservoir on the North Umpqua, north of Crater Lake. Calm paddleboard water without the crowds.",
  },
  {
    name: "Lost Creek Lake",
    slug: "lost-creek-lake",
    type: "lake",
    lat: 42.672,
    lng: -122.67,
    description: "Ten miles of paddle-friendly water on the Rogue with a big launch beach at Joseph H. Stewart park.",
  },
  {
    name: "Watson Falls",
    slug: "watson-falls",
    type: "waterfall",
    lat: 43.243,
    lng: -122.388,
    description: "One of southern Oregon's tallest plunges, a short walk from Toketee.",
  },
];

// Existing pins the routes depend on that were seeded unverified and are
// public now. Flipped verified so the First Mate can chart them.
const VERIFY_SLUGS = ["the-sanctuary-tao-hermitage", "umpqua-hot-springs"];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env.");
    process.exit(1);
  }
  console.log(`Seeding ${LOCATIONS.length} route pins${DRY_RUN ? " (dry run)" : ""}...`);
  if (DRY_RUN) {
    for (const l of LOCATIONS) console.log(`  would upsert: ${l.slug} (${l.type}, verified=1)`);
    for (const s of VERIFY_SLUGS) console.log(`  would verify: ${s}`);
    return;
  }
  const conn = await mysql.createConnection(url);
  let inserted = 0;
  let updated = 0;
  let verified = 0;
  try {
    for (const l of LOCATIONS) {
      const [existing] = await conn.execute("SELECT id FROM ship_locations WHERE slug = ? LIMIT 1", [l.slug]);
      if (Array.isArray(existing) && existing.length > 0) {
        // Refresh coordinates + description only; never flip a human verification here.
        await conn.execute(
          "UPDATE ship_locations SET name = ?, type = ?, lat = ?, lng = ?, description = ? WHERE slug = ?",
          [l.name, l.type, l.lat, l.lng, l.description ?? null, l.slug],
        );
        updated++;
      } else {
        await conn.execute(
          `INSERT INTO ship_locations (name, slug, type, lat, lng, bioregion, description, isVerified, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, 'cascadia', ?, 1, NOW(), NOW())`,
          [l.name, l.slug, l.type, l.lat, l.lng, l.description ?? null],
        );
        inserted++;
      }
    }
    for (const slug of VERIFY_SLUGS) {
      const [res] = await conn.execute(
        "UPDATE ship_locations SET isVerified = 1, lastVerifiedAt = NOW() WHERE slug = ? AND isVerified = 0",
        [slug],
      );
      const changed = (res as { affectedRows?: number }).affectedRows ?? 0;
      if (changed > 0) {
        verified++;
        console.log(`  verified: ${slug}`);
      }
    }
    console.log(`Done. Inserted: ${inserted}, Updated: ${updated}, Newly verified: ${verified}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
