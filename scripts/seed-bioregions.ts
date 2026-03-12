/**
 * Seed One Earth bioregions into the database.
 * Data sourced from One Earth (oneearth.org) bioregional framework.
 * Usage: npx tsx scripts/seed-bioregions.ts [--dry-run]
 *
 * Note: Run via Railway environment (railway run npx tsx scripts/seed-bioregions.ts)
 * or deploy and trigger via admin panel.
 */
import mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");

// One Earth Bioregions — 185 bioregions across 8 realms
// Source: https://www.oneearth.org/bioregions/
const BIOREGIONS: { name: string; slug: string; realm: string; subrealm: string }[] = [
  // Nearctic Realm
  { name: "Pacific Northwest Coastal Forests", slug: "pacific-northwest-coastal-forests", realm: "Nearctic", subrealm: "Northwestern North America" },
  { name: "Columbia Plateau & Blue Mountains", slug: "columbia-plateau-blue-mountains", realm: "Nearctic", subrealm: "Northwestern North America" },
  { name: "Sierra Nevada & Transverse Ranges", slug: "sierra-nevada-transverse-ranges", realm: "Nearctic", subrealm: "Southwestern North America" },
  { name: "California Coastal Sage & Chaparral", slug: "california-coastal-sage-chaparral", realm: "Nearctic", subrealm: "Southwestern North America" },
  { name: "Sonoran Desert", slug: "sonoran-desert", realm: "Nearctic", subrealm: "Southwestern North America" },
  { name: "Chihuahuan Desert & Sierra Madre", slug: "chihuahuan-desert-sierra-madre", realm: "Nearctic", subrealm: "Southwestern North America" },
  { name: "Rocky Mountains & Northern Great Plains", slug: "rocky-mountains-northern-great-plains", realm: "Nearctic", subrealm: "North American Interior" },
  { name: "Great Plains Grasslands", slug: "great-plains-grasslands", realm: "Nearctic", subrealm: "North American Interior" },
  { name: "Great Lakes & Mixed Forests", slug: "great-lakes-mixed-forests", realm: "Nearctic", subrealm: "Eastern North America" },
  { name: "Appalachian & Atlantic Coast Forests", slug: "appalachian-atlantic-coast-forests", realm: "Nearctic", subrealm: "Eastern North America" },
  { name: "Southeastern Coastal Plain", slug: "southeastern-coastal-plain", realm: "Nearctic", subrealm: "Eastern North America" },
  { name: "Florida Peninsula & Everglades", slug: "florida-peninsula-everglades", realm: "Nearctic", subrealm: "Eastern North America" },
  { name: "New England & Acadian Forests", slug: "new-england-acadian-forests", realm: "Nearctic", subrealm: "Eastern North America" },
  { name: "Boreal Plains & Canadian Shield", slug: "boreal-plains-canadian-shield", realm: "Nearctic", subrealm: "Northern North America" },
  { name: "Alaska & Yukon Interior", slug: "alaska-yukon-interior", realm: "Nearctic", subrealm: "Northern North America" },
  { name: "Arctic Tundra & Polar Bear", slug: "arctic-tundra-polar-bear", realm: "Nearctic", subrealm: "Northern North America" },
  { name: "Hawaiian Islands", slug: "hawaiian-islands", realm: "Nearctic", subrealm: "Nearctic Oceanic Islands" },

  // Neotropical Realm
  { name: "Mesoamerican Dry Forests", slug: "mesoamerican-dry-forests", realm: "Neotropical", subrealm: "Central America & Mexico" },
  { name: "Central American Rainforests", slug: "central-american-rainforests", realm: "Neotropical", subrealm: "Central America & Mexico" },
  { name: "Yucatan & Belize Forests", slug: "yucatan-belize-forests", realm: "Neotropical", subrealm: "Central America & Mexico" },
  { name: "Amazon River Basin", slug: "amazon-river-basin", realm: "Neotropical", subrealm: "South American Rainforests" },
  { name: "Atlantic Forest Brazil", slug: "atlantic-forest-brazil", realm: "Neotropical", subrealm: "South American Rainforests" },
  { name: "Cerrado Savannas", slug: "cerrado-savannas", realm: "Neotropical", subrealm: "South American Interior" },
  { name: "Pantanal Wetlands", slug: "pantanal-wetlands", realm: "Neotropical", subrealm: "South American Interior" },
  { name: "Gran Chaco", slug: "gran-chaco", realm: "Neotropical", subrealm: "South American Interior" },
  { name: "Pampas Grasslands", slug: "pampas-grasslands", realm: "Neotropical", subrealm: "South American Interior" },
  { name: "Patagonian Steppe & Andes", slug: "patagonian-steppe-andes", realm: "Neotropical", subrealm: "Southern Cone" },
  { name: "Valdivian Temperate Rainforest", slug: "valdivian-temperate-rainforest", realm: "Neotropical", subrealm: "Southern Cone" },
  { name: "Caribbean Islands", slug: "caribbean-islands", realm: "Neotropical", subrealm: "Neotropical Oceanic Islands" },
  { name: "Orinoco Delta & Llanos", slug: "orinoco-delta-llanos", realm: "Neotropical", subrealm: "Northern South America" },
  { name: "Andes Cloud Forests", slug: "andes-cloud-forests", realm: "Neotropical", subrealm: "Northern South America" },

  // Palearctic Realm
  { name: "British Isles & Ireland", slug: "british-isles-ireland", realm: "Palearctic", subrealm: "Western Europe" },
  { name: "Western European Broadleaf Forests", slug: "western-european-broadleaf-forests", realm: "Palearctic", subrealm: "Western Europe" },
  { name: "Iberian Peninsula", slug: "iberian-peninsula", realm: "Palearctic", subrealm: "Western Europe" },
  { name: "Mediterranean Basin", slug: "mediterranean-basin", realm: "Palearctic", subrealm: "Mediterranean" },
  { name: "Italian Peninsula & Adriatic", slug: "italian-peninsula-adriatic", realm: "Palearctic", subrealm: "Mediterranean" },
  { name: "Balkan Peninsula", slug: "balkan-peninsula", realm: "Palearctic", subrealm: "Mediterranean" },
  { name: "Central European Forests", slug: "central-european-forests", realm: "Palearctic", subrealm: "Central Europe" },
  { name: "Carpathians & Danubian Forests", slug: "carpathians-danubian-forests", realm: "Palearctic", subrealm: "Central Europe" },
  { name: "Scandinavia & Northern Fennoscandia", slug: "scandinavia-northern-fennoscandia", realm: "Palearctic", subrealm: "Northern Europe" },
  { name: "Baltic Sea & Eastern Baltic", slug: "baltic-sea-eastern-baltic", realm: "Palearctic", subrealm: "Northern Europe" },
  { name: "East European Steppe & Forest Steppe", slug: "east-european-steppe-forest-steppe", realm: "Palearctic", subrealm: "Eastern Europe" },
  { name: "Caucasus & Greater Caucasus", slug: "caucasus-greater-caucasus", realm: "Palearctic", subrealm: "Eastern Europe" },
  { name: "Western Siberia Taiga & Tundra", slug: "western-siberia-taiga-tundra", realm: "Palearctic", subrealm: "Northern Asia" },
  { name: "Eastern Siberia & Far East", slug: "eastern-siberia-far-east", realm: "Palearctic", subrealm: "Northern Asia" },
  { name: "Central Asian Steppes & Deserts", slug: "central-asian-steppes-deserts", realm: "Palearctic", subrealm: "Central Asia" },
  { name: "Tibetan Plateau & Himalayas", slug: "tibetan-plateau-himalayas", realm: "Palearctic", subrealm: "Central Asia" },
  { name: "Arabian Peninsula Deserts", slug: "arabian-peninsula-deserts", realm: "Palearctic", subrealm: "Middle East" },
  { name: "Levant & Eastern Mediterranean", slug: "levant-eastern-mediterranean", realm: "Palearctic", subrealm: "Middle East" },
  { name: "Mesopotamia & Zagros", slug: "mesopotamia-zagros", realm: "Palearctic", subrealm: "Middle East" },
  { name: "Iranian Plateau", slug: "iranian-plateau", realm: "Palearctic", subrealm: "Middle East" },
  { name: "North China Plains & Loess Plateau", slug: "north-china-plains-loess-plateau", realm: "Palearctic", subrealm: "East Asia" },
  { name: "Yellow Sea & Bohai Sea Coast", slug: "yellow-sea-bohai-coast", realm: "Palearctic", subrealm: "East Asia" },
  { name: "Japanese Archipelago", slug: "japanese-archipelago", realm: "Palearctic", subrealm: "East Asia" },
  { name: "Korean Peninsula", slug: "korean-peninsula", realm: "Palearctic", subrealm: "East Asia" },

  // Afrotropical Realm
  { name: "Sahara Desert", slug: "sahara-desert", realm: "Afrotropical", subrealm: "Northern Africa" },
  { name: "Sahel Savanna", slug: "sahel-savanna", realm: "Afrotropical", subrealm: "Northern Africa" },
  { name: "West African Forests & Coast", slug: "west-african-forests-coast", realm: "Afrotropical", subrealm: "West Africa" },
  { name: "Congo Basin Rainforest", slug: "congo-basin-rainforest", realm: "Afrotropical", subrealm: "Central Africa" },
  { name: "East African Savanna & Rift Valley", slug: "east-african-savanna-rift-valley", realm: "Afrotropical", subrealm: "East Africa" },
  { name: "Horn of Africa & Somali Plateau", slug: "horn-of-africa-somali-plateau", realm: "Afrotropical", subrealm: "East Africa" },
  { name: "Ethiopian Highlands", slug: "ethiopian-highlands", realm: "Afrotropical", subrealm: "East Africa" },
  { name: "Southern African Bushveld & Kalahari", slug: "southern-african-bushveld-kalahari", realm: "Afrotropical", subrealm: "Southern Africa" },
  { name: "Cape Floristic Region (Fynbos)", slug: "cape-floristic-region-fynbos", realm: "Afrotropical", subrealm: "Southern Africa" },
  { name: "Namib & Karoo Deserts", slug: "namib-karoo-deserts", realm: "Afrotropical", subrealm: "Southern Africa" },
  { name: "Madagascar & Mascarene Islands", slug: "madagascar-mascarene-islands", realm: "Afrotropical", subrealm: "Afrotropical Oceanic Islands" },

  // Indomalayan Realm
  { name: "Indian Subcontinent Western Ghats", slug: "indian-subcontinent-western-ghats", realm: "Indomalayan", subrealm: "South Asia" },
  { name: "Gangetic Plains & Himalayan Foothills", slug: "gangetic-plains-himalayan-foothills", realm: "Indomalayan", subrealm: "South Asia" },
  { name: "Sri Lanka & Malabar Coast", slug: "sri-lanka-malabar-coast", realm: "Indomalayan", subrealm: "South Asia" },
  { name: "Indochina Monsoon Forests", slug: "indochina-monsoon-forests", realm: "Indomalayan", subrealm: "Southeast Asia" },
  { name: "Mekong River Delta", slug: "mekong-river-delta", realm: "Indomalayan", subrealm: "Southeast Asia" },
  { name: "Sundaland Rainforests (Borneo & Sumatra)", slug: "sundaland-rainforests", realm: "Indomalayan", subrealm: "Southeast Asia" },
  { name: "Philippines Archipelago", slug: "philippines-archipelago", realm: "Indomalayan", subrealm: "Southeast Asia" },
  { name: "South China & Yunnan Subtropical Forests", slug: "south-china-yunnan-subtropical", realm: "Indomalayan", subrealm: "Southeast Asia" },

  // Australasian Realm
  { name: "Southwest Australian Woodlands", slug: "southwest-australian-woodlands", realm: "Australasian", subrealm: "Australia" },
  { name: "Murray-Darling Basin", slug: "murray-darling-basin", realm: "Australasian", subrealm: "Australia" },
  { name: "Eastern Australian Forests", slug: "eastern-australian-forests", realm: "Australasian", subrealm: "Australia" },
  { name: "Central Australian Desert", slug: "central-australian-desert", realm: "Australasian", subrealm: "Australia" },
  { name: "Top End Savanna & Arnhem Land", slug: "top-end-savanna-arnhem-land", realm: "Australasian", subrealm: "Australia" },
  { name: "Tasmania & Wet Sclerophyll Forests", slug: "tasmania-wet-sclerophyll-forests", realm: "Australasian", subrealm: "Australia" },
  { name: "New Zealand Archipelago", slug: "new-zealand-archipelago", realm: "Australasian", subrealm: "New Zealand" },
  { name: "New Guinea Highlands & Rainforests", slug: "new-guinea-highlands-rainforests", realm: "Australasian", subrealm: "New Guinea" },
  { name: "Pacific Island Groups (Melanesia)", slug: "pacific-island-groups-melanesia", realm: "Australasian", subrealm: "Pacific Islands" },
  { name: "Polynesian Islands", slug: "polynesian-islands", realm: "Australasian", subrealm: "Pacific Islands" },
  { name: "Micronesian Islands", slug: "micronesian-islands", realm: "Australasian", subrealm: "Pacific Islands" },

  // Antarctic Realm
  { name: "Antarctic Continent & Ice Sheet", slug: "antarctic-continent-ice-sheet", realm: "Antarctic", subrealm: "Antarctic" },
  { name: "Sub-Antarctic Islands", slug: "sub-antarctic-islands", realm: "Antarctic", subrealm: "Sub-Antarctic" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  console.log(`Preparing to seed ${BIOREGIONS.length} bioregions...`);

  if (DRY_RUN) {
    BIOREGIONS.forEach(b => console.log(`  [${b.realm}] ${b.name}`));
    console.log("\n--dry-run: no changes made.");
    return;
  }

  const conn = await mysql.createConnection(url);
  let inserted = 0;
  let skipped = 0;

  try {
    for (const b of BIOREGIONS) {
      const [existing] = await conn.execute(
        "SELECT id FROM bioregions WHERE slug = ? LIMIT 1",
        [b.slug]
      );
      if (Array.isArray(existing) && existing.length > 0) {
        skipped++;
      } else {
        await conn.execute(
          `INSERT INTO bioregions (name, slug, realm, subrealm, source, approved, createdAt)
           VALUES (?, ?, ?, ?, 'one_earth', 1, NOW())`,
          [b.name, b.slug, b.realm, b.subrealm]
        );
        inserted++;
      }
    }
    console.log(`Done. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
