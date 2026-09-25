/**
 * Filter and CSV helpers for the Outbound People list, plus the audience
 * picker for Outbound Write (newsletter sources and the email lists).
 * Pure so tests do not need the admin shell or tRPC.
 */
import {
  audienceToWriteList,
  audienceToWriteSource,
  summarizeAudienceList,
  type OutboundAudienceList,
} from "@shared/outboundHistory";

export type { OutboundAudienceList };

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

// ─── Audience picker (Outbound Write) ────────────────────────────────────────
//
// One Select holds both kinds of audience. Its value is a string:
//   "nl:all", "nl:<source>"            newsletter subscribers
//   "list:campaign:<id>"               one campaign's email followers
//   "list:all_campaigns"               everyone following a campaign by email
//   "list:waitlist:<season>"           the crowdpool waitlist for a season
// A list audience replaces the newsletter sources on the server.

export type AudienceChoice =
  | { kind: "newsletter"; source: NewsletterSource | "all" }
  | { kind: "list"; list: OutboundAudienceList };

/** What outbound.listAudiences returns. */
export type ListAudienceCounts = {
  campaigns: Array<{ id: number; title: string; isDemo: boolean; status: string; count: number }>;
  allCampaigns: number;
  waitlists: Array<{ seasonNumber: number; count: number }>;
};

export function audienceChoiceValue(choice: AudienceChoice): string {
  if (choice.kind === "newsletter") return `nl:${choice.source}`;
  const l = choice.list;
  if (l.kind === "campaign") return `list:campaign:${l.campaignId}`;
  if (l.kind === "all_campaigns") return "list:all_campaigns";
  return `list:waitlist:${l.seasonNumber}`;
}

export function parseAudienceChoiceValue(value: string): AudienceChoice | null {
  if (value === "nl:all") return { kind: "newsletter", source: "all" };
  if (value.startsWith("nl:")) {
    const s = value.slice(3);
    return (NEWSLETTER_SOURCES as readonly string[]).includes(s)
      ? { kind: "newsletter", source: s as NewsletterSource }
      : null;
  }
  if (value === "list:all_campaigns") return { kind: "list", list: { kind: "all_campaigns" } };
  const m = value.match(/^list:(campaign|waitlist):(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[2], 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return m[1] === "campaign"
    ? { kind: "list", list: { kind: "campaign", campaignId: n } }
    : { kind: "list", list: { kind: "waitlist", seasonNumber: n } };
}

/** The audience object Outbound saves: a list replaces the sources. */
export function audienceFromChoice(choice: AudienceChoice): {
  sources: NewsletterSource[];
  activeOnly: true;
  list?: OutboundAudienceList;
} {
  if (choice.kind === "list") return { sources: [], activeOnly: true, list: choice.list };
  return { sources: choice.source === "all" ? [] : [choice.source], activeOnly: true };
}

/** The picker choice a stored letter went to, so Duplicate keeps it and never widens to everyone. */
export function choiceFromStoredAudience(raw: unknown): AudienceChoice {
  const list = audienceToWriteList(raw);
  if (list) return { kind: "list", list };
  const source = audienceToWriteSource(raw);
  return (NEWSLETTER_SOURCES as readonly string[]).includes(source)
    ? { kind: "newsletter", source: source as NewsletterSource }
    : { kind: "newsletter", source: "all" };
}

function campaignTitleMap(counts: ListAudienceCounts | null | undefined): Record<number, string> {
  const out: Record<number, string> = {};
  for (const c of counts?.campaigns ?? []) out[c.id] = c.title;
  return out;
}

/** A plain label for the chosen audience, for the composer and the drafting assistant. */
export function audienceChoiceLabel(choice: AudienceChoice, counts?: ListAudienceCounts | null): string {
  if (choice.kind === "newsletter") {
    return choice.source === "all"
      ? "active subscribers"
      : `active ${newsletterSourceLabel(choice.source)} subscribers`;
  }
  return summarizeAudienceList(choice.list, campaignTitleMap(counts));
}

/** How many people the chosen list reaches, from listAudiences. Null for newsletter choices. */
export function listChoiceCount(choice: AudienceChoice, counts?: ListAudienceCounts | null): number | null {
  if (choice.kind !== "list") return null;
  const l = choice.list;
  if (!counts) return 0;
  if (l.kind === "all_campaigns") return counts.allCampaigns;
  if (l.kind === "campaign") return counts.campaigns.find((c) => c.id === l.campaignId)?.count ?? 0;
  return counts.waitlists.find((w) => w.seasonNumber === l.seasonNumber)?.count ?? 0;
}

export type AudienceOptionGroup = {
  label: string;
  options: Array<{ value: string; label: string; count: number | null }>;
};

/**
 * The email-list groups for the Select, in order: each campaign's email
 * followers, everyone following a campaign by email, then each waitlist
 * season. `keep` makes sure a list chosen by Duplicate still shows even if
 * its count has dropped to zero.
 */
export function listAudienceGroups(counts: ListAudienceCounts | null | undefined, keep?: AudienceChoice | null): AudienceOptionGroup[] {
  const groups: AudienceOptionGroup[] = [];
  const campaignOpts = (counts?.campaigns ?? []).map((c) => ({
    value: audienceChoiceValue({ kind: "list", list: { kind: "campaign", campaignId: c.id } }),
    label: `Email followers: ${c.title}${c.isDemo ? " (Example)" : ""}${c.status === "cancelled" ? " (cancelled)" : ""}`,
    count: c.count,
  }));
  const waitOpts = (counts?.waitlists ?? []).map((w) => ({
    value: audienceChoiceValue({ kind: "list", list: { kind: "waitlist", seasonNumber: w.seasonNumber } }),
    label: `Crowdpool waitlist, Season ${w.seasonNumber}`,
    count: w.count,
  }));
  if (keep?.kind === "list") {
    const v = audienceChoiceValue(keep);
    const all = [...campaignOpts, ...waitOpts, { value: "list:all_campaigns" }];
    if (!all.some((o) => o.value === v)) {
      const opt = { value: v, label: summarizeAudienceList(keep.list, campaignTitleMap(counts)), count: 0 };
      if (keep.list.kind === "campaign") campaignOpts.push(opt);
      else if (keep.list.kind === "waitlist") waitOpts.push(opt);
    }
  }
  if (campaignOpts.length > 0) groups.push({ label: "Campaign email followers", options: campaignOpts });
  groups.push({
    label: "All campaigns",
    options: [{ value: "list:all_campaigns", label: "Everyone following a campaign by email", count: counts?.allCampaigns ?? 0 }],
  });
  if (waitOpts.length > 0) groups.push({ label: "Crowdpool waitlist", options: waitOpts });
  return groups;
}
