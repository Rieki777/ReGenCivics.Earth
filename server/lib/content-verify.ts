/**
 * Fact verification for composed drafts (The Harvest, Phase 5+).
 *
 * The voice grader (server/lib/voice-grader.ts) already checks HOW a draft
 * reads. Nothing checked whether it is TRUE. This does: it extracts factual
 * claims from a draft and traces each one to the source material it was
 * composed from, or to the canon facts.
 *
 * This matters most on investor-facing surfaces, where a confidently wrong
 * claim is a liability rather than a typo. The classic failure is the
 * RCVoice/RGVoice token swap, which reads perfectly and is simply false.
 *
 * Routed on the "light" tier (ADR-43): claim extraction against a fixed
 * reference is exactly the cheap-model job that tier exists for.
 *
 * Fails closed. Any error propagates so the caller records the target as
 * 'unverified'. A draft must never be marked verified because the checker
 * broke.
 */

import { invokeLLM, extractJsonObject, type OutputSchema } from "../_core/llm";
import { CANON_FACTS } from "./content-canon";

export interface VerificationFlag {
  claim: string; // the sentence or phrase in question
  problem: string; // what is wrong or unverifiable about it
  severity: "block" | "warn";
  // block = contradicts source or canon (wrong token, invented number)
  // warn  = plausible but not traceable to source (needs a human eye)
}

export interface VerificationResult {
  status: "passed" | "flagged";
  flags: VerificationFlag[];
}

const VERIFY_SCHEMA: OutputSchema = {
  name: "verification_result",
  schema: {
    type: "object",
    properties: {
      flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            claim: { type: "string" },
            problem: { type: "string" },
            severity: { type: "string", enum: ["block", "warn"] },
          },
          required: ["claim", "problem", "severity"],
        },
      },
    },
    required: ["flags"],
  },
};

const SYSTEM_PROMPT = `You are a fact-checker for ReGen Civics published copy.
You receive a draft, the source material it was composed from, and a short
list of canon facts about the organization.

Extract every FACTUAL claim in the draft: numbers, percentages, dates, token
names and mechanics, governance rules, land project details, partner names,
financial or impact claims. Opinions, framing, and metaphors are NOT claims
(the bridge metaphor is fine; "20-40% stakes" is a claim).

For each claim, check it against the source material and the canon facts:
- Supported by source or canon -> no flag.
- CONTRADICTS source or canon (wrong token pairing, wrong number, invented
  entity) -> severity "block".
- Not present in source or canon at all (plausible but untraceable)
  -> severity "warn".

Pay special attention to token mix-ups: RCVoice and $RCivics belong to the
Fund; RGVoice and $ReGen belong to the Game. Any swap is a "block".

Do not flag a claim merely for being vague or badly written. That is the
voice grader's job, not yours. Only factual accuracy.

An empty flags array means the draft passed.

CANON FACTS:
${CANON_FACTS}`;

/** Trace a draft's factual claims to its sources. Throws on checker failure. */
export async function verifyDraft(opts: {
  body: string;
  /** Checked too: the first comment is published text, and it carries the link. */
  firstComment?: string | null;
  sourceText: string;
}): Promise<VerificationResult> {
  const body = opts.body.trim();
  // Nothing to check. An empty draft is a drafting failure, not a fact problem.
  if (!body) return { status: "passed", flags: [] };

  const res = await invokeLLM({
    task: "light",
    maxTokens: 1500,
    outputSchema: VERIFY_SCHEMA,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `DRAFT:
${body}

FIRST COMMENT:
${opts.firstComment?.trim() || "(none)"}

SOURCE MATERIAL:
${opts.sourceText.slice(0, 12000) || "(no source material recorded)"}`,
      },
    ],
  });

  const raw = res.choices?.[0]?.message?.content ?? "";
  const parsed = extractJsonObject(raw);
  if (!parsed) {
    throw new Error(`Verifier returned non-JSON output: ${raw.slice(0, 300)}`);
  }

  const flags = (Array.isArray(parsed.flags) ? parsed.flags : [])
    .filter((f): f is VerificationFlag =>
      Boolean(f) && typeof f === "object" && typeof (f as VerificationFlag).claim === "string")
    .map((f) => ({
      claim: String(f.claim),
      problem: String(f.problem ?? ""),
      // Anything the model invents that is not "block" is treated as a warn,
      // so an unknown severity can never silently pass the approve gate.
      severity: f.severity === "block" ? ("block" as const) : ("warn" as const),
    }));

  return { status: flags.length === 0 ? "passed" : "flagged", flags };
}

/** True when a target must not be approved yet. */
export function hasBlockingFlags(flags: unknown): boolean {
  return Array.isArray(flags) && flags.some((f) => f?.severity === "block");
}
