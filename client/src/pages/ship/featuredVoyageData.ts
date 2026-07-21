/**
 * Data for the featured voyage on the treasure map page: "Cascadia Epic Voyage:
 * The Full Lunar Cycle," now expanded south into Northern California and Mt
 * Shasta. The illustrated map lives at voyage-map-cascadia-california.webp.
 *
 * ACCURACY: every route leg distance below is a REAL driving distance, computed
 * from real coordinates via the OSRM routing engine (not the invented numbers on
 * the old art). The total is the sum of those legs. Positions (x, y) are the
 * normalized location of each place's label on the illustration, 0 to 1.
 *
 * `baked: true` means the place already has a printed label on the illustration,
 * so the interactive layer puts a transparent clickable box over it (the label
 * itself is the tap target, no covering dot). `baked: false` places its own dark
 * pill label (Crater Lake and the extra California sites the art did not print).
 */

export const MAP_IMAGE = "voyage-map-cascadia-california.webp";

export type StopKind = "home" | "landmark" | "spring";
export type Stop = {
  name: string;
  kind: StopKind;
  region: string;
  blurb: string;
  x: number;
  y: number;
  baked: boolean;
  seasonal?: boolean;
};

/**
 * Real driving legs of the grand loop, in order, each distance from OSRM (real
 * road miles). Sums to TOTAL_MILES.
 */
export const LEGS: Array<{ from: string; to: string; mi: number }> = [
  { from: "Ashland", to: "Crater Lake", mi: 101 },
  { from: "Crater Lake", to: "Umpqua Hot Springs", mi: 40 },
  { from: "Umpqua Hot Springs", to: "Umpqua National Forest", mi: 5 },
  { from: "Umpqua National Forest", to: "Oregon Dunes", mi: 135 },
  { from: "Oregon Dunes", to: "Florence", mi: 22 },
  { from: "Florence", to: "Sea Lion Caves", mi: 11 },
  { from: "Sea Lion Caves", to: "Newport", mi: 39 },
  { from: "Newport", to: "Devil's Punchbowl", mi: 8 },
  { from: "Devil's Punchbowl", to: "Cannon Beach", mi: 106 },
  { from: "Cannon Beach", to: "Astoria", mi: 25 },
  { from: "Astoria", to: "Columbia River Gorge", mi: 121 },
  { from: "Columbia River Gorge", to: "Hood River", mi: 46 },
  { from: "Hood River", to: "Timberline Lodge", mi: 47 },
  { from: "Timberline Lodge", to: "Breitenbush", mi: 62 },
  { from: "Breitenbush", to: "Silver Falls", mi: 61 },
  { from: "Silver Falls", to: "Eugene", mi: 80 },
  { from: "Eugene", to: "Belknap", mi: 60 },
  { from: "Belknap", to: "Sisters", mi: 47 },
  { from: "Sisters", to: "Smith Rock", mi: 29 },
  { from: "Smith Rock", to: "Painted Hills", mi: 71 },
  { from: "Painted Hills", to: "Bend", mi: 86 },
  { from: "Bend", to: "Mount Bachelor", mi: 21 },
  { from: "Mount Bachelor", to: "Lava Beds", mi: 187 },
  { from: "Lava Beds", to: "Burney Falls", mi: 98 },
  { from: "Burney Falls", to: "Lassen Volcanic", mi: 54 },
  { from: "Lassen Volcanic", to: "Trinity Lake", mi: 126 },
  { from: "Trinity Lake", to: "McCloud Falls", mi: 100 },
  { from: "McCloud Falls", to: "Mount Shasta City", mi: 20 },
  { from: "Mount Shasta City", to: "Castle Crags", mi: 14 },
  { from: "Castle Crags", to: "Lake Siskiyou", mi: 18 },
  { from: "Lake Siskiyou", to: "Weed", mi: 14 },
  { from: "Weed", to: "Stewart Mineral Springs", mi: 6 },
  { from: "Stewart Mineral Springs", to: "Crescent City", mi: 185 },
  { from: "Crescent City", to: "Ashland", mi: 124 },
];

export const TOTAL_MILES = LEGS.reduce((a, l) => a + l.mi, 0); // 2169

export const VOYAGE = {
  id: "lunar_cycle",
  title: "Cascadia Epic Voyage",
  subtitle: "The Full Lunar Cycle",
  tagline: "Ashland to the Pacific and Cascades and south to Mount Shasta, a grand loop through two states.",
  nights: 28,
  weeks: 4,
  miles: TOTAL_MILES,
  pace: "An immersive grand loop. Slow and deep, a few nights at each anchor, not a night a stop dash.",
  terrain: "Pacific coast, temperate rainforest, the Columbia Gorge, glaciered Cascade volcanoes, high desert, redwoods, and the Mount Shasta country.",
  bestMonths: "Late June to early October",
};

export const SEASON = {
  best: "Late June through early October",
  note: "The high passes, the Cascade Lakes Highway, the Crater Lake rim road, and the roads around Lassen and Mount Shasta are summer to fall routes that close under snow in winter. The coast and valley legs still sail year round, but the mountain crown of this loop, north and south, is at its best from summer into fall.",
};

/**
 * Every place on the map, in loop order from home port. Springs carry a distinct
 * icon. x/y are the label position on the illustration; baked marks whether the
 * art already prints the label.
 */
export const STOPS: Stop[] = [
  { name: "Ashland", kind: "home", region: "Home port", x: 0.510, y: 0.955, baked: true, blurb: "Home port in the Rogue Valley at the Oregon and California line, where every voyage begins and ends. She waters, provisions, and rests here before the loop opens and after it closes." },

  // Oregon coast
  { name: "Astoria", kind: "landmark", region: "The Oregon Coast", x: 0.162, y: 0.166, baked: true, blurb: "The old river mouth town where the Columbia meets the Pacific, all lighthouses, long bridges, and morning fog." },
  { name: "Cannon Beach", kind: "landmark", region: "The Oregon Coast", x: 0.169, y: 0.270, baked: true, blurb: "Wide sand and sea stacks, tide pools at low water, the classic Oregon coast in one view." },
  { name: "Haystack Rock", kind: "landmark", region: "The Oregon Coast", x: 0.104, y: 0.329, baked: true, blurb: "The great monolith standing just off the beach, seabirds nesting on its shoulders and starfish around its base." },
  { name: "Sea Lion Caves", kind: "landmark", region: "The Oregon Coast", x: 0.104, y: 0.212, baked: true, blurb: "A sea cave worn into the headland where sea lions haul out and their voices echo off the rock." },
  { name: "Newport", kind: "landmark", region: "The Oregon Coast", x: 0.112, y: 0.444, baked: true, blurb: "The green arch of Yaquina Bay Bridge over a working harbor, a good place to breathe salt air and eat off the docks." },
  { name: "Devil's Punchbowl", kind: "landmark", region: "The Oregon Coast", x: 0.099, y: 0.531, baked: true, blurb: "A collapsed sea cave that churns and booms as the tide floods in and out of it." },
  { name: "Florence", kind: "landmark", region: "The Oregon Coast", x: 0.121, y: 0.569, baked: true, blurb: "Old town riverfront and the gateway to the dunes, a soft landing between coast and sand." },
  { name: "Oregon Dunes", kind: "landmark", region: "The Oregon Coast", x: 0.121, y: 0.642, baked: true, blurb: "Mountains of sand between the forest and the surf, the largest expanse of coastal dunes in North America." },

  // Willamette Valley and the Gorge
  { name: "Eugene", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.285, y: 0.528, baked: true, blurb: "The green valley city, farmers markets and river paths, an easy resupply before the mountains." },
  { name: "Silver Falls", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.303, y: 0.350, baked: true, blurb: "A canyon of waterfalls you can walk behind, ferns and moss and cool spray on the trail." },
  { name: "Columbia River Gorge", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.718, y: 0.166, baked: true, blurb: "A river canyon cut clean through the Cascades, walls of basalt and a corridor of falling water." },
  { name: "Multnomah Falls", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.892, y: 0.201, baked: true, blurb: "The tall two tier falls off the gorge wall, a stone footbridge crossing its middle." },
  { name: "Hood River", kind: "landmark", region: "The Willamette Valley and Gorge", x: 0.786, y: 0.279, baked: true, blurb: "A wind and water town on the Columbia, orchards on the hills above and windsurfers on the river below." },

  // Mount Hood
  { name: "Mount Hood", kind: "landmark", region: "Mount Hood", x: 0.808, y: 0.403, baked: true, seasonal: true, blurb: "The glaciered peak that watches the whole region, alpine meadows and wildflowers on its lower skirts." },
  { name: "Timberline Lodge", kind: "landmark", region: "Mount Hood", x: 0.881, y: 0.464, baked: true, seasonal: true, blurb: "The great timberline lodge high on Mount Hood, hand built of stone and timber, with snow that lingers into summer." },

  // Central Cascades and high desert
  { name: "Smith Rock", kind: "landmark", region: "The Central Cascades and high desert", x: 0.589, y: 0.325, baked: true, blurb: "Rust red spires rising over a river bend, where climbers and the dry desert light meet." },
  { name: "Sisters", kind: "landmark", region: "The Central Cascades and high desert", x: 0.425, y: 0.460, baked: true, blurb: "A small Cascade town under the Three Sisters peaks, pine air and a slow main street." },
  { name: "Bend", kind: "landmark", region: "The Central Cascades and high desert", x: 0.569, y: 0.484, baked: true, blurb: "The high desert hub on the Deschutes River, trails and water and a full resupply." },
  { name: "Mount Bachelor", kind: "landmark", region: "The Central Cascades and high desert", x: 0.462, y: 0.423, baked: true, seasonal: true, blurb: "The volcano south of Bend, ringed with alpine lakes and trails around its base." },
  { name: "Cascade Lakes Highway", kind: "landmark", region: "The Central Cascades and high desert", x: 0.618, y: 0.578, baked: true, seasonal: true, blurb: "A high scenic road strung between alpine lakes and volcanoes, a summer to fall drive that closes under snow." },
  { name: "Painted Hills", kind: "landmark", region: "The Central Cascades and high desert", x: 0.879, y: 0.575, baked: true, blurb: "Banded hills of red, gold, and black, an ancient seabed painted by time and best in low light." },

  // Southern Oregon Cascades
  { name: "Crater Lake", kind: "landmark", region: "The Southern Cascades", x: 0.745, y: 0.640, baked: false, seasonal: true, blurb: "The deepest and bluest lake in the country, held in a collapsed volcano with an island rising from its center. The rim road is a summer to fall route." },
  { name: "Umpqua National Forest", kind: "landmark", region: "The Southern Cascades", x: 0.399, y: 0.642, baked: true, blurb: "Old growth and waterfalls along the North Umpqua, deep green and quiet." },

  // Northern California (the southern expansion)
  { name: "Mount Shasta", kind: "landmark", region: "The Mount Shasta country", x: 0.510, y: 0.792, baked: true, blurb: "The lone white giant of Northern California, a 14,000 foot volcano that draws the eye and the pilgrims from a hundred miles off." },
  { name: "Mount Shasta City", kind: "landmark", region: "The Mount Shasta country", x: 0.400, y: 0.845, baked: false, blurb: "The little town at the mountain's foot, a resupply and a base for the springs, lakes, and trails all around it." },
  { name: "Weed", kind: "landmark", region: "The Mount Shasta country", x: 0.330, y: 0.800, baked: false, blurb: "A crossroads town under Shasta's north side, gateway to the mineral springs and the Trinity country west." },
  { name: "Lake Siskiyou", kind: "landmark", region: "The Mount Shasta country", x: 0.300, y: 0.855, baked: false, blurb: "A calm reservoir lake at Shasta's foot with the mountain doubled on the water, good for a paddle and a swim." },
  { name: "Castle Crags", kind: "landmark", region: "The Mount Shasta country", x: 0.904, y: 0.764, baked: true, blurb: "Granite spires rising sheer from the forest across the valley from Shasta, ancient and jagged." },
  { name: "McCloud Falls", kind: "landmark", region: "The Mount Shasta country", x: 0.640, y: 0.845, baked: false, blurb: "Three waterfalls stepping down the McCloud River in the forest southeast of Shasta, pools to swim between them." },
  { name: "Stewart Mineral Springs", kind: "spring", region: "The Mount Shasta country", x: 0.719, y: 0.518, baked: true, blurb: "Mineral springs in the Shasta country, a soak and a cold plunge in the creek near the home stretch of the loop." },

  // Northeast California and the far south
  { name: "Lava Beds", kind: "landmark", region: "Northeast California", x: 0.700, y: 0.705, baked: false, seasonal: true, blurb: "Lava Beds National Monument, a maze of lava tube caves under the high desert near the Oregon line." },
  { name: "Burney Falls", kind: "landmark", region: "Northeast California", x: 0.760, y: 0.885, baked: false, blurb: "A wide curtain of spring water falling over a mossy wall, running full and cold even in high summer." },
  { name: "Lassen Volcanic", kind: "landmark", region: "Northeast California", x: 0.867, y: 0.954, baked: true, seasonal: true, blurb: "Lassen Volcanic National Park, boiling mud pots, steaming ground, and a peak that last erupted a century ago." },
  { name: "Trinity Lake", kind: "landmark", region: "The Trinity country", x: 0.290, y: 0.790, baked: false, blurb: "A big forest lake in the Trinity Alps west of Shasta, quiet water under high granite." },

  // Redwood coast
  { name: "Redwoods", kind: "landmark", region: "The Redwood Coast", x: 0.154, y: 0.859, baked: true, blurb: "The tall groves of the far north California coast, the Jedediah Smith redwoods, oldest and largest living things on earth." },
  { name: "Crescent City", kind: "landmark", region: "The Redwood Coast", x: 0.185, y: 0.908, baked: true, blurb: "A working harbor town on the northernmost California coast, lighthouse and tide pools, the turn for home." },

  // Hot springs of the north
  { name: "Breitenbush", kind: "spring", region: "Hot springs", x: 0.642, y: 0.417, baked: true, seasonal: true, blurb: "Forest hot springs on the Breitenbush River, pools among old growth, a place to soak and let the week settle out of you." },
  { name: "Belknap", kind: "spring", region: "Hot springs", x: 0.462, y: 0.534, baked: true, blurb: "Riverside hot springs in the McKenzie country, warm mineral water and cold forest air together." },
  { name: "Umpqua Hot Springs", kind: "spring", region: "Hot springs", x: 0.457, y: 0.600, baked: true, seasonal: true, blurb: "Terraced pools on a bluff above the North Umpqua, steam rising over the running river below." },
];

/** Honest general RV guidance per region. No fabricated facilities or addresses. */
export const LOGISTICS: Array<{ region: string; guidance: string }> = [
  { region: "The Oregon Coast", guidance: "Coastal towns are well set up for rigs, with hookups, water, and dump stations spread along the highway. Book ahead in summer. A few headland pullouts are tight for a big rig, so we route around the narrow ones." },
  { region: "The Willamette Valley and Gorge", guidance: "Valley towns and the gorge corridor have full services and easy resupply. The historic gorge pullouts are small, so overnight in town and day trip the waterfalls." },
  { region: "The Central Cascades and high desert", guidance: "Bend and Sisters are full service hubs for water, dumps, and provisions. The high lake roads are summer only and can be narrow, so we stage from town and day trip the passes." },
  { region: "The Mount Shasta country", guidance: "Mount Shasta City and Weed are the resupply hubs for the whole southern leg, with water, dumps, and provisions. The springs and lake roads nearby are easy, the higher trailheads narrower." },
  { region: "Northeast California and Lassen", guidance: "Services are sparse across the high volcanic country. Fill water and empty tanks in town before Lava Beds, Burney, or Lassen, and expect limited hookups at elevation." },
  { region: "The Redwood Coast", guidance: "Crescent City and the redwood parks have coastal services, but some grove roads have low clearance and tight turns, so we route the rig on the through roads and walk into the big trees." },
  { region: "Hot springs", guidance: "Most springs are primitive, with no hookups, water, or dump, and some sit at the end of rough access roads. We stage from the nearest town and visit them as day soaks rather than overnights in the rig." },
];

export const LOGISTICS_FRAME =
  "This is general guidance by region. Before you sail, the First Mate maps your exact hookups, water, and dumps for your dates and your rig length, so you never guess at a gate.";
