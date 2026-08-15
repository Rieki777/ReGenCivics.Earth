/**
 * Data for the featured voyage on the treasure map page: "Cascadia Epic Voyage:
 * The Full Lunar Cycle." The illustrated map (voyage-map-cascadia-v4.webp) runs
 * north to south: Ashland Home Port sits near the vertical center at the Oregon
 * and California line, Oregon above it, and Northern California with Mount Shasta
 * below (south of) it. Portland is on the map; Timberline Lodge was removed.
 *
 * ACCURACY: every route leg distance below is a REAL driving distance, computed
 * from real coordinates via the OSRM routing engine. The total is the sum of the
 * legs. Positions (x, y) are the normalized location of each place's label on the
 * illustration, 0 to 1. `baked: true` means the art already prints the label, so
 * the interactive layer puts a transparent clickable box over it (the label is
 * the tap target, no covering dot); `baked: false` places its own dark pill.
 */

export const MAP_IMAGE = "voyage-map-cascadia-v4.webp";
/** Intrinsic size of the illustration, for the map's aspect ratio. */
export const MAP_W = 3072;
export const MAP_H = 5504;

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

/** Real driving legs of the grand loop, in order, each distance from OSRM. */
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
  { from: "Astoria", to: "Portland", mi: 90 },
  { from: "Portland", to: "Columbia River Gorge", mi: 32 },
  { from: "Columbia River Gorge", to: "Multnomah Falls", mi: 12 },
  { from: "Multnomah Falls", to: "Hood River", mi: 47 },
  { from: "Hood River", to: "Mount Hood", mi: 48 },
  { from: "Mount Hood", to: "Breitenbush", mi: 63 },
  { from: "Breitenbush", to: "Silver Falls", mi: 61 },
  { from: "Silver Falls", to: "Eugene", mi: 80 },
  { from: "Eugene", to: "Belknap", mi: 60 },
  { from: "Belknap", to: "Sisters", mi: 47 },
  { from: "Sisters", to: "Smith Rock", mi: 29 },
  { from: "Smith Rock", to: "Painted Hills", mi: 71 },
  { from: "Painted Hills", to: "Bend", mi: 86 },
  { from: "Bend", to: "Mount Bachelor", mi: 21 },
  { from: "Mount Bachelor", to: "Lava Beds", mi: 187 },
  { from: "Lava Beds", to: "Lassen Volcanic", mi: 140 },
  { from: "Lassen Volcanic", to: "Trinity Lake", mi: 126 },
  { from: "Trinity Lake", to: "McCloud Falls", mi: 100 },
  { from: "McCloud Falls", to: "Mount Shasta City", mi: 20 },
  { from: "Mount Shasta City", to: "Castle Crags", mi: 14 },
  { from: "Castle Crags", to: "Lake Siskiyou", mi: 18 },
  { from: "Lake Siskiyou", to: "Weed", mi: 14 },
  { from: "Weed", to: "Stewart Mineral Springs", mi: 6 },
  { from: "Stewart Mineral Springs", to: "Crescent City", mi: 185 },
  { from: "Crescent City", to: "Redwoods", mi: 10 },
  { from: "Redwoods", to: "Ashland", mi: 115 },
];

export const TOTAL_MILES = LEGS.reduce((a, l) => a + l.mi, 0); // 2174

export const VOYAGE = {
  id: "lunar_cycle",
  title: "Cascadia Epic Voyage",
  subtitle: "The Full Lunar Cycle",
  tagline: "From Ashland at the center, north through Oregon and south to Mount Shasta, a grand loop through two states.",
  nights: 28,
  weeks: 4,
  miles: TOTAL_MILES,
  pace: "An immersive grand loop. Slow and deep, a few nights at each anchor, not a night a stop dash.",
  terrain: "Pacific coast, temperate rainforest, the Columbia Gorge, glaciered Cascade volcanoes, high desert, redwoods, and the Mount Shasta country.",
  bestMonths: "Late June to early October",
};

export const SEASON = {
  best: "Late June through early October",
  note: "The high passes, the Cascade Lakes country, the Crater Lake rim road, and the roads around Lassen and Mount Shasta are summer to fall routes that close under snow in winter. The coast and valley legs still sail year round, but the mountain crown of this loop, north and south, is at its best from summer into fall.",
};

/**
 * Every place on the map, roughly in loop order. Springs carry a distinct icon.
 * x/y are the label position on the illustration; baked marks whether the art
 * already prints the label.
 */
export const STOPS: Stop[] = [
  { name: "Ashland", kind: "home", region: "Home port", x: 0.530, y: 0.691, baked: true, blurb: "Home port in the Rogue Valley at the Oregon and California line, near the center of the loop. She waters, provisions, and rests here before the voyage opens north and after it closes from the south." },

  // Oregon coast
  { name: "Astoria", kind: "landmark", region: "The Oregon Coast", x: 0.152, y: 0.197, baked: true, blurb: "The old river mouth town where the Columbia meets the Pacific, all lighthouses, long bridges, and morning fog." },
  { name: "Cannon Beach", kind: "landmark", region: "The Oregon Coast", x: 0.132, y: 0.300, baked: true, blurb: "Wide sand and sea stacks, tide pools at low water, the classic Oregon coast in one view." },
  { name: "Haystack Rock", kind: "landmark", region: "The Oregon Coast", x: 0.086, y: 0.312, baked: false, blurb: "The great monolith standing just off the beach at Cannon Beach, seabirds on its shoulders and starfish around its base." },
  { name: "Sea Lion Caves", kind: "landmark", region: "The Oregon Coast", x: 0.100, y: 0.408, baked: false, blurb: "A sea cave worn into the headland where sea lions haul out and their voices echo off the rock." },
  { name: "Newport", kind: "landmark", region: "The Oregon Coast", x: 0.132, y: 0.361, baked: true, blurb: "The green arch of Yaquina Bay Bridge over a working harbor, a good place to breathe salt air and eat off the docks." },
  { name: "Devil's Punchbowl", kind: "landmark", region: "The Oregon Coast", x: 0.085, y: 0.385, baked: false, blurb: "A collapsed sea cave that churns and booms as the tide floods in and out of it." },
  { name: "Florence", kind: "landmark", region: "The Oregon Coast", x: 0.121, y: 0.446, baked: true, blurb: "Old town riverfront and the gateway to the dunes, a soft landing between coast and sand." },
  { name: "Oregon Dunes", kind: "landmark", region: "The Oregon Coast", x: 0.096, y: 0.541, baked: true, blurb: "Mountains of sand between the forest and the surf, the largest expanse of coastal dunes in North America." },

  // The north: Portland, the Gorge, Mount Hood
  { name: "Portland", kind: "landmark", region: "Portland and the Gorge", x: 0.414, y: 0.279, baked: true, blurb: "The big river city at the north end of the loop, bridges over the Willamette, gardens and food carts and an easy resupply." },
  { name: "Columbia River Gorge", kind: "landmark", region: "Portland and the Gorge", x: 0.692, y: 0.173, baked: true, blurb: "A river canyon cut clean through the Cascades, walls of basalt and a corridor of falling water." },
  { name: "Multnomah Falls", kind: "landmark", region: "Portland and the Gorge", x: 0.596, y: 0.296, baked: true, blurb: "The tall two tier falls off the gorge wall, a stone footbridge crossing its middle." },
  { name: "Hood River", kind: "landmark", region: "Portland and the Gorge", x: 0.744, y: 0.260, baked: true, blurb: "A wind and water town on the Columbia, orchards on the hills above and windsurfers on the river below." },
  { name: "Mount Hood", kind: "landmark", region: "Portland and the Gorge", x: 0.860, y: 0.349, baked: true, seasonal: true, blurb: "The glaciered peak that watches the whole north, alpine meadows and wildflowers on its lower skirts." },

  // Willamette valley and central Cascades
  { name: "Silver Falls", kind: "landmark", region: "The Willamette Valley", x: 0.457, y: 0.378, baked: true, blurb: "A canyon of waterfalls you can walk behind, ferns and moss and cool spray on the trail." },
  { name: "Eugene", kind: "landmark", region: "The Willamette Valley", x: 0.366, y: 0.464, baked: true, blurb: "The green valley city, farmers markets and river paths, an easy resupply before the mountains." },
  { name: "Sisters", kind: "landmark", region: "The Central Cascades and high desert", x: 0.609, y: 0.434, baked: true, blurb: "A small Cascade town under the Three Sisters peaks, pine air and a slow main street." },
  { name: "Smith Rock", kind: "landmark", region: "The Central Cascades and high desert", x: 0.842, y: 0.441, baked: true, blurb: "Rust red spires rising over a river bend, where climbers and the dry desert light meet." },
  { name: "Bend", kind: "landmark", region: "The Central Cascades and high desert", x: 0.677, y: 0.505, baked: true, blurb: "The high desert hub on the Deschutes River, trails and water and a full resupply." },
  { name: "Mount Bachelor", kind: "landmark", region: "The Central Cascades and high desert", x: 0.874, y: 0.523, baked: true, seasonal: true, blurb: "The volcano south of Bend, ringed with alpine lakes and trails around its base." },
  { name: "Painted Hills", kind: "landmark", region: "The Central Cascades and high desert", x: 0.930, y: 0.575, baked: false, blurb: "Banded hills of red, gold, and black, an ancient seabed painted by time and best in low light." },

  // Southern Oregon Cascades
  { name: "Crater Lake", kind: "landmark", region: "The Southern Cascades", x: 0.717, y: 0.623, baked: true, seasonal: true, blurb: "The deepest and bluest lake in the country, held in a collapsed volcano with an island rising from its center. The rim road is a summer to fall route." },
  { name: "Umpqua National Forest", kind: "landmark", region: "The Southern Cascades", x: 0.360, y: 0.650, baked: false, blurb: "Old growth and waterfalls along the North Umpqua, deep green and quiet." },

  // Northern California (south of Ashland)
  { name: "Mount Shasta", kind: "landmark", region: "The Mount Shasta country", x: 0.717, y: 0.809, baked: true, blurb: "The lone white giant just south of Ashland, a 14,000 foot volcano that draws the eye and the pilgrims from a hundred miles off." },
  { name: "Mount Shasta City", kind: "landmark", region: "The Mount Shasta country", x: 0.630, y: 0.860, baked: false, blurb: "The little town at the mountain's foot, a resupply and a base for the springs, lakes, and trails all around it." },
  { name: "Weed", kind: "landmark", region: "The Mount Shasta country", x: 0.560, y: 0.775, baked: false, blurb: "A crossroads town under Shasta's north side, gateway to the mineral springs and the Trinity country west." },
  { name: "Lake Siskiyou", kind: "landmark", region: "The Mount Shasta country", x: 0.500, y: 0.870, baked: false, blurb: "A calm reservoir lake at Shasta's foot with the mountain doubled on the water, good for a paddle and a swim." },
  { name: "Castle Crags", kind: "landmark", region: "The Mount Shasta country", x: 0.459, y: 0.941, baked: true, blurb: "Granite spires rising sheer from the forest near Shasta, ancient and jagged." },
  { name: "McCloud Falls", kind: "landmark", region: "The Mount Shasta country", x: 0.835, y: 0.845, baked: false, blurb: "Three waterfalls stepping down the McCloud River in the forest southeast of Shasta, pools to swim between them." },

  // Northeast California and the Trinity country
  { name: "Lava Beds", kind: "landmark", region: "Northeast California", x: 0.865, y: 0.715, baked: false, seasonal: true, blurb: "Lava Beds National Monument, a maze of lava tube caves under the high desert near the Oregon line." },
  { name: "Lassen Volcanic", kind: "landmark", region: "Northeast California", x: 0.858, y: 0.972, baked: true, seasonal: true, blurb: "Lassen Volcanic National Park, boiling mud pots, steaming ground, and a peak that last erupted a century ago." },
  { name: "Trinity Lake", kind: "landmark", region: "The Trinity country", x: 0.360, y: 0.820, baked: false, blurb: "A big forest lake in the Trinity Alps west of Shasta, quiet water under high granite." },

  // Redwood coast
  { name: "Redwoods", kind: "landmark", region: "The Redwood Coast", x: 0.231, y: 0.809, baked: true, blurb: "The tall groves of the far north California coast, the Jedediah Smith redwoods, oldest and largest living things on earth." },
  { name: "Crescent City", kind: "landmark", region: "The Redwood Coast", x: 0.173, y: 0.885, baked: true, blurb: "A working harbor town on the northernmost California coast, lighthouse and tide pools, the turn for home." },

  // Hot springs
  { name: "Breitenbush", kind: "spring", region: "Hot springs", x: 0.575, y: 0.340, baked: false, seasonal: true, blurb: "Forest hot springs on the Breitenbush River, pools among old growth, a place to soak and let the week settle out of you." },
  { name: "Belknap", kind: "spring", region: "Hot springs", x: 0.500, y: 0.490, baked: false, blurb: "Riverside hot springs in the McKenzie country, warm mineral water and cold forest air together." },
  { name: "Umpqua Hot Springs", kind: "spring", region: "Hot springs", x: 0.380, y: 0.605, baked: false, seasonal: true, blurb: "Terraced pools on a bluff above the North Umpqua, steam rising over the running river below." },
  { name: "Stewart Mineral Springs", kind: "spring", region: "The Mount Shasta country", x: 0.600, y: 0.740, baked: false, blurb: "Mineral springs in the Shasta country, a soak and a cold plunge in the creek near the home stretch of the loop." },
];

/** Honest general RV guidance per region. No fabricated facilities or addresses. */
export const LOGISTICS: Array<{ region: string; guidance: string }> = [
  { region: "The Oregon Coast", guidance: "Coastal towns are well set up for rigs, with hookups, water, and dump stations spread along the highway. Book ahead in summer. A few headland pullouts are tight for a big rig, so we route around the narrow ones." },
  { region: "Portland and the Gorge", guidance: "Portland and the valley have full services and easy resupply. The historic gorge pullouts are small, so overnight in town and day trip the waterfalls." },
  { region: "The Central Cascades and high desert", guidance: "Bend and Sisters are full service hubs for water, dumps, and provisions. The high lake roads are summer only and can be narrow, so we stage from town and day trip the passes." },
  { region: "The Mount Shasta country", guidance: "Mount Shasta City and Weed are the resupply hubs for the whole southern leg, with water, dumps, and provisions. The springs and lake roads nearby are easy, the higher trailheads narrower." },
  { region: "Northeast California and Lassen", guidance: "Services are sparse across the high volcanic country. Fill water and empty tanks in town before Lava Beds and Lassen, and expect limited hookups at elevation." },
  { region: "The Redwood Coast", guidance: "Crescent City and the redwood parks have coastal services, but some grove roads have low clearance and tight turns, so we route the rig on the through roads and walk into the big trees." },
  { region: "Hot springs", guidance: "Most springs are primitive, with no hookups, water, or dump, and some sit at the end of rough access roads. We stage from the nearest town and visit them as day soaks rather than overnights in the rig." },
];

export const LOGISTICS_FRAME =
  "This is general guidance by region. Before you sail, the First Mate maps your exact hookups, water, and dumps for your dates and your rig length, so you never guess at a gate.";
