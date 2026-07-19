/**
 * Seed the Ship's Inventory (the bag) — SHIP_MAINTAINER_INVENTORY Section 2.3.
 *
 * Idempotent by slug. These are the items from the vision so far; Rye adds more
 * in admin. Icons come from the locked-style pipeline
 * (scripts/generate-ship-item-icon.ts); until an icon is attached, the grid
 * shows the category glyph, so the bag is usable immediately.
 *
 * Usage:
 *   npx tsx scripts/seed-ship-inventory.ts --dry-run
 *   npx tsx scripts/seed-ship-inventory.ts
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");

type Item = {
  slug: string;
  name: string;
  category: string;
  lore: string;
  description: string;
  quantity: number;
  storagePlace: string;
  activityTags: string[];
  isGearChecked?: boolean;
  comingYear2?: boolean;
};

const ITEMS: Item[] = [
  { slug: "regenerative-walking-staff", name: "The regenerative walking staff", category: "magic", lore: "A Gandalf staff for the Renaissance: it glows softly in the dark, and the crown holds seeds, so every walk can plant a forest.", description: "A tall hardwood staff with a seed-holding crown and a soft glow for night walks. Take it on every hike; press seeds into good ground as you go.", quantity: 1, storagePlace: "By the door, in the umbrella stand", activityTags: ["forest walk", "planting", "spring run"], isGearChecked: true },
  { slug: "copper-dowsing-rods", name: "Copper dowsing rods", category: "magic", lore: "For finding water, and for asking after lost things.", description: "A pair of copper rods for dowsing springs and seeps, and for the fun of it. Hold them level and walk slow.", quantity: 2, storagePlace: "Map drawer under the dinette", activityTags: ["spring run", "forest walk"] },
  { slug: "treasure-chest-of-seeds", name: "The treasure chest of seeds", category: "magic", lore: "A literal chest of seeds, chosen for maximum collective ecosystem impact. The regenerative heart of the fleet.", description: "The seed chest: chestnuts and food-forest seeds gathered for the places you visit. The Seed Keeper guards it and logs every planting.", quantity: 1, storagePlace: "Locked bench seat, starboard", activityTags: ["planting"], isGearChecked: true },
  { slug: "starlink-dish", name: "Starlink dish", category: "connectivity", lore: "The sky's own harbor line: internet from anywhere she drops anchor.", description: "Roof-mounted Starlink for work, calls, and the treasure map anywhere she sails. Fair-use, always on.", quantity: 1, storagePlace: "Roof mount", activityTags: ["rainy day", "hosting dinner"], isGearChecked: true },
  { slug: "stand-up-paddleboard", name: "Stand-up paddleboard + PFDs", category: "adventure", lore: "Walk on water, gently.", description: "An inflatable SUP with pump, paddle, and personal flotation devices. For lakes, slow rivers, and still mornings.", quantity: 1, storagePlace: "Rear storage bay", activityTags: ["lake day"], isGearChecked: true },
  { slug: "electric-bike", name: "Electric bike + helmet", category: "adventure", lore: "Leave the ship at anchor; let the bike carry you into town.", description: "An e-bike for getting around towns and trailheads without moving the ship. Highly advisable over driving her into tight streets.", quantity: 1, storagePlace: "Rear bike rack", activityTags: ["forest walk", "lake day"], isGearChecked: true, comingYear2: true },
  { slug: "paddle-ball-set", name: "Paddle ball set", category: "adventure", lore: "A little friendly rivalry by the water.", description: "Wooden paddles and balls for the beach, a meadow, or a campsite.", quantity: 1, storagePlace: "Adventure bin, rear bay", activityTags: ["lake day"], comingYear2: true },
  { slug: "hammocks", name: "Hammocks", category: "comfort", lore: "The best seat on the ship is strung between two trees.", description: "Packable hammocks with tree-friendly straps. Find two trunks and a view.", quantity: 2, storagePlace: "Overhead cabinet, bedroom", activityTags: ["forest walk", "rainy day"] },
  { slug: "spring-water-intake-pump", name: "Spring-water intake pump + hoses", category: "water", lore: "She drinks from the land, with thanks.", description: "A pump that draws from springs up to about 50 feet away (farther with extra hose), filling her tanks with living water.", quantity: 1, storagePlace: "Wet bay, curbside", activityTags: ["spring run"], isGearChecked: true },
  { slug: "gravity-drinking-water-filter", name: "In-line drinking-water filter", category: "water", lore: "Clean water, straight from the tap.", description: "An in-line drinking-water filter on top of her whole-RV filtration.", quantity: 1, storagePlace: "Galley counter", activityTags: ["hosting dinner", "rainy day"] },
  { slug: "cast-iron-cookware", name: "Cast iron cookware set", category: "galley", lore: "Seasoned by a hundred shared meals.", description: "Cast iron skillets and a Dutch oven for real cooking, indoors or over a fire.", quantity: 1, storagePlace: "Galley drawer, lower", activityTags: ["hosting dinner"] },
  { slug: "washing-machine", name: "Full-size washing machine + drying stand", category: "comfort", lore: "A ship that keeps you in clean linens is a ship you never want to leave.", description: "A full-size washer with a fold-out drying stand. Line-dry in the sun when she is at anchor.", quantity: 1, storagePlace: "Closet, hallway", activityTags: ["rainy day"] },
  { slug: "tool-bag", name: "The tool bag", category: "tools", lore: "Every ship her age keeps her own kit close.", description: "A working tool bag for small fixes on the road. Contents to be inventoried by the captain; add what you find.", quantity: 1, storagePlace: "Rear bay, curbside", activityTags: ["repairs"], isGearChecked: true },
  { slug: "field-guides-and-games", name: "Field guides, instruments + games", category: "comfort", lore: "For the long golden evenings.", description: "Regional field guides, a small instrument or two, and board games for rainy afternoons and campfire nights.", quantity: 1, storagePlace: "Bench seat, dinette", activityTags: ["rainy day", "hosting dinner"] },
  { slug: "safety-kit", name: "First aid, fire extinguishers + detectors", category: "safety", lore: "The quiet crew that keeps everyone home safe.", description: "A stocked first aid kit, fire extinguishers, and CO and propane detectors. Know where each one lives before you sail.", quantity: 1, storagePlace: "Under the driver seat + galley", activityTags: ["repairs"], isGearChecked: true },
  { slug: "generator", name: "Generator", category: "power", lore: "Her own tireless heart, for when the sun is shy.", description: "An onboard generator plus her electrical system that together meet 100% of her energy needs. Included, fair use.", quantity: 1, storagePlace: "Generator bay, forward", activityTags: ["rainy day"], isGearChecked: true },
  { slug: "love-your-body-kit", name: "The Love Your Body kit", category: "comfort", lore: "A week aboard is a good time to be tender with the body you live in.", description: "A loving massage kit: natural oils and simple tools for tending yourselves and each other aboard.", quantity: 1, storagePlace: "Bedroom cabinet", activityTags: ["rainy day"] },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env.");
    process.exit(1);
  }
  console.log(`Seeding ${ITEMS.length} inventory items${DRY_RUN ? " (dry run)" : ""}...`);
  if (DRY_RUN) {
    for (const it of ITEMS) console.log(`  would upsert: ${it.slug} (${it.category}, x${it.quantity})`);
    return;
  }
  const conn = await mysql.createConnection(url);
  let inserted = 0;
  let updated = 0;
  try {
    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i];
      const tags = JSON.stringify(it.activityTags);
      const gear = it.isGearChecked ? 1 : 0;
      const year2 = it.comingYear2 ? 1 : 0;
      const [existing] = await conn.execute("SELECT id FROM ship_inventory_items WHERE slug = ? LIMIT 1", [it.slug]);
      if (Array.isArray(existing) && existing.length > 0) {
        await conn.execute(
          "UPDATE ship_inventory_items SET name = ?, category = ?, lore = ?, description = ?, quantity = ?, storagePlace = ?, activityTags = CAST(? AS JSON), isGearChecked = ?, comingYear2 = ?, sortOrder = ? WHERE slug = ?",
          [it.name, it.category, it.lore, it.description, it.quantity, it.storagePlace, tags, gear, year2, i + 1, it.slug],
        );
        updated++;
      } else {
        await conn.execute(
          `INSERT INTO ship_inventory_items (name, slug, category, lore, description, quantity, storagePlace, activityTags, isVisible, isGearChecked, comingYear2, sortOrder, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), 1, ?, ?, ?, NOW(), NOW())`,
          [it.name, it.slug, it.category, it.lore, it.description, it.quantity, it.storagePlace, tags, gear, year2, i + 1],
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
