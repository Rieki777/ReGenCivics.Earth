/**
 * Custom-game blueprint draft field registry for admin review.
 * Paths match blueprintDraftSchema intake shape. Empty/missing → "—".
 * Values are never truncated.
 */

export const EMPTY_BLUEPRINT_ANSWER = "—";

export type BlueprintFieldType =
  | "text"
  | "longtext"
  | "number"
  | "enum"
  | "string_array"
  | "booleanish"
  | "url"
  | "personas";

export type BlueprintFieldDef = {
  key: string;
  label: string;
  type: BlueprintFieldType;
  section: string;
  /** Dot path from blueprint root, e.g. "content.vision". */
  path: string;
  valueLabels?: Record<string, string>;
};

export const BLUEPRINT_LAND_STATUS_LABELS: Record<string, string> = {
  owned: "Owned",
  leased: "Leased",
  committed: "Committed",
  seeking: "Seeking",
};

export const BLUEPRINT_ROLE_LABELS: Record<string, string> = {
  founder: "Founder",
  investor: "Investor",
  "core-team": "Core team",
};

export const BLUEPRINT_HOSTING_LABELS: Record<string, string> = {
  "self-hosted": "Self-hosted",
  "regen-full-service": "ReGen full service",
};

export const BLUEPRINT_TECH_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const CUSTOM_GAME_BLUEPRINT_SECTIONS = [
  "Applicant",
  "Identity",
  "Vision & content",
  "Personas",
  "Language",
  "Team",
  "Deployment",
  "Integrations",
  "Links",
] as const;

export const CUSTOM_GAME_BLUEPRINT_FIELDS: BlueprintFieldDef[] = [
  {
    key: "applicant.role",
    label: "Role",
    type: "enum",
    section: "Applicant",
    path: "applicant.role",
    valueLabels: BLUEPRINT_ROLE_LABELS,
  },
  {
    key: "applicant.investorGoals",
    label: "Investor goals",
    type: "longtext",
    section: "Applicant",
    path: "applicant.investorGoals",
  },

  {
    key: "identity.tagline",
    label: "Tagline",
    type: "text",
    section: "Identity",
    path: "identity.tagline",
  },
  {
    key: "identity.location",
    label: "Location",
    type: "text",
    section: "Identity",
    path: "identity.location",
  },
  {
    key: "identity.country",
    label: "Country",
    type: "text",
    section: "Identity",
    path: "identity.country",
  },
  {
    key: "identity.landStatus",
    label: "Land status",
    type: "enum",
    section: "Identity",
    path: "identity.landStatus",
    valueLabels: BLUEPRINT_LAND_STATUS_LABELS,
  },
  {
    key: "identity.acreage",
    label: "Acreage",
    type: "number",
    section: "Identity",
    path: "identity.acreage",
  },
  {
    key: "identity.stage",
    label: "Stage",
    type: "text",
    section: "Identity",
    path: "identity.stage",
  },
  {
    key: "identity.website",
    label: "Website",
    type: "url",
    section: "Identity",
    path: "identity.website",
  },

  {
    key: "content.vision",
    label: "Vision",
    type: "longtext",
    section: "Vision & content",
    path: "content.vision",
  },
  {
    key: "content.story",
    label: "Story",
    type: "longtext",
    section: "Vision & content",
    path: "content.story",
  },
  {
    key: "content.goals",
    label: "Goals",
    type: "string_array",
    section: "Vision & content",
    path: "content.goals",
  },
  {
    key: "content.problems",
    label: "Pains",
    type: "string_array",
    section: "Vision & content",
    path: "content.problems",
  },
  {
    key: "content.values",
    label: "Values",
    type: "string_array",
    section: "Vision & content",
    path: "content.values",
  },

  {
    key: "personas",
    label: "Personas",
    type: "personas",
    section: "Personas",
    path: "personas",
  },

  {
    key: "language.memberName",
    label: "Member name",
    type: "text",
    section: "Language",
    path: "language.memberName",
  },
  {
    key: "language.currencyName",
    label: "Currency",
    type: "text",
    section: "Language",
    path: "language.currencyName",
  },
  {
    key: "language.communityNoun",
    label: "Community noun",
    type: "text",
    section: "Language",
    path: "language.communityNoun",
  },
  {
    key: "language.guideName",
    label: "Guide",
    type: "text",
    section: "Language",
    path: "language.guideName",
  },
  {
    key: "language.guideVoice",
    label: "Guide voice",
    type: "longtext",
    section: "Language",
    path: "language.guideVoice",
  },

  {
    key: "team.size",
    label: "Team size",
    type: "number",
    section: "Team",
    path: "team.size",
  },
  {
    key: "team.hoursPerWeek",
    label: "Team hours/week",
    type: "number",
    section: "Team",
    path: "team.hoursPerWeek",
  },
  {
    key: "team.technicalComfort",
    label: "Technical comfort",
    type: "enum",
    section: "Team",
    path: "team.technicalComfort",
    valueLabels: BLUEPRINT_TECH_LABELS,
  },
  {
    key: "team.communityExperience",
    label: "Community experience",
    type: "longtext",
    section: "Team",
    path: "team.communityExperience",
  },
  {
    key: "team.adminName",
    label: "Admin name",
    type: "text",
    section: "Team",
    path: "team.adminName",
  },
  {
    key: "team.adminEmail",
    label: "Admin email",
    type: "text",
    section: "Team",
    path: "team.adminEmail",
  },

  {
    key: "deployment.hosting",
    label: "Hosting",
    type: "enum",
    section: "Deployment",
    path: "deployment.hosting",
    valueLabels: BLUEPRINT_HOSTING_LABELS,
  },
  {
    key: "deployment.domain",
    label: "Domain",
    type: "text",
    section: "Deployment",
    path: "deployment.domain",
  },
  {
    key: "deployment.timelineEstimate",
    label: "Timeline",
    type: "text",
    section: "Deployment",
    path: "deployment.timelineEstimate",
  },
  {
    key: "deployment.budgetConfirmed",
    label: "Budget confirmed",
    type: "booleanish",
    section: "Deployment",
    path: "deployment.budgetConfirmed",
  },
  {
    key: "deployment.referralSource",
    label: "Referral",
    type: "text",
    section: "Deployment",
    path: "deployment.referralSource",
  },

  {
    key: "integrations.llmProvider",
    label: "LLM provider",
    type: "text",
    section: "Integrations",
    path: "integrations.llmProvider",
  },
  {
    key: "integrations.emailProvider",
    label: "Email provider",
    type: "text",
    section: "Integrations",
    path: "integrations.emailProvider",
  },

  {
    key: "generationInputs.uploads",
    label: "Links / uploads",
    type: "string_array",
    section: "Links",
    path: "generationInputs.uploads",
  },
];

export type FormattedBlueprintAnswer = {
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

/** Read nested blueprint value by dotted path. */
export function getBlueprintPath(root: unknown, path: string): unknown {
  if (!root || typeof root !== "object") return undefined;
  const parts = path.split(".");
  let cur: unknown = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function labelForCode(code: string, labels?: Record<string, string>): string {
  if (labels && labels[code]) return labels[code];
  return code.replace(/_/g, " ");
}

function formatPersonas(raw: unknown): string | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const labels = raw
    .map((p) => {
      if (!p || typeof p !== "object") return "";
      const row = p as { label?: unknown; id?: unknown };
      return String(row.label || row.id || "").trim();
    })
    .filter(Boolean);
  return labels.length ? labels.join(", ") : null;
}

/**
 * Format one blueprint draft into label+value rows for admin review.
 * Always returns one row per registry field (empty → "—"). Never truncates.
 */
export function formatCustomGameBlueprintAnswers(
  blueprint: unknown,
): FormattedBlueprintAnswer[] {
  return CUSTOM_GAME_BLUEPRINT_FIELDS.map((field) => {
    const raw = getBlueprintPath(blueprint, field.path);
    let display: string | null = null;
    let urls: string[] = [];

    switch (field.type) {
      case "enum":
        if (!isBlank(raw)) display = labelForCode(String(raw), field.valueLabels);
        break;
      case "string_array": {
        const items = Array.isArray(raw)
          ? raw.map((v) => String(v).trim()).filter(Boolean)
          : [];
        display = items.length ? items.join("; ") : null;
        break;
      }
      case "personas":
        display = formatPersonas(raw);
        break;
      case "number":
        if (raw == null || raw === "") display = null;
        else {
          const n = typeof raw === "number" ? raw : Number(raw);
          display = Number.isFinite(n) ? String(n) : null;
        }
        break;
      case "booleanish":
        if (raw === true || raw === 1 || raw === "1") display = "Yes";
        else if (raw === false || raw === 0 || raw === "0") display = "No";
        else display = isBlank(raw) ? null : String(raw);
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
      displayValue: isEmpty ? EMPTY_BLUEPRINT_ANSWER : display!,
      urls,
      kind: isEmpty
        ? "empty"
        : field.type === "longtext"
          ? "longtext"
          : field.type === "url"
            ? "url"
            : "text",
      isEmpty,
    };
  });
}

export function groupCustomGameBlueprintAnswers(
  answers: FormattedBlueprintAnswer[],
): Array<{ section: string; answers: FormattedBlueprintAnswer[] }> {
  const order = CUSTOM_GAME_BLUEPRINT_SECTIONS as readonly string[];
  const bySection = new Map<string, FormattedBlueprintAnswer[]>();
  for (const a of answers) {
    const list = bySection.get(a.section) ?? [];
    list.push(a);
    bySection.set(a.section, list);
  }
  return order
    .filter((s) => bySection.has(s))
    .map((section) => ({ section, answers: bySection.get(section)! }));
}

export function customGameBlueprintFieldKeys(): string[] {
  return CUSTOM_GAME_BLUEPRINT_FIELDS.map((f) => f.key);
}
