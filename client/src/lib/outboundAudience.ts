/**
 * Filter and CSV helpers for the Outbound People list.
 * Pure so tests do not need the admin shell or tRPC.
 */

export const NEWSLETTER_SOURCES = [
  "homepage",
  "investor_form",
  "connect_form",
  "apply_form",
  "footer",
  "exit_intent",
  "other",
] as const;

export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];
export type SubscriberStatusFilter = "active" | "pending" | "all";

export type NewsletterAudienceRow = {
  id: number;
  email: string;
  name?: string | null;
  source?: string | null;
  isActive: number;
  createdAt: string | Date;
};

export function filterNewsletterAudience(
  rows: NewsletterAudienceRow[],
  opts: { status: SubscriberStatusFilter; source: string },
): NewsletterAudienceRow[] {
  return rows.filter((row) => {
    if (opts.status === "active" && row.isActive !== 1) return false;
    if (opts.status === "pending" && row.isActive !== 0) return false;
    if (opts.source && opts.source !== "all" && (row.source || "other") !== opts.source) return false;
    return true;
  });
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function newsletterAudienceCsv(rows: NewsletterAudienceRow[]): string {
  const headers = ["Email", "Name", "Source", "Active", "Subscribed Date"];
  const lines = rows.map((row) => {
    const date = row.createdAt instanceof Date
      ? row.createdAt.toLocaleDateString()
      : new Date(row.createdAt).toLocaleDateString();
    return [
      csvCell(row.email),
      csvCell(row.name || ""),
      csvCell(row.source || "other"),
      row.isActive === 1 ? "yes" : "no",
      csvCell(date),
    ].join(",");
  });
  return [headers.join(","), ...lines].join("\n");
}

export function newsletterSourceLabel(source: string): string {
  return source.replace(/_/g, " ");
}
