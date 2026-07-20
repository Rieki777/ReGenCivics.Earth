/**
 * Data for the first fully-built featured voyage on the treasure map page:
 * "Cascadia Epic Voyage: The Full Lunar Cycle." The illustrated map lives at
 * /images/ship/voyage-map-full-lunar-cycle.webp; this file holds the stats, the
 * stop layer, the honest per-region RV logistics, and the season notes that the
 * FeaturedVoyage component renders beside it.
 *
 * Each stop carries a normalized (x, y) position (0 to 1) of its label on the
 * illustration, so the component can drop a tappable marker over the map that is
 * synced to the stop list. Tillamook Creamery still appears on the illustration,
 * but by Rye's call it is NOT a stop in the built experience, so it is absent
 * below and gets no marker.
 *
 * All copy is grounded and honest. RV logistics are general guidance by region
 * only, with no fabricated dump-station addresses or facility names: the First
 * Mate maps a crew's exact hookups, water, and dumps before they sail.
 */

export const MAP_IMAGE = "voyage-map-full-lunar-cycle.webp";

/** The marked legs on the illustration, in loop order. Summed for total miles. */
export const ROUTE_LEGS = [95, 30, 55, 40, 25, 35, 45, 25, 35, 60, 15, 45, 20, 95, 60, 75];
export const TOTAL_MILES = ROUTE_LEGS.reduce((a, b) => a + b, 0); // 755

export const VOYAGE = {
  id: "lunar_cycle",
  title: "Cascadia Epic Voyage",
  subtitle: "The Full Lunar Cycle",
  tagline: "Ashland to the Pacific and Cascades, a full 28 day moon cycle in living nature.",
  nights: 28,
  weeks: 4,
  miles: TOTAL_MILES,
  pace: "An immersive grand loop. Slow and deep, a few nights at each anchor, not a night a stop dash.",
  terrain: "Pacific coast, temperate rainforest, the Columbia Gorge, glaciered Cascade volcanoes, high desert, and a crater rim.",
  bestMonths: "Late June to early October",
};

/** Season band: when the loop is at its best and the honest winter limits. */
export const SEASON = {
  best: "Late June through early October",
  note: "The high passes, the Cascade Lakes Highway, and the Crater Lake rim road are summer to fall roads. In winter they close under snow. The coast and valley legs still sail year round, but the mountain crown of this loop is limited outside the warm season, so a full lunar cycle is at its best from summer into fall.",
};

export type StopKind = "home" | "landmark" | "spring";

export type Stop = {
  name: string;
  kind: StopKind;
  region: string;
  blurb: string;
  /** Normalized position of the marker on the map image, 0 to 1. */
  x: number;
  y: number;
  /** True when the stop is only reachable in the warm season. */
  seasonal?: boolean;
};

/**
 * The stop layer, in loop order from Ashland. Springs carry a distinct icon.
 * Tillamook is intentionally omitted (removed as a stop). x/y place the tappable
 * marker over the illustration.
 */
export const STOPS: Stop[] = [
  { name: "Ashland", kind: "home", region: "Home port", x: 0.502, y: 0.955, blurb: "Home port in the Rogue Valley, where every voyage begins and ends. She waters, provisions, and rests here before the loop opens and after it closes." },

  // The Oregon coast
  { name: "Astoria", kind: "landmark", region: "The Oregon Coast", x: 0.172, y: 0.200, blurb: "The old river mouth town where the Columbia meets the Pacific, all lighthouses, long bridges, and morning fog." },
  { name: "Cannon Beach", kind: "landmark", region: "The Oregon Coast", x: 0.172, y: 0.328, blurb: "Wide sand and sea stacks, tide pools at low water, the classic Oregon coast in one view." },
  { name: "Haystack Rock", kind: "landmark", region: "The Oregon Coast", x: 0.108, y: 0.398, blurb: "The great monolith standing just off the beach, seabirds nesting on its shoulders and starfish around its base." },
  { name: "Sea Lion Caves", kind: "landmark", region: "The Oregon Coast", x: 0.100, y: 0.256, blurb: "A sea cave worn into the headland where sea lions haul out and their voices echo off the rock." },
  { name: "Newport", kind: "landmark", region: "The Oregon Coast", x: 0.110, y: 0.540, blurb: "The green arch of Yaquina Bay Bridge over a working harbor, a good place to breathe salt air and eat off the docks." },
  { name: "Devil's Punchbowl", kind: "landmark", region: "The Oregon Coast", x: 0.100, y: 0.630, blurb: "A collapsed sea cave that churns and booms as the tide floods in and out of it." },
  { name: "Florence", kind: "landmark", region: "The Oregon Coast", x: 0.117, y: 0.694, blurb: "Old town riverfront and the gateway to the dunes, a soft landing between coast and sand." },
  { name: "Oregon Dunes", kind: "landmark", region: "The Oregon Coast", x: 0.122, y: 0.783, blurb: "Mountains of sand between the forest and the surf, the largest expanse of coastal dunes in North America." },

  // The Willamette Valley and the Gorge
  { name: "Eugene", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.284, y: 0.643, blurb: "The green valley city, farmers markets and river paths, an easy resupply before the mountains." },
  { name: "Silver Falls", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.312, y: 0.427, blurb: "A canyon of waterfalls you can walk behind, ferns and moss and cool spray on the trail." },
  { name: "Columbia River Gorge", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.722, y: 0.198, blurb: "A river canyon cut clean through the Cascades, walls of basalt and a corridor of falling water." },
  { name: "Multnomah Falls", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.888, y: 0.242, blurb: "The tall two tier falls off the gorge wall, a stone footbridge crossing its middle." },
  { name: "Hood River", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.784, y: 0.335, blurb: "A wind and water town on the Columbia, orchards on the hills above and windsurfers on the river below." },

  // Mount Hood and the northern Cascades
  { name: "Mount Hood", kind: "landmark", region: "Mount Hood", x: 0.808, y: 0.486, seasonal: true, blurb: "The glaciered peak that watches the whole region, alpine meadows and wildflowers on its lower skirts." },
  { name: "Timberline Lodge", kind: "landmark", region: "Mount Hood", x: 0.888, y: 0.562, seasonal: true, blurb: "The great timberline lodge high on Mount Hood, hand built of stone and timber, with snow that lingers into summer." },

  // The central Cascades and high desert
  { name: "Smith Rock", kind: "landmark", region: "The Central Cascades and high desert", x: 0.590, y: 0.391, blurb: "Rust red spires rising over a river bend, where climbers and the dry desert light meet." },
  { name: "Sisters", kind: "landmark", region: "The Central Cascades and high desert", x: 0.426, y: 0.558, blurb: "A small Cascade town under the Three Sisters peaks, pine air and a slow main street." },
  { name: "Bend", kind: "landmark", region: "The Central Cascades and high desert", x: 0.572, y: 0.586, blurb: "The high desert hub on the Deschutes River, trails and water and a full resupply." },
  { name: "Mount Bachelor", kind: "landmark", region: "The Central Cascades and high desert", x: 0.472, y: 0.513, seasonal: true, blurb: "The volcano south of Bend, ringed with alpine lakes and trails around its base." },
  { name: "Cascade Lakes Highway", kind: "landmark", region: "The Central Cascades and high desert", x: 0.620, y: 0.703, seasonal: true, blurb: "A high scenic road strung between alpine lakes and volcanoes, a summer to fall drive that closes under snow." },
  { name: "Painted Hills", kind: "landmark", region: "The Central Cascades and high desert", x: 0.881, y: 0.702, blurb: "Banded hills of red, gold, and black, an ancient seabed painted by time and best in low light." },

  // The southern Cascades and home
  { name: "Crater Lake", kind: "landmark", region: "The Southern Cascades", x: 0.657, y: 0.868, seasonal: true, blurb: "The deepest and bluest lake in the country, held in a collapsed volcano with an island rising from its center. The rim road is a summer to fall route." },
  { name: "Umpqua National Forest", kind: "landmark", region: "The Southern Cascades", x: 0.401, y: 0.776, blurb: "Old growth and waterfalls along the North Umpqua, deep green and quiet, the long way home." },

  // Hot springs (distinct icon)
  { name: "Breitenbush", kind: "spring", region: "Hot springs", x: 0.639, y: 0.503, seasonal: true, blurb: "Forest hot springs on the Breitenbush River, pools among old growth, a place to soak and let the week settle out of you." },
  { name: "Belknap", kind: "spring", region: "Hot springs", x: 0.463, y: 0.650, blurb: "Riverside hot springs in the McKenzie country, warm mineral water and cold forest air together." },
  { name: "Umpqua Hot Springs", kind: "spring", region: "Hot springs", x: 0.458, y: 0.730, seasonal: true, blurb: "Terraced pools on a bluff above the North Umpqua, steam rising over the running river below." },
  { name: "Stewart Mineral Springs", kind: "spring", region: "Hot springs", x: 0.731, y: 0.620, blurb: "Mineral springs in the Shasta country to the south, a last soak near the home stretch of the loop." },
];

/** Honest general RV guidance per region. No fabricated facilities or addresses. */
export const LOGISTICS: Array<{ region: string; guidance: string }> = [
  { region: "The Oregon Coast", guidance: "Coastal towns are well set up for rigs, with hookups, water, and dump stations spread along the highway. Book ahead in summer. A few headland pullouts and beach approaches are tight for a big rig, so we route around the narrow ones." },
  { region: "The Willamette Valley and Gorge", guidance: "Valley towns and the gorge corridor have full services and easy resupply. The historic gorge pullouts are small, so overnight in town and day trip the waterfalls." },
  { region: "The Central Cascades and high desert", guidance: "Bend and Sisters are full service hubs for water, dumps, and provisions. The high lake roads are summer only and can be narrow, so we stage from town and day trip the passes." },
  { region: "The Southern Cascades", guidance: "Services thin out near Crater Lake. Fill water and empty tanks before you climb, and expect limited hookups at elevation. The rim is a day trip, not a place to park a big rig for a week." },
  { region: "Hot springs", guidance: "Most springs are primitive, with no hookups, water, or dump, and some sit at the end of rough access roads. We stage from the nearest town and visit them as day soaks rather than overnights in the rig." },
];

export const LOGISTICS_FRAME =
  "This is general guidance by region. Before you sail, the First Mate maps your exact hookups, water, and dumps for your dates and your rig length, so you never guess at a gate.";
