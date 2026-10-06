/**
 * The five archetypal contributions, as classes.
 *
 * Copied from Village OS `shared/archetypes.ts` so the keys match.
 * `building`, `researching`, `facilitating`, `catalyzing`, and `storytelling`
 * are identifiers. A renamed key matches nothing. Display names can change.
 * Village OS still owns the canonical character. This copy is the local cast
 * until a public-profile pull exists. See `shared/characterSheet.ts`.
 */

export interface ArchetypeSeed {
  /** Stable identifier. Never a display string. */
  key: string;
  name: string;
  subtitle: string;
  blurb: string;
  examples: string[];
  /** A key into the shared glyph library, never a file path. */
  sigil: string;
}

export const ARCHETYPES: ArchetypeSeed[] = [
  {
    key: "building",
    name: "The Builder",
    subtitle: "Building & Developing",
    blurb: "Creating tools, systems, and infrastructure that serve the regenerative movement.",
    examples: [
      "Building out the village platform",
      "Creating infrastructure for the land",
      "Developing governance tools",
      "Building dashboards and tracking systems",
    ],
    sigil: "hammer",
  },
  {
    key: "researching",
    name: "The Architect",
    subtitle: "Researching & Architecting",
    blurb: "Designing frameworks, exploring possibilities, and mapping the path forward.",
    examples: [
      "Designing tokenomics models",
      "Researching regenerative land practices",
      "Creating organizational frameworks",
      "Mapping ecosystem relationships",
    ],
    sigil: "lens",
  },
  {
    key: "facilitating",
    name: "The Spaceholder",
    subtitle: "Facilitating & Space Holding",
    blurb: "Creating containers for collaboration, learning, and community growth.",
    examples: [
      "Facilitating community sessions",
      "Hosting season incubators",
      "Running onboarding calls",
      "Holding space for conflict resolution",
    ],
    sigil: "circle",
  },
  {
    key: "catalyzing",
    name: "The Catalyst",
    subtitle: "Catalyzing & Connecting",
    blurb: "Weaving relationships, building bridges, and sparking new possibilities.",
    examples: [
      "Helping onboard new land projects",
      "Making key introductions",
      "Connecting people with projects",
      "Building partnership networks",
    ],
    sigil: "thread",
  },
  {
    key: "storytelling",
    name: "The Storyteller",
    subtitle: "Storytelling & Communicating",
    blurb: "Sharing the vision, documenting the journey, and drawing others in.",
    examples: [
      "Telling the story of the land",
      "Creating content that carries the work",
      "Documenting the journey",
      "Keeping the outside world in the loop",
    ],
    sigil: "book",
  },
];

/** Stable identifiers, derived from the cast so the list cannot drift from it. */
export const ARCHETYPE_KEYS: readonly string[] = ARCHETYPES.map((a) => a.key);

export type ArchetypeKey = (typeof ARCHETYPES)[number]["key"];
