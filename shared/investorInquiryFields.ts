/**
 * Investor inquiry field registry for admin detail panels.
 * Keys match drizzle `investor_inquiries` / InvestorForm — not legacy aliases.
 */

export const EMPTY_INVESTOR_ANSWER = "—";

export type InvestorInquiryFieldType = "text" | "longtext" | "enum" | "booleanish" | "url_list";

export type InvestorInquiryFieldDef = {
  key: string;
  label: string;
  type: InvestorInquiryFieldType;
  section: string;
  valueLabels?: Record<string, string>;
};

export const INVESTOR_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  family_office: "Family office",
  foundation: "Foundation",
  impact_fund: "Impact fund",
  institutional: "Institutional",
  other: "Other",
};

export const INVESTMENT_RANGE_LABELS: Record<string, string> = {
  under_250k: "Under $250K",
  "250k_1m": "$250K – $1M",
  "1m_5m": "$1M – $5M",
  "5m_10m": "$5M – $10M",
  over_10m: "Over $10M",
  // Legacy
  under_10k: "Under $10K (legacy)",
  "10k_50k": "$10K – $50K (legacy)",
  "50k_100k": "$50K – $100K (legacy)",
  "100k_500k": "$100K – $500K (legacy)",
  "500k_1m": "$500K – $1M (legacy)",
  over_1m: "Over $1M (legacy)",
};

export const INVESTMENT_TIMELINE_LABELS: Record<string, string> = {
  immediate: "Immediate",
  "3_months": "Within 3 months",
  "6_months": "Within 6 months",
  "1_year": "Within 1 year",
  exploring: "Exploring",
};

export const PRIMARY_INTEREST_LABELS: Record<string, string> = {
  land_projects: "Land projects",
  // fund-claims-allow: investor inquiry enum key and display label; not a product claim
  alliance_fund: "Alliance fund",
  both: "Both",
};

export const PREFERRED_CONTACT_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  video_call: "Video call",
};

export const INVESTOR_INQUIRY_FIELDS: InvestorInquiryFieldDef[] = [
  { key: "fullName", label: "Full name", type: "text", section: "Contact" },
  { key: "email", label: "Email", type: "text", section: "Contact" },
  { key: "phone", label: "Phone", type: "text", section: "Contact" },
  { key: "organization", label: "Organization", type: "text", section: "Contact" },
  { key: "role", label: "Role", type: "text", section: "Contact" },
  { key: "location", label: "Location", type: "text", section: "Contact" },
  {
    key: "preferredContact",
    label: "Preferred contact",
    type: "enum",
    section: "Contact",
    valueLabels: PREFERRED_CONTACT_LABELS,
  },

  {
    key: "investorType",
    label: "Investor type",
    type: "enum",
    section: "Investment profile",
    valueLabels: INVESTOR_TYPE_LABELS,
  },
  {
    key: "investmentRange",
    label: "Investment range",
    type: "enum",
    section: "Investment profile",
    valueLabels: INVESTMENT_RANGE_LABELS,
  },
  {
    key: "investmentTimeline",
    label: "Timeline",
    type: "enum",
    section: "Investment profile",
    valueLabels: INVESTMENT_TIMELINE_LABELS,
  },
  {
    key: "primaryInterest",
    label: "Primary interest",
    type: "enum",
    section: "Investment profile",
    valueLabels: PRIMARY_INTEREST_LABELS,
  },
  {
    key: "geographicPreference",
    label: "Geographic preference",
    type: "longtext",
    section: "Investment profile",
  },
  {
    key: "sectorInterests",
    label: "Sector interests",
    type: "longtext",
    section: "Investment profile",
  },

  {
    key: "investmentExperience",
    label: "Investment experience",
    type: "longtext",
    section: "Background",
  },
  { key: "motivations", label: "Motivations", type: "longtext", section: "Background" },
  { key: "impactGoals", label: "Impact goals", type: "longtext", section: "Background" },
  {
    key: "questionsForTeam",
    label: "Questions for the team",
    type: "longtext",
    section: "Background",
  },

  { key: "referralSource", label: "How they found us", type: "text", section: "Extra" },
  { key: "additionalNotes", label: "Additional notes", type: "longtext", section: "Extra" },
  { key: "needsText", label: "Needs", type: "longtext", section: "Extra" },
  { key: "offersText", label: "Offers", type: "longtext", section: "Extra" },
  {
    key: "newsletterOptIn",
    label: "Newsletter opt-in",
    type: "booleanish",
    section: "Extra",
  },
];

export type FormattedInvestorAnswer = {
  key: string;
  label: string;
  section: string;
  displayValue: string;
  kind: "text" | "longtext" | "empty";
  isEmpty: boolean;
};

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

export function formatInvestorInquiryAnswers(
  record: Record<string, unknown> | null | undefined,
): FormattedInvestorAnswer[] {
  const r = record ?? {};
  return INVESTOR_INQUIRY_FIELDS.map((field) => {
    const raw = r[field.key];
    let display: string | null = null;

    if (field.type === "booleanish") {
      if (raw === true || raw === 1 || raw === "1") display = "Yes";
      else if (raw === false || raw === 0 || raw === "0") display = "No";
      else display = isBlank(raw) ? null : String(raw);
    } else if (field.type === "enum") {
      if (!isBlank(raw)) {
        const code = String(raw);
        display = field.valueLabels?.[code] ?? code.replace(/_/g, " ");
      }
    } else {
      display = isBlank(raw) ? null : String(raw).trim();
    }

    const isEmpty = display == null || display === "";
    return {
      key: field.key,
      label: field.label,
      section: field.section,
      displayValue: isEmpty ? EMPTY_INVESTOR_ANSWER : display!,
      kind: isEmpty ? "empty" : field.type === "longtext" ? "longtext" : "text",
      isEmpty,
    };
  });
}

export function groupInvestorInquiryAnswers(
  answers: FormattedInvestorAnswer[],
): Array<{ section: string; answers: FormattedInvestorAnswer[] }> {
  const order = ["Contact", "Investment profile", "Background", "Extra"];
  const bySection = new Map<string, FormattedInvestorAnswer[]>();
  for (const a of answers) {
    const list = bySection.get(a.section) ?? [];
    list.push(a);
    bySection.set(a.section, list);
  }
  return order
    .filter((s) => bySection.has(s))
    .map((section) => ({ section, answers: bySection.get(section)! }));
}

export function investorInquiryFieldKeys(): string[] {
  return INVESTOR_INQUIRY_FIELDS.map((f) => f.key);
}
