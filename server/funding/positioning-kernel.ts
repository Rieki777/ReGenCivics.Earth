/**
 * The positioning engine's code half: prompt builders, the output schema, and
 * the neutral fallbacks.
 *
 * The kernel itself (the grounding the model reads before a funder row: what
 * ReGen Civics is, the entity map, proof points, framing rules) is private and
 * lives in the funding_prompts table under POSITIONING_PROMPT_KEY, edited in
 * /admin/funding and seeded by scripts/seed-funding-prompts.ts from a
 * gitignored file. Until 2026-09-27 it was a constant in this file, in a public
 * repo, naming funders and internal strategy (plan P0-7, approved by Rye). Its
 * old text is in git history; Rye deferred any history scrub until after the
 * October application deadlines.
 *
 * The engine drafts and prepares. It never submits, and it never reaches a
 * funder's website from the server. Verification against the live funder page
 * happens in the Cowork session the generated prompt sets up.
 */

import { stripBannedDashes } from "@shared/funding";

export { stripBannedDashes };

/** The tier used for substantive drafting elsewhere in the codebase (ADR-43/45). */
export const POSITIONING_LLM_TASK = "complex" as const;

/** funding_prompts keys for the two texts the engine reads. */
export const POSITIONING_PROMPT_KEY = "positioning_kernel" as const;
export const COWORK_TEMPLATE_KEY = "cowork_template" as const;

/**
 * Used only when no kernel version has been saved. It names no funder and
 * holds no strategy, so the positioning it produces is general on purpose, and
 * it tells the model to flag that the kernel is missing.
 */
export const FALLBACK_POSITIONING_PROMPT = `You are positioning ReGen Civics for one specific funder. You produce the strategy for one application: which entity applies, which parts of the work lead, which proof points carry weight, and what to leave out. You do not write the application itself. A human runs the drafting session afterward.

No positioning kernel has been saved in the admin yet, so you have only the funder row and this short brief. Add the flag "kernel_not_seeded" and keep the positioning general.

## What ReGen Civics is (public description)

ReGen Civics helps regenerative land projects design structures that hold together, and connects them into a network. It runs an in-real-life game and builds free, open tools that a project's own agents can use. A member-owned cooperative network, in which land projects and people buy and steward land together, is in design; it is not a legal entity and accepts no money. Church of the Regenerative Earth is a separate entity.

## Rules

- Never describe financial upside of any kind for anyone who puts money in. Never offer a stake in land projects or in the cooperative.
- Every number you use must be one the admin has confirmed. If a claim cannot be sourced, put it in flags.
- Match the entity to the funder's eligibility text, and say so.
- Voice: no em-dashes, no contrast framing ("not X, but Y"), no rhetorical-question openers, no passive inspiration. Direct, grounded, specific.

## Your task

positioningSummary: 150 to 250 words on how ReGen Civics shows up for THIS funder.
keyPoints: 5 to 8 claims the application would actually make.
entityToUse: the vehicle that applies, from the row's regenEntity unless its eligibility text contradicts it (flag an override).
flags: eligibility conflicts, deadline urgency, unverified items, and "kernel_not_seeded".
coworkPrompt: fill the template you are given, verbatim in structure.

Return strict JSON matching the schema. No prose outside the JSON.`;

/**
 * The standalone execution prompt. Written for a fresh Cowork session with the
 * repo folder connected and no other context, so every fact it needs is
 * interpolated or named as a place to read. The admin can replace it with a
 * saved version under COWORK_TEMPLATE_KEY; placeholder names must stay as they
 * are here, and step 4 must keep the sentence "Do not submit anything
 * yourself", which the server checks before trusting a model's copy.
 */
export const FALLBACK_COWORK_TEMPLATE = `Prepare our funding application for {{name}}.
Funder record from our pipeline: {{link}} | {{capitalType}} | {{typicalSize}} | Deadline: {{deadline}} | Eligibility: {{eligibility}} | Apply through this ReGen entity: {{entityToUse}} | Notes: {{notes}}
Positioning direction (pre-generated, follow unless research contradicts it):
{{positioningSummary}}
Key points to make: {{keyPoints}}
Flags to resolve: {{flags}}
Process:
1. Read the private funding plan and answer bank in docs/private/ of this folder, and the confirmed numbers in /admin/funding (Metrics). Use no number that is not confirmed there.
2. Research this funder at source: current application questions, process, deadline, eligibility. Verify before drafting; flag anything that contradicts the pipeline record.
3. Draft the complete application in ReGen Civics voice (use the regen-fundraising-copy skill): every real question answered within its character limit, positioned per the direction above. Include a fit rationale and honest odds.
4. Deliver the draft as APPLICATION_{{SLUG}}_{{DATE}}.md in docs/private/ with a Handoff section listing exactly what Rye must do to submit. Do not submit anything yourself.
5. Update the funding portal row: app status, next action.`;

/** JSON schema the model must return. Enforced at the invoke layer. */
export const POSITIONING_OUTPUT_SCHEMA = {
  name: "funding_positioning",
  schema: {
    type: "object",
    properties: {
      positioningSummary: {
        type: "string",
        description: "150 to 250 words on how ReGen Civics shows up for this funder.",
      },
      keyPoints: {
        type: "array",
        items: { type: "string" },
        description: "5 to 8 claims the application would actually make.",
      },
      entityToUse: {
        type: "string",
        description: "The ReGen vehicle that applies to this funder.",
      },
      flags: {
        type: "array",
        items: { type: "string" },
        description: "Eligibility conflicts, deadline urgency, unverified items.",
      },
      coworkPrompt: {
        type: "string",
        description: "The execution template, interpolated with this funder and this positioning.",
      },
    },
    required: ["positioningSummary", "keyPoints", "entityToUse", "flags", "coworkPrompt"],
  },
} as const;

export interface PositioningResult {
  positioningSummary: string;
  keyPoints: string[];
  entityToUse: string;
  flags: string[];
  coworkPrompt: string;
}

/** Fields the kernel needs off a funding_pipeline row. */
export interface FunderRowForPrompt {
  name: string;
  category: string;
  capitalType?: string | null;
  whatItFunds?: string | null;
  typicalSize?: string | null;
  geography?: string | null;
  eligibility?: string | null;
  accessStatus?: string | null;
  deadline?: string | null;
  fit?: string | null;
  regenEntity?: string | null;
  link?: string | null;
  notes?: string | null;
  priority?: string | null;
}

/** Slug used in the delivered filename, e.g. APPLICATION_Z_FELLOWS_2026-07-24.md */
export function funderSlug(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, " ")
      .trim()
      .replace(/[\s-]+/g, "_")
      .toUpperCase()
      .slice(0, 60) || "FUNDER"
  );
}

const EMPTY = "(not recorded)";

function orEmpty(value: string | null | undefined): string {
  const s = (value ?? "").trim();
  return s || EMPTY;
}

/**
 * Server-side interpolation of the Cowork template.
 *
 * Used two ways: as the fallback when a generation comes back without a usable
 * coworkPrompt, and as the source of truth for the funder fields inside a
 * prompt the model did produce. The model handles the positioning language; the
 * funder record should never depend on it copying fields correctly.
 */
export function buildCoworkPrompt(
  row: FunderRowForPrompt,
  positioning: { positioningSummary: string; keyPoints: string[]; entityToUse: string; flags: string[] },
  today: string,
  template: string = FALLBACK_COWORK_TEMPLATE,
): string {
  const keyPoints =
    positioning.keyPoints.length > 0
      ? positioning.keyPoints.map((p) => `\n- ${p}`).join("")
      : " (none generated)";
  const flags =
    positioning.flags.length > 0
      ? positioning.flags.map((f) => `\n- ${f}`).join("")
      : " none recorded, verify eligibility and deadline at source anyway";

  const values: Record<string, string> = {
    name: row.name,
    link: orEmpty(row.link),
    capitalType: orEmpty(row.capitalType),
    typicalSize: orEmpty(row.typicalSize),
    deadline: orEmpty(row.deadline),
    eligibility: orEmpty(row.eligibility),
    entityToUse: positioning.entityToUse || orEmpty(row.regenEntity),
    notes: orEmpty(row.notes),
    positioningSummary: positioning.positioningSummary,
    keyPoints,
    flags,
    SLUG: funderSlug(row.name),
    DATE: today,
  };

  // Scrubbed on the way out, so a dash in the research text (the seed carries
  // ranges like "$250K-$5M+") never reaches a prompt Rye pastes.
  return stripBannedDashes(
    template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in values ? values[key] : match)),
  );
}

/** The funder row as the model sees it. One field per line, empty fields dropped. */
export function buildFunderContext(row: FunderRowForPrompt): string {
  const lines: Array<[string, string | null | undefined]> = [
    ["Name", row.name],
    ["Category", row.category],
    ["Priority band", row.priority],
    ["Capital type", row.capitalType],
    ["What it funds", row.whatItFunds],
    ["Typical size", row.typicalSize],
    ["Geography", row.geography],
    ["Eligibility", row.eligibility],
    ["Access status", row.accessStatus],
    ["Deadline", row.deadline],
    ["Fit rating", row.fit],
    ["ReGen entity recorded in the pipeline", row.regenEntity],
    ["Link", row.link],
    ["Research notes", row.notes],
  ];

  return lines
    .filter(([, v]) => (v ?? "").toString().trim().length > 0)
    .map(([label, v]) => `${label}: ${String(v).trim()}`)
    .join("\n");
}

/**
 * The user message for a generation run. Carries the funder row, the template
 * the model must fill, and the slug/date it should use in the filename.
 */
export function buildPositioningUserMessage(
  row: FunderRowForPrompt,
  today: string,
  template: string = FALLBACK_COWORK_TEMPLATE,
): string {
  return [
    "Funder row from the ReGen Civics pipeline:",
    "",
    buildFunderContext(row),
    "",
    "Fill this Cowork prompt template for coworkPrompt. Keep its structure and its five numbered process steps exactly. Replace every {{placeholder}}, using this funder's fields and your own positioning. Use " +
      funderSlug(row.name) +
      " for {{SLUG}} and " +
      today +
      " for {{DATE}}.",
    "",
    template,
  ].join("\n");
}
