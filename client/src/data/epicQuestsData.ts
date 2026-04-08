/**
 * EPIC Quests data, long-form challenges for committed regenerators.
 * Rendered in EpicQuestSection.tsx at the bottom of the /quest page.
 * Placeholder content; will be updated from QUEST_MASTER_SHEET Part 5.
 */

export type EpicTier = "easy" | "hard" | "expert";
export type EpicElement = "earth" | "water" | "fire" | "air";

export interface EpicQuest {
  id: string;
  title: string;
  tier: EpicTier;
  tagline: string;
  description: string;
  duration: string;
  commitment: string;
  regenReward: number;
  element: EpicElement;
}

export const EPIC_QUESTS: EpicQuest[] = [
  // ─── Easy Mode ────────────────────────────────────────────────────────────────
  {
    id: "epic-block-food-forest",
    title: "Block Food Forest",
    tier: "easy",
    tagline: "Transform a street into a forest garden for a day.",
    description:
      "Coordinate the overnight transformation of a street in your city. Host an event where neighbours each bring potted plants, fruit trees, and garden beds, and together you redesign a street as a forest garden for a day. Document the process and the response from people passing by.",
    duration: "1 day event (weeks of coordination)",
    commitment: "Community organizing + event facilitation",
    regenReward: 444,
    element: "earth",
  },
  {
    id: "epic-networked-community-garden",
    title: "Networked Community Garden",
    tier: "easy",
    tagline: "Connect neighbours' plots into one shared growing network.",
    description:
      "Coordinate with neighbours for each household to offer some space on their property for a collective garden. Multiple small plots connected into one shared network, or adopt a vacant lot. Design the shared governance from the start. Document the process.",
    duration: "3-6 months",
    commitment: "Weekly coordination + ongoing tending",
    regenReward: 444,
    element: "earth",
  },
  {
    id: "epic-bioregional-currency",
    title: "Bioregional Currency Launch",
    tier: "easy",
    tagline: "Design and launch a community currency for your neighbourhood.",
    description:
      "Design and launch a community currency for your neighbourhood or bioregion. Host a launch party. Invite people to transact in it. Document the design, the launch, and the first real uses. SEEDS and LocalScale have tools to support this through the Rainbow Seeds Protocol.",
    duration: "2-3 months",
    commitment: "Design, coordination, and launch event",
    regenReward: 444,
    element: "water",
  },

  // ─── Hard Mode ────────────────────────────────────────────────────────────────
  {
    id: "epic-cornfield-to-cloud-forest",
    title: "Cornfield to Cloud Forest",
    tier: "hard",
    tagline: "Transform a conventional agricultural field into a food forest ecosystem.",
    description:
      "Transform a conventional agricultural field into a functioning food forest ecosystem. Full documentation from start to finish: soil testing, design, planting plan, community involvement, and before and after. A multi-season commitment that creates lasting change.",
    duration: "1-3 years",
    commitment: "Active project management + regular site work",
    regenReward: 777,
    element: "earth",
  },
  {
    id: "epic-pasture-to-paradise",
    title: "Pasture to Paradise",
    tier: "hard",
    tagline: "Transform degraded pasture into a thriving food forest and wildlife habitat.",
    description:
      "Transform degraded pasture land into a diverse, productive, thriving food forest and wildlife habitat. A multi-year project. Document the whole arc from degraded land to living abundance.",
    duration: "Multi-year",
    commitment: "Sustained active land stewardship",
    regenReward: 777,
    element: "earth",
  },
  {
    id: "epic-hoa-to-village",
    title: "HOA to Village",
    tier: "hard",
    tagline: "Transform a homeowners association into a functioning village.",
    description:
      "Transform a conventional homeowners association into a functioning village with shared resources, governance, food production, and care networks. Document the governance design and the transition process.",
    duration: "1-2 years",
    commitment: "Community organizing + governance facilitation",
    regenReward: 777,
    element: "fire",
  },
  {
    id: "epic-retreat-center",
    title: "Retreat Center",
    tier: "hard",
    tagline: "Design and build a retreat center serving the regenerative community.",
    description:
      "Design and build a retreat center on or near a land project in the network. The center serves as a base for quests, ceremonies, community gatherings, and healing work. Document the design and construction from vision to opening.",
    duration: "1-2 years",
    commitment: "Project management + hands-on building",
    regenReward: 777,
    element: "earth",
  },
  {
    id: "epic-golf-course",
    title: "Golf Course Transformation",
    tier: "hard",
    tagline: "Transform a golf course into living land.",
    description:
      "Coordinate the transformation of a golf course into a food forest, wildlife corridor, or community land project. This will require coalition building with local government and community groups. Document everything. This is one of the most visible possible acts of regenerative urban transformation.",
    duration: "2-5 years",
    commitment: "Coalition building + ongoing advocacy + land design",
    regenReward: 777,
    element: "earth",
  },
  {
    id: "epic-apartment-building",
    title: "Apartment Building Community",
    tier: "hard",
    tagline: "Transform an apartment building into a regenerative living community.",
    description:
      "Transform a conventional apartment building into a regenerative living community with shared food growing, governance, and mutual support. Design and implement shared agreements, growing spaces, and governance structures. Document the process and the agreements.",
    duration: "6-12 months",
    commitment: "Community facilitation + ongoing coordination",
    regenReward: 777,
    element: "fire",
  },

  // ─── Expert Mode ──────────────────────────────────────────────────────────────
  {
    id: "epic-startup-town",
    title: "Startup Town",
    tier: "expert",
    tagline: "Design and establish a new regenerative settlement from the ground up.",
    description:
      "Coordinate the design and establishment of a new settlement built from the ground up on regenerative principles. Land access, governance design, food systems, energy systems, waste systems, cultural life. This is the long game. Document every step. This is what the Ringing Cedars movement built in Russia, and what is being built again, everywhere.",
    duration: "5+ years",
    commitment: "Life-stage commitment: full community leadership",
    regenReward: 1444,
    element: "earth",
  },
];
