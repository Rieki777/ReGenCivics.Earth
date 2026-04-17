/**
 * Historical Contribution tier config. Shared across claim flow, contributor cards, admin review.
 */

export type ClaimType = "individual" | "organization";

export interface TierDef {
  tier: string;
  label: string;
  usd: number;
  tokens: number;
  color: string;
  description: string;
}

export const individualTiers: TierDef[] = [
  { tier: "seed",       label: "Seed",       usd: 750,     tokens: 75_000,     color: "#8BC34A", description: "A beginning. Early steps, personal practice, or a small contribution that still matters." },
  { tier: "sprout",     label: "Sprout",     usd: 3_500,   tokens: 350_000,    color: "#4CAF50", description: "Work that has taken root. Months or a few years of consistent contribution." },
  { tier: "sapling",    label: "Sapling",    usd: 15_000,  tokens: 1_500_000,  color: "#1a472a", description: "Years of showing up. Real outputs that others have used or built on." },
  { tier: "grove",      label: "Grove",      usd: 50_000,  tokens: 5_000_000,  color: "#0d2818", description: "Wide reach across capitals. Work that has shaped a field or held a community." },
  { tier: "old_growth", label: "Old Growth", usd: 150_000, tokens: 15_000_000, color: "#004D40", description: "Decades of deep work. Generational reach. A keystone contributor." },
];

export const orgTiers: TierDef[] = [
  { tier: "roots",    label: "Roots",    usd: 20_000,    tokens: 2_000_000,    color: "#795548", description: "A local or regional organization holding infrastructure that others build on." },
  { tier: "canopy",   label: "Canopy",   usd: 200_000,   tokens: 20_000_000,   color: "#33691E", description: "Multi-region reach. Stewarding capital for many people or projects." },
  { tier: "mycelium", label: "Mycelium", usd: 1_000_000, tokens: 100_000_000,  color: "#311B92", description: "Foundational. A network, fund, or ecosystem that holds many others." },
];

export function getTierDef(tier: string | null | undefined): TierDef | undefined {
  if (!tier) return undefined;
  return [...individualTiers, ...orgTiers].find((t) => t.tier === tier);
}

/** The 8 forms of capital used in Screen 4. */
export const capitalForms = [
  { id: "material",     label: "Material",     description: "Land, tools, infrastructure, seeds, physical stewardship." },
  { id: "financial",    label: "Financial",    description: "Money raised, funded, moved, or stewarded for regeneration." },
  { id: "living",       label: "Living",       description: "Biodiversity, soil, water, care for beings and ecosystems." },
  { id: "social",       label: "Social",       description: "Relationships, trust, networks, conflict work, community facilitation." },
  { id: "intellectual", label: "Intellectual", description: "Frameworks, tools, research, methodologies, curricula." },
  { id: "experiential", label: "Experiential", description: "Skills, embodied knowledge, craft, years of practice." },
  { id: "cultural",     label: "Cultural",     description: "Story, art, music, ceremony, language keeping." },
  { id: "spiritual",    label: "Spiritual",    description: "Prayer, vision, grief work, ancestral repair, holding the sacred." },
];

export const capitalFormColors: Record<string, string> = {
  material: "#8d6e63",
  financial: "#ffb74d",
  living: "#66bb6a",
  social: "#42a5f5",
  intellectual: "#ab47bc",
  experiential: "#26a69a",
  cultural: "#ec407a",
  spiritual: "#7e57c2",
};

export const tangibleOutputTypes = [
  { id: "tool_software",           label: "Tool or software" },
  { id: "curriculum_course",       label: "Curriculum or course" },
  { id: "methodology_framework",   label: "Methodology or framework" },
  { id: "templates_guides",        label: "Templates or guides" },
  { id: "physical_space",          label: "Physical space or place" },
  { id: "network_community",       label: "Network or community" },
  { id: "publications_research",   label: "Publications or research" },
  { id: "art_media",               label: "Art or media" },
  { id: "financial_infrastructure", label: "Financial infrastructure" },
  { id: "other",                   label: "Something else" },
];

export const individualReachOptions = [
  { id: "under_50",     label: "Under 50 people" },
  { id: "50_200",       label: "50 to 200 people" },
  { id: "200_1000",     label: "200 to 1,000 people" },
  { id: "1000_plus",    label: "More than 1,000 people" },
  { id: "generational", label: "Generational (work that will outlive me)" },
];

export const orgReachOptions = [
  { id: "under_500",  label: "Under 500 people or members" },
  { id: "500_5000",   label: "500 to 5,000" },
  { id: "5000_plus",  label: "More than 5,000" },
];

export const durationOptions = [
  { id: "under_1_year",  label: "Less than 1 year" },
  { id: "1_3_years",     label: "1 to 3 years" },
  { id: "3_5_years",     label: "3 to 5 years" },
  { id: "5_10_years",    label: "5 to 10 years" },
  { id: "10_plus_years", label: "More than 10 years" },
];
