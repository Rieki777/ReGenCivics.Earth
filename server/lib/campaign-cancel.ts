/**
 * Cancelling a campaign.
 *
 * One service behind campaigns.cancel and updateStatus('cancelled'). It:
 *   1. checks the actor may cancel from the campaign's status
 *      (shared/campaignStatus.ts: stewards from draft, pending_review and
 *      active; admins also from rejected);
 *   2. in one transaction flips the campaign to cancelled (conditional on
 *      the status, so a repeat call is idempotent), closes every pending and
 *      accepted contribution into 'cancelled', and recomputes every need's
 *      counters from the rows;
 *   3. recomputes the pledged totals (delivered work stays on the record);
 *   4. posts the steward's optional message as the campaign's final update;
 *   5. tells everyone involved on the notification spine (stewards, account
 *      contributors, account followers), once each, never the actor, with up
 *      to three live campaigns that could use their energy;
 *   6. emails contributors WITHOUT an account in the background, one email
 *      per address, claiming the rows' cancelNoticedAt before the send and
 *      handing them back when the send did not go out. A send the hourly
 *      cap held back is retried: once after 65 minutes, then by the daily
 *      crowdpool job and the nightly batch for 30 days.
 *
 * The email run (sendPendingCampaignEndEmails) also serves the close
 * (server/lib/campaign-close.ts, build spec 2026-09-27, section 9.5): a
 * campaign that closed without completing, and one that completed at its
 * close date with offers still waiting, reach people without an account
 * through the same cancellation email, worded for the close.
 *
 * Email-only followers (campaign_followers) get no automatic email: Rye
 * reaches them from admin Outbound with the campaign's follower audience.
 */
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import {
  campaigns,
  campaignContributions,
  campaignItems,
  campaignUpdates,
  users,
  type Campaign,
} from "../../drizzle/schema";
import * as db from "../db";
import type { TrpcContext } from "../_core/context";
import { sanitizeRichText } from "../_core/security";
import { canTransition, cancellableFrom, type CampaignActorRole } from "../../shared/campaignStatus";
import { decodeBasicEntities } from "../../shared/htmlText";
import { projectPathForCampaignFocus } from "../../shared/projectKey";
import { isAdminUser } from "./public-projection";
import { UNPUBLISHED_CAMPAIGN_STATUSES, canStewardCampaign, getCampaignStewardIds } from "./project-steward";
import {
  buildCampaignClosed,
  buildOfferClosedAtCompletion,
  deliver,
  notifyCampaignCancelled,
  recipientsOf,
} from "./campaign-notify";
import { otherOpenNeeds } from "./open-needs";
import { closeLinesFor, otherNeedsLine } from "../../shared/campaignClose";
import { campaignEndsAt, formatCloseDate } from "../../shared/campaignProgress";
import { placeOf, suggestAlternatives, type CampaignSuggestion } from "./campaign-suggest";
import type { insertNotification } from "./forum-notify";
import type { sendEmail as SendEmail } from "../_core/email";

/** The title of the update that carries a steward's cancellation message. */
export const CANCEL_UPDATE_TITLE = "This campaign has been cancelled";

export type CancelDeps = {
  insert?: typeof insertNotification;
  sendEmail?: typeof SendEmail;
  now?: () => Date;
  /**
   * Where the background email run goes. Defaults to fire-and-forget; tests
   * pass a collector so they can await it.
   */
  background?: (p: Promise<unknown>) => void;
};

export type CancelResult = {
  alreadyCancelled: boolean;
  closedContributions: number;
  notified: number;
  emailQueued: number;
  suggestions: CampaignSuggestion[];
};

const affected = (r: any): number => Number(r?.[0]?.affectedRows ?? r?.affectedRows ?? 0);

function defaultBackground(p: Promise<unknown>) {
  p.catch((err) => console.warn("[campaign-cancel] background email run failed:", err));
}

/**
 * Every account holder a cancellation reaches on the spine: the stewards,
 * account contributors whose rows were closed or delivered, and account
 * followers. Unique; the actor is removed by the builder.
 */
export async function gatherCancelRecipients(
  campaign: Pick<Campaign, "id" | "userId" | "applicationId">,
  opts: { includeFollowers: boolean },
): Promise<number[]> {
  const database = await db.getDb();
  if (!database) return [];
  const [stewardIds, contribRows, followerIds] = await Promise.all([
    getCampaignStewardIds(campaign),
    database
      .select({ userId: campaignContributions.userId })
      .from(campaignContributions)
      .where(and(
        eq(campaignContributions.campaignId, campaign.id),
        inArray(campaignContributions.status, ["cancelled", "fulfilled", "thanked"]),
      )),
    // A campaign that never went live was invisible to visitors, so its
    // followers (a follow made by id) hear nothing about it.
    opts.includeFollowers ? db.getCampaignFollowerUserIds(campaign.id) : Promise.resolve([] as number[]),
  ]);
  return recipientsOf([...stewardIds, ...contribRows.map((r) => r.userId), ...followerIds]);
}

/** A campaign reached visitors once it went live (startedAt is stamped then). */
export function wasPublished(campaign: Pick<Campaign, "status" | "startedAt" | "publishedAt">): boolean {
  if (campaign.startedAt || campaign.publishedAt) return true;
  return !UNPUBLISHED_CAMPAIGN_STATUSES.includes(campaign.status) && campaign.status !== "cancelled";
}

export async function cancelCampaign(
  args: { campaignId: number; actor: TrpcContext["user"]; message?: string | null },
  deps: CancelDeps = {},
): Promise<CancelResult> {
  const database = await db.getDb();
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  const campaign = await db.getCampaignById(args.campaignId);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });

  const role: CampaignActorRole | null = isAdminUser(args.actor)
    ? "admin"
    : (await canStewardCampaign(args.actor, campaign)) ? "steward" : null;
  if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Only this project's stewards can cancel its campaign." });

  const done = async (alreadyCancelled: true): Promise<CancelResult> => ({
    alreadyCancelled,
    closedContributions: 0,
    notified: 0,
    emailQueued: 0,
    suggestions: await suggestAlternatives(campaign, 3),
  });

  if (campaign.status === "cancelled") return done(true);
  if (!canTransition(campaign.status, "cancelled", role)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This campaign can't be cancelled from where it is now." });
  }

  // ── 1-2. The status flip, closing offers, and counters, all or nothing.
  //       Lock order matches every accept path (need rows first, then the
  //       campaign row, then contribution rows), so a cancel racing an
  //       accept waits instead of deadlocking.
  const outcome = await database.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM campaign_items WHERE campaignId = ${campaign.id} FOR UPDATE`);
    const flip = await tx.update(campaigns)
      .set({ status: "cancelled", updatedAt: sql`NOW()` as any })
      .where(and(eq(campaigns.id, campaign.id), inArray(campaigns.status, cancellableFrom(role))));
    if (affected(flip) === 0) return { flipped: false as const, closed: 0 };

    const closed = await tx.update(campaignContributions)
      .set({ status: "cancelled", claimExpiresAt: null })
      .where(and(
        eq(campaignContributions.campaignId, campaign.id),
        inArray(campaignContributions.status, ["pending", "accepted"]),
      ));

    const items = await tx.select({ id: campaignItems.id }).from(campaignItems)
      .where(eq(campaignItems.campaignId, campaign.id));
    for (const item of items) await db.recomputeNeedCounters(item.id, tx);

    return { flipped: true as const, closed: affected(closed) };
  });

  if (!outcome.flipped) {
    const now = await db.getCampaignById(campaign.id);
    if (now?.status === "cancelled") return done(true);
    throw new TRPCError({ code: "CONFLICT", message: "Someone just changed this campaign. Refresh and try again." });
  }

  // ── 3. Totals: cancelled offers stop counting, delivered work stays.
  try {
    await db.updateCampaignPledgedTotals(campaign.id);
  } catch (err) {
    console.warn("[campaign-cancel] pledged-total recompute failed:", err);
  }

  // ── 4. The steward's message becomes the final update (no follower
  //       fan-out: the cancel notice already reaches them).
  const message = (args.message ?? "").trim();
  if (message && args.actor) {
    try {
      await db.createCampaignUpdate({
        campaignId: campaign.id,
        authorId: args.actor.id,
        title: CANCEL_UPDATE_TITLE,
        body: sanitizeRichText(message),
      });
    } catch (err) {
      console.warn("[campaign-cancel] final update failed:", err);
    }
  }

  // ── 5. Suggestions and the spine.
  const suggestions = await suggestAlternatives(campaign, 3);
  let notified = 0;
  try {
    const recipientIds = recipientsOf(
      await gatherCancelRecipients(campaign, { includeFollowers: wasPublished(campaign) }),
      [args.actor?.id],
    );
    notified = recipientIds.length;
    await notifyCampaignCancelled(
      { campaign, recipientIds, message: message || null, suggestions, actorId: args.actor?.id ?? null },
      { insert: deps.insert },
    );
    // Every account row on this campaign is now accounted for: its holder
    // got the notice, or is the actor who cancelled. A row linked to an
    // account LATER still reads NULL, and the email run's
    // noticeLinkedAccounts picks it up.
    await database.update(campaignContributions)
      .set({ cancelNoticedAt: sql`NOW()` as any })
      .where(and(
        eq(campaignContributions.campaignId, campaign.id),
        isNotNull(campaignContributions.userId),
        isNull(campaignContributions.cancelNoticedAt),
      ));
  } catch (err) {
    console.warn("[campaign-cancel] spine notices failed (non-fatal):", err);
  }

  // ── 6. Direct emails to contributors without an account, in the background.
  let emailQueued = 0;
  try {
    emailQueued = (await pendingCampaignEndGroups(campaign, "cancelled")).groups.length;
  } catch (err) {
    console.warn("[campaign-cancel] counting pending emails failed:", err);
  }
  // Who cancelled, for the email's wording: a steward, or an admin who is
  // not one of this project's stewards (the ReGen Civics team).
  const stewardIds = await getCampaignStewardIds(campaign).catch(() => [] as number[]);
  const cancelledBy: "stewards" | "team" =
    role === "admin" && !(args.actor && stewardIds.includes(args.actor.id)) ? "team" : "stewards";
  (deps.background ?? defaultBackground)(sendPendingCancellationEmails(campaign.id, { ...deps, cancelledBy }));
  if (!process.env.VITEST && process.env.NODE_ENV !== "test") {
    // One retry after the hourly send cap has rolled over; the daily batch
    // covers anything still held after that.
    const timer = setTimeout(() => {
      sendPendingCancellationEmails(campaign.id).catch((err) =>
        console.warn("[campaign-cancel] retry run failed:", err));
    }, 65 * 60 * 1000);
    timer.unref?.();
  }

  // ── 7. A note to the site owner. Best-effort.
  try {
    const { notifyOwner } = await import("../_core/notification");
    await notifyOwner({
      title: `Campaign cancelled: ${campaign.title}`,
      content: `${campaign.title} (${campaign.projectName}) was cancelled. ${outcome.closed} open offers closed, ${notified} people told in their notifications, ${emailQueued} emails to people without an account.`,
    });
  } catch (err) {
    console.warn("[campaign-cancel] site-owner note failed (non-fatal):", err);
  }

  return { alreadyCancelled: false, closedContributions: outcome.closed, notified, emailQueued, suggestions };
}

// ─── Direct emails to contributors without an account ──────────────────────
//
// One run for every way a campaign ends (build spec 2026-09-27, section
// 9.5): a cancel, a close that didn't complete, and a completion at the close
// date that closed offers still waiting. People without an account get one
// email per address through the existing cancellation email, worded for the
// ending, so they still receive only the three fixed emails plus this one.

/** How a campaign ended, for the email run. Null: nothing to send. */
export type CampaignEndKind = "cancelled" | "closed" | "completed_unanswered";

export function campaignEndKind(campaign: Pick<Campaign, "status" | "closeOutcome">): CampaignEndKind | null {
  if (campaign.status === "cancelled") return "cancelled";
  if (campaign.status === "closed") return "closed";
  if (campaign.status === "completed" && campaign.closeOutcome === "complete") return "completed_unanswered";
  return null;
}

/**
 * The rows each ending tells people about:
 *   - cancelled: closed and delivered rows, as before;
 *   - closed: waiting offers the close closed, accepted offers the close
 *     released (closeReleasedAt), accepted offers still standing, delivered;
 *   - completed at the close date: only the waiting offers it closed.
 */
function endRowWhere(kind: CampaignEndKind) {
  const cc = campaignContributions;
  if (kind === "cancelled") return inArray(cc.status, ["cancelled", "fulfilled", "thanked"]);
  if (kind === "completed_unanswered") return eq(cc.status, "cancelled");
  return or(
    inArray(cc.status, ["cancelled", "accepted", "fulfilled", "thanked"]),
    and(eq(cc.status, "released"), isNotNull(cc.closeReleasedAt)),
  );
}

type PendingRow = {
  id: number;
  contributorEmail: string;
  contributorName: string;
  status: string;
  title: string;
  offerMode: "give" | "lend" | null;
  lendUntil: string | null;
  closeReleasedAt: Date | null;
};

type EndGroup = { email: string; name: string; rowIds: number[]; rows: PendingRow[] };

/**
 * Every account holder an ending reached on the spine, for telling which
 * addresses already heard. A cancel: gatherCancelRecipients. A close: the
 * stewards, every account holder with a row the close tells about, and (for
 * a close that didn't complete) the followers.
 */
async function gatherEndRecipients(campaign: Campaign, kind: CampaignEndKind): Promise<number[]> {
  if (kind === "cancelled") return gatherCancelRecipients(campaign, { includeFollowers: wasPublished(campaign) });
  const database = await db.getDb();
  if (!database) return [];
  const [stewardIds, contribRows, followerIds] = await Promise.all([
    getCampaignStewardIds(campaign),
    database
      .select({ userId: campaignContributions.userId })
      .from(campaignContributions)
      .where(and(eq(campaignContributions.campaignId, campaign.id), isNotNull(campaignContributions.userId), endRowWhere(kind))),
    kind === "closed" ? db.getCampaignFollowerUserIds(campaign.id) : Promise.resolve([] as number[]),
  ]);
  return recipientsOf([...stewardIds, ...contribRows.map((r) => r.userId), ...followerIds]);
}

/**
 * Rows still owed an ending email, grouped by lowercased trimmed email.
 * Emails that belong to an account the spine already reached are split out
 * (`spineCovered`) so the caller can stamp them without sending.
 */
async function pendingCampaignEndGroups(campaign: Campaign, kind: CampaignEndKind): Promise<{
  groups: EndGroup[];
  spineCoveredRowIds: number[];
}> {
  const database = await db.getDb();
  if (!database) return { groups: [], spineCoveredRowIds: [] };
  const cc = campaignContributions;
  const rows: PendingRow[] = await database
    .select({
      id: cc.id,
      contributorEmail: cc.contributorEmail,
      contributorName: cc.contributorName,
      status: cc.status,
      title: cc.title,
      offerMode: cc.offerMode,
      lendUntil: cc.lendUntil,
      closeReleasedAt: cc.closeReleasedAt,
    })
    .from(cc)
    .where(and(
      eq(cc.campaignId, campaign.id),
      isNull(cc.userId),
      isNull(cc.cancelNoticedAt),
      endRowWhere(kind),
    ))
    .orderBy(cc.id);
  if (rows.length === 0) return { groups: [], spineCoveredRowIds: [] };

  // An account holder whose earlier offer is still unlinked hears on the
  // spine; they must not get a second, direct email.
  const recipientIds = await gatherEndRecipients(campaign, kind);
  const covered = new Set<string>();
  if (recipientIds.length > 0) {
    const accounts = await database.select({ email: users.email }).from(users).where(inArray(users.id, recipientIds));
    for (const a of accounts) if (a.email) covered.add(a.email.trim().toLowerCase());
  }

  const groups = new Map<string, EndGroup>();
  const spineCoveredRowIds: number[] = [];
  for (const r of rows) {
    const key = String(r.contributorEmail ?? "").trim().toLowerCase();
    if (!key) continue;
    if (covered.has(key)) {
      spineCoveredRowIds.push(r.id);
      continue;
    }
    const g = groups.get(key);
    if (g) {
      g.rowIds.push(r.id);
      g.rows.push(r);
    } else {
      groups.set(key, { email: String(r.contributorEmail).trim(), name: r.contributorName, rowIds: [r.id], rows: [r] });
    }
  }
  return { groups: Array.from(groups.values()), spineCoveredRowIds };
}

/** The cancellation message, read back from the final update (plain text), and who wrote it. */
async function cancellationMessage(campaignId: number): Promise<{ text: string; authorId: number } | null> {
  const database = await db.getDb();
  if (!database) return null;
  const [row] = await database
    .select({ body: campaignUpdates.body, authorId: campaignUpdates.authorId })
    .from(campaignUpdates)
    .where(and(eq(campaignUpdates.campaignId, campaignId), eq(campaignUpdates.title, CANCEL_UPDATE_TITLE)))
    .orderBy(sql`${campaignUpdates.updateNumber} DESC`)
    .limit(1);
  if (!row?.body) return null;
  const text = decodeBasicEntities(row.body.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]*>/g, ""))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text ? { text, authorId: row.authorId } : null;
}

/** "21 March 2027" for a close, from closedAt (or the close date when it is missing). */
export function closedOnWords(campaign: Pick<Campaign, "closedAt" | "startedAt" | "publishedAt" | "durationDays" | "status" | "isDemo">): string {
  const at = campaign.closedAt ? new Date(campaign.closedAt) : campaignEndsAt(campaign as any);
  return at && !isNaN(at.getTime()) ? formatCloseDate(at) : "its close date";
}

/**
 * Someone whose ending email the hourly cap held back, and who then made an
 * account, has their rows linked (userId set) with cancelNoticedAt still
 * NULL. The email run only looks at rows with no account, and the spine
 * recipients were worked out at the ending, so without this they would hear
 * nothing. Send them the spine notice now and stamp their rows.
 */
async function noticeLinkedAccounts(
  campaign: Campaign,
  kind: CampaignEndKind,
  deps: Pick<CancelDeps, "insert">,
): Promise<number> {
  const database = await db.getDb();
  if (!database) return 0;
  const cc = campaignContributions;
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
      isNull(cc.cancelNoticedAt),
      endRowWhere(kind),
    ));
  if (rows.length === 0) return 0;
  const recipientIds = recipientsOf(rows.map((r) => r.userId));
  try {
    if (kind === "cancelled") {
      const [note, suggestions] = await Promise.all([
        cancellationMessage(campaign.id),
        suggestAlternatives(campaign, 3),
      ]);
      // The dedupe key (cp:cancel:{cid}:u{uid}) keeps anyone who already had
      // the notice from getting it twice.
      await notifyCampaignCancelled(
        { campaign, recipientIds, message: note?.text ?? null, suggestions, actorId: null },
        { insert: deps.insert },
      );
    } else {
      // A close: the same notice everyone else had (cp:close:{cid}:u{uid}).
      const project = campaign.projectName || campaign.title;
      const others = otherNeedsLine(await otherOpenNeeds(campaign.id, 2), project);
      const byUser = new Map<number, typeof rows>();
      for (const r of rows) {
        const list = byUser.get(r.userId!) ?? [];
        list.push(r);
        byUser.set(r.userId!, list);
      }
      const inputs = kind === "closed"
        ? buildCampaignClosed({
            campaign,
            closedOn: closedOnWords(campaign),
            stewardIds: [],
            releasedCount: 0,
            contributors: Array.from(byUser.entries()).map(([userId, list]) => ({ userId, lines: closeLinesFor(list, project) })),
            followerIds: [],
            otherNeedsLine: others,
          })
        : buildOfferClosedAtCompletion({
            campaign,
            recipients: Array.from(byUser.entries()).map(([userId, list]) => ({ userId, titles: list.map((r) => r.title) })),
            otherNeedsLine: others,
          });
      await deliver(inputs, { insert: deps.insert });
    }
    await database.update(cc)
      .set({ cancelNoticedAt: sql`NOW()` as any })
      .where(inArray(cc.id, rows.map((r) => r.id)));
  } catch (err) {
    console.warn("[campaign-cancel] notice to newly linked accounts failed; it stays queued:", err);
    return 0;
  }
  return recipientIds.length;
}

/**
 * Send the ending email to every contributor without an account who has not
 * had it yet, one email per address: for a cancelled campaign, a campaign
 * that closed without completing, and one that completed at its close date
 * (only people whose offer was still waiting). Safe to call repeatedly.
 *
 * Claim, then send: before sending to an address, its rows are stamped with
 * cancelNoticedAt, conditional on the stamp being empty, and the email goes
 * only when every row was claimed. A send that returns no id (the hourly cap
 * or EMAIL_HOLD) or throws hands the rows back (NULL) for the retry. Before
 * 2026-09-27 the send came first and the stamp after, so the 65-minute retry
 * and the daily batch could both email the same address. When another run
 * claimed part of an address's rows, that run is emailing the address, so
 * this one sends nothing: one email per address.
 */
export async function sendPendingCampaignEndEmails(
  campaignId: number,
  deps: Pick<CancelDeps, "sendEmail" | "insert"> & { cancelledBy?: "stewards" | "team" | null } = {},
): Promise<{ found: number; sent: number }> {
  const database = await db.getDb();
  if (!database) return { found: 0, sent: 0 };
  const campaign = await db.getCampaignById(campaignId);
  const kind = campaign ? campaignEndKind(campaign) : null;
  if (!campaign || !kind) return { found: 0, sent: 0 };

  await noticeLinkedAccounts(campaign, kind, deps);

  const { groups, spineCoveredRowIds } = await pendingCampaignEndGroups(campaign, kind);
  if (spineCoveredRowIds.length > 0) {
    await database.update(campaignContributions)
      .set({ cancelNoticedAt: sql`NOW()` as any })
      .where(and(inArray(campaignContributions.id, spineCoveredRowIds), isNull(campaignContributions.cancelNoticedAt)));
  }
  if (groups.length === 0) return { found: 0, sent: 0 };

  const email = await import("../_core/email");
  const send = deps.sendEmail ?? email.sendEmail;
  const projectPath = projectPathForCampaignFocus(campaign);
  const links = email.contributionEmailLinks(projectPath);
  const projectName = campaign.projectName || campaign.title;

  // What every email for this ending shares.
  let message: string | null = null;
  let cancelledBy: "stewards" | "team" | null = null;
  let suggestionLinks: Array<{ title: string; place?: string | null; url: string }> = [];
  if (kind === "cancelled") {
    const [cancelNote, suggestions, stewardIds] = await Promise.all([
      cancellationMessage(campaign.id),
      suggestAlternatives(campaign, 3),
      getCampaignStewardIds(campaign).catch(() => [] as number[]),
    ]);
    message = cancelNote?.text ?? null;
    // The actor is known on the first run. A later retry works it out from
    // who wrote the message, and reads neutrally when there was none.
    cancelledBy = deps.cancelledBy
      ?? (cancelNote ? (stewardIds.includes(cancelNote.authorId) ? "stewards" : "team") : null);
    suggestionLinks = suggestions.map((s) => ({
      title: s.title,
      place: placeOf(s),
      url: email.toAbsoluteUrl(s.path, { campaign: "campaign-cancelled" }),
    }));
  } else {
    suggestionLinks = (await otherOpenNeeds(campaign.id, 3)).map((n) => ({
      title: decodeBasicEntities(n.title),
      place: decodeBasicEntities(n.projectName),
      url: email.toAbsoluteUrl(n.path, { campaign: "campaign-closed" }),
    }));
  }
  const closedOn = kind === "closed" ? closedOnWords(campaign) : null;

  const cc = campaignContributions;
  const release = (rowIds: number[]) =>
    database.update(cc).set({ cancelNoticedAt: null }).where(inArray(cc.id, rowIds));

  let sent = 0;
  for (const g of groups) {
    // Claim the address's rows first.
    let claimed = 0;
    try {
      const claim = await database.update(cc)
        .set({ cancelNoticedAt: sql`NOW()` as any })
        .where(and(inArray(cc.id, g.rowIds), isNull(cc.cancelNoticedAt)));
      claimed = affected(claim);
    } catch (err) {
      console.warn("[campaign-cancel] claiming an ending email failed; it stays queued:", err);
      continue;
    }
    if (claimed < g.rowIds.length) continue; // another run has this address
    try {
      const content = email.emailTemplates.campaignCancelled({
        recipientName: g.name || "friend",
        campaignTitle: campaign.title,
        projectName,
        message,
        suggestions: suggestionLinks,
        browseUrl: links.browseUrl,
        signUpUrl: links.signUpUrl,
        cancelledBy,
        reason: kind,
        lines: kind === "closed" ? closeLinesFor(g.rows, projectName) : undefined,
        closedOn,
      });
      const result = await send({
        to: g.email,
        subject: content.subject,
        html: content.html,
        template: kind === "cancelled" ? "campaign_cancelled" : "campaign_closed",
        recipientName: g.name,
      });
      if (result?.id) sent++;
      else await release(g.rowIds);
    } catch (err) {
      console.warn("[campaign-cancel] ending email failed; it stays queued for the retry:", err);
      await release(g.rowIds).catch(() => undefined);
    }
  }
  return { found: groups.length, sent };
}

/** The cancel path's name for sendPendingCampaignEndEmails, kept for its callers and tests. */
export const sendPendingCancellationEmails = sendPendingCampaignEndEmails;

/**
 * Daily: retry owed ending emails for campaigns cancelled in the last 30
 * days, and for campaigns the close job closed or completed in the last 30
 * days. Runs from the crowdpool daily job, the nightly batch (cron and the
 * admin button). `onlyCampaignIds` scopes a test run.
 */
export async function retryPendingCampaignEndEmails(
  deps: Pick<CancelDeps, "sendEmail" | "insert"> & { onlyCampaignIds?: number[] } = {},
): Promise<{ campaigns: number; sent: number }> {
  const database = await db.getDb();
  if (!database) return { campaigns: 0, sent: 0 };
  const scope = deps.onlyCampaignIds
    ? inArray(campaigns.id, deps.onlyCampaignIds.length > 0 ? deps.onlyCampaignIds : [-1])
    : undefined;
  const rows = await database
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(
      or(
        and(eq(campaigns.status, "cancelled"), sql`${campaigns.updatedAt} > NOW() - INTERVAL 30 DAY`),
        and(
          inArray(campaigns.status, ["closed", "completed"]),
          isNotNull(campaigns.closeOutcome),
          sql`${campaigns.closedAt} > NOW() - INTERVAL 30 DAY`,
        ),
      ),
      scope,
    ));
  let sent = 0;
  for (const r of rows) {
    try {
      sent += (await sendPendingCampaignEndEmails(r.id, { sendEmail: deps.sendEmail, insert: deps.insert })).sent;
    } catch (err) {
      console.warn(`[campaign-cancel] retry for campaign ${r.id} failed:`, err);
    }
  }
  return { campaigns: rows.length, sent };
}

/** The nightly batch's name for retryPendingCampaignEndEmails, kept for its callers and tests. */
export const retryPendingCancellationEmails = retryPendingCampaignEndEmails;
