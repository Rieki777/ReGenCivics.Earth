/**
 * EPIC Quests data — long-form challenges for committed regenerators.
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
  // Easy tier
  {
    id: "epic-forest-keeper",
    title: "Forest Keeper",
    tier: "easy",
    tagline: "Tend a patch of wild land for one season",
    description:
      "Commit to visiting, observing, and tending a specific patch of land every week for one full season. Document what you find and what changes.",
    duration: "3 months",
    commitment: "Weekly visits",
    regenReward: 100,
    element: "earth",
  },
  {
    id: "epic-water-steward",
    title: "Water Steward",
    tier: "easy",
    tagline: "Map and protect a local water source",
    description:
      "Identify a local spring, stream, or water body. Monitor its health monthly, clear blockages, and bring at least one other person into stewardship.",
    duration: "3 months",
    commitment: "Monthly monitoring",
    regenReward: 100,
    element: "water",
  },
  {
    id: "epic-community-weaver",
    title: "Community Weaver",
    tier: "easy",
    tagline: "Host 4 gatherings in 4 months",
    description:
      "Host one meaningful gathering per month around food, land, healing, or community building. Each one must include at least 5 people.",
    duration: "4 months",
    commitment: "Monthly gatherings",
    regenReward: 120,
    element: "fire",
  },

  // Hard tier
  {
    id: "epic-food-forest",
    title: "Food Forest Builder",
    tier: "hard",
    tagline: "Plant and establish a food forest",
    description:
      "Design, plant, and maintain a food forest with at least 20 plants including canopy, understory, and ground cover layers. Document each stage.",
    duration: "6 months",
    commitment: "Weekly tending",
    regenReward: 300,
    element: "earth",
  },
  {
    id: "epic-land-guardian",
    title: "Land Guardian",
    tier: "hard",
    tagline: "Take formal stewardship of a piece of land",
    description:
      "Enter a formal stewardship agreement with a land project, community garden, or wild space. Commit to active care and regular documentation for 6 months.",
    duration: "6 months",
    commitment: "Weekly active stewardship",
    regenReward: 350,
    element: "earth",
  },
  {
    id: "epic-healing-practitioner",
    title: "Healing Practitioner",
    tier: "hard",
    tagline: "Facilitate healing for your community",
    description:
      "Lead or co-lead a structured healing program for a group of at least 6 people over 3 months. Include somatic, relational, or land-based practices.",
    duration: "3 months",
    commitment: "Weekly facilitation",
    regenReward: 280,
    element: "water",
  },

  // Expert tier
  {
    id: "epic-land-project",
    title: "Land Project Initiator",
    tier: "expert",
    tagline: "Start or formally join a land project",
    description:
      "Initiate a land-based project or formally join an existing one as a core team member. Apply to the ReGen Civics incubator and complete a full season.",
    duration: "12 months",
    commitment: "Full commitment",
    regenReward: 1000,
    element: "earth",
  },
  {
    id: "epic-bioregional-mapping",
    title: "Bioregional Mapper",
    tier: "expert",
    tagline: "Create a living map of your bioregion",
    description:
      "Produce a comprehensive living map of your bioregion: water systems, food networks, land projects, indigenous territories, and regenerative initiatives.",
    duration: "6 months",
    commitment: "Deep research and fieldwork",
    regenReward: 600,
    element: "air",
  },
];
