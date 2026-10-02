/**
 * Needs and Offers matcher (Phase B2): deterministic cron, zero LLM.
 *
 * Rule-level matching (shared tags + compatible bioregion, pure planner in
 * server/lib/needsOffers.ts). On a new match it inserts the pair into the
 * needs_offers_matches ledger (unique per pair, so an introduction can never
 * send twice), emails both parties a clearly-automated introduction naming
 * each other's contact, and flips both rows open → matched only when both
 * sides were accepted. A later run retries the missing side. Rows stamped
 * before the side ids existed are left alone.
 *
 * Suppression, in order: parties with no reachable email never match; players
 * with emailDigestFrequency = "never" or a ban never match; a per-party daily
 * introduction cap (INTRO_DAILY_CAP_PER_PARTY) bounds volume; the global email
 * rate limiter and EMAIL_HOLD still gate the transport underneath.
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

import { and, eq, gte, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { getDb, isUserBanned, getPlayerProfileByUserId } from "../db";
import { bioregions, needsOffersMatches, playerOffers, projectNeeds, users } from "../../drizzle/schema";
import { normalizeTags, planMatches, introEmail, sharedTags, type MatchableRow } from "../lib/needsOffers";
import { sendEmail, toAbsoluteUrl } from "../_core/email";
import { providerAccepted } from "../lib/emailAttempt";

const MAX_INTROS_PER_RUN = 20;
const EMAIL_SPACING_MS = 150;

/** Keep the pair only when at least one side reached Resend. Both null: release it. */
export function matchLedgerAction(
  sentNeed: { id?: string | null } | null | undefined,
  sentOffer: { id?: string | null } | null | undefined,
): "release" | "keep" {
  if (!providerAccepted(sentNeed) && !providerAccepted(sentOffer)) return "release";
  return "keep";
}

export type PairSideState = {
  needResendId: string | null;
  offerResendId: string | null;
  emailSentAt: Date | null;
};

/** What to do with a ledger row on a later run. Historical unstamped rows stay put. */
export type PairFollowUp = "complete" | "retry_need" | "retry_offer" | "leave";

export function pairFollowUp(row: PairSideState): PairFollowUp {
  const need = typeof row.needResendId === "string" && row.needResendId.length > 0;
  const offer = typeof row.offerResendId === "string" && row.offerResendId.length > 0;
  if (need && offer) return "complete";
  if (row.emailSentAt) return "complete";
  if (need && !offer) return "retry_offer";
  if (offer && !need) return "retry_need";
  return "leave";
}

function acceptedId(result: { id?: string | null } | null | undefined): string | null {
  return providerAccepted(result) && result?.id ? result.id : null;
}

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

        const needResendId = acceptedId(sentA);
        const offerResendId = acceptedId(sentB);
        if (matchLedgerAction(sentA, sentB) === "release") {
          // Both blocked. Drop the claim so the next run can try again.
          // Leaving the row in place used to look like "unstamped" while the
          // pair ledger still treated it as already introduced.
          await db
            .delete(needsOffersMatches)
            .where(and(eq(needsOffersMatches.needId, match.needId), eq(needsOffersMatches.offerId, match.offerId)));
        } else {
          const both = Boolean(needResendId && offerResendId);
          await db
            .update(needsOffersMatches)
            .set({
              needResendId,
              offerResendId,
              emailSentAt: both ? new Date() : null,
            })
            .where(and(eq(needsOffersMatches.needId, match.needId), eq(needsOffersMatches.offerId, match.offerId)));
          if (both) {
            report.introsSent += 1;
            await markPairMatched(db, need.id, offer.id);
          }
        }
      } catch (err: any) {
        report.errors.push(`match ${match.needId}:${match.offerId}: ${err?.message ?? err}`);
      }
    }

    try {
      await retryOneSidedPairs(db, needs, offers, bioregionNames, boardUrl, report);
    } catch (err: any) {
      const message = err?.message ?? String(err);
      // The side columns arrive in 0286. Until that file is applied, skip the
      // retry pass. New intros above already finished.
      if (!/needResendId|offerResendId|Unknown column/i.test(message)) {
        report.errors.push(`one-sided retry: ${message}`);
      }
    }
  } catch (err: any) {
    report.errors.push(`matcher: ${err?.message ?? err}`);
  }

  report.ok = report.errors.length === 0;
  return report;
}

type MatcherDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Flip open rows to matched. Already-matched or closed rows stay as they are. */
async function markPairMatched(db: MatcherDb, needId: number, offerId: number): Promise<void> {
  await db
    .update(projectNeeds)
    .set({ status: "matched" })
    .where(and(eq(projectNeeds.id, needId), eq(projectNeeds.status, "open")));
  await db
    .update(playerOffers)
    .set({ status: "matched" })
    .where(and(eq(playerOffers.id, offerId), eq(playerOffers.status, "open")));
}

/**
 * Send only the missing side of a pair this code already started.
 * Rows with emailSentAt set, or with both ids null, are not selected.
 */
async function retryOneSidedPairs(
  db: MatcherDb,
  needs: LoadedRow[],
  offers: LoadedRow[],
  bioregionNames: Map<number, string>,
  boardUrl: string,
  report: NeedsOffersMatcherReport,
): Promise<void> {
  const rows = await db
    .select({
      needId: needsOffersMatches.needId,
      offerId: needsOffersMatches.offerId,
      needResendId: needsOffersMatches.needResendId,
      offerResendId: needsOffersMatches.offerResendId,
      emailSentAt: needsOffersMatches.emailSentAt,
    })
    .from(needsOffersMatches)
    .where(
      and(
        isNull(needsOffersMatches.emailSentAt),
        or(
          and(isNotNull(needsOffersMatches.needResendId), isNull(needsOffersMatches.offerResendId)),
          and(isNull(needsOffersMatches.needResendId), isNotNull(needsOffersMatches.offerResendId)),
        ),
      ),
    )
    .limit(MAX_INTROS_PER_RUN);

  const needById = new Map(needs.map((n) => [n.id, n]));
  const offerById = new Map(offers.map((o) => [o.id, o]));

  for (const row of rows) {
    const action = pairFollowUp({
      needResendId: row.needResendId,
      offerResendId: row.offerResendId,
      emailSentAt: row.emailSentAt,
    });
    if (action !== "retry_need" && action !== "retry_offer") continue;

    const need = needById.get(row.needId);
    const offer = offerById.get(row.offerId);
    if (!need?.partyEmail || !offer?.partyEmail) continue;

    const tags = sharedTags(need.tags, offer.tags);
    if (tags.length === 0) continue;

    const bioregionName =
      (need.bioregionId && bioregionNames.get(need.bioregionId)) ||
      (offer.bioregionId && bioregionNames.get(offer.bioregionId)) ||
      null;
    const shared = {
      needTitle: need.title,
      offerTitle: offer.title,
      tags,
      bioregionName,
      needTimeWindow: need.timeWindow,
      offerTimeWindow: offer.timeWindow,
      boardUrl,
    };
    const toOfferSide = action === "retry_offer";
    const letter = introEmail({
      ...shared,
      recipientName: toOfferSide ? offer.partyName : need.partyName,
      otherName: toOfferSide ? need.partyName : offer.partyName,
      otherEmail: toOfferSide ? need.partyEmail : offer.partyEmail,
    });
    const sent = await sendEmail({
      to: toOfferSide ? offer.partyEmail : need.partyEmail,
      subject: letter.subject,
      html: letter.html,
    });
    await new Promise((r) => setTimeout(r, EMAIL_SPACING_MS));
    if (sent.status === "rate_limited" || sent.status === "held") break;

    const id = acceptedId(sent);
    if (!id) continue;

    await db
      .update(needsOffersMatches)
      .set({
        needResendId: toOfferSide ? row.needResendId : id,
        offerResendId: toOfferSide ? id : row.offerResendId,
        emailSentAt: new Date(),
      })
      .where(and(eq(needsOffersMatches.needId, row.needId), eq(needsOffersMatches.offerId, row.offerId)));
    report.introsSent += 1;
    await markPairMatched(db, need.id, offer.id);
  }
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
