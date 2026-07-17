/**
 * Crowdpooling taxonomy: the shared language for the whole platform.
 *
 * Every campaign need, calculator category, and role template speaks in
 * these terms. The campaign engine, the Crowd Pooling Tool, and the
 * Contribution Calculator all import from here, so a "Yoga Instructor"
 * means the same thing everywhere and every line item lands on one of
 * the nine capitals.
 *
 * Types and data only. The single dependency is shared/capitals, so both
 * client and server can import this module.
 */

import { CAPITAL_TYPES, type CapitalType } from "./capitals";

export { CAPITAL_TYPES };
export type { CapitalType };

/** The kinds of need a campaign can post and a contributor can fill. */
export const NEED_KINDS = [
  "item",
  "role",
  "shift",
  "loan",
  "knowledge",
  "crypto",
  "financial_link",
] as const;

export type NeedKind = (typeof NEED_KINDS)[number];

export interface ContributionCategory {
  key: string;
  label: string;
  capital: CapitalType;
  kind: NeedKind;
  examples: string[];
  /** Lucide icon name. Clients map this string to the actual component. */
  icon?: string;
}

/**
 * Every category a contributor can bring, each mapped to a capital and a
 * default need kind. The Crowd Pooling Tool's old flat categories (land,
 * money, vehicles, farming, tools, building, technology, housing) remap
 * onto these with capitals attached; "money" is now "crypto" because
 * national currency routes to partner platforms.
 */
export const CONTRIBUTION_CATEGORIES: ContributionCategory[] = [
  {
    key: "land",
    label: "Land",
    capital: "living",
    kind: "item",
    examples: ["Land parcels", "Property rights", "Long term land access"],
    icon: "TreePine",
  },
  {
    key: "crypto",
    label: "Crypto",
    capital: "financial",
    kind: "crypto",
    examples: ["USDC", "ETH", "Other tokens the project accepts"],
    icon: "Coins",
  },
  {
    key: "vehicles",
    label: "Vehicles",
    capital: "material",
    kind: "item",
    examples: ["Cars", "Trucks", "Trailers"],
    icon: "Car",
  },
  {
    key: "farming",
    label: "Farming Equipment",
    capital: "living",
    kind: "item",
    examples: ["Tractors", "Tillers", "Irrigation gear"],
    icon: "Tractor",
  },
  {
    key: "tools",
    label: "Tools",
    capital: "material",
    kind: "item",
    examples: ["Hand tools", "Power tools", "Shop equipment"],
    icon: "Wrench",
  },
  {
    key: "building",
    label: "Building Supplies",
    capital: "material",
    kind: "item",
    examples: ["Lumber", "Cement", "Roofing", "Hardware"],
    icon: "Hammer",
  },
  {
    key: "technology",
    label: "Technology",
    capital: "intellectual",
    kind: "item",
    examples: ["Computers", "Solar panels", "Communications gear"],
    icon: "Laptop",
  },
  {
    key: "housing",
    label: "Housing and Structures",
    capital: "material",
    kind: "item",
    examples: ["Tiny homes", "Yurts", "Shipping containers"],
    icon: "Home",
  },
  {
    key: "plants",
    label: "Plants and Seeds",
    capital: "living",
    kind: "item",
    examples: ["Fruit trees", "Seed stock", "Nursery starts"],
    icon: "Sprout",
  },
  {
    key: "knowledge",
    label: "Knowledge and Mentorship",
    capital: "intellectual",
    kind: "knowledge",
    examples: ["Permaculture design help", "Legal guidance", "Mentorship sessions"],
    icon: "BookOpen",
  },
  {
    key: "workshops",
    label: "Workshops and Experiences",
    capital: "experiential",
    kind: "knowledge",
    examples: ["Skill workshops", "Guided farm days", "Retreats"],
    icon: "Compass",
  },
  {
    key: "organizing",
    label: "Community Organizing",
    capital: "social",
    kind: "role",
    examples: ["Event coordination", "Volunteer wrangling", "Neighbor outreach"],
    icon: "Users",
  },
  {
    key: "arts",
    label: "Arts and Culture",
    capital: "cultural",
    kind: "role",
    examples: ["Murals", "Music for gatherings", "Ceremony arts"],
    icon: "Palette",
  },
  {
    key: "ceremony",
    label: "Ceremony and Spiritual Guidance",
    capital: "spiritual",
    kind: "role",
    examples: ["Ceremony holding", "Meditation sessions", "Rites of passage"],
    icon: "Sparkles",
  },
  {
    key: "wellness",
    label: "Wellness and Bodywork",
    capital: "health",
    kind: "role",
    examples: ["Yoga classes", "Massage and bodywork", "Herbal support"],
    icon: "HeartPulse",
  },
  {
    key: "other",
    label: "Other",
    capital: "material",
    kind: "item",
    examples: ["Anything else of immediate value"],
    icon: "Package",
  },
];

export interface RoleTemplate {
  title: string;
  description: string;
  defaultHoursPerWeek: number;
  defaultHourlyRate: number;
}

/**
 * The roles a community needs held, organized by the capital they feed.
 * Campaigns post these as role needs; contributors commit to them in the
 * Crowd Pooling Tool with prefilled hours and rates they can adjust.
 */
export const ROLE_TEMPLATES_BY_CAPITAL: Record<CapitalType, RoleTemplate[]> = {
  social: [
    {
      title: "Community Organizer",
      description: "Brings neighbors in, keeps people connected, and turns interest into participation.",
      defaultHoursPerWeek: 10,
      defaultHourlyRate: 25,
    },
    {
      title: "Conflict Evolutionary",
      description: "Helps people work through tension before it hardens, so the community stays whole.",
      defaultHoursPerWeek: 5,
      defaultHourlyRate: 40,
    },
    {
      title: "Welcome Steward",
      description: "First face for newcomers. Gets them oriented, introduced, and contributing.",
      defaultHoursPerWeek: 5,
      defaultHourlyRate: 20,
    },
    {
      title: "Events Weaver",
      description: "Plans and runs the gatherings that keep the community showing up.",
      defaultHoursPerWeek: 8,
      defaultHourlyRate: 25,
    },
  ],
  cultural: [
    {
      title: "Dance Coordinator",
      description: "Organizes dances and movement gatherings that bring the community alive.",
      defaultHoursPerWeek: 4,
      defaultHourlyRate: 30,
    },
    {
      title: "Storyteller",
      description: "Captures and shares the project story in writing, photos, and video.",
      defaultHoursPerWeek: 6,
      defaultHourlyRate: 30,
    },
    {
      title: "Ceremony Arts Lead",
      description: "Creates the visual and artistic elements for gatherings and ceremonies.",
      defaultHoursPerWeek: 4,
      defaultHourlyRate: 30,
    },
    {
      title: "Traditions Keeper",
      description: "Tends the practices, songs, and seasonal rhythms the community returns to.",
      defaultHoursPerWeek: 3,
      defaultHourlyRate: 25,
    },
  ],
  spiritual: [
    {
      title: "Guide",
      description: "Holds space for people working through big questions and transitions.",
      defaultHoursPerWeek: 4,
      defaultHourlyRate: 40,
    },
    {
      title: "Ceremony Holder",
      description: "Leads ceremonies that mark seasons, milestones, and passages.",
      defaultHoursPerWeek: 3,
      defaultHourlyRate: 50,
    },
    {
      title: "Meditation Leader",
      description: "Leads regular sits and quiet practice for the community.",
      defaultHoursPerWeek: 3,
      defaultHourlyRate: 30,
    },
  ],
  health: [
    {
      title: "Yoga Instructor",
      description: "Teaches regular classes that keep bodies strong and nervous systems settled.",
      defaultHoursPerWeek: 4,
      defaultHourlyRate: 50,
    },
    {
      title: "Massage Therapist",
      description: "Gives bodywork that keeps hard-working bodies going.",
      defaultHoursPerWeek: 6,
      defaultHourlyRate: 60,
    },
    {
      title: "Community Fitness Leader",
      description: "Leads group movement, hikes, and training sessions.",
      defaultHoursPerWeek: 4,
      defaultHourlyRate: 30,
    },
    {
      title: "Herbalist",
      description: "Grows and prepares plant medicine, and supports people in using it well.",
      defaultHoursPerWeek: 6,
      defaultHourlyRate: 35,
    },
  ],
  intellectual: [
    {
      title: "Permaculture Designer",
      description: "Designs the food forests, water systems, and land plans the project builds from.",
      defaultHoursPerWeek: 15,
      defaultHourlyRate: 45,
    },
    {
      title: "Governance Advisor",
      description: "Helps the community make decisions well and keep agreements clear.",
      defaultHoursPerWeek: 5,
      defaultHourlyRate: 50,
    },
    {
      title: "Educator",
      description: "Teaches courses and builds learning materials others can use.",
      defaultHoursPerWeek: 10,
      defaultHourlyRate: 40,
    },
  ],
  experiential: [
    {
      title: "Workshop Facilitator",
      description: "Runs hands-on workshops where people learn by doing.",
      defaultHoursPerWeek: 6,
      defaultHourlyRate: 40,
    },
    {
      title: "Apprenticeship Mentor",
      description: "Takes on apprentices and passes skills along one on one.",
      defaultHoursPerWeek: 8,
      defaultHourlyRate: 35,
    },
    {
      title: "Build Lead",
      description: "Leads work parties and builds, keeping crews safe and productive.",
      defaultHoursPerWeek: 12,
      defaultHourlyRate: 40,
    },
  ],
  living: [
    {
      title: "Land Steward",
      description: "Tends the land day to day: soil, water, plantings, and animals.",
      defaultHoursPerWeek: 20,
      defaultHourlyRate: 28,
    },
    {
      title: "Nursery Manager",
      description: "Runs the nursery, from propagation to planting out.",
      defaultHoursPerWeek: 12,
      defaultHourlyRate: 28,
    },
    {
      title: "Seed Keeper",
      description: "Saves, stores, and shares seed so the project stays resilient.",
      defaultHoursPerWeek: 4,
      defaultHourlyRate: 25,
    },
  ],
  material: [
    {
      title: "Carpenter",
      description: "Builds and repairs structures, furniture, and fixtures.",
      defaultHoursPerWeek: 15,
      defaultHourlyRate: 40,
    },
    {
      title: "Builder",
      description: "Handles general construction, from foundations to finish work.",
      defaultHoursPerWeek: 20,
      defaultHourlyRate: 38,
    },
    {
      title: "Mechanic",
      description: "Keeps vehicles, tractors, and tools running.",
      defaultHoursPerWeek: 8,
      defaultHourlyRate: 45,
    },
  ],
  financial: [
    {
      title: "Fundraising Steward",
      description: "Runs campaigns and keeps relationships with funders warm.",
      defaultHoursPerWeek: 10,
      defaultHourlyRate: 40,
    },
    {
      title: "Bookkeeper",
      description: "Keeps the books clean and the numbers honest.",
      defaultHoursPerWeek: 6,
      defaultHourlyRate: 35,
    },
    {
      title: "Capital Stack Coordinator",
      description: "Designs the mix of gifts, loans, and community capital the project runs on.",
      defaultHoursPerWeek: 6,
      defaultHourlyRate: 50,
    },
  ],
};

/** One-line plain-language label and blurb for each of the nine capitals. */
export const CAPITAL_LABELS: Record<CapitalType, { label: string; blurb: string }> = {
  intellectual: {
    label: "Intellectual",
    blurb: "Knowledge, designs, and systems that make the work smarter.",
  },
  social: {
    label: "Social",
    blurb: "Relationships, trust, and the connections that hold a community together.",
  },
  material: {
    label: "Material",
    blurb: "Tools, equipment, buildings, and physical supplies.",
  },
  financial: {
    label: "Financial",
    blurb: "Money and financial instruments. On this platform that means crypto; national currency goes through partners.",
  },
  living: {
    label: "Living",
    blurb: "Soil, water, plants, animals, and the land itself.",
  },
  cultural: {
    label: "Cultural",
    blurb: "Stories, art, music, and the traditions that carry meaning.",
  },
  spiritual: {
    label: "Spiritual",
    blurb: "Purpose, ceremony, and the practices that keep people rooted.",
  },
  experiential: {
    label: "Experiential",
    blurb: "Skills and hands-on wisdom earned by doing the work.",
  },
  health: {
    label: "Health",
    blurb: "Movement, rest, care, and the wellbeing of bodies and minds.",
  },
};

/**
 * Context for crypto contributions. Crypto is the one form of money the
 * platform tracks directly; national currency routes to partner platforms
 * (Ma Earth for donations, GoSteward for loans).
 */
export const CRYPTO_PAYMENT_CONTEXT = {
  /** Chain the platform reads balances from. */
  chain: "Base",
  /** Placeholder until campaign wallets confirm what they accept. */
  acceptedTokens: ["USDC", "ETH"],
  helperText:
    "Crypto pledges are tracked here like any other contribution and delivered wallet to wallet.",
  fiatNote:
    "National currency goes through our partners: Ma Earth for donations, GoSteward for loans.",
  partners: [
    { key: "maearth", name: "Ma Earth", handles: "donations", url: "https://maearth.com" },
    { key: "gosteward", name: "GoSteward", handles: "loans", url: "https://gosteward.com" },
  ],
} as const;

/** Old Crowd Pooling Tool category ids that map onto the new keys. */
export const LEGACY_CATEGORY_KEYS: Record<string, string> = {
  money: "crypto",
};

/**
 * Looks up a category by key. Resolves legacy keys from the old flat
 * category list, so saved data that says "money" finds "crypto". Returns
 * undefined for unknown keys so callers choose their own fallback.
 */
export function categoryForKey(key: string): ContributionCategory | undefined {
  const resolved = LEGACY_CATEGORY_KEYS[key] ?? key;
  return CONTRIBUTION_CATEGORIES.find((c) => c.key === resolved);
}
