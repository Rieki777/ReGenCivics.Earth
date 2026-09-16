/**
 * Shared investor-admin triage vocabulary.
 *
 * Overview KPIs, Needs you, and the Investors tab must agree on what
 * "pending review" / "needs action" means so counts don't drift.
 *
 * Product assumption: archived is a terminal status (not a separate flag).
 * "New" and "pending" are both waiting on admin; Overview "new" = pending review
 * = those statuses only (archived never appears in that bucket).
 */

/** Statuses that still need an admin first look / reply. */
export const INVESTOR_PENDING_REVIEW_STATUSES = ["new", "pending"] as const;

export type InvestorTriageFilter =
  | "needs_action"
  | "overdue"
  | "duplicates"
  | "all"
  | "new"
  | "pending"
  | "contacted"
  | "in_discussion"
  | "committed"
  | "declined"
  | "archived";

export type InvestorLike = {
  id?: number;
  email?: string | null;
  fullName?: string | null;
  organization?: string | null;
  investmentRange?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
};

export function normalizeInvestorStatus(status: string | null | undefined): string {
  return (status || "new").toLowerCase();
}

export function isInvestorArchived(inv: InvestorLike): boolean {
  return normalizeInvestorStatus(inv.status) === "archived";
}

export function isInvestorPendingReview(inv: InvestorLike): boolean {
  const s = normalizeInvestorStatus(inv.status);
  return (INVESTOR_PENDING_REVIEW_STATUSES as readonly string[]).includes(s);
}

/** Needs-action queue: pending review and not archived (archived is separate status). */
export function isInvestorNeedsAction(inv: InvestorLike): boolean {
  return isInvestorPendingReview(inv) && !isInvestorArchived(inv);
}

export function isInvestorOverdue(inv: InvestorLike, nowMs: number = Date.now()): boolean {
  if (!inv.createdAt) return false;
  if (isInvestorArchived(inv)) return false;
  if (!isInvestorPendingReview(inv)) return false;
  const ageH = (nowMs - new Date(inv.createdAt).getTime()) / 3_600_000;
  // Same 48h threshold as getAgeInfo / Investors row badges.
  return ageH >= 48;
}

export function buildDuplicateInvestorEmails(investors: InvestorLike[]): Set<string> {
  const counts: Record<string, number> = {};
  for (const inv of investors) {
    const email = (inv.email || "").trim().toLowerCase();
    if (!email) continue;
    counts[email] = (counts[email] || 0) + 1;
  }
  return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([e]) => e));
}

export function countInvestorTriage(investors: InvestorLike[]): {
  total: number;
  /** Alias used by ecosystem snapshot `investors.new` — pending review only. */
  pendingReview: number;
  archived: number;
  overdue: number;
  duplicateRows: number;
} {
  const dupes = buildDuplicateInvestorEmails(investors);
  let pendingReview = 0;
  let archived = 0;
  let overdue = 0;
  let duplicateRows = 0;
  for (const inv of investors) {
    if (isInvestorArchived(inv)) archived += 1;
    if (isInvestorPendingReview(inv)) pendingReview += 1;
    if (isInvestorOverdue(inv)) overdue += 1;
    const email = (inv.email || "").trim().toLowerCase();
    if (email && dupes.has(email)) duplicateRows += 1;
  }
  return {
    total: investors.length,
    pendingReview,
    archived,
    overdue,
    duplicateRows,
  };
}

export function investorMatchesSearch(inv: InvestorLike, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return (
    (inv.fullName || "").toLowerCase().includes(q) ||
    (inv.email || "").toLowerCase().includes(q) ||
    (inv.investmentRange || "").toLowerCase().includes(q) ||
    (inv.organization || "").toLowerCase().includes(q)
  );
}

/**
 * Filter + light sort for the Investors admin list.
 * Default `needs_action`: pending review, not archived.
 */
export function filterInvestorsForTriage(
  investors: InvestorLike[],
  opts: {
    filter: string;
    search?: string;
    duplicateEmails?: Set<string>;
  },
): InvestorLike[] {
  const dupes = opts.duplicateEmails ?? buildDuplicateInvestorEmails(investors);
  const search = opts.search?.trim() || "";
  const filter = opts.filter || "needs_action";

  const rows = investors.filter((inv) => {
    if (!investorMatchesSearch(inv, search)) return false;
    switch (filter) {
      case "needs_action":
        return isInvestorNeedsAction(inv);
      case "overdue":
        return isInvestorOverdue(inv);
      case "duplicates": {
        const email = (inv.email || "").trim().toLowerCase();
        return Boolean(email && dupes.has(email));
      }
      case "all":
        return true;
      default:
        return normalizeInvestorStatus(inv.status) === filter;
    }
  });

  // Group duplicate emails together when viewing the duplicates filter.
  if (filter === "duplicates") {
    return [...rows].sort((a, b) => {
      const ea = (a.email || "").toLowerCase();
      const eb = (b.email || "").toLowerCase();
      if (ea !== eb) return ea.localeCompare(eb);
      return String(a.fullName || "").localeCompare(String(b.fullName || ""));
    });
  }

  return rows;
}

/** Empty-state copy for the active triage filter. */
export function investorTriageEmptyCopy(filter: string): { title: string; hint: string } {
  switch (filter) {
    case "needs_action":
      return {
        title: "Nothing needs action",
        hint: "No pending (non-archived) investor inquiries. Switch to All to browse history.",
      };
    case "overdue":
      return {
        title: "No overdue investors",
        hint: "Nothing pending review older than 48 hours.",
      };
    case "duplicates":
      return {
        title: "No duplicate emails",
        hint: "Every investor email appears once.",
      };
    case "archived":
      return {
        title: "No archived investors",
        hint: "Archive a declined or spam inquiry to keep the queue clean.",
      };
    default:
      return {
        title: "No investors match",
        hint: "Try clearing search or switching filters.",
      };
  }
}
