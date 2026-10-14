/**
 * Alliance partner applications (ADR-72): the words and rules the form at
 * /apply/alliance, its router and the admin review share.
 *
 * The role and support tags are the ones /connect has always offered alliance
 * partners, so an inquiry converts into an application without losing a tag.
 */

export const ALLIANCE_ROLES = [
  { id: "Coordination", name: "Coordination", icon: "🔗", description: "Coordinating networks, governance, and collaboration" },
  { id: "Bioregional Econ", name: "Bioregional Econ", icon: "🌿", description: "Local economies, marketplaces, ecosystem tokens" },
  { id: "Infrastructure", name: "Infrastructure", icon: "🏗️", description: "Physical systems, buildings, utilities" },
  { id: "Nourishment", name: "Nourishment", icon: "🍎", description: "Food systems, agriculture, nutrition" },
  { id: "Legal", name: "Legal", icon: "⚖️", description: "Legal structures, land trusts, compliance" },
  { id: "Funding", name: "Funding", icon: "💰", description: "Grants, flow funding, lending" },
  { id: "Growth/Media", name: "Growth/Media", icon: "📢", description: "Marketing, communications, storytelling" },
  { id: "Events", name: "Events", icon: "🎪", description: "Festivals, gatherings, retreats" },
  { id: "Education", name: "Education", icon: "📚", description: "Training, learning, knowledge sharing" },
  { id: "Technology", name: "Technology", icon: "💻", description: "Software, platforms, digital tools" },
  { id: "Wellness", name: "Wellness", icon: "❤️", description: "Health, wellbeing, healing practices" },
  { id: "Community Building", name: "Community Building", icon: "👥", description: "Social architecture, conflict resolution" },
  { id: "Land Services", name: "Land Services", icon: "🗺️", description: "Land discovery, acquisition, stewardship" },
  { id: "Spiritual", name: "Spiritual", icon: "🙏", description: "Ceremonies, practices, meaning-making" },
  { id: "Housing", name: "Housing", icon: "🏠", description: "Shelter, living spaces, construction" },
  { id: "Water Systems", name: "Water Systems", icon: "💧", description: "Collection, treatment, distribution" },
  { id: "Economics", name: "Economics", icon: "💱", description: "Financial systems, currencies, exchange" },
  { id: "Other", name: "Other", icon: "✨", description: "Something unique" },
] as const;

export type AllianceRoleId = (typeof ALLIANCE_ROLES)[number]["id"];

const ROLE_IDS = new Set<string>(ALLIANCE_ROLES.map((r) => r.id));

/** Keep only known tags, once each, in list order. Unknown tags from old rows drop. */
export function cleanRoles(raw: unknown): AllianceRoleId[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try { list = JSON.parse(raw); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  const picked = new Set(list.filter((x): x is string => typeof x === "string" && ROLE_IDS.has(x)));
  return ALLIANCE_ROLES.map((r) => r.id).filter((id) => picked.has(id));
}

export const ALLIANCE_STATUSES = [
  "draft", "submitted", "under_review", "approved", "active", "inactive", "rejected", "changes_requested",
] as const;
export type AllianceStatus = (typeof ALLIANCE_STATUSES)[number];

/** Statuses the applicant can no longer edit: the partnership is decided. */
export const ALLIANCE_LOCKED: readonly AllianceStatus[] = ["approved", "active", "inactive"];

/** Statuses an applicant can send (again) from. */
export const ALLIANCE_SENDABLE: readonly AllianceStatus[] = ["draft", "changes_requested", "rejected"];

export const SUPPORT_MIN = 20;

/** The fields submit needs, as the applicant would name them. Empty when ready. */
export function missingForSubmit(a: {
  organizationName?: string | null;
  contactName?: string | null;
  roles?: unknown;
  supportDescription?: string | null;
}): string[] {
  const missing: string[] = [];
  if (!a.organizationName?.trim()) missing.push("your organization's name");
  if (!a.contactName?.trim()) missing.push("your name");
  if (cleanRoles(a.roles).length === 0) missing.push("at least one role or kind of support");
  if ((a.supportDescription?.trim().length ?? 0) < SUPPORT_MIN) missing.push("how you support land projects (a sentence or two)");
  return missing;
}

/** Plain words for each status, applicant-facing. */
export const ALLIANCE_STATUS_LABEL: Record<AllianceStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Alliance Partner",
  active: "Alliance Partner",
  inactive: "Paused",
  rejected: "Not this time",
  changes_requested: "Changes requested",
};

export const ALLIANCE_APPLY_PATH = "/apply/alliance";
export const ALLIANCE_STATUS_PATH = "/apply/alliance/status";
