/**
 * Land project application field registry.
 *
 * Single source of labels/types for the /apply form answers so admin review
 * (and any other surface) can render every stored question without drifting
 * from the form. Values are never invented — empty/missing shows as "—".
 */

export const EMPTY_ANSWER = "—";

export type LandApplicationFieldType =
  | "text"
  | "longtext"
  | "number"
  | "enum"
  | "string_array"
  | "url"
  | "url_list"
  | "coordinates"
  | "booleanish";

export type LandApplicationFieldDef = {
  key: string;
  label: string;
  type: LandApplicationFieldType;
  /** Grouping header in admin review. */
  section: string;
  /** Human labels for enum / array item codes. */
  valueLabels?: Record<string, string>;
  /**
   * When set, the display value is derived from several record keys
   * (e.g. lat+lng). The primary `key` is still used for coverage lists.
   */
  derive?: (record: Record<string, unknown>) => unknown;
};

export const LAND_APPLICATION_SECTIONS = [
  "Contact",
  "Project",
  "Land & community",
  "Team",
  "Values & alignment",
  "Commitment & resources",
  "Links & documents",
  "Extra",
] as const;

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  early_stage: "Early stage",
  mature: "Mature",
};

export const LAND_STATUS_LABELS: Record<string, string> = {
  owned: "Owned",
  leased: "Leased",
  committed: "Committed",
  seeking: "Seeking",
};

export const MEETING_FREQUENCY_LABELS: Record<string, string> = {
  everyday: "Everyday",
  "2_3x_week": "2–3× per week",
  weekly: "Weekly",
  "2_3x_month": "2–3× per month",
  monthly: "Monthly",
  "2_3x_year": "2–3× per year",
  yearly_plus: "Yearly or less",
};

export const MIXED_USE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  agricultural: "Agricultural",
  educational: "Educational",
  recreational: "Recreational",
};

export const DIETARY_PATTERN_LABELS: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  plant_based: "Plant-Based",
  pescatarian: "Pescatarian",
  omnivore: "Omnivore",
  animal_based: "Animal-Based",
  keto: "Keto",
  no_shared_diets: "No Shared Diets",
};

/**
 * Every applicant-facing answer field stored on `applications` (plus the
 * contact join columns admin list attaches). Order matches the /apply wizard.
 */
export const LAND_APPLICATION_FIELDS: LandApplicationFieldDef[] = [
  { key: "contactName", label: "Contact name", type: "text", section: "Contact" },
  { key: "contactEmail", label: "Contact email", type: "text", section: "Contact" },

  { key: "projectName", label: "Project name", type: "text", section: "Project" },
  {
    key: "projectType",
    label: "Project type",
    type: "enum",
    section: "Project",
    valueLabels: PROJECT_TYPE_LABELS,
  },
  { key: "location", label: "Location", type: "text", section: "Project" },
  { key: "country", label: "Country", type: "text", section: "Project" },
  {
    key: "mapPin",
    label: "Map pin",
    type: "coordinates",
    section: "Project",
    derive: (r) => {
      const lat = r.latitude;
      const lng = r.longitude;
      if (lat == null || lng == null || lat === "" || lng === "") return null;
      return `${lat}, ${lng}`;
    },
  },
  { key: "vision", label: "Project vision", type: "longtext", section: "Project" },

  {
    key: "landStatus",
    label: "Land status",
    type: "enum",
    section: "Land & community",
    valueLabels: LAND_STATUS_LABELS,
  },
  {
    key: "projectSizeHectares",
    label: "Project size (hectares)",
    type: "number",
    section: "Land & community",
  },
  {
    key: "currentPeopleCount",
    label: "Current people",
    type: "number",
    section: "Land & community",
  },
  {
    key: "currentHouseholdCount",
    label: "Current households",
    type: "number",
    section: "Land & community",
  },
  {
    key: "intendedPeopleCount",
    label: "Intended people",
    type: "number",
    section: "Land & community",
  },
  {
    key: "intendedHouseholdCount",
    label: "Intended households",
    type: "number",
    section: "Land & community",
  },
  {
    key: "mixedUse",
    label: "Mixed use",
    type: "string_array",
    section: "Land & community",
    valueLabels: MIXED_USE_LABELS,
  },
  {
    key: "meetingFrequency",
    label: "Meeting frequency",
    type: "enum",
    section: "Land & community",
    valueLabels: MEETING_FREQUENCY_LABELS,
  },

  { key: "teamSize", label: "Core team size", type: "number", section: "Team" },
  { key: "teamDescription", label: "Team description", type: "longtext", section: "Team" },

  {
    key: "regenerativePractices",
    label: "Regenerative practices",
    type: "longtext",
    section: "Values & alignment",
  },
  {
    key: "governanceApproach",
    label: "Governance approach",
    type: "longtext",
    section: "Values & alignment",
  },
  {
    key: "communityEngagement",
    label: "Community engagement",
    type: "longtext",
    section: "Values & alignment",
  },
  {
    key: "dietaryPatterns",
    label: "Dietary patterns",
    type: "string_array",
    section: "Values & alignment",
    valueLabels: DIETARY_PATTERN_LABELS,
  },

  {
    key: "timeCommitment",
    label: "Time commitment",
    type: "longtext",
    section: "Commitment & resources",
  },
  {
    key: "currentFunding",
    label: "Current funding",
    type: "longtext",
    section: "Commitment & resources",
  },
  {
    key: "fundingNeeds",
    label: "Funding needs",
    type: "longtext",
    section: "Commitment & resources",
  },
  { key: "needsText", label: "Needs", type: "longtext", section: "Commitment & resources" },
  { key: "offersText", label: "Offers", type: "longtext", section: "Commitment & resources" },

  { key: "websiteUrl", label: "Website", type: "url", section: "Links & documents" },
  { key: "videoUrl", label: "Video", type: "url", section: "Links & documents" },
  {
    key: "documentsUrl",
    label: "Documents",
    type: "url_list",
    section: "Links & documents",
  },

  { key: "additionalNotes", label: "Additional notes", type: "longtext", section: "Extra" },
  {
    key: "shipReferralHandle",
    label: "Ship referral handle",
    type: "text",
    section: "Extra",
  },
];

export type FormattedAnswerKind = "text" | "longtext" | "url" | "url_list" | "empty";

export type FormattedApplicationAnswer = {
  key: string;
  label: string;
  section: string;
  /** Ready-to-show string (or joined list for url_list). Empty → EMPTY_ANSWER. */
  displayValue: string;
  /** Parsed URL list when kind is url_list; otherwise empty. */
  urls: string[];
  kind: FormattedAnswerKind;
  /** True when the stored value was null/blank/empty-array. */
  isEmpty: boolean;
};

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/** Parse mixedUse / dietaryPatterns / documentsUrl JSON blobs. */
export function parseJsonArray(raw: unknown): unknown[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Bare single URL / token stored without JSON.
    return [trimmed];
  }
}

export function parseDocumentUrls(raw: unknown): string[] {
  const items = parseJsonArray(raw);
  const urls: string[] = [];
  for (const item of items) {
    if (typeof item === "string" && item.trim()) {
      urls.push(item.trim());
      continue;
    }
    if (item && typeof item === "object" && "url" in item) {
      const url = (item as { url?: unknown }).url;
      if (typeof url === "string" && url.trim()) urls.push(url.trim());
    }
  }
  return urls;
}

function labelForCode(code: string, labels?: Record<string, string>): string {
  if (labels && labels[code]) return labels[code];
  return code.replace(/_/g, " ");
}

function formatEnum(value: unknown, labels?: Record<string, string>): string | null {
  if (isBlank(value)) return null;
  return labelForCode(String(value), labels);
}

function formatStringArray(value: unknown, labels?: Record<string, string>): string | null {
  const items = parseJsonArray(value)
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (items.length === 0) return null;
  return items.map((c) => labelForCode(c, labels)).join(", ");
}

function formatNumber(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  // teamSize defaults to 0 on unfinished drafts — still show 0 if stored.
  return String(n);
}

function kindForField(type: LandApplicationFieldType, isEmpty: boolean): FormattedAnswerKind {
  if (isEmpty) return "empty";
  if (type === "longtext") return "longtext";
  if (type === "url") return "url";
  if (type === "url_list") return "url_list";
  return "text";
}

/**
 * Format one application record into label+value rows for admin review.
 * Always returns one row per registry field (empty → "—").
 */
export function formatLandApplicationAnswers(
  record: Record<string, unknown> | null | undefined,
): FormattedApplicationAnswer[] {
  const r = record ?? {};
  return LAND_APPLICATION_FIELDS.map((field) => {
    const raw = field.derive ? field.derive(r) : r[field.key];

    if (field.type === "url_list") {
      const urls = parseDocumentUrls(raw);
      const isEmpty = urls.length === 0;
      return {
        key: field.key,
        label: field.label,
        section: field.section,
        displayValue: isEmpty ? EMPTY_ANSWER : urls.join("\n"),
        urls,
        kind: kindForField(field.type, isEmpty),
        isEmpty,
      };
    }

    let display: string | null = null;
    switch (field.type) {
      case "enum":
        display = formatEnum(raw, field.valueLabels);
        break;
      case "string_array":
        display = formatStringArray(raw, field.valueLabels);
        break;
      case "number":
        display = formatNumber(raw);
        break;
      case "coordinates":
        display = isBlank(raw) ? null : String(raw);
        break;
      case "booleanish":
        if (raw === true || raw === 1 || raw === "1") display = "Yes";
        else if (raw === false || raw === 0 || raw === "0") display = "No";
        else display = isBlank(raw) ? null : String(raw);
        break;
      case "url":
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
      displayValue: isEmpty ? EMPTY_ANSWER : display!,
      urls: field.type === "url" && !isEmpty ? [display!] : [],
      kind: kindForField(field.type, isEmpty),
      isEmpty,
    };
  });
}

/** Group formatted answers by section, preserving registry order. */
export function groupLandApplicationAnswers(
  answers: FormattedApplicationAnswer[],
): Array<{ section: string; answers: FormattedApplicationAnswer[] }> {
  const order = LAND_APPLICATION_SECTIONS as readonly string[];
  const bySection = new Map<string, FormattedApplicationAnswer[]>();
  for (const a of answers) {
    const list = bySection.get(a.section) ?? [];
    list.push(a);
    bySection.set(a.section, list);
  }
  const groups: Array<{ section: string; answers: FormattedApplicationAnswer[] }> = [];
  for (const section of order) {
    const list = bySection.get(section);
    if (list?.length) groups.push({ section, answers: list });
  }
  // Any unexpected section appended last.
  for (const [section, list] of bySection) {
    if (!(order as readonly string[]).includes(section)) {
      groups.push({ section, answers: list });
    }
  }
  return groups;
}

/** Keys the registry covers — useful for tests / PR coverage lists. */
export function landApplicationFieldKeys(): string[] {
  return LAND_APPLICATION_FIELDS.map((f) => f.key);
}
