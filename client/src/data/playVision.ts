/**
 * Vision Plays: shared constants for the needs-first play format and the
 * robustness self-test.
 *
 * A Vision Play is a designed economic system: a whole proposal for how a
 * community meets its needs. It sits in the same library as Culture Plays
 * (the 14-section packaged cultures from operating communities) with a
 * lifecycle of envisioned -> trialed -> practiced.
 *
 * The robustness dimensions are drawn from biologist Olivier Hamant's work
 * on how living systems endure (The Great Simplification, episode 230):
 * life selects for the capacity to stay viable through fluctuation, and the
 * systems that last share these marks.
 */

export const ROBUSTNESS_DIMENSIONS = [
  {
    key: "redundancy",
    label: "Redundancy",
    helper:
      "More than one way to meet each core need. When one pathway fails, others hold.",
  },
  {
    key: "diversity",
    label: "Diversity",
    helper:
      "Heterogeneity of people, skills, crops, income streams, and strategies.",
  },
  {
    key: "biophilia",
    label: "Living-World Link",
    helper:
      "The play deepens its members' relationship with living systems.",
  },
  {
    key: "rootedness",
    label: "Rootedness",
    helper:
      "Designed for a real place: its bioregion, watershed, and neighbors.",
  },
  {
    key: "slack",
    label: "Slack and Sufficiency",
    helper:
      "Reserves, rest, and margins built in. Enough beats maximum.",
  },
  {
    key: "circularity",
    label: "Circularity and Cooperation",
    helper:
      "Wastes become inputs. Symbiosis carries more weight than competition.",
  },
] as const;

export type RobustnessKey = (typeof ROBUSTNESS_DIMENSIONS)[number]["key"];

export type RobustnessScores = Partial<Record<RobustnessKey, number>> & {
  note?: string;
};

/** Average of the six scores, or null when none are present. */
export function robustnessAverage(
  scores: RobustnessScores | null | undefined,
): number | null {
  if (!scores) return null;
  const values = ROBUSTNESS_DIMENSIONS.map((d) => scores[d.key]).filter(
    (v): v is number => typeof v === "number" && v >= 1 && v <= 5,
  );
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/**
 * The baseline needs floor. Every Vision Play declares its own needs set and
 * weighting (that is part of the design), and must at minimum address these:
 * the nine fundamental human needs (after Manfred Max-Neef) plus the needs
 * of the more-than-human world.
 */
export const BASELINE_NEEDS = [
  "Subsistence",
  "Protection",
  "Affection",
  "Understanding",
  "Participation",
  "Idleness",
  "Creation",
  "Identity",
  "Freedom",
  "The more-than-human world",
] as const;

/**
 * The Vision Play format. The first and last entries map to their own
 * columns (needsFramework, receipts); the middle entries reuse existing
 * play section columns with vision-specific meaning.
 */
export const VISION_SECTIONS = [
  {
    key: "needsFramework",
    label: "The Needs",
    helper:
      "Which needs does your play honor, how are they weighted, and how do you measure whether each is met? Cover the baseline at minimum: " +
      BASELINE_NEEDS.join(", ") +
      ".",
  },
  {
    key: "sectionIdentity",
    label: "Vision and Origin",
    helper: "What is this play, where did it come from, and who is it for?",
  },
  {
    key: "sectionEconomics",
    label: "Meeting Needs: The Coordination Design",
    helper:
      "How people, resources, and information move so needs get met. Currencies, commons, markets, gifts, planning, any mix.",
  },
  {
    key: "sectionGovernance",
    label: "Steering",
    helper:
      "How the play steers itself: decisions, course corrections, who holds the wheel.",
  },
  {
    key: "sectionLandEcology",
    label: "The More-Than-Human World",
    helper:
      "How the play counts and meets the needs of soil, water, forests, and wildlife.",
  },
  {
    key: "sectionScaling",
    label: "Growth and Adaptation",
    helper: "What happens under shocks and growth: 10 people, 100, 1000.",
  },
  {
    key: "receipts",
    label: "Receipts",
    helper:
      "Where has this play, or its parts, run in reality? How long, at what scale? New designs are welcome; just say so.",
  },
] as const;

/**
 * Card and detail labels for the lifecycle: Envisioned -> In Trial ->
 * Practiced. A vision play is "in trial" once a Crowdpooling campaign has
 * been launched from it or a project has adopted it.
 */
export function playKindLabel(
  kind: string | null | undefined,
  totalAdoptions?: number | null,
  campaignId?: number | null,
): string {
  if (kind === "vision") {
    return (totalAdoptions ?? 0) > 0 || campaignId ? "In Trial" : "Envisioned";
  }
  return "Practiced";
}
