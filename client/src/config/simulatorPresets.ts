/**
 * Game simulator scenario presets. Click a preset to apply a delta on top
 * of the baseline state. Each preset becomes a history entry the user can
 * undo.
 *
 * To add a preset, drop a new entry here. The keys must match SimState
 * fields in client/src/pages/GameMechanics.tsx.
 */
export type Preset = {
  id: string;
  label: string;
  description: string;
  delta: Record<string, number>;
};

export const SIMULATOR_PRESETS: Preset[] = [
  {
    id: "double-harvest",
    label: "Double the harvest pool",
    description: "What happens if the seasonal harvest pool doubles?",
    delta: { harvestPoolSize: 100_000 },
  },
  {
    id: "half-quest-weight",
    label: "Halve quest weight",
    description: "What if quests count half as much toward score?",
    delta: { questWeight: 5 },
  },
  {
    id: "triple-gratitude",
    label: "Triple gratitude budget",
    description: "Bigger lunar gratitude budget per cycle.",
    delta: { gratitudeBudget: 300 },
  },
  {
    id: "high-trust",
    label: "High trust everywhere",
    description: "Push the trust multiplier range up.",
    delta: { trustMultiplierMin: 2.0, trustMultiplierMax: 4.0 },
  },
  {
    id: "no-decay",
    label: "Turn off composting decay",
    description: "Old contributions never lose value.",
    delta: { compostingDecay: 0 },
  },
  {
    id: "wide-distribution",
    label: "Spread gratitude wider",
    description: "Twice as many recipients per cycle.",
    delta: { gratitudeRecipients: 20 },
  },
];
