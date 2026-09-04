import type { ElementType } from "react";
import { toast } from "sonner";
import {
  Handshake,
  Palette,
  Home as HomeIcon,
  UserCheck,
  TrendingUp,
  Globe,
  HelpCircle,
} from "lucide-react";

export const pathTypeConfig: Record<string, { label: string; icon: ElementType; color: string }> = {
  alliance: { label: "Alliance Partners", icon: Handshake, color: "bg-purple-500" },
  create: { label: "Create with ReGens", icon: Palette, color: "bg-blue-500" },
  live: { label: "Live in a Land Project", icon: HomeIcon, color: "bg-green-500" },
  role: { label: "Role inquiries", icon: UserCheck, color: "bg-amber-500" },
  finance: { label: "Finance Regeneration", icon: TrendingUp, color: "bg-emerald-500" },
  learn: { label: "Learn and Explore", icon: Globe, color: "bg-cyan-500" },
  other: { label: "Other Inquiries", icon: HelpCircle, color: "bg-gray-500" },
};

export const landProjectsList = [
  { id: "la_tierra", name: "La Tierra", location: "Costa Rica" },
  { id: "starseed", name: "StarSeed Village", location: "Guatemala" },
  { id: "nyx", name: "The Nyx", location: "Bali, Indonesia" },
  { id: "neighbourgood", name: "Our NeighbourGood", location: "New Zealand" },
  { id: "highland_lake", name: "Highland Lake CampUS", location: "NC, USA" },
  { id: "liminal", name: "Liminal Village", location: "Italy" },
  { id: "heartland", name: "Heartland Retreat", location: "California, USA" },
  { id: "tdf", name: "Traditional Dream Factory", location: "Portugal" },
  { id: "ubuntu", name: "Ubuntu", location: "Various" },
  { id: "finca_sagrada", name: "Finca Sagrada", location: "Latin America" },
  { id: "tabi", name: "Tabi", location: "Various" },
  { id: "tioga", name: "Tioga", location: "Various" },
  { id: "lala_gardens", name: "LaLa Gardens Cooperative", location: "Various" },
];

export const allianceOrgsList = [
  { id: "hypha", name: "Hypha DAO" },
  { id: "seeds", name: "SEEDS" },
  { id: "nestr", name: "Nestr.io" },
  { id: "kinship_earth", name: "Kinship Earth" },
  { id: "open_future", name: "Open Future Coalition" },
  { id: "united_planet", name: "UP.Game (United Planet)" },
  { id: "gaia_biolab", name: "Gaia Union BioLab" },
  { id: "closer", name: "Closer.earth" },
  { id: "oasa", name: "OASA.earth" },
  { id: "planetary_party", name: "Planetary Party" },
  { id: "dao_universe", name: "DAO Universe Club" },
  { id: "desa", name: "DESA" },
  { id: "permatours", name: "Permatours" },
  { id: "maptio", name: "Maptio" },
  { id: "local_scale", name: "LocalScale" },
];

export type InquiryBlurbSource = {
  allianceSupportDescription?: string | null;
  partnershipDescription?: string | null;
  valueContribution?: string | null;
  whyIdealFit?: string | null;
  projectInspiration?: string | null;
  roleInterest?: string | null;
  uniqueContribution?: string | null;
  additionalNotes?: string | null;
  message?: string | null;
  otherAllianceSupport?: string | null;
  allianceSupportCategories?: string | null;
  organizationRole?: string | null;
  formData?: string | null;
};

const BLURB_TEXT_FIELDS = [
  "allianceSupportDescription",
  "partnershipDescription",
  "valueContribution",
  "whyIdealFit",
  "projectInspiration",
  "roleInterest",
  "uniqueContribution",
  "additionalNotes",
  "message",
] as const;

function collapseBlurbText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function jsonListBlurb(value: unknown): string {
  const raw = collapseBlurbText(value);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return raw;
    return parsed
      .map((item) => collapseBlurbText(String(item)).replace(/_/g, " "))
      .filter(Boolean)
      .join(", ");
  } catch {
    return raw;
  }
}

function formDataNotes(formData: string | null | undefined): string {
  if (!formData) return "";
  try {
    const parsed = JSON.parse(formData);
    return collapseBlurbText(parsed?.additionalNotes);
  } catch {
    return "";
  }
}

/** Visible 1-2 line summary for an admin inquiry row. Alliance apps store the body in dedicated columns, not `message`. */
export function inquiryListBlurb(inquiry: InquiryBlurbSource | null | undefined): string {
  if (!inquiry) return "";
  for (const key of BLURB_TEXT_FIELDS) {
    const text = collapseBlurbText(inquiry[key]);
    if (text) return text;
  }
  const notes = formDataNotes(inquiry.formData);
  if (notes) return notes;
  const otherSupport = collapseBlurbText(inquiry.otherAllianceSupport);
  if (otherSupport) return otherSupport;
  const categories = jsonListBlurb(inquiry.allianceSupportCategories);
  if (categories) return categories;
  return jsonListBlurb(inquiry.organizationRole);
}

export function getAgeInfo(createdAt: string | Date): {
  label: string;
  color: string;
  bg: string;
  isOverdue: boolean;
} {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageH = ageMs / 3_600_000;
  if (ageH < 24) return { label: `${Math.round(ageH)}h ago`, color: "text-green-700", bg: "bg-green-50 border-green-200", isOverdue: false };
  if (ageH < 48) return { label: `${Math.floor(ageH / 24)}d ago`, color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", isOverdue: false };
  return { label: `${Math.floor(ageH / 24)}d overdue`, color: "text-red-700", bg: "bg-red-50 border-red-200", isOverdue: true };
}

export function getInvestorPriority(investor: {
  investmentRange?: string | null;
  createdAt: string | Date;
  status?: string | null;
}): { score: number; label: string; color: string } {
  let score = 0;
  const range = (investor.investmentRange || "").toLowerCase();
  if (range.includes("1m") || range.includes("1,000,000") || range.includes("million")) score += 5;
  else if (range.includes("500k") || range.includes("500,000")) score += 4;
  else if (range.includes("100k") || range.includes("100,000")) score += 3;
  else if (range.includes("50k") || range.includes("50,000")) score += 2;
  else if (range) score += 1;
  const daysOld = (Date.now() - new Date(investor.createdAt).getTime()) / 86_400_000;
  if (daysOld <= 7) score += 3;
  else if (daysOld <= 30) score += 2;
  else score += 1;
  const status = investor.status || "new";
  if (status === "new") score += 2;
  else if (status === "in_discussion") score += 1;
  else if (status === "declined" || status === "archived") score -= 3;
  if (score >= 8) return { score, label: "High", color: "bg-red-100 text-red-700 border-red-200" };
  if (score >= 5) return { score, label: "Med", color: "bg-amber-100 text-amber-700 border-amber-200" };
  return { score, label: "Low", color: "bg-gray-100 text-gray-500 border-gray-200" };
}

function csvRow(cells: unknown[]) {
  return cells.map((c) => `"${String(c ?? "").replace(/"/g, '""').replace(/[\n\r]/g, " ")}"`).join(",");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToCSV(data: any[], filename: string, projectName?: string) {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  if (filename.includes("investor")) {
    const headers = [
      "Full Name", "Email", "Phone", "Organization", "Role", "Location", "Investor Type",
      "Investment Range", "Timeline", "Primary Interest", "Investment Experience", "Motivations",
      "Impact Goals", "Questions", "Referral Source", "Status", "Submitted",
    ];
    const rows = data.map((i: any) =>
      csvRow([
        i.fullName, i.email, i.phone, i.organization, i.role, i.location,
        i.investorType, i.investmentRange, i.investmentTimeline, i.primaryInterest,
        i.investmentExperience, i.motivations, i.impactGoals, i.questionsForTeam,
        i.referralSource || i.howHeard, i.status, new Date(i.createdAt).toLocaleString(),
      ]),
    );
    downloadCSV([headers.join(","), ...rows].join("\n"), filename + (projectName ? "_" + projectName : ""));
  } else if (filename.includes("application")) {
    const headers = [
      "Project Name", "Contact Name", "Contact Email", "Location", "Size (ha)", "Current People",
      "Target People", "Households", "Land Status", "Vision", "Regenerative Practices", "Governance",
      "Current Funding", "Funding Needs", "Status", "Submitted",
    ];
    const rows = data.map((a: any) =>
      csvRow([
        a.projectName, a.contactName, a.contactEmail, a.location,
        a.projectSizeHectares, a.currentPeopleCount, a.intendedPeopleCount, a.intendedHouseholdCount,
        a.landStatus, a.vision, a.regenerativePractices, a.governanceApproach,
        a.currentFunding, a.fundingNeeds, a.status,
        a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "Draft",
      ]),
    );
    downloadCSV([headers.join(","), ...rows].join("\n"), filename + (projectName ? "_" + projectName : ""));
  } else {
    const headers = ["Full Name", "Email", "Organization", "Path Type", "Message", "Status", "Location", "Date"];
    const rows = data.map((i: any) =>
      csvRow([
        i.fullName, i.email, i.organization, i.pathType,
        i.message, i.status, i.location, new Date(i.createdAt).toLocaleString(),
      ]),
    );
    downloadCSV([headers.join(","), ...rows].join("\n"), filename + (projectName ? "_" + projectName : ""));
  }
  toast.success(`Exported ${data.length} records to CSV`);
}

export function filterByProject(inquiries: any[], projectId: string): any[] {
  return inquiries.filter((inquiry: any) => {
    try {
      const formData = inquiry.formData ? JSON.parse(inquiry.formData) : {};
      const selectedProjects = formData.selectedProjects || [];
      const selectedOrganizations = formData.selectedOrganizations || [];
      return (
        selectedProjects.includes(projectId) ||
        selectedOrganizations.includes(projectId) ||
        selectedProjects.includes("all") ||
        selectedOrganizations.includes("all")
      );
    } catch {
      return false;
    }
  });
}

export const INQUIRY_HUB_TYPES = ["live", "create", "alliance", "role", "other"] as const;
export type InquiryHubType = (typeof INQUIRY_HUB_TYPES)[number];

export function inquiryTypeForPath(pathType: string | undefined | null): InquiryHubType {
  if (!pathType) return "live";
  if (pathType === "finance" || pathType === "learn") return "other";
  if ((INQUIRY_HUB_TYPES as readonly string[]).includes(pathType)) return pathType as InquiryHubType;
  return "other";
}

type WaitingRow = {
  id: number;
  status?: string | null;
  createdAt?: string | Date | null;
  submittedAt?: string | Date | null;
};

function waitingTime(row: WaitingRow): number {
  return new Date(row.submittedAt || row.createdAt || 0).getTime();
}

/** Oldest row whose status is in `statuses`. Missing status counts as `fallback`. */
export function oldestWaiting<T extends WaitingRow>(
  rows: T[] | undefined,
  statuses: string[],
  fallback = "new",
): T | undefined {
  return [...(rows || [])]
    .filter((row) => statuses.includes(row.status || fallback))
    .sort((a, b) => waitingTime(a) - waitingTime(b))[0];
}
