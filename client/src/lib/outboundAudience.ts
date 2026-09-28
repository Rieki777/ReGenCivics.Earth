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
import { OUTBOUND_DIGEST } from "@shared/crowdpoolCopy";

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
//   "list:season_digest:<season>"      that season's digest: email followers
//                                      and the waitlist, one letter each
// A list audience replaces the newsletter sources on the server.
//
// The season digest's "leave out people who already offered" is a checkbox
// beside the Select, not part of its value: `parseAudienceChoiceValue` takes
// the checkbox's current state (on by default).

export type AudienceChoice =
  | { kind: "newsletter"; source: NewsletterSource | "all" }
  | { kind: "list"; list: OutboundAudienceList };

/** What outbound.listAudiences returns. */
export type ListAudienceCounts = {
  campaigns: Array<{ id: number; title: string; isDemo: boolean; status: string; count: number }>;
  allCampaigns: number;
  waitlists: Array<{ seasonNumber: number; count: number }>;
  /** The current season's digest and the next (build spec 2026-09-27, section 12.4). */
  seasonDigests?: Array<{ seasonNumber: number; count: number; countExcluding: number }>;
};

export function audienceChoiceValue(choice: AudienceChoice): string {
  if (choice.kind === "newsletter") return `nl:${choice.source}`;
  const l = choice.list;
  if (l.kind === "campaign") return `list:campaign:${l.campaignId}`;
  if (l.kind === "all_campaigns") return "list:all_campaigns";
  if (l.kind === "season_digest") return `list:season_digest:${l.seasonNumber}`;
  return `list:waitlist:${l.seasonNumber}`;
}

export function parseAudienceChoiceValue(
  value: string,
  opts: { excludeOffered?: boolean } = {},
): AudienceChoice | null {
  if (value === "nl:all") return { kind: "newsletter", source: "all" };
  if (value.startsWith("nl:")) {
    const s = value.slice(3);
    return (NEWSLETTER_SOURCES as readonly string[]).includes(s)
      ? { kind: "newsletter", source: s as NewsletterSource }
      : null;
  }
  if (value === "list:all_campaigns") return { kind: "list", list: { kind: "all_campaigns" } };
  const m = value.match(/^list:(campaign|waitlist|season_digest):(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[2], 10);
  if (!Number.isInteger(n) || n < 1) return null;
  if (m[1] === "campaign") return { kind: "list", list: { kind: "campaign", campaignId: n } };
  if (m[1] === "season_digest") {
    return { kind: "list", list: { kind: "season_digest", seasonNumber: n, excludeOffered: opts.excludeOffered !== false } };
  }
  return { kind: "list", list: { kind: "waitlist", seasonNumber: n } };
}

/** The season digest's checkbox state for a choice: on unless a digest choice turned it off. */
export function excludeOfferedOf(choice: AudienceChoice | null | undefined): boolean {
  return choice?.kind === "list" && choice.list.kind === "season_digest" ? choice.list.excludeOffered : true;
}

/** The same choice with the season digest's checkbox set. Other choices come back unchanged. */
export function withExcludeOffered(choice: AudienceChoice, excludeOffered: boolean): AudienceChoice {
  if (choice.kind !== "list" || choice.list.kind !== "season_digest") return choice;
  return { kind: "list", list: { ...choice.list, excludeOffered } };
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
  if (l.kind === "season_digest") {
    const d = (counts.seasonDigests ?? []).find((s) => s.seasonNumber === l.seasonNumber);
    return d ? (l.excludeOffered ? d.countExcluding : d.count) : 0;
  }
  return counts.waitlists.find((w) => w.seasonNumber === l.seasonNumber)?.count ?? 0;
}

export type AudienceOptionGroup = {
  label: string;
  options: Array<{ value: string; label: string; count: number | null }>;
};

/**
 * The email-list groups for the Select, in order: each campaign's email
 * followers, everyone following a campaign by email, each waitlist season,
 * then the season digests. `keep` makes sure a list chosen by Duplicate
 * still shows even if its count has dropped to zero, and a digest's count
 * follows its "leave out people who already offered" checkbox (on unless
 * `keep` is a digest with it off). A digest option carries its count in its
 * own label, so its `count` is null.
 */
export function listAudienceGroups(counts: ListAudienceCounts | null | undefined, keep?: AudienceChoice | null): AudienceOptionGroup[] {
  const groups: AudienceOptionGroup[] = [];
  const excludeOffered = excludeOfferedOf(keep);
  const digestOpts = (counts?.seasonDigests ?? []).map((d) => ({
    value: audienceChoiceValue({ kind: "list", list: { kind: "season_digest", seasonNumber: d.seasonNumber, excludeOffered } }),
    label: OUTBOUND_DIGEST.choice(d.seasonNumber, excludeOffered ? d.countExcluding : d.count),
    count: null as number | null,
  }));
  const campaignOpts = (counts?.campaigns ?? []).map((c) => ({
    value: audienceChoiceValue({ kind: "list", list: { kind: "campaign", campaignId: c.id } }),
    label: `Email followers: ${c.title}${c.isDemo ? " (Example)" : ""}${c.status === "cancelled" ? " (cancelled)" : c.status === "closed" ? " (closed)" : ""}`,
    count: c.count,
  }));
  const waitOpts = (counts?.waitlists ?? []).map((w) => ({
    value: audienceChoiceValue({ kind: "list", list: { kind: "waitlist", seasonNumber: w.seasonNumber } }),
    label: `Crowdpool waitlist, Season ${w.seasonNumber}`,
    count: w.count,
  }));
  if (keep?.kind === "list") {
    const v = audienceChoiceValue(keep);
    const all = [...campaignOpts, ...waitOpts, ...digestOpts, { value: "list:all_campaigns" }];
    if (!all.some((o) => o.value === v)) {
      if (keep.list.kind === "season_digest") {
        // A letter to an earlier season's digest, duplicated: shown with no count row.
        digestOpts.push({ value: v, label: OUTBOUND_DIGEST.choice(keep.list.seasonNumber, 0), count: null });
      } else {
        const opt = { value: v, label: summarizeAudienceList(keep.list, campaignTitleMap(counts)), count: 0 };
        if (keep.list.kind === "campaign") campaignOpts.push(opt);
        else if (keep.list.kind === "waitlist") waitOpts.push(opt);
      }
    }
  }
  if (campaignOpts.length > 0) groups.push({ label: "Campaign email followers", options: campaignOpts });
  groups.push({
    label: "All campaigns",
    options: [{ value: "list:all_campaigns", label: "Everyone following a campaign by email", count: counts?.allCampaigns ?? 0 }],
  });
  if (waitOpts.length > 0) groups.push({ label: "Crowdpool waitlist", options: waitOpts });
  if (digestOpts.length > 0) groups.push({ label: OUTBOUND_DIGEST.group, options: digestOpts });
  return groups;
}
