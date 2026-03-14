/**
 * EPIC Quests — from QUEST_MASTER_SHEET Part 5.
 * These are collective transformation acts, not individual practices.
 * Rendered in EpicQuestSection.tsx at the bottom of the /quest page.
 */

export interface EpicQuest {
  id: string;
  title: string;
  tier: "easy" | "hard" | "expert";
  description: string;
  deliverable: string;
}

export const epicQuestsData: EpicQuest[] = [
  // Easy Mode
  {
    id: "block-food-forest",
    title: "Block Food Forest",
    tier: "easy",
    description:
      "Coordinate the overnight transformation of a street in your city. Host an event where neighbours each bring potted plants, fruit trees, and garden beds, and together redesign a street as a forest garden for a day. Document the process and the response from people passing by.",
    deliverable: "A documented event with before and after, shared with the community.",
  },
  {
    id: "networked-community-garden",
    title: "Networked Community Garden",
    tier: "easy",
    description:
      "Coordinate with neighbours for each household to offer some space on their property for a collective garden. Multiple small plots connected into one shared network, or adopt a vacant lot. Design the shared governance from the start. Document the process.",
    deliverable: "A running networked garden with documented governance agreements.",
  },
  {
    id: "bioregional-currency-launch",
    title: "Bioregional Currency Launch",
    tier: "easy",
    description:
      "Design and launch a community currency for your neighbourhood or bioregion. Host a launch party. Invite people to transact in it. Document the design, the launch, and the first real uses.",
    deliverable: "A launched currency, a launch event, and documentation of the first real uses.",
  },

  // Hard Mode
  {
    id: "cornfield-to-cloud-forest",
    title: "Cornfield to Cloud Forest",
    tier: "hard",
    description:
      "Transform a conventional agricultural field into a functioning food forest ecosystem. Full documentation from start to finish: soil testing, design, planting plan, community involvement, and before and after.",
    deliverable:
      "A fully documented transformation with before and after evidence of ecosystem change.",
  },
  {
    id: "pasture-to-paradise",
    title: "Pasture to Paradise",
    tier: "hard",
    description:
      "Transform degraded pasture land into a diverse, productive, thriving food forest and wildlife habitat. Multi-year project. Document the whole arc, from the first assessment through establishment to the first harvests.",
    deliverable:
      "A multi-year documented transformation showing measurable ecological improvement.",
  },
  {
    id: "hoa-to-village",
    title: "HOA to Village",
    tier: "hard",
    description:
      "Transform a conventional homeowners association into a functioning village with shared resources, governance, food production, and care networks. Document the governance design and the transition process.",
    deliverable: "A running village commons with documented governance and shared systems.",
  },
  {
    id: "retreat-center",
    title: "Retreat Center",
    tier: "hard",
    description:
      "Design and build a retreat center on or near a land project in the network. The center serves as a base for quests, ceremonies, community gatherings, and healing work. Document the design and construction process.",
    deliverable: "A functioning retreat center, documented from design through first event.",
  },
  {
    id: "golf-course",
    title: "Golf Course",
    tier: "hard",
    description:
      "Coordinate the transformation of a golf course into a food forest, wildlife corridor, or community land project. This requires coalition building with local government and community groups. Document everything from initial outreach through transformation.",
    deliverable:
      "A transformed site with full documentation of the coalition-building and transition process.",
  },
  {
    id: "apartment-building",
    title: "Apartment Building",
    tier: "hard",
    description:
      "Transform a conventional apartment building into a regenerative living community with shared food growing, governance, and mutual support. Document the process and the agreements that make it work.",
    deliverable: "A running regenerative apartment community with documented governance and shared systems.",
  },

  // Expert Mode
  {
    id: "startup-town",
    title: "Startup Town",
    tier: "expert",
    description:
      "Coordinate the design and establishment of a new settlement built from the ground up on regenerative principles. Land access, governance design, food systems, energy systems, waste systems, cultural life. This is the long game. Document every step from land access through first permanent residents.",
    deliverable:
      "A settlement with permanent residents, documented from the first conversations through establishment.",
  },
];
