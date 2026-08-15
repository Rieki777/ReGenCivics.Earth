/**
 * seed-ship-curated.ts — the hand-curated verified quality tier of the treasure
 * map. This is the "treasure": places a crew can actually use, researched and
 * held to a gorgeousness bar. Only beautiful spots make the map.
 *
 * Owns three things (verified natural landmarks live in seed-ship-locations.ts;
 * this script does NOT duplicate them):
 *   1. 40-ft-capable free BOONDOCKS for the coverage plan (Section 8): Tier 1
 *      (60-mile ring around Ashland) + Tier 2 (Ashland→Portland voyage zone).
 *      Every one carries maxRigLengthFt and accessNotes. Researched from USFS /
 *      BLM dispersed-camping sources; Rye ground-truths the 40-ft confirmations
 *      over time (companion Task 3), so accessNotes say "confirm rig fit."
 *   2. Marquee food forests near the anchorage.
 *   3. A few best springs carrying their findaspring.org reference link
 *      (source = findaspring_ref) until Find a Spring export permission lands.
 *
 * Idempotent on (source, externalId). Seeded isVerified=true so they are the
 * treasure tier and count toward the admin coverage/gap view. accessNotes stay
 * honest: researched, not yet physically driven.
 *
 * Usage (from repo root):
 *   npx tsx scripts/seed-ship-curated.ts --dry-run
 *   npx tsx scripts/seed-ship-curated.ts
 */
import { runImport, type ImportRow } from "./ship-import-lib";

const RESEARCHED = "Researched from USFS/BLM dispersed-camping sources. Confirm the turnaround, road surface, and rig fit on arrival; forest roads change with weather and season.";

// ── Tier 1: 60-mile ring around Ashland ──────────────────────────────────────
const TIER1: Array<Omit<ImportRow, "source" | "sourceLicense">> = [
  { name: "Hyatt Lake Dispersed, Cascade-Siskiyou", type: "boondock", lat: 42.155, lng: -122.470, externalId: "boondock-hyatt-lake", maxRigLengthFt: 40, accessNotes: `Gravel forest roads off Hyatt Prairie Rd, high country east of Ashland. Good open sites near the lake. ${RESEARCHED}`, sourceUrl: "https://www.blm.gov/visit/cascade-siskiyou-national-monument", description: "Open high-country camping beside Hyatt Lake in the Cascade-Siskiyou.", isVerified: true },
  { name: "Howard Prairie Boondock", type: "boondock", lat: 42.220, lng: -122.375, externalId: "boondock-howard-prairie", maxRigLengthFt: 40, accessNotes: `Dispersed pullouts on the forest roads around Howard Prairie Reservoir. ${RESEARCHED}`, description: "Reservoir-edge dispersed camping in the Cascade foothills above Ashland.", isVerified: true },
  { name: "Applegate Lake Forest Roads", type: "boondock", lat: 42.020, lng: -123.130, externalId: "boondock-applegate-lake", maxRigLengthFt: 35, accessNotes: `Rogue River-Siskiyou NF roads around Applegate Lake. Some sites tight; larger rigs use the wider gravel spurs. ${RESEARCHED}`, description: "Quiet forest camping around Applegate Lake, southwest of Ashland.", isVerified: true },
  { name: "Mount Ashland Road Dispersed", type: "boondock", lat: 42.083, lng: -122.700, externalId: "boondock-mount-ashland", maxRigLengthFt: 30, accessNotes: `Pullouts along Mt Ashland Rd (FR 20). Big views; narrower shoulders, better for mid-size rigs. ${RESEARCHED}`, description: "High shoulder-of-the-mountain camping with Siskiyou views.", isVerified: true },
  { name: "Emigrant Lake Uplands", type: "boondock", lat: 42.150, lng: -122.610, externalId: "boondock-emigrant-lake", maxRigLengthFt: 40, accessNotes: `Dispersed spots on the uplands east of Emigrant Lake, minutes from the anchorage. ${RESEARCHED}`, description: "The closest boondock to the anchorage, above Emigrant Lake.", isVerified: true },
  { name: "Lake of the Woods Forest Roads", type: "boondock", lat: 42.370, lng: -122.210, externalId: "boondock-lake-of-the-woods", maxRigLengthFt: 40, accessNotes: `Fremont-Winema NF roads near Lake of the Woods, under Mt McLoughlin. ${RESEARCHED}`, description: "Forest camping beneath Mount McLoughlin, east of the anchorage.", isVerified: true },
];

// ── Tier 2: the Ashland→Portland voyage zone ─────────────────────────────────
const TIER2: Array<Omit<ImportRow, "source" | "sourceLicense">> = [
  { name: "Diamond Lake Dispersed, Umpqua NF", type: "boondock", lat: 43.155, lng: -122.145, externalId: "boondock-diamond-lake", maxRigLengthFt: 40, accessNotes: `Wide forest roads near Diamond Lake, between Mt Thielsen and Mt Bailey. Good big-rig gravel. ${RESEARCHED}`, description: "Alpine dispersed camping between two volcanoes on the Crater Lake approach.", isVerified: true },
  { name: "Toketee / North Umpqua Forest Roads", type: "boondock", lat: 43.283, lng: -122.420, externalId: "boondock-north-umpqua", maxRigLengthFt: 35, accessNotes: `Dispersed spurs along the North Umpqua near Toketee. River access; some spurs tight. ${RESEARCHED}`, description: "Riverside forest camping on the wild North Umpqua.", isVerified: true },
  { name: "Willamette Pass / Salt Creek Dispersed", type: "boondock", lat: 43.605, lng: -122.130, externalId: "boondock-willamette-pass", maxRigLengthFt: 40, accessNotes: `Willamette NF roads near Salt Creek Falls and Willamette Pass. ${RESEARCHED}`, description: "High-Cascade camping by one of Oregon's tallest waterfalls.", isVerified: true },
  { name: "Waldo Lake Forest Roads", type: "boondock", lat: 43.720, lng: -122.030, externalId: "boondock-waldo-lake", maxRigLengthFt: 40, accessNotes: `Gravel roads around Waldo Lake, one of the purest lakes on earth. ${RESEARCHED}`, description: "Dispersed camping beside famously clear Waldo Lake.", isVerified: true },
  { name: "Hosmer Lake / Cascade Lakes Dispersed", type: "boondock", lat: 43.966, lng: -121.786, externalId: "boondock-hosmer-lake", maxRigLengthFt: 40, accessNotes: `Deschutes NF dispersed sites along the Cascade Lakes Scenic Byway. ${RESEARCHED}`, description: "Volcano-rimmed camping on the Cascade Lakes byway west of Bend.", isVerified: true },
  { name: "McKenzie River / Proxy Falls Roads", type: "boondock", lat: 44.165, lng: -121.930, externalId: "boondock-mckenzie", maxRigLengthFt: 35, accessNotes: `Willamette NF spurs off Hwy 242 near Proxy Falls (summer only; the pass closes in winter). ${RESEARCHED}`, description: "Mossy old-Cascade camping near the Proxy Falls country.", isVerified: true },
  { name: "Detroit Lake Forest Roads", type: "boondock", lat: 44.735, lng: -122.150, externalId: "boondock-detroit-lake", maxRigLengthFt: 40, accessNotes: `Willamette NF roads around Detroit Lake on the Breitenbush/Santiam approach. ${RESEARCHED}`, description: "Lake-country camping on the road to Breitenbush.", isVerified: true },
  { name: "Mount Hood / Bennett Pass Dispersed", type: "boondock", lat: 45.285, lng: -121.660, externalId: "boondock-mount-hood", maxRigLengthFt: 40, accessNotes: `Mt Hood NF roads near Bennett Pass, southeast of the mountain. ${RESEARCHED}`, description: "High camping in the shadow of Mount Hood.", isVerified: true },
  { name: "Timothy Lake Forest Roads", type: "boondock", lat: 45.110, lng: -121.790, externalId: "boondock-timothy-lake", maxRigLengthFt: 40, accessNotes: `Mt Hood NF gravel around Timothy Lake, south of Government Camp. ${RESEARCHED}`, description: "Forest-and-lake camping on the south side of Mount Hood.", isVerified: true },
  { name: "Oregon Dunes / Siltcoos Dispersed", type: "boondock", lat: 43.870, lng: -124.140, externalId: "boondock-oregon-dunes", maxRigLengthFt: 35, accessNotes: `Siuslaw NF dispersed areas near the Oregon Dunes, central coast. ${RESEARCHED}`, description: "Coast-and-dune camping on the central Oregon coast.", isVerified: true },
  { name: "Cape Blanco / Southern Coast Roads", type: "boondock", lat: 42.837, lng: -124.500, externalId: "boondock-cape-blanco", maxRigLengthFt: 35, accessNotes: `Dispersed spots near the southern Oregon coast headlands. Wind-exposed; pick sheltered spurs. ${RESEARCHED}`, description: "Wild-headland camping on the far southern coast.", isVerified: true },
];

// ── Marquee food forests near the anchorage ──────────────────────────────────
const FOOD_FORESTS: Array<Omit<ImportRow, "source" | "sourceLicense">> = [
  { name: "Ashland Creek Food Forest", type: "food_forest", lat: 42.196, lng: -122.713, externalId: "ff-ashland-creek", description: "A community food forest along Ashland Creek, near the anchorage.", isVerified: true },
  { name: "Talent Community Orchard", type: "food_forest", lat: 42.245, lng: -122.788, externalId: "ff-talent-orchard", description: "A neighborhood orchard in the Rogue Valley, minutes north of Ashland.", isVerified: true },
];

// ── Best springs carrying their Find a Spring reference ───────────────────────
// source = findaspring_ref: sourceUrl points at findaspring.org until Find a
// Spring export permission lands (companion Task 1). These complement, not
// duplicate, the natural-landmark springs in seed-ship-locations.ts.
const FINDASPRING: Array<Omit<ImportRow, "source" | "sourceLicense">> = [
  { name: "Ashland Lithia Spring", type: "spring", lat: 42.190, lng: -122.714, externalId: "fas-ashland-lithia", sourceUrl: "https://www.findaspring.org/?s=Ashland", description: "The mineral springs that give Ashland's Lithia Park and fountains their name.", isVerified: true },
  { name: "Buckhorn Mineral Spring", type: "spring", lat: 42.470, lng: -122.870, externalId: "fas-buckhorn", sourceUrl: "https://www.findaspring.org/", description: "A historic mineral spring in the hills of the Rogue Valley.", isVerified: true },
];

function stamp<T extends { externalId: string }>(items: Array<Omit<ImportRow, "source" | "sourceLicense">>, source: string, license: string): ImportRow[] {
  return items.map((it) => ({ ...it, source, sourceLicense: license } as ImportRow));
}

async function main() {
  const rows: ImportRow[] = [
    ...stamp([...TIER1, ...TIER2], "curated", "original"),
    ...stamp(FOOD_FORESTS, "curated", "original"),
    ...stamp(FINDASPRING, "findaspring_ref", "CC-BY-NC-SA"),
  ];
  await runImport("curated", rows);
}

main().catch((e) => { console.error(e); process.exit(1); });
