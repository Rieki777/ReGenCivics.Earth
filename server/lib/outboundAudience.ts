/**
 * Who an Outbound letter goes to.
 *
 * One resolver for every audience, used at preview (the snapshot), again at
 * send (the live re-check: anyone no longer on the list is skipped_unsub),
 * and for each recipient's footer link. Deduped by lowercased email.
 *
 * Newsletter audiences (no `list`) are the community subscribers as before,
 * each with a signed Manage email preferences link.
 *
 * List audiences (2026-09-24) are people who asked for news by email without
 * an account: one campaign's email followers, everyone following any
 * campaign by email, one season's crowdpool waitlist, or (2026-09-27) the
 * season digest, which is every email follower plus that season's waitlist,
 * optionally leaving out anyone who already offered on a live campaign. It
 * is how email-only followers hear about openings and final stretches:
 * platform notices reach account holders only. They are mailed
 * only from here (Rye's admin Outbound), never automatically, and each
 * letter carries that person's own token unsubscribe link, never the
 * newsletter prefs link.
 */
import { ENV } from "../_core/env";
import * as db from "../db";
import { getNewsletterAudience } from "../db/newsletter";
import { managePreferencesUrl } from "./emailPrefs";
import type { ListFooter } from "../../shared/letterHtml";
import { parseAudienceList, type OutboundAudienceList } from "../../shared/outboundHistory";
import { OUTBOUND_DIGEST } from "../../shared/crowdpoolCopy";
import { regenSeasonSpan } from "../../shared/regenYear";

export type OutboundAudienceInput = { sources: string[]; activeOnly?: boolean; list?: OutboundAudienceList };

export type OutboundRecipient = {
  email: string;
  name: string | null;
  /** newsletter source, or campaign:{id} | all_campaigns | waitlist:{n} | season_digest:{n} (fits varchar 32). */
  source: string | null;
  /** The footer link for this person. Newsletter: signed prefs URL. Lists: token unsubscribe URL. */
  unsubscribeUrl: string;
};

export const LIST_UNSUBSCRIBE_PATH = "/campaign-updates/unsubscribe";
export const LIST_LINK_LABEL = "Stop these emails";

/**
 * A person's stop link. The `list` marker tells the page what kind of letter
 * it came from: an "everyone following a campaign" letter has no single
 * campaign to stop, so the page offers only "stop all" (one token row alone
 * would leave the person on the list through their other follows); a
 * waitlist letter reads as the waitlist.
 */
export function listUnsubscribeUrl(token: string, list?: OutboundAudienceList | null): string {
  const url = new URL(LIST_UNSUBSCRIBE_PATH, ENV.appUrl);
  url.searchParams.set("token", token);
  // A season digest mixes follower and waitlist rows: only "stop all" makes sense.
  if (list?.kind === "all_campaigns" || list?.kind === "season_digest") url.searchParams.set("list", "all");
  else if (list?.kind === "waitlist") url.searchParams.set("list", "waitlist");
  return url.toString();
}

/** What previews show in place of a person's token. */
export function previewListUnsubscribeUrl(list?: OutboundAudienceList | null): string {
  return listUnsubscribeUrl("preview", list);
}

export function listSource(list: OutboundAudienceList): string {
  if (list.kind === "campaign") return `campaign:${list.campaignId}`;
  if (list.kind === "all_campaigns") return "all_campaigns";
  if (list.kind === "season_digest") return `season_digest:${list.seasonNumber}`;
  return `waitlist:${list.seasonNumber}`;
}

/** The footer's reason line for a list, in plain words. */
export async function listFooterReason(list: OutboundAudienceList): Promise<string> {
  if (list.kind === "waitlist") return "You asked us to tell you when crowdpooling opens.";
  if (list.kind === "season_digest") return OUTBOUND_DIGEST.footer;
  if (list.kind === "all_campaigns") return "You asked for news about a campaign on regencivics.earth.";
  const campaign = await db.getCampaignById(list.campaignId);
  const { decodeBasicEntities } = await import("../../shared/htmlText");
  const title = campaign ? decodeBasicEntities(campaign.title) : "a campaign";
  return `You asked for news about ${title} on regencivics.earth.`;
}

/** The list footer with a given link (a person's token URL, or the preview placeholder). */
export async function listFooterFor(list: OutboundAudienceList, url: string): Promise<ListFooter> {
  return { reason: await listFooterReason(list), linkLabel: LIST_LINK_LABEL, url };
}

/** Dedupe by lowercased, trimmed email; the first row wins (rows arrive oldest id first). */
function dedupe<T extends { email: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const key = String(r.email ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

async function resolveList(list: OutboundAudienceList): Promise<OutboundRecipient[]> {
  const source = listSource(list);
  if (list.kind === "season_digest") return resolveSeasonDigest(list, source);
  const rows = list.kind === "campaign"
    ? await db.getEmailFollowers({ campaignId: list.campaignId })
    : list.kind === "all_campaigns"
      ? await db.getEmailFollowers()
      : await db.listWaitlist(list.seasonNumber);
  // all_campaigns: several follow rows per email collapse to the lowest id's
  // token (getEmailFollowers orders by id), so one letter, one stop link.
  return dedupe(rows).map((r) => ({
    email: r.email.trim(),
    name: r.name ?? null,
    source,
    unsubscribeUrl: listUnsubscribeUrl(r.unsubscribeToken, list),
  }));
}

/**
 * The season digest: every email follower (oldest follow first) then that
 * season's waitlist, one row per lowercased address (the first row's token
 * wins, so one letter, one stop link), minus, when excludeOffered, every
 * address with an offer that isn't withdrawn on a live real campaign.
 */
async function resolveSeasonDigest(
  list: Extract<OutboundAudienceList, { kind: "season_digest" }>,
  source: string,
): Promise<OutboundRecipient[]> {
  const [followers, waitlist, offered] = await Promise.all([
    db.getEmailFollowers(),
    db.listWaitlist(list.seasonNumber),
    list.excludeOffered ? db.getOfferedEmailsOnLiveCampaigns() : Promise.resolve(new Set<string>()),
  ]);
  return dedupe([...followers, ...waitlist])
    .filter((r) => !offered.has(String(r.email ?? "").trim().toLowerCase()))
    .map((r) => ({
      email: r.email.trim(),
      name: r.name ?? null,
      source,
      unsubscribeUrl: listUnsubscribeUrl(r.unsubscribeToken, list),
    }));
}

export async function resolveOutboundRecipients(audience: OutboundAudienceInput): Promise<OutboundRecipient[]> {
  const list = audience.list ? parseAudienceList(audience.list) : null;
  if (list) return resolveList(list);

  const subscribers = await getNewsletterAudience({ sources: audience.sources });
  const out: OutboundRecipient[] = [];
  for (const row of dedupe(subscribers)) {
    out.push({
      email: row.email,
      name: row.name ?? null,
      source: row.source ?? null,
      unsubscribeUrl: await managePreferencesUrl(row.email, { mute: "seasonal" }),
    });
  }
  return out;
}

/** Counts for Outbound's audience picker, from the same resolver. */
export async function listAudienceCounts(): Promise<{
  campaigns: Array<{ id: number; title: string; isDemo: boolean; status: string; count: number }>;
  allCampaigns: number;
  waitlists: Array<{ seasonNumber: number; count: number }>;
  seasonDigests: Array<{ seasonNumber: number; count: number; countExcluding: number }>;
}> {
  const perCampaign = await db.getEmailFollowerCountsByCampaign();
  const campaigns: Array<{ id: number; title: string; isDemo: boolean; status: string; count: number }> = [];
  for (const row of perCampaign) {
    const campaign = await db.getCampaignById(row.campaignId);
    if (!campaign) continue; // followers of a deleted campaign are reached by all_campaigns
    const count = (await resolveList({ kind: "campaign", campaignId: row.campaignId })).length;
    if (count === 0) continue;
    campaigns.push({ id: campaign.id, title: campaign.title, isDemo: !!campaign.isDemo, status: campaign.status, count });
  }
  campaigns.sort((a, b) => b.count - a.count || a.id - b.id);
  const allCampaigns = (await resolveList({ kind: "all_campaigns" })).length;
  const waitlists: Array<{ seasonNumber: number; count: number }> = [];
  for (const w of await db.getWaitlistCountsBySeason()) {
    waitlists.push({ seasonNumber: w.seasonNumber, count: (await resolveList({ kind: "waitlist", seasonNumber: w.seasonNumber })).length });
  }
  // The season digest for the current season and the next.
  const current = regenSeasonSpan(new Date()).seasonNumber;
  const seasonDigests: Array<{ seasonNumber: number; count: number; countExcluding: number }> = [];
  for (const seasonNumber of [current, current + 1]) {
    seasonDigests.push({
      seasonNumber,
      count: (await resolveList({ kind: "season_digest", seasonNumber, excludeOffered: false })).length,
      countExcluding: (await resolveList({ kind: "season_digest", seasonNumber, excludeOffered: true })).length,
    });
  }
  return { campaigns, allCampaigns, waitlists, seasonDigests };
}
