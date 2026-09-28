/**
 * The close date (build spec 2026-09-27, section 9; Rye's ruling of the same
 * day, research question 1).
 *
 * A real live campaign closes at startedAt (or publishedAt) plus
 * durationDays. When its two halves have both landed it moves to
 * `completed` on its own; otherwise it moves to `closed` ("didn't
 * complete"). The daily crowdpool job (server/jobs/crowdpoolDailyJob.ts)
 * calls closeDueCampaigns; nothing else writes `closed`, and no status
 * transition offers it (shared/campaignStatus.ts).
 *
 * At a close:
 *   - offers still waiting close into `cancelled`, both outcomes: the
 *     campaign takes nothing new;
 *   - didn't complete: accepted offers that had not started
 *     (offerHasStarted in shared/campaignClose.ts) are `released` with
 *     closeReleasedAt, a thank-you and other open needs; accepted offers
 *     that had started stay, with claimExpiresAt cleared so the nightly
 *     expiry sweep (which ignores campaign status) never "closes a place" on
 *     a campaign that already closed; lends on site go home on their agreed
 *     date or sooner; delivered help stays recorded in the project's token;
 *   - counters and totals are recomputed from the rows;
 *   - everyone involved hears once: on the spine (stewards, account
 *     contributors, account followers), and people without an account
 *     through the existing cancellation email, worded for the close
 *     (server/lib/campaign-cancel.ts sendPendingCampaignEndEmails).
 *
 * Idempotent and safe to run twice at once: the flip is conditional on
 * `status = 'active' AND closedAt IS NULL`, so one run closes a campaign;
 * notices carry spine dedupe keys; ending emails claim their rows before
 * sending; closeNoticedAt marks that the notices went out, and
 * resumeUnnoticedCloses finishes any close a crash interrupted. Examples
 * never close. `crowdpool.auto_close` (a game variable) pauses it without a
 * deploy, and `dryRun` reports what would happen and writes nothing.
 */
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import {
  applications,
  campaigns,
  campaignContributions,
  campaignItems,
  type Campaign,
} from "../../drizzle/schema";
import * as db from "../db";
import { cacheDel } from "../cache";
import { getGameVariable } from "../game";
import {
  closeLinesFor,
  closeOutcome,
  isDueToClose,
  offerHasStarted,
  otherNeedsLine,
} from "../../shared/campaignClose";
import { computeCampaignProgress } from "../../shared/campaignProgress";
import { todayUtc } from "../../shared/crowdpoolNeedAction";
import { OPEN_NEEDS_CACHE_KEY } from "../../shared/openNeeds";
import {
  buildCampaignClosed,
  buildOfferClosedAtCompletion,
  deliver,
  notifyCampaignCompleted,
} from "./campaign-notify";
import { closedOnWords, sendPendingCampaignEndEmails } from "./campaign-cancel";
import { otherOpenNeeds, type OtherNeed } from "./open-needs";
import { getCampaignStewardIds } from "./project-steward";
import type { insertNotification } from "./forum-notify";
import type { sendEmail as SendEmail } from "../_core/email";

export { otherOpenNeeds, type OtherNeed };

export type CloseDeps = {
  insert?: typeof insertNotification;
  sendEmail?: typeof SendEmail;
  /** The clock the close date is read against. Defaults to now. */
  now?: () => Date;
  /** Only these campaigns (tests: scratch holds a thousand old fixtures). */
  onlyCampaignIds?: number[];
  /** Report what would happen; write nothing, tell nobody. */
  dryRun?: boolean;
  /** Reads a crowdpool switch (game variable). Tests pass their own. */
  readSwitch?: (key: string) => Promise<number>;
  /** Minutes a close must be old before resumeUnnoticedCloses picks it up. */
  leaseMinutes?: number;
};

export type CloseResult = {
  campaignId: number;
  result: "skipped" | "already_closed" | "completed" | "closed";
  reason?: "missing" | "example" | "not_active" | "not_due";
  outcome?: "complete" | "did_not_complete";
  /** Accepted offers the close released (didn't complete only). */
  released: number;
  /** Offers still waiting that the close closed. */
  closedWaiting: number;
  notified: number;
  emailQueued: number;
};

export const AUTO_CLOSE_SWITCH = "crowdpool.auto_close";

/** Minutes a close must be old before another run finishes its notices. */
export const RESUME_LEASE_MINUTES = 10;

const affected = (r: any): number => Number(r?.[0]?.affectedRows ?? r?.affectedRows ?? 0);

/**
 * Whether a crowdpool switch is on. Off when the variable is missing or
 * unreadable: closing and nudging cannot be undone, so they never run on a
 * guess.
 */
export async function crowdpoolSwitchOn(key: string, deps: Pick<CloseDeps, "readSwitch"> = {}): Promise<boolean> {
  try {
    const read = deps.readSwitch ?? getGameVariable;
    return Number(await read(key)) === 1;
  } catch {
    return false;
  }
}

function nowOf(deps: Pick<CloseDeps, "now">): Date {
  return deps.now ? deps.now() : new Date();
}

type OfferRow = {
  id: number;
  status: string;
  offerMode: "give" | "lend" | null;
  availableFrom: string | null;
  campaignItemId: number | null;
};
type NeedRow = { id: number; kind: string; shiftStartsAt: Date | null; neededFrom: string | null };

/** Which accepted offers a close that didn't complete releases, and which stand. */
function splitAccepted(offers: OfferRow[], needs: NeedRow[], now: Date): { release: number[]; stand: number[] } {
  const byId = new Map(needs.map((n) => [n.id, n]));
  const today = todayUtc(now);
  const release: number[] = [];
  const stand: number[] = [];
  for (const o of offers) {
    if (o.status !== "accepted") continue;
    const need = o.campaignItemId ? byId.get(o.campaignItemId) ?? null : null;
    (offerHasStarted(o, need, today, now) ? stand : release).push(o.id);
  }
  return { release, stand };
}

/** The close's reading: complete or didn't complete, from the same two-line bar the page shows. */
async function readOutcome(campaign: Campaign): Promise<"complete" | "did_not_complete"> {
  const inputs = (await db.getCampaignProgressInputs([campaign.id])).get(campaign.id)
    ?? { items: [], rows: [], lends: [], routes: [] };
  return closeOutcome(computeCampaignProgress({ campaign, ...inputs }));
}

/**
 * Close one campaign if it is due. Idempotent: a campaign that is not live,
 * an example, or not yet due is skipped, and a second call (or a
 * concurrent one) finds it already closed and does nothing.
 */
export async function closeCampaign(campaignId: number, deps: CloseDeps = {}): Promise<CloseResult> {
  const base = { campaignId, released: 0, closedWaiting: 0, notified: 0, emailQueued: 0 };
  const now = nowOf(deps);
  const campaign = await db.getCampaignById(campaignId);
  if (!campaign) return { ...base, result: "skipped", reason: "missing" };
  if (campaign.isDemo) return { ...base, result: "skipped", reason: "example" };
  if (campaign.status !== "active") {
    return campaign.closedAt
      ? { ...base, result: "already_closed", outcome: campaign.closeOutcome ?? undefined }
      : { ...base, result: "skipped", reason: "not_active" };
  }
  if (!isDueToClose(campaign, now)) return { ...base, result: "skipped", reason: "not_due" };

  const database = await db.getDb();
  if (!database) return { ...base, result: "skipped", reason: "missing" };

  if (deps.dryRun) {
    const outcome = await readOutcome(campaign);
    let release: number[] = [];
    let waiting = 0;
    const offers = await database
      .select({
        id: campaignContributions.id,
        status: campaignContributions.status,
        offerMode: campaignContributions.offerMode,
        availableFrom: campaignContributions.availableFrom,
        campaignItemId: campaignContributions.campaignItemId,
      })
      .from(campaignContributions)
      .where(and(eq(campaignContributions.campaignId, campaignId), inArray(campaignContributions.status, ["pending", "accepted"])));
    waiting = offers.filter((o) => o.status === "pending").length;
    if (outcome === "did_not_complete") {
      const needs = await database
        .select({ id: campaignItems.id, kind: campaignItems.kind, shiftStartsAt: campaignItems.shiftStartsAt, neededFrom: campaignItems.neededFrom })
        .from(campaignItems)
        .where(eq(campaignItems.campaignId, campaignId));
      release = splitAccepted(offers as OfferRow[], needs as NeedRow[], now).release;
    }
    return {
      ...base,
      result: outcome === "complete" ? "completed" : "closed",
      outcome,
      released: release.length,
      closedWaiting: waiting,
    };
  }

  // ── The flip, the offers and the counters, all or nothing. Lock order as
  //    everywhere (need rows, then the campaign row, then contribution rows),
  //    so a close racing an accept waits instead of deadlocking. The reading
  //    is taken after the need rows are locked, so no accept lands between
  //    the reading and the flip.
  const done = await database.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM campaign_items WHERE campaignId = ${campaignId} FOR UPDATE`);
    const outcome = await readOutcome(campaign);
    const complete = outcome === "complete";
    const flip = await tx.update(campaigns)
      .set({
        status: complete ? "completed" : "closed",
        closedAt: sql`NOW()` as any,
        closeOutcome: outcome,
        completedAt: complete ? (sql`COALESCE(${campaigns.completedAt}, NOW())` as any) : (sql`${campaigns.completedAt}` as any),
        updatedAt: sql`NOW()` as any,
      })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.status, "active"), isNull(campaigns.closedAt)));
    if (affected(flip) === 0) return null;

    // Through drizzle, so availableFrom comes back as 'YYYY-MM-DD' (a raw
    // DATE read is a local-midnight Date, a day off east of UTC).
    const offers: OfferRow[] = await tx
      .select({
        id: campaignContributions.id,
        status: campaignContributions.status,
        offerMode: campaignContributions.offerMode,
        availableFrom: campaignContributions.availableFrom,
        campaignItemId: campaignContributions.campaignItemId,
      })
      .from(campaignContributions)
      .where(and(eq(campaignContributions.campaignId, campaignId), inArray(campaignContributions.status, ["pending", "accepted"])))
      .for("update");

    // Both outcomes: the campaign takes nothing new.
    const closed = await tx.update(campaignContributions)
      .set({ status: "cancelled", claimExpiresAt: null })
      .where(and(eq(campaignContributions.campaignId, campaignId), eq(campaignContributions.status, "pending")));

    let released = 0;
    if (!complete) {
      const needs = await tx
        .select({ id: campaignItems.id, kind: campaignItems.kind, shiftStartsAt: campaignItems.shiftStartsAt, neededFrom: campaignItems.neededFrom })
        .from(campaignItems)
        .where(eq(campaignItems.campaignId, campaignId));
      const { release, stand } = splitAccepted(offers, needs as NeedRow[], now);
      if (release.length > 0) {
        const r = await tx.update(campaignContributions)
          .set({ status: "released", closeReleasedAt: sql`NOW()` as any, claimExpiresAt: null })
          .where(and(inArray(campaignContributions.id, release), eq(campaignContributions.status, "accepted")));
        released = affected(r);
      }
      if (stand.length > 0) {
        await tx.update(campaignContributions)
          .set({ claimExpiresAt: null })
          .where(and(inArray(campaignContributions.id, stand), eq(campaignContributions.status, "accepted")));
      }
    } else {
      // Complete: every accepted place stays, and none can lapse any more.
      // The nightly sweep (expireCrowdpoolClaims) ignores campaign status,
      // so a delivery window left in place would later tell the person "the
      // need is open again" on a campaign that takes no offers (review
      // 2026-09-28).
      await tx.update(campaignContributions)
        .set({ claimExpiresAt: null })
        .where(and(eq(campaignContributions.campaignId, campaignId), eq(campaignContributions.status, "accepted")));
    }

    const items = await tx.select({ id: campaignItems.id }).from(campaignItems).where(eq(campaignItems.campaignId, campaignId));
    for (const item of items) await db.recomputeNeedCounters(item.id, tx);

    return { outcome, released, closedWaiting: affected(closed) };
  });

  if (!done) {
    const fresh = await db.getCampaignById(campaignId);
    return { ...base, result: "already_closed", outcome: fresh?.closeOutcome ?? undefined };
  }

  // Totals: released and closed offers stop counting, delivered work stays.
  try {
    await db.updateCampaignPledgedTotals(campaignId);
  } catch (err) {
    console.warn("[campaign-close] pledged-total recompute failed:", err);
  }

  // A completed campaign counts toward the land project's progression, once:
  // only the call that flipped it gets here.
  if (done.outcome === "complete" && campaign.applicationId) {
    try {
      await database.update(applications)
        .set({ fundedCampaignCount: sql`COALESCE(${applications.fundedCampaignCount}, 0) + 1` })
        .where(eq(applications.id, campaign.applicationId));
    } catch (err) {
      console.warn("[campaign-close] project progression count failed:", err);
    }
  }

  // The Needs tab drops it at once instead of within a minute.
  await cacheDel(OPEN_NEEDS_CACHE_KEY).catch(() => undefined);

  let notified = 0;
  let emailQueued = 0;
  try {
    const sent = await sendCloseNotices(campaignId, deps);
    notified = sent.notified;
    emailQueued = sent.emailQueued;
    await db.stampCloseNoticed(campaignId);
  } catch (err) {
    // closeNoticedAt stays NULL; resumeUnnoticedCloses finishes it next run.
    console.warn("[campaign-close] notices failed; the next run finishes them:", err);
  }

  try {
    const { notifyOwner } = await import("../_core/notification");
    const words = done.outcome === "complete" ? "It completed at its close date" : "It closed without completing";
    await notifyOwner({
      title: `Campaign closed: ${campaign.title}`,
      content: `${words}. ${done.released} offers released, ${notified} people told, ${emailQueued} emails queued.`,
    });
  } catch (err) {
    console.warn("[campaign-close] site-owner note failed (non-fatal):", err);
  }

  return {
    ...base,
    result: done.outcome === "complete" ? "completed" : "closed",
    outcome: done.outcome,
    released: done.released,
    closedWaiting: done.closedWaiting,
    notified,
    emailQueued,
  };
}

/**
 * Close every real live campaign whose close date has come. Skipped, with
 * `paused`, while crowdpool.auto_close is off.
 */
export async function closeDueCampaigns(deps: CloseDeps = {}): Promise<{
  checked: number;
  completed: number;
  closed: number;
  released: number;
  paused: boolean;
  results: CloseResult[];
}> {
  const empty = { checked: 0, completed: 0, closed: 0, released: 0, results: [] as CloseResult[] };
  if (!(await crowdpoolSwitchOn(AUTO_CLOSE_SWITCH, deps))) return { ...empty, paused: true };
  const now = nowOf(deps);
  const candidates = await db.listCloseCandidates({ now, onlyCampaignIds: deps.onlyCampaignIds });
  // The pure function is the one definition of the close date.
  const due = candidates.filter((c) => isDueToClose(c, now));
  const out = { ...empty, checked: due.length, paused: false };
  for (const c of due) {
    try {
      const r = await closeCampaign(c.id, { ...deps, now: () => now });
      out.results.push(r);
      if (r.result === "completed") out.completed++;
      if (r.result === "closed") out.closed++;
      out.released += r.released;
    } catch (err) {
      console.warn(`[campaign-close] closing campaign ${c.id} failed:`, err);
    }
  }
  return out;
}

/**
 * Tell everyone a close reached, on the spine, then queue the ending email
 * to people without an account. Safe to call again: every spine row carries
 * a dedupe key, and the email run claims its rows. The caller stamps
 * closeNoticedAt after this returns.
 */
export async function sendCloseNotices(
  campaignId: number,
  deps: Pick<CloseDeps, "insert" | "sendEmail"> = {},
): Promise<{ notified: number; emailQueued: number }> {
  const campaign = await db.getCampaignById(campaignId);
  if (!campaign || !campaign.closeOutcome || !["closed", "completed"].includes(campaign.status)) {
    return { notified: 0, emailQueued: 0 };
  }
  const database = await db.getDb();
  if (!database) return { notified: 0, emailQueued: 0 };
  const cc = campaignContributions;
  const project = campaign.projectName || campaign.title;
  const others = otherNeedsLine(await otherOpenNeeds(campaign.id, 2), project);

  // Account holders with a row on the campaign, except declined and withdrawn.
  const rows = await database
    .select({
      id: cc.id,
      userId: cc.userId,
      status: cc.status,
      title: cc.title,
      offerMode: cc.offerMode,
      lendUntil: cc.lendUntil,
      closeReleasedAt: cc.closeReleasedAt,
    })
    .from(cc)
    .where(and(
      eq(cc.campaignId, campaign.id),
      isNotNull(cc.userId),
      sql`${cc.status} NOT IN ('rejected', 'withdrawn')`,
    ))
    .orderBy(cc.id);
  const byUser = new Map<number, typeof rows>();
  for (const r of rows) {
    const list = byUser.get(Number(r.userId)) ?? [];
    list.push(r);
    byUser.set(Number(r.userId), list);
  }

  let notified = 0;
  if (campaign.closeOutcome === "complete") {
    // The existing completed notice (stewards and account contributors whose
    // offer stands), then a note to each person whose offer was still waiting.
    notified += await notifyCampaignCompleted({ campaign, actorId: null }, { insert: deps.insert });
    const waiting = Array.from(byUser.entries())
      .map(([userId, list]) => ({ userId, titles: list.filter((r) => r.status === "cancelled").map((r) => r.title) }))
      .filter((r) => r.titles.length > 0);
    notified += await deliver(buildOfferClosedAtCompletion({ campaign, recipients: waiting, otherNeedsLine: others }), { insert: deps.insert });
  } else {
    const [stewardIds, followerIds, releasedRows] = await Promise.all([
      getCampaignStewardIds(campaign).catch(() => [campaign.userId]),
      db.getCampaignFollowerUserIds(campaign.id),
      database
        .select({ n: sql<number>`COUNT(*)` })
        .from(cc)
        .where(and(eq(cc.campaignId, campaign.id), eq(cc.status, "released"), isNotNull(cc.closeReleasedAt))),
    ]);
    notified += await deliver(buildCampaignClosed({
      campaign,
      closedOn: closedOnWords(campaign),
      stewardIds,
      releasedCount: Number(releasedRows[0]?.n ?? 0),
      contributors: Array.from(byUser.entries()).map(([userId, list]) => ({ userId, lines: closeLinesFor(list, project) })),
      followerIds,
      otherNeedsLine: others,
    }), { insert: deps.insert });
  }

  // Every account row on this campaign is now accounted for, as the cancel
  // path does. A row linked to an account LATER still reads NULL, and the
  // email run's noticeLinkedAccounts picks it up.
  await database.update(cc)
    .set({ cancelNoticedAt: sql`NOW()` as any })
    .where(and(eq(cc.campaignId, campaign.id), isNotNull(cc.userId), isNull(cc.cancelNoticedAt)));

  // People without an account: one email per address, claimed before it goes.
  const { found } = await sendPendingCampaignEndEmails(campaign.id, { sendEmail: deps.sendEmail, insert: deps.insert });
  return { notified, emailQueued: found };
}

/**
 * Finish any close whose notices did not all go out (the flip landed, then
 * the process stopped before closeNoticedAt). Only closes older than the
 * lease, so it never races a close still being told. Returns how many.
 */
export async function resumeUnnoticedCloses(deps: CloseDeps = {}): Promise<number> {
  const ids = await db.listUnnoticedCloses({
    now: nowOf(deps),
    leaseMinutes: deps.leaseMinutes ?? RESUME_LEASE_MINUTES,
    onlyCampaignIds: deps.onlyCampaignIds,
  });
  if (deps.dryRun) return ids.length;
  let resumed = 0;
  for (const id of ids) {
    try {
      await sendCloseNotices(id, deps);
      await db.stampCloseNoticed(id);
      resumed++;
    } catch (err) {
      console.warn(`[campaign-close] finishing the notices for campaign ${id} failed:`, err);
    }
  }
  return resumed;
}
