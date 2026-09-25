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
 *      per address, stamping cancelNoticedAt only when the send went out. A
 *      send the hourly cap held back stays NULL and is retried: once after
 *      65 minutes, then by the daily batch for 30 days.
 *
 * Email-only followers (campaign_followers) get no automatic email: Rye
 * reaches them from admin Outbound with the campaign's follower audience.
 */
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
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
import { notifyCampaignCancelled, recipientsOf } from "./campaign-notify";
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
    emailQueued = (await pendingCancellationGroups(campaign)).groups.length;
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

type PendingRow = { id: number; contributorEmail: string; contributorName: string };

/**
 * Rows still owed a cancellation email, grouped by lowercased trimmed email.
 * Emails that belong to an account the spine already reached are split out
 * (`spineCovered`) so the caller can stamp them without sending.
 */
async function pendingCancellationGroups(campaign: Pick<Campaign, "id" | "userId" | "applicationId" | "status" | "startedAt" | "publishedAt">): Promise<{
  groups: Array<{ email: string; name: string; rowIds: number[] }>;
  spineCoveredRowIds: number[];
}> {
  const database = await db.getDb();
  if (!database) return { groups: [], spineCoveredRowIds: [] };
  const rows: PendingRow[] = await database
    .select({
      id: campaignContributions.id,
      contributorEmail: campaignContributions.contributorEmail,
      contributorName: campaignContributions.contributorName,
    })
    .from(campaignContributions)
    .where(and(
      eq(campaignContributions.campaignId, campaign.id),
      isNull(campaignContributions.userId),
      isNull(campaignContributions.cancelNoticedAt),
      inArray(campaignContributions.status, ["cancelled", "fulfilled", "thanked"]),
    ))
    .orderBy(campaignContributions.id);
  if (rows.length === 0) return { groups: [], spineCoveredRowIds: [] };

  // An account holder whose earlier offer is still unlinked hears on the
  // spine; they must not get a second, direct email.
  const recipientIds = await gatherCancelRecipients(campaign, { includeFollowers: wasPublished(campaign) });
  const covered = new Set<string>();
  if (recipientIds.length > 0) {
    const accounts = await database.select({ email: users.email }).from(users).where(inArray(users.id, recipientIds));
    for (const a of accounts) if (a.email) covered.add(a.email.trim().toLowerCase());
  }

  const groups = new Map<string, { email: string; name: string; rowIds: number[] }>();
  const spineCoveredRowIds: number[] = [];
  for (const r of rows) {
    const key = String(r.contributorEmail ?? "").trim().toLowerCase();
    if (!key) continue;
    if (covered.has(key)) {
      spineCoveredRowIds.push(r.id);
      continue;
    }
    const g = groups.get(key);
    if (g) g.rowIds.push(r.id);
    else groups.set(key, { email: String(r.contributorEmail).trim(), name: r.contributorName, rowIds: [r.id] });
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

/**
 * Someone whose cancellation email the hourly cap held back, and who then
 * made an account, has their rows linked (userId set) with cancelNoticedAt
 * still NULL. The email run only looks at rows with no account, and the
 * spine recipients were worked out at cancel time, so without this they
 * would hear nothing. Send them the spine notice now and stamp their rows.
 */
async function noticeLinkedAccounts(
  campaign: Campaign,
  deps: Pick<CancelDeps, "insert">,
): Promise<number> {
  const database = await db.getDb();
  if (!database) return 0;
  const rows = await database
    .select({ id: campaignContributions.id, userId: campaignContributions.userId })
    .from(campaignContributions)
    .where(and(
      eq(campaignContributions.campaignId, campaign.id),
      isNotNull(campaignContributions.userId),
      isNull(campaignContributions.cancelNoticedAt),
      inArray(campaignContributions.status, ["cancelled", "fulfilled", "thanked"]),
    ));
  if (rows.length === 0) return 0;
  const recipientIds = recipientsOf(rows.map((r) => r.userId));
  try {
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
    await database.update(campaignContributions)
      .set({ cancelNoticedAt: sql`NOW()` as any })
      .where(inArray(campaignContributions.id, rows.map((r) => r.id)));
  } catch (err) {
    console.warn("[campaign-cancel] notice to newly linked accounts failed; it stays queued:", err);
    return 0;
  }
  return recipientIds.length;
}

/**
 * Send the cancellation email to every contributor without an account who
 * has not had it yet, one email per address. Stamps cancelNoticedAt on all
 * of that address's rows only when sendEmail returned an id; a held send
 * stays NULL for the next run. Safe to call repeatedly.
 */
export async function sendPendingCancellationEmails(
  campaignId: number,
  deps: Pick<CancelDeps, "sendEmail" | "insert"> & { cancelledBy?: "stewards" | "team" | null } = {},
): Promise<{ found: number; sent: number }> {
  const database = await db.getDb();
  if (!database) return { found: 0, sent: 0 };
  const campaign = await db.getCampaignById(campaignId);
  if (!campaign || campaign.status !== "cancelled") return { found: 0, sent: 0 };

  await noticeLinkedAccounts(campaign, deps);

  const { groups, spineCoveredRowIds } = await pendingCancellationGroups(campaign);
  if (spineCoveredRowIds.length > 0) {
    await database.update(campaignContributions)
      .set({ cancelNoticedAt: sql`NOW()` as any })
      .where(inArray(campaignContributions.id, spineCoveredRowIds));
  }
  if (groups.length === 0) return { found: 0, sent: 0 };

  const email = await import("../_core/email");
  const send = deps.sendEmail ?? email.sendEmail;
  const projectPath = projectPathForCampaignFocus(campaign);
  const links = email.contributionEmailLinks(projectPath);
  const [cancelNote, suggestions, stewardIds] = await Promise.all([
    cancellationMessage(campaign.id),
    suggestAlternatives(campaign, 3),
    getCampaignStewardIds(campaign).catch(() => [] as number[]),
  ]);
  const message = cancelNote?.text ?? null;
  // The actor is known on the first run. A later retry works it out from who
  // wrote the message, and reads neutrally when there was none.
  const cancelledBy = deps.cancelledBy
    ?? (cancelNote ? (stewardIds.includes(cancelNote.authorId) ? "stewards" : "team") : null);
  const suggestionLinks = suggestions.map((s) => ({
    title: s.title,
    place: placeOf(s),
    url: email.toAbsoluteUrl(s.path, { campaign: "campaign-cancelled" }),
  }));

  let sent = 0;
  for (const g of groups) {
    try {
      const content = email.emailTemplates.campaignCancelled({
        recipientName: g.name || "friend",
        campaignTitle: campaign.title,
        projectName: campaign.projectName || campaign.title,
        message,
        suggestions: suggestionLinks,
        browseUrl: links.browseUrl,
        signUpUrl: links.signUpUrl,
        cancelledBy,
      });
      const result = await send({
        to: g.email,
        subject: content.subject,
        html: content.html,
        template: "campaign_cancelled",
        recipientName: g.name,
      });
      if (result?.id) {
        await database.update(campaignContributions)
          .set({ cancelNoticedAt: sql`NOW()` as any })
          .where(inArray(campaignContributions.id, g.rowIds));
        sent++;
      }
    } catch (err) {
      console.warn("[campaign-cancel] cancellation email failed; it stays queued for the retry:", err);
    }
  }
  return { found: groups.length, sent };
}

/** Daily batch: retry owed cancellation emails for campaigns cancelled in the last 30 days. */
export async function retryPendingCancellationEmails(
  deps: Pick<CancelDeps, "sendEmail" | "insert"> = {},
): Promise<{ campaigns: number; sent: number }> {
  const database = await db.getDb();
  if (!database) return { campaigns: 0, sent: 0 };
  const rows = await database
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.status, "cancelled"), sql`${campaigns.updatedAt} > NOW() - INTERVAL 30 DAY`));
  let sent = 0;
  for (const r of rows) {
    try {
      sent += (await sendPendingCancellationEmails(r.id, deps)).sent;
    } catch (err) {
      console.warn(`[campaign-cancel] retry for campaign ${r.id} failed:`, err);
    }
  }
  return { campaigns: rows.length, sent };
}
