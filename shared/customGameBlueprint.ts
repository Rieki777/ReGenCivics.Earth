/**
 * blueprint.json v0.3: the shared shape of a Custom Game blueprint
 * (CUSTOM_GAMES_MASTER_PLAN.md, Phase 0 deliverable).
 *
 * Two artifacts carry a custom game from intake to generation: this structured
 * blueprint (consumed by the create-land-game scaffold) and the intake
 * transcript + uploads (the raw voice the generation session writes content
 * from). Both sides of the pipeline validate against this file:
 *
 *  - `blueprintDraftSchema`: progressive/partial, used at intake. Sylva fills
 *    what she hears; everything is optional and gaps stay visible as gaps.
 *  - `blueprintSchema`: strict/complete, used by the generation pipeline. A
 *    blueprint must pass this before a game is scaffolded from it.
 *
 * Security (BUILD-PLAYBOOK section 4): every string is length-bounded and every
 * array is capped, because intake drafts are built from untrusted applicant
 * text. Integrations hold provider NAMES only; API keys are entered by the
 * client into their own instance post-acceptance and never touch ReGen Civics
 * systems (master plan, Decisions locked #1).
 */
import { z } from "zod";

export const BLUEPRINT_VERSION = "0.3";

// ── Shared enums ──────────────────────────────────────────────────────────────

export const applicantRoleEnum = z.enum(["founder", "investor", "core-team"]);
export const landStatusEnum = z.enum(["owned", "leased", "committed", "seeking"]);
export const technicalComfortEnum = z.enum(["low", "medium", "high"]);
export const hostingEnum = z.enum(["self-hosted", "regen-full-service"]);

export type ApplicantRole = z.infer<typeof applicantRoleEnum>;
export type BlueprintLandStatus = z.infer<typeof landStatusEnum>;
export type BlueprintHosting = z.infer<typeof hostingEnum>;

/**
 * A provider NAME (e.g. "Anthropic", "Resend"). Refuses anything shaped like a
 * credential so a pasted key can never land in a blueprint, even by accident.
 */
const providerName = z
  .string()
  .max(100)
  .refine(
    (v) => !/(sk-|sk_|pk_|api[_-]?key|secret|token|bearer\s|[A-Za-z0-9_-]{40,})/i.test(v),
    { message: "Provider name only. Keys are entered into your own game later and never stored here." },
  );

// ── Section schemas ───────────────────────────────────────────────────────────

const applicantSchema = z.strictObject({
  role: applicantRoleEnum,
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  /** Investor branch: what success for their capital looks like. */
  investorGoals: z.string().max(4000).default(""),
});

const identitySchema = z.strictObject({
  projectName: z.string().min(1).max(255),
  tagline: z.string().max(300).default(""),
  location: z.string().min(1).max(255),
  country: z.string().max(100).default(""),
  landStatus: landStatusEnum,
  acreage: z.number().min(0).max(1_000_000).default(0),
  stage: z.string().max(255).default(""),
  website: z.string().max(500).default(""),
});

/** Powers the honest 3-6 month delivery estimate. */
const teamSchema = z.strictObject({
  adminName: z.string().max(255).default(""),
  adminEmail: z.string().max(255).default(""),
  size: z.number().int().min(0).max(10_000).default(0),
  hoursPerWeek: z.number().min(0).max(168).default(0),
  communityExperience: z.string().max(4000).default(""),
  technicalComfort: technicalComfortEnum.default("low"),
});

const languageSchema = z.strictObject({
  /** Amora's "Amoracita". */
  memberName: z.string().max(100).default(""),
  /** Amora's "Gratitude". */
  currencyName: z.string().max(100).default(""),
  /** Village, sanctuary, farm... */
  communityNoun: z.string().max(100).default(""),
  /** Their Maia; asked at intake. Naming the guide is when the game becomes theirs. */
  guideName: z.string().max(100).default(""),
  /** Tone notes that seed their guide's system prompt. */
  guideVoice: z.string().max(2000).default(""),
});

const themeColorsSchema = z.strictObject({
  primary: z.string().max(60).default(""),
  surface: z.string().max(60).default(""),
  accent: z.string().max(60).default(""),
  text: z.string().max(60).default(""),
});

const themeFontsSchema = z.strictObject({
  display: z.string().max(120).default(""),
  body: z.string().max(120).default(""),
});

const themeAssetsSchema = z.strictObject({
  logo: z.string().max(500).default(""),
  favicon: z.string().max(500).default(""),
  ogImage: z.string().max(500).default(""),
  heroImages: z.array(z.string().max(500)).max(12).default([]),
});

const themeSchema = z.strictObject({
  colors: themeColorsSchema,
  fonts: themeFontsSchema,
  assets: themeAssetsSchema,
  toneWords: z.array(z.string().max(60)).max(12).default([]),
});

/** 1 to N personas, fully data-driven (resident, business builder, core team, investor, or their own). */
const personaSchema = z.strictObject({
  id: z.string().min(1).max(60),
  label: z.string().max(120).default(""),
  enabled: z.boolean().default(true),
  targetCount: z.number().int().min(0).max(1_000_000).default(0),
  currentCount: z.number().int().min(0).max(1_000_000).default(0),
  journeySteps: z.array(z.string().max(2000)).max(40).default([]),
  rights: z.array(z.string().max(1000)).max(40).default([]),
  faqs: z.array(z.strictObject({
    question: z.string().max(500),
    answer: z.string().max(4000),
  })).max(60).default([]),
});

/**
 * Currency model mirrors the Custom-Game-Foundation levers spec
 * (FIXES_TO_MAKE_2026-07-17_FOUNDATION_LEVERS.md in game-amora): a project
 * defines 1..N currencies. Recognition currencies carry NO peg and no posted
 * price. A recognition currency may declare a surface-token release: at cycle
 * close, each holder's share of that cycle's issuance releases a pro-rata share
 * of a governed per-cycle budget of a compensation currency, so the effective
 * value floats cycle to cycle. Reference deployment: ReGen Civics, where
 * received Gratitude releases $ReGen. Custom games mirror that deployment.
 */
const currencySchema = z.strictObject({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  kind: z.enum(["recognition", "compensation", "voice"]),
  fiatExchangeable: z.boolean().default(false),
  peerGivenOnly: z.boolean().default(false),
  grantsVoice: z.boolean().default(false),
  monthlyBudget: z.number().min(0).max(100_000_000).optional(),
  releases: z.strictObject({
    targetCurrencyId: z.string().min(1).max(60),
    budgetPerCycleVar: z.string().min(1).max(120),
    method: z.literal("pro-rata"),
  }).optional(),
}).superRefine((c, ctx) => {
  // Invariants from the levers spec (F4 + release guards):
  if (c.kind === "recognition" && c.grantsVoice) {
    ctx.addIssue({ code: "custom", message: "A recognition currency can never grant voice." });
  }
  if (c.kind === "recognition" && c.fiatExchangeable) {
    ctx.addIssue({ code: "custom", message: "A recognition currency carries no peg and no fiat exchange." });
  }
  if (c.releases && c.releases.targetCurrencyId === c.id) {
    ctx.addIssue({ code: "custom", message: "A currency cannot release into itself." });
  }
});

const economySchema = z.strictObject({
  /** 1..N currencies, the project's call. Cross-currency release targets are
   *  validated at generation time (must exist and be kind "compensation"). */
  currencies: z.array(currencySchema).max(12).default([]),
  currencyMonthlyBudget: z.number().min(0).max(100_000_000).default(0),
  stageMultipliers: z.record(z.string().max(60), z.number()).default({}),
  dues: z.record(z.string().max(60), z.union([z.string().max(500), z.number()])).default({}),
  investor: z.strictObject({
    enabled: z.boolean().default(false),
    summary: z.record(z.string().max(60), z.string().max(2000)).default({}),
  }),
  /** White-labeled reciprocity types (cash, tokens, JV, MOU, their own). */
  exchangeTypes: z.array(z.string().max(120)).max(24).default([]),
});

const stageSchema = z.strictObject({
  id: z.string().min(1).max(60),
  name: z.string().max(120).default(""),
  rule: z.record(z.string().max(60), z.union([z.string().max(500), z.number(), z.boolean()])).default({}),
});

const questSchema = z.strictObject({
  title: z.string().min(1).max(255),
  persona: z.string().max(60).default(""),
  reward: z.number().min(0).max(1_000_000).default(0),
  difficulty: z.string().max(60).default(""),
  circle: z.string().max(120).default(""),
});

/** Config-declared game effects when a form submission is accepted. */
const formOutcomeSchema = z.strictObject({
  form: z.string().min(1).max(120),
  onAccept: z.array(z.enum(["advanceStage", "creditCurrency", "spawnQuest"])).max(6).default([]),
});

const contentSchema = z.strictObject({
  vision: z.string().min(1).max(8000),
  story: z.string().max(8000).default(""),
  values: z.array(z.string().max(300)).max(24).default([]),
  /** Coordination pains; feeds quest design. */
  problems: z.array(z.string().max(2000)).max(24).default([]),
  /** Ranked curriculum topics the game must accomplish. */
  goals: z.array(z.string().max(300)).max(24).default([]),
});

const seasonSchema = z.strictObject({
  name: z.string().max(120).default(""),
  theme: z.string().max(255).default(""),
  start: z.string().max(30).default(""),
  end: z.string().max(30).default(""),
});

/** Provider NAMES only, never keys (Decisions locked #1). */
const integrationsSchema = z.strictObject({
  llmProvider: providerName.default(""),
  emailProvider: providerName.default(""),
  analytics: providerName.default(""),
});

const deploymentSchema = z.strictObject({
  domain: z.string().max(255).default(""),
  hosting: hostingEnum,
  adminEmails: z.array(z.string().email().max(255)).max(10).default([]),
  timelineEstimate: z.string().max(255).default(""),
});

const generationInputsSchema = z.strictObject({
  transcriptRef: z.string().max(500).default(""),
  /** Logo, land photos, vision docs, master plans. URL references for now; the upload primitive lands with the foundation (master plan B2 #15). */
  uploads: z.array(z.string().max(1000)).max(40).default([]),
});

// ── The strict blueprint (generation gate) ────────────────────────────────────

export const blueprintSchema = z.strictObject({
  blueprintVersion: z.literal(BLUEPRINT_VERSION),
  foundationVersion: z.string().max(20),
  applicant: applicantSchema,
  identity: identitySchema,
  team: teamSchema,
  language: languageSchema,
  theme: themeSchema,
  personas: z.array(personaSchema).min(1).max(8),
  economy: economySchema,
  stages: z.array(stageSchema).max(24).default([]),
  quests: z.array(questSchema).max(200).default([]),
  formOutcomes: z.array(formOutcomeSchema).max(24).default([]),
  content: contentSchema,
  season: seasonSchema,
  integrations: integrationsSchema,
  deployment: deploymentSchema,
  generationInputs: generationInputsSchema,
});

export type Blueprint = z.infer<typeof blueprintSchema>;

// ── The progressive draft (intake) ────────────────────────────────────────────
// Zod 4 removed .deepPartial(), so the draft is composed by hand: every section
// is optional, and within each section every field is optional. Gaps are data
// (Sylva flags what she never heard), so nothing is defaulted or invented here.

export const blueprintDraftSchema = z.strictObject({
  blueprintVersion: z.string().max(10).optional(),
  foundationVersion: z.string().max(20).optional(),
  applicant: applicantSchema.partial().optional(),
  identity: identitySchema.partial().optional(),
  team: teamSchema.partial().optional(),
  language: languageSchema.partial().optional(),
  theme: z.strictObject({
    colors: themeColorsSchema.partial().optional(),
    fonts: themeFontsSchema.partial().optional(),
    assets: themeAssetsSchema.partial().optional(),
    toneWords: z.array(z.string().max(60)).max(12).optional(),
  }).optional(),
  personas: z.array(personaSchema.partial()).max(8).optional(),
  economy: z.strictObject({
    currencies: z.array(currencySchema).max(12).optional(),
    currencyMonthlyBudget: z.number().min(0).max(100_000_000).optional(),
    stageMultipliers: z.record(z.string().max(60), z.number()).optional(),
    dues: z.record(z.string().max(60), z.union([z.string().max(500), z.number()])).optional(),
    investor: z.strictObject({
      enabled: z.boolean().optional(),
      summary: z.record(z.string().max(60), z.string().max(2000)).optional(),
    }).optional(),
    exchangeTypes: z.array(z.string().max(120)).max(24).optional(),
    /** Free-text reward instincts from intake; shaped into budgets during co-creation. */
    rewardInstincts: z.string().max(4000).optional(),
  }).optional(),
  stages: z.array(stageSchema.partial()).max(24).optional(),
  quests: z.array(questSchema.partial()).max(200).optional(),
  formOutcomes: z.array(formOutcomeSchema.partial()).max(24).optional(),
  content: contentSchema.partial().optional(),
  season: seasonSchema.partial().optional(),
  integrations: integrationsSchema.partial().optional(),
  deployment: z.strictObject({
    domain: z.string().max(255).optional(),
    hosting: hostingEnum.optional(),
    adminEmails: z.array(z.string().email().max(255)).max(10).optional(),
    timelineEstimate: z.string().max(255).optional(),
    /** Intake-only: their explicit yes to the $20,000 investment. */
    budgetConfirmed: z.boolean().optional(),
    /** Intake-only: how they found us. */
    referralSource: z.string().max(255).optional(),
  }).optional(),
  generationInputs: generationInputsSchema.partial().optional(),
});

export type BlueprintDraft = z.infer<typeof blueprintDraftSchema>;
