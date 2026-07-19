/**
 * seed-ship-inventory-manifest.ts
 *
 * Merge the 118-item physical RV manifest (data/rv_inventory.json) INTO the
 * gamified bag table `ship_inventory_items` as a NESTED TREE. This supersedes
 * the old standalone `ship_inventory` table + shipManifest router (retired).
 *
 * What it does (idempotent — safe to re-run; keyed on `slug`):
 *   1. Upserts curator-added CONTAINER hero cards (provenance='curator_added',
 *      isContainer=true) so the /ship overview reaches ~20–30 top-level cards.
 *   2. Upserts the 118 transcribed manifest items (provenance='transcribed')
 *      with their manifest fields (zone/unit/itemCondition/confidence/
 *      sourceVideo/sourceTimestamp/manifestCategory), mapping manifestCategory
 *      -> the 9-value `category` enum for a glyph fallback.
 *   3. Parents each transcribed item under a container via zone/location rules
 *      (ordered keyword engine). Genuinely ambiguous items are left parentId
 *      NULL + isVisible=false and printed in the review list for admin curation.
 *   4. Merges the real kit into existing CURATED cards with no duplicates:
 *        - `tool-bag`                 -> parent of the Indoor + Outdoor tool bags
 *        - `stand-up-paddleboard`     -> parent of the boards + Rye-supplied kit
 *                                        (2 paddles, pump, ankle leashes, fins)
 *        - `spring-water-intake-pump` / in-line filter -> parent of the spares
 *        - `starlink-dish`, `hammocks` -> enriched from their manifest twins
 *          (twin row is skipped, not duplicated)
 *
 * Reconciliation note: the plan lists 9 containers to promote to top-level AND
 * says "make tool-bag the parent of the tool bags". Both are honored by nesting
 * the Indoor/Outdoor tool bags under the curated `tool-bag` card, so the two of
 * them are NOT top-level (7 new top-level containers + 17 curated = 24 cards).
 *
 * Usage:
 *   npx tsx scripts/seed-ship-inventory-manifest.ts             # upsert + build tree
 *   npx tsx scripts/seed-ship-inventory-manifest.ts --dry-run   # plan only, no DB, no writes
 *   npx tsx scripts/seed-ship-inventory-manifest.ts --reset     # drop seeded rows first, then upsert
 *
 * Requires DATABASE_URL in the environment (.env) for the real run. For local
 * runs against Railway use the public proxy URL, not mysql.railway.internal.
 * (--dry-run needs no DB.)
 */
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const isDryRun = process.argv.includes("--dry-run");
const isReset = process.argv.includes("--reset");

// ── Types ─────────────────────────────────────────────────────────────────────
interface RawItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  zone: string;
  location: string;
  condition: string;
  notes: string;
  source_video: string;
  timestamp: string;
  confidence: string;
}

type EnumCategory =
  | "adventure" | "galley" | "water" | "power" | "connectivity"
  | "tools" | "magic" | "comfort" | "safety";

type Provenance = "curated" | "transcribed" | "curator_added";

interface Row {
  slug: string;
  name: string;
  category: EnumCategory;
  quantity: number;
  unit: string | null;
  storagePlace: string | null;
  description: string | null;
  lore: string | null;
  isVisible: boolean;
  isContainer: boolean;
  provenance: Provenance;
  zone: string | null;
  itemCondition: string | null;
  confidence: string | null;
  sourceVideo: string | null;
  sourceTimestamp: string | null;
  manifestCategory: string | null;
  sortOrder: number;
  /** Slug of the parent row, or null for top-level / review. Resolved to an id in pass B. */
  parentSlug: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// House-style slugify (scripts/seed-organisations.ts).
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// manifestCategory -> the 9-value `category` enum (glyph fallback only; the real
// taxonomy is preserved verbatim in manifestCategory).
const CATEGORY_MAP: Record<string, EnumCategory> = {
  "Electronics": "connectivity",
  "Outdoor/Camping": "adventure",
  "Electrical/Power": "power",
  "Plumbing/Water": "water",
  "Tools": "tools",
  "Bedding/Linens": "comfort",
  "Clothing": "comfort",
  "Safety/Emergency": "safety",
  "Seeds/Garden": "magic",
  "Cleaning/Household": "comfort",
  "Misc": "tools",
  "Personal": "comfort",
};
function toEnumCategory(manifestCategory: string): EnumCategory {
  return CATEGORY_MAP[manifestCategory] ?? "comfort";
}

// The 17 curated bag slugs (seed-ship-inventory.ts) — reserved so a transcribed
// slug can never collide with / overwrite a curated card.
const CURATED_SLUGS = [
  "regenerative-walking-staff", "copper-dowsing-rods", "treasure-chest-of-seeds",
  "starlink-dish", "stand-up-paddleboard", "electric-bike", "paddle-ball-set",
  "hammocks", "spring-water-intake-pump", "gravity-drinking-water-filter",
  "cast-iron-cookware", "washing-machine", "tool-bag", "field-guides-and-games",
  "safety-kit", "generator", "love-your-body-kit",
];

// Curated cards we promote to containers (they gain children below).
const CURATED_CONTAINERS = [
  "tool-bag", "stand-up-paddleboard", "spring-water-intake-pump", "gravity-drinking-water-filter",
];

// ── Container hero cards (curator_added) ──────────────────────────────────────
interface ContainerDef {
  slug: string; name: string; category: EnumCategory; parentSlug: string | null;
  sortOrder: number; storagePlace: string; description: string;
}
const CONTAINERS: ContainerDef[] = [
  { slug: "indoor-tool-bag", name: "Indoor tool bag", category: "tools", parentSlug: "tool-bag", sortOrder: 1,
    storagePlace: "Inside the RV, upper cupboards + main galley",
    description: "The kit she keeps within reach: screwdrivers, glues, tapes, measuring tools, and small fixings for quick jobs indoors." },
  { slug: "outdoor-tool-bag", name: "Outdoor tool bag", category: "tools", parentSlug: "tool-bag", sortOrder: 2,
    storagePlace: "Tool section, passenger side",
    description: "The heavier field kit: saw, sealants, multimeter, clamps, and the tools that live in the passenger-side tool section." },
  { slug: "exterior-bottom-cupboard", name: "Exterior bottom cupboard", category: "tools", parentSlug: null, sortOrder: 18,
    storagePlace: "Last exterior door, bottom cupboard",
    description: "The catch-all bottom cupboard behind the last exterior door: spare parts, lubricants, cutters, and odds and ends." },
  { slug: "power-system", name: "Power system", category: "power", parentSlug: null, sortOrder: 19,
    storagePlace: "Main power setup + electrical box",
    description: "Her off-grid heart: house batteries, solar panels and controllers, the inverter/charger, and the shore-power gear." },
  { slug: "water-sewer-kit", name: "Water & sewer kit", category: "water", parentSlug: null, sortOrder: 20,
    storagePlace: "Water & sewer section, exterior bays",
    description: "Everything for taking on clean water and sending grey/black water away: hoses, filters, fittings, and the dump gear." },
  { slug: "sealants-adhesives-tape-kit", name: "Sealants, adhesives & tape kit", category: "tools", parentSlug: null, sortOrder: 21,
    storagePlace: "Exterior bays",
    description: "The sticking-things-together drawer: tapes of every kind, silicones and sealants, glues, epoxies, and weather stripping." },
  { slug: "screw-fastener-box", name: "Screw & fastener box", category: "tools", parentSlug: null, sortOrder: 22,
    storagePlace: "Rear tool section",
    description: "A sorted box of screws, washers, and fasteners of many sizes, plus a bag of spare screws and drill tips." },
  { slug: "long-term-storage-bay", name: "Long-term storage bay", category: "tools", parentSlug: null, sortOrder: 23,
    storagePlace: "Long-term storage bay",
    description: "The bay for things kept but rarely needed: heavy-duty tapes and the waterproof roof & awning tarps." },
  { slug: "exterior-storage-bays", name: "Exterior storage bays", category: "adventure", parentSlug: null, sortOrder: 24,
    storagePlace: "Exterior storage bays / containers",
    description: "The big exterior containers: adventure gear, tarps, buckets, tie-downs, the TVs, and bulk outdoor kit." },
];

// SUP accessories (curator_added) nested under the curated stand-up-paddleboard.
// Rye-supplied: two paddles, the boards (inv-005, parented separately), pump,
// ankle leashes, and three fins per board.
interface AccessoryDef { slug: string; name: string; quantity: number; unit: string; description: string; sortOrder: number; }
const SUP_ACCESSORIES: AccessoryDef[] = [
  { slug: "sup-paddles", name: "SUP paddles", quantity: 2, unit: "each", sortOrder: 2, description: "Two adjustable paddles for the paddleboards." },
  { slug: "sup-pump", name: "SUP pump", quantity: 1, unit: "each", sortOrder: 3, description: "The hand pump that inflates the boards." },
  { slug: "sup-ankle-leashes", name: "SUP ankle leashes", quantity: 2, unit: "each", sortOrder: 4, description: "Coiled ankle leashes so a board never drifts off without you." },
  { slug: "sup-fins", name: "SUP fins", quantity: 6, unit: "each", sortOrder: 5, description: "Removable tracking fins — three per board." },
];

// ── Explicit per-item rules (override the heuristic engine) ───────────────────
// Enrich the curated card from its manifest twin; the twin row is NOT created.
const MERGE_INTO: Record<string, string> = {
  "inv-001": "starlink-dish",
  "inv-025": "hammocks",
};
// Force a parent (curated slug, container slug, or "@inv-NNN" = another manifest row).
const PARENT_OVERRIDE: Record<string, string> = {
  "inv-005": "stand-up-paddleboard",          // the boards
  "inv-030": "gravity-drinking-water-filter", // spare in-line filter
  "inv-036": "spring-water-intake-pump",      // spare (leaky) water pump
  "inv-114": "spring-water-intake-pump",      // backup pump
  "inv-083": "screw-fastener-box",            // the screw box
  "inv-094": "screw-fastener-box",            // bag of extra screws & drill tips
  "inv-038": "@inv-037", "inv-039": "@inv-037", "inv-040": "@inv-037", "inv-041": "@inv-037", // mystery-box contents
  "inv-023": "@inv-024",                      // air-mattress pump -> under the air mattress (Rye)
  "inv-029": "outdoor-tool-bag",              // rubber boots -> passenger-side rear container, with the tools (Rye)
  "inv-032": "outdoor-tool-bag",              // sanitary gloves -> kept in the tool bags (Rye)
};
// Manifest rows that are themselves containers.
const ITEM_CONTAINERS = new Set(["inv-037", "inv-024"]); // mystery box + the air mattress (holds its pump)
// Owner-private / do-not-show rows: created but isVisible=false, no parent.
const HIDE_IDS = new Set(["inv-116"]);
// Intentionally top-level + visible even with no parent (curated placement, not "review").
const TOP_LEVEL_VISIBLE = new Set(["inv-024"]); // the air mattress (a hero card holding its pump)
// Rye-supplied storage places for items the transcript left vague.
const STORAGE_OVERRIDE: Record<string, string> = {
  "inv-024": "Main cabin, under the couch",
  "inv-023": "Cupboard above the bed",
  "inv-029": "Passenger-side rear exterior container, with the tool bag",
  "inv-032": "Kept in the tool bags",
};

// Ordered keyword engine: first match wins. Returns a parent slug or null (review).
function resolveParentSlug(item: RawItem): string | null {
  const loc = (item.location || "").toLowerCase();
  const name = item.name.toLowerCase();
  const cat = item.category;
  const zone = item.zone;
  const sealantKw = /(tape|sealant|silicone|glue|adhesive|putty|epoxy|caulk|weld|weather strip|weatherproof|liquid nails)/;

  if (loc.includes("indoor tool bag") || loc.includes("indoor kit")) return "indoor-tool-bag";
  if (loc.includes("outdoor tool bag")) return "outdoor-tool-bag";
  if (loc.includes("long-term storage")) return "long-term-storage-bay";
  if (loc.includes("water section") || loc.includes("water filtration")) return "water-sewer-kit";
  if (loc.includes("main power setup") || loc.includes("power setup") || loc.includes("electrical box")) return "power-system";
  if (sealantKw.test(name)) return "sealants-adhesives-tape-kit";
  if (cat === "Plumbing/Water") return "water-sewer-kit";
  if (cat === "Electrical/Power") return "power-system";
  if (
    loc.includes("exterior container") || loc.includes("exterior bay") ||
    loc.includes("rear exterior") || loc.includes("first exterior") ||
    loc.includes("propane") || loc.includes("roof")
  ) return "exterior-storage-bays";
  if (cat === "Outdoor/Camping") return "exterior-storage-bays";
  if (zone === "Living/Salon" || zone === "Bathroom") return null; // review — belongs inside the RV, not a bay
  if (cat === "Tools" || cat === "Misc" || cat === "Cleaning/Household") return "exterior-bottom-cupboard";
  return null; // review (Clothing / Safety / Personal / Electronics / Seeds with no location signal)
}

// ── Build the plan (pure — no DB) ─────────────────────────────────────────────
function buildPlan(items: RawItem[]) {
  const used = new Set<string>([
    ...CURATED_SLUGS,
    ...CONTAINERS.map((c) => c.slug),
    ...SUP_ACCESSORIES.map((a) => a.slug),
  ]);
  const uniqueSlug = (name: string): string => {
    const base = slugify(name) || "item";
    let s = base;
    let n = 2;
    while (used.has(s)) s = `${base}-${n++}`;
    used.add(s);
    return s;
  };

  // First assign a slug to every non-merged manifest item so "@inv-NNN" parents resolve.
  const slugByManifestId = new Map<string, string>();
  for (const it of items) {
    if (MERGE_INTO[it.id]) continue;
    slugByManifestId.set(it.id, uniqueSlug(it.name));
  }

  const rows: Row[] = [];

  // Container hero cards.
  for (const c of CONTAINERS) {
    rows.push({
      slug: c.slug, name: c.name, category: c.category, quantity: 1, unit: null,
      storagePlace: c.storagePlace, description: c.description, lore: null,
      isVisible: true, isContainer: true, provenance: "curator_added",
      zone: null, itemCondition: null, confidence: null, sourceVideo: null,
      sourceTimestamp: null, manifestCategory: null, sortOrder: c.sortOrder, parentSlug: c.parentSlug,
    });
  }
  // SUP accessories.
  for (const a of SUP_ACCESSORIES) {
    rows.push({
      slug: a.slug, name: a.name, category: "adventure", quantity: a.quantity, unit: a.unit,
      storagePlace: "With the paddleboards", description: a.description, lore: null,
      isVisible: true, isContainer: false, provenance: "curator_added",
      zone: null, itemCondition: null, confidence: null, sourceVideo: null,
      sourceTimestamp: null, manifestCategory: null, sortOrder: a.sortOrder, parentSlug: "stand-up-paddleboard",
    });
  }

  const review: RawItem[] = [];
  const merged: { id: string; target: string }[] = [];
  const hidden: RawItem[] = [];

  for (const it of items) {
    if (MERGE_INTO[it.id]) { merged.push({ id: it.id, target: MERGE_INTO[it.id] }); continue; }

    const slug = slugByManifestId.get(it.id)!;
    const isHidden = HIDE_IDS.has(it.id);

    // Resolve parent: explicit override (incl "@inv-NNN") first, else the engine.
    let parentSlug: string | null = null;
    if (!isHidden) {
      const override = PARENT_OVERRIDE[it.id];
      if (override) {
        parentSlug = override.startsWith("@")
          ? (slugByManifestId.get(override.slice(1)) ?? null)
          : override;
      } else {
        parentSlug = resolveParentSlug(it);
      }
    }

    const isReview = !isHidden && parentSlug === null && !TOP_LEVEL_VISIBLE.has(it.id);
    if (isHidden) hidden.push(it);
    else if (isReview) review.push(it);

    rows.push({
      slug,
      name: it.name,
      category: toEnumCategory(it.category),
      quantity: it.quantity ?? 1,
      unit: it.unit || null,
      storagePlace: STORAGE_OVERRIDE[it.id] || it.location || null,
      description: it.notes || null,
      lore: null,
      // Review + owner-private rows stay hidden until an admin curates them.
      isVisible: !isHidden && !isReview,
      isContainer: ITEM_CONTAINERS.has(it.id),
      provenance: "transcribed",
      zone: it.zone || null,
      itemCondition: it.condition || null,
      confidence: it.confidence || null,
      sourceVideo: it.source_video || null,
      sourceTimestamp: it.timestamp || null,
      manifestCategory: it.category || null,
      sortOrder: Number.parseInt(it.id.replace(/[^0-9]/g, ""), 10) || 0,
      parentSlug,
    });
  }

  const transcribed = rows.filter((r) => r.provenance === "transcribed");
  const parented = transcribed.filter((r) => r.parentSlug !== null).length;
  // Projected top-level cards = curated top-level (17) + containers with no parent.
  const topLevelContainers = CONTAINERS.filter((c) => c.parentSlug === null).length;
  const projectedTopLevel = CURATED_SLUGS.length + topLevelContainers;

  return { rows, merged, review, hidden, parented, projectedTopLevel, slugByManifestId };
}

// ── DB writers ────────────────────────────────────────────────────────────────
async function upsertRow(conn: mysql.Connection, r: Row): Promise<void> {
  const [existing] = await conn.execute("SELECT id FROM ship_inventory_items WHERE slug = ? LIMIT 1", [r.slug]);
  const exists = Array.isArray(existing) && existing.length > 0;
  // parentId is set in pass B (after every row exists), so it is not written here.
  if (exists) {
    await conn.execute(
      `UPDATE ship_inventory_items SET
         name = ?, category = ?, quantity = ?, unit = ?, storagePlace = ?, description = ?, lore = ?,
         isVisible = ?, isContainer = ?, provenance = ?, zone = ?, itemCondition = ?, confidence = ?,
         sourceVideo = ?, sourceTimestamp = ?, manifestCategory = ?, sortOrder = ?
       WHERE slug = ?`,
      [
        r.name, r.category, r.quantity, r.unit, r.storagePlace, r.description, r.lore,
        r.isVisible ? 1 : 0, r.isContainer ? 1 : 0, r.provenance, r.zone, r.itemCondition, r.confidence,
        r.sourceVideo, r.sourceTimestamp, r.manifestCategory, r.sortOrder, r.slug,
      ],
    );
  } else {
    await conn.execute(
      `INSERT INTO ship_inventory_items
         (name, slug, category, quantity, unit, storagePlace, description, lore, activityTags,
          isVisible, isContainer, provenance, zone, itemCondition, confidence,
          sourceVideo, sourceTimestamp, manifestCategory, sortOrder, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST('[]' AS JSON), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        r.name, r.slug, r.category, r.quantity, r.unit, r.storagePlace, r.description, r.lore,
        r.isVisible ? 1 : 0, r.isContainer ? 1 : 0, r.provenance, r.zone, r.itemCondition, r.confidence,
        r.sourceVideo, r.sourceTimestamp, r.manifestCategory, r.sortOrder,
      ],
    );
  }
}

async function main() {
  const dataPath = path.resolve(process.cwd(), "data", "rv_inventory.json");
  const items: RawItem[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${items.length} manifest items from ${dataPath}`);

  const plan = buildPlan(items);
  const containersCreated = plan.rows.filter((r) => r.provenance === "curator_added").length;
  const transcribedCreated = plan.rows.filter((r) => r.provenance === "transcribed").length;

  console.log("");
  console.log("── Plan ──────────────────────────────────────────────");
  console.log(`  curator_added rows (containers + SUP kit): ${containersCreated}`);
  console.log(`  transcribed rows (manifest items):         ${transcribedCreated}`);
  console.log(`  merged into curated cards (no dup row):    ${plan.merged.length}  [${plan.merged.map((m) => `${m.id}->${m.target}`).join(", ")}]`);
  console.log(`  parented transcribed items:                ${plan.parented}`);
  console.log(`  hidden (owner-private):                    ${plan.hidden.length}  [${plan.hidden.map((h) => h.id).join(", ")}]`);
  console.log(`  review (parentId NULL, hidden for admin):  ${plan.review.length}`);
  plan.review.forEach((r) => console.log(`      · ${r.id}  ${r.name}  (${r.category} / ${r.zone})`));
  console.log(`  curated cards promoted to containers:      ${CURATED_CONTAINERS.length}  [${CURATED_CONTAINERS.join(", ")}]`);
  console.log(`  projected TOP-LEVEL cards on /ship:        ${plan.projectedTopLevel}  (17 curated + ${plan.projectedTopLevel - CURATED_SLUGS.length} new containers)`);
  console.log("──────────────────────────────────────────────────────");
  console.log("");

  if (isDryRun) {
    console.log("DRY RUN — no database connection, no writes.");
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env (public Railway proxy URL for local runs).");
    process.exit(1);
  }
  const conn = await mysql.createConnection(url);
  try {
    if (isReset) {
      const [del] = await conn.execute("DELETE FROM ship_inventory_items WHERE provenance <> 'curated'");
      const affected = (del as { affectedRows?: number }).affectedRows ?? 0;
      await conn.execute(
        `UPDATE ship_inventory_items
           SET isContainer = 0, parentId = NULL, zone = NULL, unit = NULL, itemCondition = NULL,
               confidence = NULL, sourceVideo = NULL, sourceTimestamp = NULL, manifestCategory = NULL
         WHERE provenance = 'curated'`,
      );
      console.log(`Reset: removed ${affected} seeded rows; cleared manifest fields on curated cards.`);
    }

    // Pass A: upsert every container / accessory / transcribed row (parentId set in pass B).
    for (const r of plan.rows) await upsertRow(conn, r);
    console.log(`Pass A: upserted ${plan.rows.length} rows (containers + SUP kit + transcribed).`);

    // Promote curated cards to containers.
    for (const slug of CURATED_CONTAINERS) {
      await conn.execute("UPDATE ship_inventory_items SET isContainer = 1 WHERE slug = ?", [slug]);
    }

    // Enrich curated cards from their manifest twins (no duplicate row created).
    for (const m of plan.merged) {
      const twin = items.find((it) => it.id === m.id)!;
      await conn.execute(
        `UPDATE ship_inventory_items SET
           zone = ?, unit = ?, itemCondition = ?, confidence = ?, sourceVideo = ?, sourceTimestamp = ?, manifestCategory = ?
         WHERE slug = ?`,
        [twin.zone || null, twin.unit || null, twin.condition || null, twin.confidence || null,
         twin.source_video || null, twin.timestamp || null, twin.category || null, m.target],
      );
    }
    console.log(`Enriched ${plan.merged.length} curated cards from manifest twins; promoted ${CURATED_CONTAINERS.length} curated cards to containers.`);

    // Pass B: resolve parent slugs -> ids and write parentId.
    const [allRows] = (await conn.execute("SELECT id, slug FROM ship_inventory_items")) as any;
    const idBySlug = new Map<string, number>();
    for (const row of allRows as { id: number; slug: string }[]) idBySlug.set(row.slug, row.id);

    let parentedWrites = 0;
    let unresolved = 0;
    for (const r of plan.rows) {
      if (!r.parentSlug) continue;
      const parentId = idBySlug.get(r.parentSlug);
      if (parentId == null) { unresolved++; console.warn(`  ! could not resolve parent '${r.parentSlug}' for '${r.slug}'`); continue; }
      await conn.execute("UPDATE ship_inventory_items SET parentId = ? WHERE slug = ?", [parentId, r.slug]);
      parentedWrites++;
    }
    console.log(`Pass B: wrote parentId on ${parentedWrites} rows${unresolved ? ` (${unresolved} unresolved)` : ""}.`);

    // Report actual top-level count.
    const [topLevel] = (await conn.execute(
      "SELECT COUNT(*) AS c FROM ship_inventory_items WHERE parentId IS NULL AND isVisible = 1",
    )) as any;
    const [total] = (await conn.execute("SELECT COUNT(*) AS c FROM ship_inventory_items")) as any;
    console.log(`\nDone. ship_inventory_items now has ${total[0].c} rows; ${topLevel[0].c} visible top-level cards.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
