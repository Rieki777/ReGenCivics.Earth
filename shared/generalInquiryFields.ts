/**
 * General / Alliance inquiry field registry for admin detail panels.
 * Keys match drizzle `general_inquiries` submit input. Empty/missing → "—".
 *
 * Note: there is no `message`, `location`, or `formData` column on this table.
 * Message-like text lives in `additionalNotes` (and path-specific longtext).
 */

export const EMPTY_INQUIRY_ANSWER = "—";

export type GeneralInquiryFieldType =
  | "text"
  | "longtext"
  | "enum"
  | "string_array"
  | "url"
  | "coordinates"
  | "booleanish";

export type GeneralInquiryFieldDef = {
  key: string;
  label: string;
  type: GeneralInquiryFieldType;
  section: string;
  valueLabels?: Record<string, string>;
  /** When set, display is derived from several record keys. */
  derive?: (record: Record<string, unknown>) => unknown;
};

export const GENERAL_INQUIRY_SECTIONS = [
  "Contact",
  "Land partner",
  "Create with ReGens",
  "Alliance partnership",
  "Live in land",
  "Role",
  "Something else",
  "Capital & fit",
  "Extra",
] as const;

export const ORGANIZATION_SCOPE_LABELS: Record<string, string> = {
  local: "Local",
  global: "Global",
};

export const PATH_TYPE_LABELS: Record<string, string> = {
  land_partner: "Land partner",
  create_with_regens: "Create with ReGens",
  create: "Create with ReGens",
  alliance: "Alliance partnership",
  finance: "Finance",
  live: "Live in a land project",
  role: "Role",
  something_else: "Something else",
  other: "Other",
};

export const GENERAL_INQUIRY_FIELDS: GeneralInquiryFieldDef[] = [
  { key: "fullName", label: "Full name", type: "text", section: "Contact" },
  { key: "email", label: "Email", type: "text", section: "Contact" },
  {
    key: "pathType",
    label: "Pathway",
    type: "enum",
    section: "Contact",
    valueLabels: PATH_TYPE_LABELS,
  },

  { key: "projectUrl", label: "Project URL", type: "url", section: "Land partner" },
  {
    key: "projectInspiration",
    label: "Project inspiration",
    type: "longtext",
    section: "Land partner",
  },
  {
    key: "projectProgress",
    label: "Project progress",
    type: "string_array",
    section: "Land partner",
  },

  {
    key: "allianceOrganizations",
    label: "Alliance organizations",
    type: "string_array",
    section: "Create with ReGens",
  },
  {
    key: "otherOrganization",
    label: "Other organization",
    type: "text",
    section: "Create with ReGens",
  },

  { key: "organizationUrl", label: "Organization URL", type: "url", section: "Alliance partnership" },
  {
    key: "organizationRole",
    label: "Organization roles",
    type: "string_array",
    section: "Alliance partnership",
  },
  {
    key: "organizationScope",
    label: "Organization scope",
    type: "enum",
    section: "Alliance partnership",
    valueLabels: ORGANIZATION_SCOPE_LABELS,
  },
  {
    key: "organizationMapPin",
    label: "Organization map pin",
    type: "coordinates",
    section: "Alliance partnership",
    derive: (r) => {
      const lat = r.organizationLatitude;
      const lng = r.organizationLongitude;
      if (lat == null || lng == null || lat === "" || lng === "") return null;
      return `${lat}, ${lng}`;
    },
  },
  {
    key: "organizationCountry",
    label: "Organization country",
    type: "text",
    section: "Alliance partnership",
  },
  {
    key: "partnershipDescription",
    label: "Partnership vision",
    type: "longtext",
    section: "Alliance partnership",
  },
  {
    key: "allianceSupportCategories",
    label: "Alliance support categories",
    type: "string_array",
    section: "Alliance partnership",
  },
  {
    key: "otherAllianceSupport",
    label: "Other support category",
    type: "text",
    section: "Alliance partnership",
  },
  {
    key: "allianceSupportDescription",
    label: "How alliance supports land projects",
    type: "longtext",
    section: "Alliance partnership",
  },

  {
    key: "landProjects",
    label: "Selected land projects",
    type: "string_array",
    section: "Live in land",
  },
  { key: "otherProject", label: "Other project", type: "text", section: "Live in land" },

  {
    key: "roleArchetypes",
    label: "Role archetypes",
    type: "string_array",
    section: "Role",
  },
  { key: "roleInterest", label: "Role interest", type: "longtext", section: "Role" },
  { key: "whyIdeal", label: "Why ideal for the role", type: "longtext", section: "Role" },
  {
    key: "seasonDeliverables",
    label: "Season deliverables",
    type: "longtext",
    section: "Role",
  },
  { key: "videoPitchUrl", label: "Video pitch", type: "url", section: "Role" },
  { key: "cvWebsite", label: "CV / website", type: "url", section: "Role" },

  {
    key: "uniqueContribution",
    label: "Unique contribution",
    type: "longtext",
    section: "Something else",
  },

  {
    key: "capitalTypes",
    label: "Forms of capital",
    type: "string_array",
    section: "Capital & fit",
  },
  {
    key: "organizationalCapital",
    label: "Organizational capital",
    type: "string_array",
    section: "Capital & fit",
  },
  {
    key: "valueContribution",
    label: "Value contribution",
    type: "longtext",
    section: "Capital & fit",
  },
  {
    key: "whyIdealFit",
    label: "Why they would be an ideal fit",
    type: "longtext",
    section: "Capital & fit",
  },

  {
    key: "additionalNotes",
    label: "Additional notes / message",
    type: "longtext",
    section: "Extra",
  },
  { key: "referralSource", label: "Referral source", type: "text", section: "Extra" },
  {
    key: "newsletterOptIn",
    label: "Newsletter opt-in",
    type: "booleanish",
    section: "Extra",
  },
];

export type FormattedInquiryAnswer = {
  key: string;
  label: string;
  section: string;
  displayValue: string;
  urls: string[];
  kind: "text" | "longtext" | "url" | "empty";
  isEmpty: boolean;
};

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function parseInquiryJsonArray(raw: unknown): unknown[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [trimmed];
  }
}

function labelForCode(code: string, labels?: Record<string, string>): string {
  if (labels && labels[code]) return labels[code];
  return code.replace(/_/g, " ");
}

export function formatGeneralInquiryAnswers(
  record: Record<string, unknown> | null | undefined,
): FormattedInquiryAnswer[] {
  const r = record ?? {};
  return GENERAL_INQUIRY_FIELDS.map((field) => {
    const raw = field.derive ? field.derive(r) : r[field.key];

    let display: string | null = null;
    let urls: string[] = [];

    switch (field.type) {
      case "enum":
        if (!isBlank(raw)) display = labelForCode(String(raw), field.valueLabels);
        break;
      case "string_array": {
        const items = parseInquiryJsonArray(raw)
          .map((v) => String(v).trim())
          .filter(Boolean)
          .map((c) => labelForCode(c, field.valueLabels));
        display = items.length ? items.join(", ") : null;
        break;
      }
      case "booleanish":
        if (raw === true || raw === 1 || raw === "1") display = "Yes";
        else if (raw === false || raw === 0 || raw === "0") display = "No";
        else display = isBlank(raw) ? null : String(raw);
        break;
      case "coordinates":
        display = isBlank(raw) ? null : String(raw);
        break;
      case "url":
        display = isBlank(raw) ? null : String(raw).trim();
        if (display) urls = [display];
        break;
      case "text":
      case "longtext":
      default:
        display = isBlank(raw) ? null : String(raw).trim();
        break;
    }

    const isEmpty = display == null || display === "";
    return {
      key: field.key,
      label: field.label,
      section: field.section,
      displayValue: isEmpty ? EMPTY_INQUIRY_ANSWER : display!,
      urls,
      kind: isEmpty ? "empty" : field.type === "longtext" ? "longtext" : field.type === "url" ? "url" : "text",
      isEmpty,
    };
  });
}

export function groupGeneralInquiryAnswers(
  answers: FormattedInquiryAnswer[],
): Array<{ section: string; answers: FormattedInquiryAnswer[] }> {
  const order = GENERAL_INQUIRY_SECTIONS as readonly string[];
  const bySection = new Map<string, FormattedInquiryAnswer[]>();
  for (const a of answers) {
    const list = bySection.get(a.section) ?? [];
    list.push(a);
    bySection.set(a.section, list);
  }
  return order
    .filter((s) => bySection.has(s))
    .map((section) => ({ section, answers: bySection.get(section)! }));
}

export function generalInquiryFieldKeys(): string[] {
  return GENERAL_INQUIRY_FIELDS.map((f) => f.key);
}
