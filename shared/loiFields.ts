/**
 * Letter of Intent (LOI) field registry for admin detail panels.
 * Keys match drizzle `letter_of_intent` / LOI form. Empty/missing → "—".
 */

export const EMPTY_LOI_ANSWER = "—";

export type LoiFieldType = "text" | "longtext" | "enum" | "currency" | "string_array";

export type LoiFieldDef = {
  key: string;
  label: string;
  type: LoiFieldType;
  section: string;
  valueLabels?: Record<string, string>;
};

export const LOI_INVESTOR_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  family_office: "Family Office",
  foundation: "Foundation",
  impact_fund: "Impact Fund",
  institutional: "Institutional",
  other: "Other",
};

export const LOI_TIMELINE_LABELS: Record<string, string> = {
  immediate: "Immediate",
  "3_months": "Within 3 months",
  "6_months": "Within 6 months",
  "1_year": "Within 1 year",
  flexible: "Flexible",
};

export const LOI_SECTIONS = [
  "Contact",
  "Investment details",
  "Preferences",
  "Additional information",
] as const;

export const LOI_FIELDS: LoiFieldDef[] = [
  { key: "fullName", label: "Name", type: "text", section: "Contact" },
  { key: "email", label: "Email", type: "text", section: "Contact" },
  { key: "phone", label: "Phone", type: "text", section: "Contact" },
  { key: "organization", label: "Organization", type: "text", section: "Contact" },
  { key: "role", label: "Role", type: "text", section: "Contact" },

  { key: "pledgeAmount", label: "Pledge amount", type: "currency", section: "Investment details" },
  {
    key: "investorType",
    label: "Investor type",
    type: "enum",
    section: "Investment details",
    valueLabels: LOI_INVESTOR_TYPE_LABELS,
  },
  {
    key: "investmentTimeline",
    label: "Investment timeline",
    type: "enum",
    section: "Investment details",
    valueLabels: LOI_TIMELINE_LABELS,
  },

  {
    key: "geographicPreference",
    label: "Geographic preference",
    type: "longtext",
    section: "Preferences",
  },
  {
    key: "sectorInterests",
    label: "Sector interests",
    type: "string_array",
    section: "Preferences",
  },

  { key: "motivations", label: "Motivations", type: "longtext", section: "Additional information" },
  {
    key: "questionsForTeam",
    label: "Questions",
    type: "longtext",
    section: "Additional information",
  },
  {
    key: "additionalNotes",
    label: "Additional notes",
    type: "longtext",
    section: "Additional information",
  },
  {
    key: "referralSource",
    label: "Referral source",
    type: "text",
    section: "Additional information",
  },
];

export type FormattedLoiAnswer = {
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
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function parseJsonArray(raw: unknown): unknown[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [trimmed];
  } catch {
    // Comma-separated or bare string stored without JSON.
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }
}

export function formatLoiAnswers(
  record: Record<string, unknown> | null | undefined,
): FormattedLoiAnswer[] {
  const r = record ?? {};
  return LOI_FIELDS.map((field) => {
    const raw = r[field.key];
    let display: string | null = null;

    if (field.type === "currency") {
      if (raw == null || raw === "") {
        display = null;
      } else {
        const n = typeof raw === "number" ? raw : Number(raw);
        display = Number.isFinite(n) ? `$${n.toLocaleString()}` : String(raw);
      }
    } else if (field.type === "enum") {
      if (!isBlank(raw)) {
        const code = String(raw);
        display = field.valueLabels?.[code] ?? code.replace(/_/g, " ");
      }
    } else if (field.type === "string_array") {
      const items = parseJsonArray(raw)
        .map((v) => String(v).trim())
        .filter(Boolean);
      display = items.length ? items.join(", ") : null;
    } else {
      display = isBlank(raw) ? null : String(raw).trim();
    }

    const isEmpty = display == null || display === "";
    return {
      key: field.key,
      label: field.label,
      section: field.section,
      displayValue: isEmpty ? EMPTY_LOI_ANSWER : display!,
      kind: isEmpty ? "empty" : field.type === "longtext" ? "longtext" : "text",
      isEmpty,
    };
  });
}

export function groupLoiAnswers(
  answers: FormattedLoiAnswer[],
): Array<{ section: string; answers: FormattedLoiAnswer[] }> {
  const order = LOI_SECTIONS as readonly string[];
  const bySection = new Map<string, FormattedLoiAnswer[]>();
  for (const a of answers) {
    const list = bySection.get(a.section) ?? [];
    list.push(a);
    bySection.set(a.section, list);
  }
  return order
    .filter((s) => bySection.has(s))
    .map((section) => ({ section, answers: bySection.get(section)! }));
}

export function loiFieldKeys(): string[] {
  return LOI_FIELDS.map((f) => f.key);
}
