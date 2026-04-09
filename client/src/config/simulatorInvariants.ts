/**
 * Simulator guardrails. Each invariant returns true when VIOLATED.
 * The simulator UI shows a red banner listing every violation and
 * disables the "Copy as forum post" / "Copy for Hypha" buttons.
 */
export type SimulatorInvariant = {
  id: string;
  test: (s: Record<string, number>) => boolean;
  message: string;
  severity: "error" | "warn";
};

export const SIMULATOR_INVARIANTS: SimulatorInvariant[] = [
  {
    id: "harvest-positive",
    test: (s) => s.harvestPoolSize <= 0,
    message: "Harvest pool must be greater than zero.",
    severity: "error",
  },
  {
    id: "quest-weight-non-negative",
    test: (s) => s.questWeight < 0,
    message: "Quest weight cannot be negative.",
    severity: "error",
  },
  {
    id: "forum-weight-non-negative",
    test: (s) => s.forumWeight < 0,
    message: "Forum weight cannot be negative.",
    severity: "error",
  },
  {
    id: "trust-range-ordered",
    test: (s) => s.trustMultiplierMax < s.trustMultiplierMin,
    message: "Trust multiplier max must be greater than min.",
    severity: "error",
  },
  {
    id: "decay-bounds",
    test: (s) => s.compostingDecay < 0 || s.compostingDecay > 1,
    message: "Composting decay must be between 0 and 1.",
    severity: "error",
  },
  {
    id: "gratitude-budget-positive",
    test: (s) => s.gratitudeBudget <= 0,
    message: "Gratitude budget must be greater than zero.",
    severity: "error",
  },
  {
    id: "harvest-very-low",
    test: (s) => s.harvestPoolSize > 0 && s.harvestPoolSize < 10_000,
    message: "Harvest pool below $10K is impractically small for a real season.",
    severity: "warn",
  },
];

export function checkInvariants(state: Record<string, number>) {
  return SIMULATOR_INVARIANTS.filter((inv) => inv.test(state));
}
