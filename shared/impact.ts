/**
 * The ReGen impact schema (Phase C1, improvement 7): the structured impact
 * record every land project carries, stored in applications.impact_data (JSON)
 * and edited through the admin panel. This is the connective tissue between
 * the game and the capital: it feeds the map layer, investor materials,
 * federation surfaces (/api/federation/projects.json), and eventually
 * quadratic funding weight. Public display always goes through
 * publicImpactSummary(), never the raw record.
 *
 * Common Impact Data Standard (CIDS) alignment, where the mapping is clean:
 *   - hectaresUnderRegeneration -> cids:ImpactScale over cids:Area (hectares)
 *   - waterCapturedM3PerYear / waterRestoredM3PerYear -> cids:Indicator on
 *     water stewardship outcomes, unit cubic meters per year
 *   - soilOrganicMatterPercent -> cids:Indicator, soil health outcome
 *   - foodOutputKgPerYear -> cids:Indicator, production outcome, kg per year
 *   - peopleHoused / peopleFed / peopleTrained -> cids:ImpactDepth over
 *     cids:Stakeholder populations (housed, nourished, trained)
 *   - governanceMaturity + context -> no clean CIDS equivalent; ours
 * Field names stay ours (plain language first); the mapping above is what a
 * CIDS-speaking evaluator or AI ImpactQF round reads.
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

import { z } from "zod";

export const GOVERNANCE_MATURITY_STAGES = [
  "forming", // decisions happen ad hoc, founder-led
  "documented", // agreements and roles are written down
  "practicing", // a named method (sociocracy, consent, council) runs real decisions
  "distributed", // power and stewardship are held by more than the founders
  "regenerative", // governance renews itself: succession, review, evolution built in
] as const;

export const impactDataSchema = z
  .object({
    hectaresUnderRegeneration: z.number().min(0).max(1_000_000).optional(),
    waterCapturedM3PerYear: z.number().min(0).max(1_000_000_000).optional(),
    waterRestoredM3PerYear: z.number().min(0).max(1_000_000_000).optional(),
    soilOrganicMatterPercent: z.number().min(0).max(100).optional(),
    foodOutputKgPerYear: z.number().min(0).max(1_000_000_000).optional(),
    peopleHoused: z.number().int().min(0).max(1_000_000).optional(),
    peopleFed: z.number().int().min(0).max(10_000_000).optional(),
    peopleTrained: z.number().int().min(0).max(10_000_000).optional(),
    governanceMaturity: z.enum(GOVERNANCE_MATURITY_STAGES).optional(),
    /** Free-text context: methods, measurement notes, what the numbers mean here. */
    context: z.string().max(4000).optional(),
    /** ISO timestamp of the last admin edit; stamped by the server. */
    updatedAt: z.string().datetime().optional(),
  })
  .strict();

export type ImpactData = z.infer<typeof impactDataSchema>;

/** Parse a stored impact_data JSON value; null when absent or invalid. */
export function parseImpactData(raw: unknown): ImpactData | null {
  if (raw === null || raw === undefined) return null;
  const value = typeof raw === "string" ? safeJson(raw) : raw;
  const result = impactDataSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * The public shape of a project's impact. Everything in ImpactData is
 * non-personal by construction (aggregate counts and land measures), so the
 * summary passes fields through minus the admin bookkeeping.
 */
export function publicImpactSummary(impact: ImpactData | null): Omit<ImpactData, "updatedAt"> | null {
  if (!impact) return null;
  const { updatedAt: _updatedAt, ...publicFields } = impact;
  const hasAny = Object.values(publicFields).some((v) => v !== undefined);
  return hasAny ? publicFields : null;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
