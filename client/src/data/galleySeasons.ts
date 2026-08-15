/**
 * Eat with the valley: the seasonal bioregional guide and where to gather for
 * the ReGen Ship's Ashland anchorage (Rogue Valley, Southern Oregon). Renders as
 * a compact panel on /ship/galley and drives the printable food treasure map.
 *
 * Display data only. Voice (STEERING section 1): no em-dashes, plain and warm.
 */

export type GatherSpot = {
  name: string;
  detail: string;
  /** When it runs, if seasonal. */
  when?: string;
};

export type SeasonWindow = {
  key: "summer" | "autumn" | "spring" | "winter";
  label: string;
  months: string;
  /** true for the voyage season, so the UI can lead with it. */
  isVoyageSeason?: boolean;
  produce: string[];
};

export const GATHER_SPOTS: GatherSpot[] = [
  {
    name: "Rogue Valley Growers and Crafters Market (Ashland Tuesday Market)",
    detail:
      "At ScienceWorks Hands-on Museum. Around 150 vendors from Jackson, Josephine, and Siskiyou counties.",
    when: "Tuesdays 8:30am to 1:30pm, March through November",
  },
  {
    name: "Ashland Saturday Market",
    detail: "The 100 block of Oak Street, downtown.",
    when: "Saturdays, May through October",
  },
  {
    name: "Ashland Food Co-op",
    detail:
      "237 N First Street. Southern Oregon's only Certified Organic Retailer, member-owned since 1972. Local growers include Blue Fox Farm (Certified Organic, Salmon-Safe) and Rolling Hills peaches.",
  },
  {
    name: "Farm stands and food forests",
    detail:
      "Stands along the valley, plus the food forests already marked on the ship's treasure map.",
  },
];

export const SEASON_WINDOWS: SeasonWindow[] = [
  {
    key: "summer",
    label: "Summer",
    months: "June to September",
    isVoyageSeason: true,
    produce: [
      "peaches",
      "nectarines",
      "apricots",
      "plums",
      "melons",
      "watermelon",
      "tomatoes",
      "cucumbers",
      "corn",
      "green beans",
      "eggplant",
      "peppers",
      "berries",
      "basil",
      "greens",
    ],
  },
  {
    key: "autumn",
    label: "Autumn",
    months: "September to November",
    produce: [
      "apples",
      "pears",
      "grapes",
      "winter squash",
      "cabbage",
      "beets",
      "carrots",
      "brussels sprouts",
      "kale",
    ],
  },
  {
    key: "spring",
    label: "Spring",
    months: "March to June",
    produce: [
      "asparagus",
      "peas",
      "radishes",
      "strawberries",
      "tender greens",
      "herbs",
      "green garlic",
    ],
  },
  {
    key: "winter",
    label: "Winter",
    months: "December to February",
    produce: [
      "stored squash",
      "roots",
      "cabbage",
      "citrus brought in",
      "co-op organics",
      "sprouts grown aboard",
    ],
  },
];
