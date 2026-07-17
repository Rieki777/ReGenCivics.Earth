/**
 * Needs and Offers matcher (Phase B2): deterministic cron, zero LLM.
 *
 * Rule-level matching (shared tags + compatible bioregion, pure planner in
 * server/lib/needsOffers.ts). On a new match it inserts the pair into the
 * needs_offers_matches ledger (unique per pair, so an introduction can never
 * send twice), emails both parties a clearly-automated introduction naming
 * each other's contact, and flips both rows open → matched (they keep
 * matching until their owner closes them).
 *
 * Suppression, in order: parties with no reachable email never match; players
 * with emailDigestFrequency = "never" or a ban never match; a per-party daily
 * introduction cap (INTRO_DAILY_CAP_PER_PARTY) bounds volume; the global email
 * rate limiter and EMAIL_HOLD still gate the transport underneath.
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { getDb, isUserBanned, getPlayerProfileByUserId } from "../db";
import { bioregions, needsOffersMatches, playerOffers, projectNeeds, users } from "../../drizzle/schema";
import { normalizeTags, planMatches, introEmail, type MatchableRow } from "../lib/needsOffers";
import { sendEmail, toAbsoluteUrl } from "../_core/email";

const MAX_INTROS_PER_RUN = 20;
const EMAIL_SPACING_MS = 150;

export type NeedsOffersMatcherReport = {
  ok: boolean;
  needsConsidered: number;
  offersConsidered: number;
  matchesPlanned: number;
  introsSent: number;
  errors: string[];
};

type LoadedRow = MatchableRow & {
  title: string;
  timeWindow: string | null;
  partyName: string;
  status: "open" | "matched" | "closed";
};

export async function runNeedsOffersMatcherJob(): Promise<NeedsOffersMatcherReport> {
  const report: NeedsOffersMatcherReport = {
    ok: true,
    needsConsidered: 0,
    offersConsidered: 0,
    matchesPlanned: 0,
    introsSent: 0,
    errors: [],
  };
  const db = await getDb();
  if (!db) return { ...report, ok: false, errors: ["database unavailable"] };

  try {
    const needs = await loadRows(db, "need");
    const offers = await loadRows(db, "offer");
    report.needsConsidered = needs.length;
    report.offersConsidered = offers.length;
    if (needs.length === 0 || offers.length === 0) return report;

    const ledger = await db
      .select({ needId: needsOffersMatches.needId, offerId: needsOffersMatches.offerId })
      .from(needsOffersMatches);
    const existingPairs = new Set(ledger.map((m) => `${m.needId}:${m.offerId}`));

    // Seed today's per-party counts from matches already emailed today.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await db
      .select({ needId: needsOffersMatches.needId, offerId: needsOffersMatches.offerId })
      .from(needsOffersMatches)
      .where(and(isNotNull(needsOffersMatches.emailSentAt), gte(needsOffersMatches.emailSentAt, startOfDay)));
    const emailByNeedId = new Map(needs.map((n) => [n.id, n.partyEmail]));
    const emailByOfferId = new Map(offers.map((o) => [o.id, o.partyEmail]));
    const sentTodayByEmail = new Map<string, number>();
    for (const m of sentToday) {
      for (const email of [emailByNeedId.get(m.needId), emailByOfferId.get(m.offerId)]) {
        if (email) sentTodayByEmail.set(email, (sentTodayByEmail.get(email) ?? 0) + 1);
      }
    }

    const planned = planMatches(needs, offers, existingPairs, sentTodayByEmail).slice(0, MAX_INTROS_PER_RUN);
    report.matchesPlanned = planned.length;

    const bioregionNames = await bioregionNameMap(db, [...needs, ...offers]);
    const boardUrl = toAbsoluteUrl("/board", { campaign: "needs_offers_intro" });

    for (const match of planned) {
      const need = needs.find((n) => n.id === match.needId)!;
      const offer = offers.find((o) => o.id === match.offerId)!;
      try {
        // Ledger first: the unique (needId, offerId) key makes concurrent runs safe.
        try {
          await db.insert(needsOffersMatches).values({ needId: match.needId, offerId: match.offerId });
        } catch {
          continue; // pair already ledgered by a concurrent run
        }

        const bioregionName =
          (need.bioregionId && bioregionNames.get(need.bioregionId)) ||
          (offer.bioregionId && bioregionNames.get(offer.bioregionId)) ||
          null;
        const shared = {
          needTitle: need.title,
          offerTitle: offer.title,
          tags: match.tags,
          bioregionName,
          needTimeWindow: need.timeWindow,
          offerTimeWindow: offer.timeWindow,
          boardUrl,
        };
        const toNeed = introEmail({
          ...shared,
          recipientName: need.partyName,
          otherName: offer.partyName,
          otherEmail: offer.partyEmail!,
        });
        const toOffer = introEmail({
          ...shared,
          recipientName: offer.partyName,
          otherName: need.partyName,
          otherEmail: need.partyEmail!,
        });

        const sentA = await sendEmail({ to: need.partyEmail!, subject: toNeed.subject, html: toNeed.html });
        await new Promise((r) => setTimeout(r, EMAIL_SPACING_MS));
        const sentB = await sendEmail({ to: offer.partyEmail!, subject: toOffer.subject, html: toOffer.html });
        await new Promise((r) => setTimeout(r, EMAIL_SPACING_MS));

        if (sentA.id !== null || sentB.id !== null) {
          await db
            .update(needsOffersMatches)
            .set({ emailSentAt: new Date() })
            .where(and(eq(needsOffersMatches.needId, match.needId), eq(needsOffersMatches.offerId, match.offerId)));
          report.introsSent += 1;
          await db.update(projectNeeds).set({ status: "matched" }).where(and(eq(projectNeeds.id, need.id), eq(projectNeeds.status, "open")));
          await db.update(playerOffers).set({ status: "matched" }).where(and(eq(playerOffers.id, offer.id), eq(playerOffers.status, "open")));
        }
        // Both blocked (EMAIL_HOLD / limiter): pair stays unstamped and retries.
      } catch (err: any) {
        report.errors.push(`match ${match.needId}:${match.offerId}: ${err?.message ?? err}`);
      }
    }
  } catch (err: any) {
    report.errors.push(`matcher: ${err?.message ?? err}`);
  }

  report.ok = report.errors.length === 0;
  return report;
}

async function loadRows(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  kind: "need" | "offer",
): Promise<LoadedRow[]> {
  const table = kind === "need" ? projectNeeds : playerOffers;
  const rows = await db
    .select({
      id: table.id,
      ownerId: table.ownerId,
      contactName: table.contactName,
      contactEmail: table.contactEmail,
      title: table.title,
      tags: table.tags,
      bioregionId: table.bioregionId,
      timeWindow: table.timeWindow,
      status: table.status,
      userName: users.name,
      userEmail: users.email,
    })
    .from(table)
    .leftJoin(users, eq(users.id, table.ownerId))
    .where(inArray(table.status, ["open", "matched"]));

  const out: LoadedRow[] = [];
  for (const r of rows) {
    const tags = normalizeTags(r.tags);
    if (tags.length === 0) continue;

    let partyEmail: string | null = null;
    let partyName = r.contactName || "a ReGen player";
    if (r.ownerId) {
      // Player-owned rows respect the player's email gates.
      if (await isUserBanned(r.ownerId)) continue;
      const profile = await getPlayerProfileByUserId(r.ownerId);
      if (profile?.emailDigestFrequency === "never") continue;
      partyEmail = r.userEmail ?? null;
      partyName = r.userName || partyName;
    } else {
      partyEmail = r.contactEmail ?? null;
    }

    out.push({
      id: r.id,
      tags,
      bioregionId: r.bioregionId,
      partyEmail,
      title: r.title,
      timeWindow: r.timeWindow,
      partyName,
      status: r.status as LoadedRow["status"],
    });
  }
  return out;
}

async function bioregionNameMap(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  rows: { bioregionId: number | null }[],
): Promise<Map<number, string>> {
  const ids = [...new Set(rows.map((r) => r.bioregionId).filter((id): id is number => id !== null))];
  if (ids.length === 0) return new Map();
  const found = await db
    .select({ id: bioregions.id, name: bioregions.name })
    .from(bioregions)
    .where(inArray(bioregions.id, ids));
  return new Map(found.map((b) => [b.id, b.name]));
}
