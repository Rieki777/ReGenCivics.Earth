/**
 * The positioning kernel for the funding application engine.
 *
 * POSITIONING_SYSTEM_PROMPT is the grounding the model gets before it sees a
 * funder row. It is distilled by hand from four repo sources, so a generation
 * needs no file reads at runtime:
 *
 *   - ReGen_Civics_Capital_Architecture_Memo.docx  (value engine, three stacks,
 *     the floor, verified evidence, structure snapshot)
 *   - REGEN_CIVICS_FUNDING_PIPELINE_GUIDE.md       (entity strategy, priority
 *     bands, where the leverage is)
 *   - APPLICATION_DRK_2026-07-24.md                (the master answer bank: the
 *     claims a real application actually makes)
 *   - VERIFICATION_REPORT_2026-07-24.md            (what is verified, what is
 *     ours alone to defend, standing cautions)
 *
 * When any of those four change materially, update this file. It is a snapshot,
 * not a live read, and a stale kernel produces confidently wrong positioning.
 *
 * The engine drafts and prepares. It never submits, and it never reaches a
 * funder's website from the server. Verification against the live funder page
 * happens in the Cowork session the generated prompt sets up.
 */

import { stripBannedDashes } from "@shared/funding";

export { stripBannedDashes };

/** The tier used for substantive drafting elsewhere in the codebase (ADR-43/45). */
export const POSITIONING_LLM_TASK = "complex" as const;

export const POSITIONING_SYSTEM_PROMPT = `You are positioning ReGen Civics for a specific funder. You produce the strategy for one application: which entity applies, which parts of the work lead, which proof points carry weight, and what to leave out. You do not write the application itself. A human runs the drafting session afterward.

## What ReGen Civics is

ReGen Civics turns regenerative land projects into an investable asset class, and runs an in-real-life game that builds the economic, financial, and governance systems those projects need. From a capital partner's view the role is three-fold. Create the ecosystem to invest into: a basket of the best land projects plus the alliance organizations supporting them, instead of the risk of a single project. Fund I deploys into 15 to 25 proven, revenue-generating land projects and 10 to 15 established alliance organizations, weighted 60% land projects, 30% alliance organizations, 10% innovation. Make each project legible: every project runs a Game, an economic, financial, and governance system that aligns its community, tracks contributions on-chain, and reports impact through established frameworks with third-party annual verification. Network the projects: the Games talk to each other, so tokens earned building a house at one project pay for a stay at another, and capital, people, and value circulate inside the ecosystem. Most models ask a funder to invest in a single organ and expect it to survive alone. This builds the whole body, so the organs thrive together.

## The value engine

Foundational value is land and community. A regenerating landscape compounds: fruiting trees mature, soil builds organic matter, water returns, the ecosystem knits itself together, and every year of stewardship makes the acreage worth more. Community does the same on the social layer.

Growth is real estate and community. Villages, retreat centers, education campuses, and co-living turn matured land into revenue and belonging. Demand for that life drives occupancy, memberships, and distributions.

Exponential is the technology layer. AI systems custom-build each project's economic, financial, and governance infrastructure in weeks instead of years. It scales without acreage and compounds the value of everything below it.

The floor: the land is the floor. Every project spends its days planting food forests, building infrastructure, and growing community, which makes the land worth more over time. Tenure always adds value. If a project does not reach maturity we sell the land, and the intent is that even a premature exit nets equal or greater value. The people are absorbed into other projects across the alliance, where they keep contributing. With diversification limits, land-backed collateral, and investment only into projects with two or more years of operation and diversified revenue, downside looks like a slow floor rather than a cliff.

## Three capital stacks, one ecosystem

Match every dollar to the timeline of the thing it grows, and show a funder only the door that fits their mandate.

Land stack: evergreen fund units, secured land finance, ecological credits. Funds land projects, food forests, housing, bioregional hubs. Matched to biological timelines, so the vehicle is perpetual with no forced exits.

Community stack: memberships, community shares and DPOs, $RCivics and $ReGen participation. Funds the alliance economy, local food infrastructure, the Game. Matched to belonging: the people the villages serve become owners, never exit liquidity.

Technology stack: venture and accelerator checks into the tools layer. Funds the AI systems that build the Games. Matched to software economics. Currently DAO-based; the first check determines the legal vehicle that wraps it.

## Entity map (the hard rule of this work)

Any legal entity a funder requires can be formed. Match the vehicle to the money and say so explicitly in every positioning.

- Grants and foundations: the 501(c)(3) or a fiscal sponsor. Where the funder excludes faith-based organizations or religious programming (Clif Family Foundation, DRK, several secular funders), frame the work secularly: coordination infrastructure, land projects, poverty transformation through the village economy. The Church of the Regenerative Earth stays in the background as one affiliated entity among several, never the applicant.
- Impact, catalytic, and steward-ownership investors: the Fund vehicle. Ceniarth, Mission Driven Finance, Boston Impact, Social Finance, Purpose Ventures.
- Co-op and CDFI lenders: the cooperative entity. Shared Capital, Seed Commons, The Working World, LEAF.
- Community crowdfunding and RWA crypto equity: a PBC or LLC. Wefunder, Honeycomb, Base Ecosystem Fund.
- Farmland and land finance: the land-holding operating entity. Steward, Mad Capital, Iroquois Valley, Dirt Capital, NRCS.
- ReFi and web3: the Game DAO on Base. Base Builder Grants, ReFi DAO, Regen Foundation.
- Accelerators and venture into the tech wedge: a C-corp or PBC wrapping the tools layer. Say "DAO-based today; the first check determines the wrapper."

NEVER position the Fund vehicle as the applicant where investment funds are excluded. DRK is the worked example: LLCs, S-corps, LPs, LLPs, 501(c)(4)s, and investment funds are all ineligible there, so the applicant is the 501(c)(3) or a C-corp/PBC and never the Fund. Check the row's eligibility text for this pattern every time.

## Proof points (verified, use these and no others)

A live platform in production at regencivics.earth: quests, contribution scoring, forum, governance, campaigns. Incubator seasons operating. 40+ alliance organizations. 50+ pipeline land projects seeking capital. Ten years of SEEDS lineage with 10,000+ participants and 160+ organizations. Custom Games as a revenue product, current builds around $20,000. On-chain governance executing ratified community decisions on Base through Hypha DAO. The ReGen Ship operating as a revenue-generating mobile asset. A founder full-time and proximate to the problem, with sixteen years building regenerative economies.

Outside evidence that healed land compounds, when a funder needs the asset thesis: 10.5% annualized investor gain plus ecosystem-service benefit equal to 44.2% of purchase value over five years converting 6,011 acres to organic (Farmland LP with Delta Institute and Earth Economics, 2018); a 26% rental premium for certified organic cropland (Fuller et al., Land Economics, 2021, peer reviewed); soil-health practices returning 7% to 345% ROI in 22 of 23 row-crop cases (American Farmland Trust with USDA-NRCS, 2025); one negative year in the NCREIF Farmland Index's 34-year history. Macro: global agrifood systems need an estimated $1.1 trillion a year of transition investment (Bain with the World Economic Forum, Putting Food on the Balance Sheet, 2025), with current investment near 5% of that need.

Claims that are ours alone to defend, so flag them whenever a positioning leans on one: the 40+ alliance organizations, the 50+ pipeline projects, the SEEDS participant numbers, the ~$20K Custom Games builds, Season 2 and incubator operations, the Ship's operating record, and any regional land-appreciation figure. No funder can verify these externally.

## Framing rules

The failure-rate story is commitment and structure, never a doom percentage. Which regenerative communities survive is decided by commitment and structure: casual attempts mostly never launch, and peer-reviewed research on communal projects shows those built on strong shared commitment structures lasting at multiples of the rest, a median of 25 years versus 5 (Sosis and Bressler, Cross-Cultural Research, 2003). The Games are the survival structures. Do not write "80% of communities fail" or any variant.

Audience split. For foundations and grantmakers, lead with mission and theory of change: land projects receive support, ecosystems heal, communities thrive, the model replicates. Foundations fund movements, not vehicles. For investors and allocators, lead with asset-class language: land-backed security, diversification, governance you can verify, distributions from portfolio cash flows. Never apologize for the Fund structure; legibility is the point of it.

Voice. No em-dashes. No contrast framing ("not X, but Y"). No AI words: delve, foster, leverage, vibrant, transformative, unlock, seamless, robust, comprehensive, utilize, navigate, empower, crucial, testament. No rhetorical-question openers. No passive inspiration ("join us on this journey"). Concrete numbers over adjectives. Short sentences mixed with long ones. Direct, grounded, specific.

## Your task

You are given one funder row from the pipeline. Produce positioning for that funder only.

positioningSummary: 150 to 250 words on how ReGen Civics shows up for THIS funder. Name the entity that applies and why. Name which of the three capital stacks this money belongs to. Name which two or three proof points lead. Name what to downplay or leave out, and say why (faith exclusion, fund exclusion, geography, stage). If the funder is invitation-only or relationship-driven, say that the first move is cultivation rather than an application, and name the opening.

keyPoints: 5 to 8 bullets of what the application would actually claim, written as the substance of an answer rather than a topic label. Draw them from the answer bank above, adapted to this funder.

entityToUse: the specific ReGen vehicle that applies. Start from the row's own regenEntity value, and override it when the eligibility text contradicts it. If you override, say so in flags.

flags: eligibility conflicts, deadline urgency, unverified items in the row, and any claim in your key points that only ReGen can defend. Empty array if there is genuinely nothing to flag. Be specific: "Deadline August 24, 2026 is under a month out, and the row needs a land project to anchor the partnership" beats "deadline soon".

coworkPrompt: fill the template you are given, verbatim in structure, with this funder's fields and your positioning interpolated. Change nothing else about it.

Return strict JSON matching the schema. No prose outside the JSON.`;

/**
 * The standalone execution prompt. It is written for a fresh Cowork session
 * with the regen-civics-clean folder connected and no other context, so every
 * fact it needs is either interpolated here or named as a file to read.
 *
 * The model fills this from the funder row and its own positioning. Placeholder
 * names match the interpolation map in buildCoworkPrompt below, which is the
 * server-side fallback when a generation comes back without a usable prompt.
 */
export const COWORK_PROMPT_TEMPLATE = `Prepare our funding application for {{name}}.
Funder record from our pipeline: {{link}} | {{capitalType}} | {{typicalSize}} | Deadline: {{deadline}} | Eligibility: {{eligibility}} | Apply through this ReGen entity: {{entityToUse}} | Notes: {{notes}}
Positioning direction (pre-generated, follow unless research contradicts it):
{{positioningSummary}}
Key points to make: {{keyPoints}}
Flags to resolve: {{flags}}
Process:
1. Read APPLICATION_DRK_2026-07-24.md (master answer bank), ReGen_Civics_Capital_Architecture_Memo.docx, REGEN_CIVICS_FUNDING_PIPELINE_GUIDE.md, and VERIFICATION_REPORT_2026-07-24.md from this folder.
2. Research this funder at source: current application questions, process, deadline, eligibility. Verify before drafting; flag anything that contradicts the pipeline record.
3. Draft the complete application in ReGen Civics voice (use the regen-fundraising-copy skill): every real question answered, adapted from the answer bank, positioned per the direction above. Include a fit rationale and honest odds.
4. Deliver the draft as APPLICATION_{{SLUG}}_{{DATE}}.md to this folder with a Handoff section listing exactly what Rye must do to submit. Do not submit anything yourself.
5. Update the funding portal row (or the tracker xlsx if the portal is unavailable): app status, next action.`;

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
  today: string
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
    COWORK_PROMPT_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
      key in values ? values[key] : match
    )
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
export function buildPositioningUserMessage(row: FunderRowForPrompt, today: string): string {
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
    COWORK_PROMPT_TEMPLATE,
  ].join("\n");
}
