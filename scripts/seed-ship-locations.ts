/**
 * Seed starter treasure-map locations for the ReGen Ship (Cascadia).
 *
 * Idempotent: upserts by slug, so re-running only fills gaps. Well-known public
 * natural landmarks are seeded verified so the launch map has pins. Springs,
 * boondocks, seed sites, land projects, and the anchorage are seeded UNVERIFIED
 * pending Rye's review (some are sensitive or private).
 *
 * Usage:
 *   npx tsx scripts/seed-ship-locations.ts --dry-run
 *   npx tsx scripts/seed-ship-locations.ts
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
  websiteUrl?: string;
  verified?: boolean;
};

const LOCATIONS: Loc[] = [
  // The anchorage (name only, no website, unverified)
  { name: "The Sanctuary / Tao Hermitage", slug: "the-sanctuary-tao-hermitage", type: "land_project", lat: 42.1946, lng: -122.7095, description: "Home anchorage of the ReGen Ship. The healing hole lives here. Ashland, Oregon.", verified: false },

  // Waterfalls (public landmarks, verified)
  { name: "Multnomah Falls", slug: "multnomah-falls", type: "waterfall", lat: 45.5762, lng: -122.1158, description: "The tallest waterfall in Oregon, in the Columbia River Gorge.", verified: true },
  { name: "Silver Falls, South Falls", slug: "silver-falls-south-falls", type: "waterfall", lat: 44.8783, lng: -122.6560, description: "The Trail of Ten Falls winds behind roaring curtains of water.", verified: true },
  { name: "Proxy Falls", slug: "proxy-falls", type: "waterfall", lat: 44.1626, lng: -121.9260, description: "A mossy veil in the McKenzie country of the central Cascades.", verified: true },
  { name: "Toketee Falls", slug: "toketee-falls", type: "waterfall", lat: 43.2843, lng: -122.4230, description: "Columnar basalt framing a two-tier plunge on the North Umpqua.", verified: true },
  { name: "Salt Creek Falls", slug: "salt-creek-falls", type: "waterfall", lat: 43.6110, lng: -122.1310, description: "One of Oregon's tallest single-drop falls, near Willamette Pass.", verified: true },

  // Lakes (verified)
  { name: "Crater Lake", slug: "crater-lake", type: "lake", lat: 42.9446, lng: -122.1090, description: "The deepest lake in the United States, held in a sleeping volcano.", verified: true },
  { name: "Waldo Lake", slug: "waldo-lake", type: "lake", lat: 43.7043, lng: -122.0300, description: "Among the purest large lakes on earth, high in the Cascades.", verified: true },
  { name: "Diamond Lake", slug: "diamond-lake", type: "lake", lat: 43.1637, lng: -122.1430, description: "A calm alpine lake beneath Mount Thielsen and Mount Bailey.", verified: true },

  // Forests (verified)
  { name: "Opal Creek Ancient Forest", slug: "opal-creek-ancient-forest", type: "forest", lat: 44.8580, lng: -122.2640, description: "Old-growth cathedral of Douglas fir and clear green pools.", verified: true },
  { name: "H.J. Andrews Experimental Forest", slug: "hj-andrews-experimental-forest", type: "forest", lat: 44.2300, lng: -122.2560, description: "A living laboratory of Pacific Northwest old growth.", verified: true },
  { name: "Redwood Nature Trail, Oregon", slug: "redwood-nature-trail-oregon", type: "forest", lat: 42.1030, lng: -124.1200, description: "The northernmost coast redwoods, near the Chetco River.", verified: true },

  // Geology (verified)
  { name: "Smith Rock", slug: "smith-rock", type: "geology", lat: 44.3663, lng: -121.1387, description: "Towers of welded tuff above the Crooked River.", verified: true },
  { name: "Lava Lands, Newberry", slug: "lava-lands-newberry", type: "geology", lat: 43.9130, lng: -121.3550, description: "Cinder cones and lava flows of the Newberry Volcano.", verified: true },

  // Springs (unverified, some sensitive)
  { name: "Terwilliger (Cougar) Hot Springs", slug: "terwilliger-cougar-hot-springs", type: "spring", lat: 44.0800, lng: -122.2400, description: "Terraced pools in the forest above Cougar Reservoir.", verified: false },
  { name: "Umpqua Hot Springs", slug: "umpqua-hot-springs", type: "spring", lat: 43.2950, lng: -122.3660, description: "Travertine pools on a bluff above the North Umpqua.", verified: false },
  { name: "Bagby Hot Springs", slug: "bagby-hot-springs", type: "spring", lat: 44.9370, lng: -122.1730, description: "Hand-hewn cedar tubs deep in the Mount Hood forest.", verified: false },
  { name: "Bigelow Hot Springs", slug: "bigelow-hot-springs", type: "spring", lat: 44.1780, lng: -122.1230, description: "A small riverside grotto on the McKenzie.", verified: false },
  { name: "Wall Creek (Meditation Pool)", slug: "wall-creek-meditation-pool", type: "spring", lat: 43.8580, lng: -122.4300, description: "A gentle warm pool near Oakridge.", verified: false },

  // Food forests + seed sites (unverified)
  { name: "Ashland Food Forest Planting", slug: "ashland-food-forest-planting", type: "food_forest", lat: 42.1900, lng: -122.7050, description: "A community food forest site near the anchorage.", verified: false },
  { name: "Eugene Food Forest", slug: "eugene-food-forest", type: "food_forest", lat: 44.0520, lng: -123.0870, description: "An urban food forest in the southern Willamette Valley.", verified: false },
  { name: "Pine Plantation Conversion, Southern Oregon", slug: "pine-plantation-conversion-southern-oregon", type: "seed_site", lat: 42.4000, lng: -122.8000, description: "A monoculture pine stand being returned to food forest.", verified: false },
  { name: "Chestnut Restoration Grove", slug: "chestnut-restoration-grove", type: "seed_site", lat: 43.2000, lng: -123.3000, description: "Where the chestnut abundance begins again.", verified: false },

  // Boondocks (unverified)
  { name: "Hosmer Lake Boondock", slug: "hosmer-lake-boondock", type: "boondock", lat: 43.9660, lng: -121.7860, description: "Quiet dispersed camping in the Cascade Lakes.", verified: false },
  { name: "Ochoco National Forest Dispersed", slug: "ochoco-national-forest-dispersed", type: "boondock", lat: 44.4000, lng: -120.4000, description: "High and dry dispersed sites east of the mountains.", verified: false },
  { name: "Alvord Desert", slug: "alvord-desert", type: "boondock", lat: 42.5100, lng: -118.5500, description: "A vast playa under the Steens, far from any light.", verified: false },

  // Land projects (unverified, placeholders from the movement)
  { name: "Siskiyou Land Project", slug: "siskiyou-land-project", type: "land_project", lat: 42.0800, lng: -123.0000, description: "A regenerative land project in the Siskiyou country.", verified: false },
  { name: "Willamette Valley Steward Farm", slug: "willamette-valley-steward-farm", type: "land_project", lat: 44.5000, lng: -123.2000, description: "A steward farm in the heart of the valley.", verified: false },
  { name: "Columbia Gorge Regen Site", slug: "columbia-gorge-regen-site", type: "land_project", lat: 45.7000, lng: -121.5000, description: "Regeneration work along the Columbia.", verified: false },

  // Event venue (unverified)
  { name: "The Regatta Grounds", slug: "the-regatta-grounds", type: "event_venue", lat: 42.1900, lng: -122.7100, description: "Where the fleet will one day converge for the annual Regatta.", verified: false },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env.");
    process.exit(1);
  }
  console.log(`Seeding ${LOCATIONS.length} ship locations${DRY_RUN ? " (dry run)" : ""}...`);
  if (DRY_RUN) {
    for (const l of LOCATIONS) console.log(`  would upsert: ${l.slug} (${l.type}, verified=${l.verified ? 1 : 0})`);
    return;
  }
  const conn = await mysql.createConnection(url);
  let inserted = 0;
  let updated = 0;
  try {
    for (const l of LOCATIONS) {
      const [existing] = await conn.execute("SELECT id FROM ship_locations WHERE slug = ? LIMIT 1", [l.slug]);
      if (Array.isArray(existing) && existing.length > 0) {
        // Only refresh coordinates + description; never flip a human verification.
        await conn.execute(
          "UPDATE ship_locations SET name = ?, type = ?, lat = ?, lng = ?, description = ?, websiteUrl = ? WHERE slug = ?",
          [l.name, l.type, l.lat, l.lng, l.description ?? null, l.websiteUrl ?? null, l.slug],
        );
        updated++;
      } else {
        await conn.execute(
          `INSERT INTO ship_locations (name, slug, type, lat, lng, bioregion, description, websiteUrl, isVerified, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, 'cascadia', ?, ?, ?, NOW(), NOW())`,
          [l.name, l.slug, l.type, l.lat, l.lng, l.description ?? null, l.websiteUrl ?? null, l.verified ? 1 : 0],
        );
        inserted++;
      }
    }
    console.log(`Done. Inserted: ${inserted}, Updated: ${updated}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
