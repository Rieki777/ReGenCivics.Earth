/**
 * The Network Grant Engine's matcher (funding engine Phase 5, plan v1.3
 * section 11): which grant programs a land project can apply to, and, for a
 * near miss, the one thing it would need.
 *
 * Rules-based and deterministic, no LLM (STEERING 11). It matches on who can
 * apply first, because many programs pay the producer or the landowner and
 * not a nonprofit, so the legal wrapper decides most matches. Then geography,
 * an independent technical advisor, partner producers, the cost match, and
 * the few programs with an exclusion or an identity requirement.
 *
 * A near miss is exactly one unmet criterion the project could change: add an
 * advisor, find partners, raise a match, apply through a sponsor or partner.
 * Being in the wrong country, or being a faith-based group where a funder
 * excludes them, is never a near miss. The fit number is internal, used only to
 * sort; it is never shown to a steward, and never to an investor (plan 11.2).
 */

export const LEGAL_WRAPPERS = [
  "individual",
  "llc",
  "coop",
  "nonprofit_501c3",
  "fiscal_sponsored",
  "tribe",
  "public_body",
  "unincorporated_collective",
  "other",
] as const;
export type LegalWrapper = (typeof LEGAL_WRAPPERS)[number];

export const WRAPPER_LABELS: Record<LegalWrapper, string> = {
  individual: "an individual or sole proprietor",
  llc: "an LLC or company",
  coop: "a cooperative",
  nonprofit_501c3: "a 501(c)(3) nonprofit",
  fiscal_sponsored: "a fiscally sponsored project",
  tribe: "a tribe or tribal organization",
  public_body: "a public body (government, district, school)",
  unincorporated_collective: "an unincorporated group",
  other: "something else",
};

/** Applicant types as the program seed names them, in plain words. */
const APPLICANT_LABELS: Record<string, string> = {
  individual: "individuals",
  llc: "companies",
  coop: "cooperatives",
  nonprofit_501c3: "nonprofits",
  fiscal_sponsored: "fiscally sponsored projects",
  tribe: "tribes",
  public_body: "public bodies",
  unincorporated_collective: "unincorporated groups",
  producer: "farm and ranch producers",
};

export const ACTIVITIES = ["agriculture", "agroforestry", "forestry", "housing", "education", "energy", "food_hub", "conservation"] as const;
export type Activity = (typeof ACTIVITIES)[number];

export const MATCH_CAPACITY = ["none", "under_10k", "10k_50k", "over_50k"] as const;
export type MatchCapacity = (typeof MATCH_CAPACITY)[number];

export const ADVISOR_OPTIONS = ["none", "independent", "not_independent"] as const;
export type AdvisorOption = (typeof ADVISOR_OPTIONS)[number];

/** Opt-in, self-reported, used only for matching and never shown publicly (plan 11.4). */
export const ELIGIBILITY_FLAGS = ["beginning_farmer", "veteran", "bipoc_led"] as const;
export type EligibilityFlag = (typeof ELIGIBILITY_FLAGS)[number];

export const FLAG_LABELS: Record<EligibilityFlag, string> = {
  beginning_farmer: "beginning farmer",
  veteran: "veteran",
  bipoc_led: "BIPOC-led",
};

export interface FundingProfile {
  legalWrapper: LegalWrapper;
  faithBased: boolean;
  isProducer: boolean;
  /** ISO 3166-1 alpha-2, "US". */
  country: string;
  /** US state or territory code when the country is US, "OR". */
  region: string | null;
  activities: Activity[];
  matchCapacity: MatchCapacity;
  technicalAdvisor: AdvisorOption;
  partnerCount: number;
  eligibilityFlags: EligibilityFlag[];
}

export interface ProgramForMatch {
  id: number;
  name: string;
  audience: "platform" | "project" | "both";
  applicantTypes: string[] | null;
  geo: { countries?: string[]; states?: string[]; scope?: string } | null;
  eligibility: { excludes?: string[]; requiresFlags?: string[] } | null;
  programStatus: string | null;
  matchRequiredPct: number | null;
  requiresTechnicalAdvisor: boolean | null;
  minPartners: number | null;
  callOpen: boolean | null;
  deadlineAt: Date | string | null;
}

export type MatchOutcome = "match" | "near" | "no" | "closed";

export interface MatchResult {
  programId: number;
  outcome: MatchOutcome;
  /** Plain sentences, in the order checked. */
  met: string[];
  unmet: string[];
  /** For a near miss, the one criterion to change. */
  unmetCriterion: string | null;
  /** Internal sort key, 0 to 100. Never shown. */
  fit: number;
}

type Check = { met: boolean; fixable: boolean; metText: string; unmetText: string };

function listWords(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function applicantCheck(profile: FundingProfile, types: string[] | null): Check | null {
  if (!types || types.length === 0) return null;
  const byWrapper = types.includes(profile.legalWrapper);
  const byProducer = profile.isProducer && types.includes("producer");
  const open = listWords(types.map((t) => APPLICANT_LABELS[t] ?? t));
  return {
    met: byWrapper || byProducer,
    // A sponsor or a partner who can apply is a real route for many programs.
    fixable: true,
    metText: byProducer && !byWrapper ? "Open to farm and ranch producers" : `Open to ${WRAPPER_LABELS[profile.legalWrapper]}`,
    unmetText: `Open only to ${open}: apply with a partner or sponsor who is one`,
  };
}

function geographyChecks(profile: FundingProfile, geo: ProgramForMatch["geo"]): Check[] {
  const out: Check[] = [];
  const countries = geo?.countries ?? [];
  if (countries.length && !countries.includes("any")) {
    const ok = countries.includes(profile.country);
    out.push({ met: ok, fixable: false, metText: `Open in ${profile.country}`, unmetText: `Only for land in ${listWords(countries)}` });
    if (!ok) return out;
  }
  const states = geo?.states ?? [];
  if (states.length && profile.country === "US") {
    const ok = !!profile.region && states.includes(profile.region);
    out.push({
      met: ok,
      fixable: false,
      metText: `Open in ${profile.region}`,
      unmetText: profile.region ? `Only in ${listWords(states)}` : `Only in some states: add your state to the profile`,
    });
  }
  return out;
}

/** Match one project against one program. Pure. */
export function matchProgram(profile: FundingProfile, program: ProgramForMatch): MatchResult {
  const base = { programId: program.id, met: [] as string[], unmet: [] as string[], unmetCriterion: null, fit: 0 };
  if (program.programStatus && program.programStatus !== "active") {
    return { ...base, outcome: "closed", unmet: [`Not taking applications (${program.programStatus})`] };
  }

  const checks: Check[] = [];
  const excludes = program.eligibility?.excludes ?? [];
  if (excludes.includes("faith_based")) {
    checks.push({
      met: !profile.faithBased,
      fixable: false,
      metText: "Not a faith-based group, which this funder excludes",
      unmetText: "Does not fund faith-based or religious groups, or projects they sponsor",
    });
  }
  const applicant = applicantCheck(profile, program.applicantTypes);
  if (applicant) checks.push(applicant);
  checks.push(...geographyChecks(profile, program.geo));
  for (const flag of program.eligibility?.requiresFlags ?? []) {
    const label = FLAG_LABELS[flag as EligibilityFlag] ?? flag;
    checks.push({
      met: profile.eligibilityFlags.includes(flag as EligibilityFlag),
      // Unset may just mean not shared yet: say how to share it.
      fixable: true,
      metText: `For ${label} groups`,
      unmetText: `Only for ${label} groups: add it to the profile if it applies`,
    });
  }
  if (program.requiresTechnicalAdvisor) {
    checks.push({
      met: profile.technicalAdvisor === "independent",
      fixable: true,
      metText: "Has an independent technical advisor",
      unmetText: "Needs a technical advisor who is independent of the project",
    });
  }
  if (program.minPartners && program.minPartners > 0) {
    checks.push({
      met: profile.partnerCount >= program.minPartners,
      fixable: true,
      metText: `Has ${program.minPartners} or more partner producers`,
      unmetText: `Needs at least ${program.minPartners} partner producers`,
    });
  }
  if (program.matchRequiredPct && program.matchRequiredPct > 0) {
    checks.push({
      met: profile.matchCapacity !== "none",
      fixable: true,
      metText: `Can bring the ${program.matchRequiredPct}% match`,
      unmetText: `Needs a ${program.matchRequiredPct}% match in cash or in kind`,
    });
  }

  const met = checks.filter((c) => c.met);
  const unmet = checks.filter((c) => !c.met);
  const fit = checks.length ? Math.round((met.length / checks.length) * 100) : 100;
  const result = { ...base, met: met.map((c) => c.metText), unmet: unmet.map((c) => c.unmetText), fit };
  if (unmet.length === 0) return { ...result, outcome: "match" };
  if (unmet.length === 1 && unmet[0].fixable) return { ...result, outcome: "near", unmetCriterion: unmet[0].unmetText };
  return { ...result, outcome: "no" };
}

function deadlineMs(value: Date | string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const t = (value instanceof Date ? value : new Date(value)).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/**
 * Every project-facing program matched, matches first, then near misses, each
 * soonest deadline first. Programs for ReGen itself (audience "platform") are
 * never offered to a project.
 */
export function matchAll(profile: FundingProfile, programs: ProgramForMatch[]): MatchResult[] {
  const rank: Record<MatchOutcome, number> = { match: 0, near: 1, no: 2, closed: 3 };
  const byId = new Map(programs.map((p) => [p.id, p]));
  return programs
    .filter((p) => p.audience !== "platform")
    .map((p) => matchProgram(profile, p))
    .sort(
      (a, b) =>
        rank[a.outcome] - rank[b.outcome] ||
        deadlineMs(byId.get(a.programId)?.deadlineAt ?? null) - deadlineMs(byId.get(b.programId)?.deadlineAt ?? null) ||
        b.fit - a.fit,
    );
}
