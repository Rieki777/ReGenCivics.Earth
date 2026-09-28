/**
 * Offer status links (build spec 2026-09-27, section 10; research R34).
 *
 * Someone who offers without an account gets a private link to that one
 * offer: its step line, Withdraw while it waits, and a short note to the
 * stewards. The same page is reached from the success screen and from a fresh
 * link inside the accepted and declined emails (the three fixed emails stay
 * three; the link rides inside them).
 *
 * The token is a bearer credential, so it is handled like one:
 *   - 256 random bits (randomBytes(32), base64url, 43 characters);
 *   - stored only as its SHA-256 hex, never the token itself; the plain token
 *     is returned once and never logged, stored or put in an error;
 *   - scoped to one contribution, expiring after 180 days (each email brings
 *     a fresh one, so a contribution may hold several live tokens);
 *   - carried in the URL fragment (/offer#<token>), which no browser sends to
 *     a server, a proxy log or a Referer header; the page clears it on load;
 *   - read only through POST mutations (server/routes/offerStatus.ts), so it
 *     never sits in a query string;
 *   - a wrong, unknown or expired token all answer the same NOT_FOUND;
 *   - once the offer is linked to an account the link is read-only.
 *
 * The arrival note (section 11) shows on the page only while the offer
 * stands (accepted, delivered, thanked).
 */
import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import * as db from "../db";
import { APP_BASE_URL } from "../_core/email";
import { sanitizeInput } from "../_core/security";
import { otherOpenNeeds, type OtherNeed } from "./open-needs";
import { decodeBasicEntities } from "../../shared/htmlText";
import { isHoursNeed } from "../../shared/roleCapacity";
import { projectPathForCampaignFocus } from "../../shared/projectKey";
import { kindForItem, needTitle, needVerb, toDay, todayUtc, type NeedVerb } from "../../shared/crowdpoolNeedAction";
import {
  offerSteps,
  type OfferEndingKey,
  type OfferStep,
  type ResolvedArrivalNote,
} from "../../shared/offerStatus";
import type { Campaign, CampaignContribution, CampaignItem } from "../../drizzle/schema";

export const OFFER_TOKEN_TTL_DAYS = 180;
/** A status token: 43 base64url characters (256 bits). */
export const OFFER_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
/** Notes one offer may send the stewards in a rolling 24 hours. */
export const OFFER_REPLY_DAILY_MAX = 5;
/** Other open needs the page offers after a decline, a release or a close. */
export const OFFER_OTHER_NEEDS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The offer statuses whose arrival note the person may read: the offer stands. */
export const STANDING_OFFER_STATUSES = ["accepted", "fulfilled", "thanked"] as const;

/** The token's SHA-256, hex. The only form of it the database ever holds. */
export function hashOfferToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** The page's path for a token: the token rides in the fragment, never the query. */
export function offerStatusPath(token: string): string {
  return `/offer#${token}`;
}

/** The absolute link for an email. */
export function offerStatusUrl(token: string): string {
  return `${APP_BASE_URL.replace(/\/$/, "")}${offerStatusPath(token)}`;
}

/**
 * Make a fresh link for one contribution. The plain token is returned once;
 * only its hash is stored. The caller decides who may get one (a signed-out
 * offer on a real campaign, or the accepted and declined emails).
 */
export async function issueOfferStatusToken(
  contributionId: number,
  now: Date = new Date(),
): Promise<{ token: string; path: string }> {
  const token = randomBytes(32).toString("base64url");
  await db.insertContributionStatusToken({
    contributionId,
    tokenHash: hashOfferToken(token),
    expiresAt: new Date(now.getTime() + OFFER_TOKEN_TTL_DAYS * DAY_MS),
  });
  return { token, path: offerStatusPath(token) };
}

/**
 * The contribution a live token reaches, and when that token expires, or
 * null. A token of the wrong shape, one no row carries and one past its
 * expiry are all null, so the procedures answer each the same way. Stamps
 * lastUsedAt on a hit.
 */
export async function resolveOfferStatusToken(
  token: unknown,
  now: Date = new Date(),
): Promise<{ contribution: CampaignContribution; expiresAt: Date } | null> {
  if (typeof token !== "string" || !OFFER_TOKEN_RE.test(token)) return null;
  const link = await db.findLiveStatusToken(hashOfferToken(token), now);
  if (!link) return null;
  const contribution = await db.getContributionById(link.contributionId);
  if (!contribution) return null;
  try {
    await db.touchContributionStatusToken(link.id, now);
  } catch {
    // A missed stamp changes nothing the person sees.
  }
  return { contribution, expiresAt: new Date(link.expiresAt) };
}

/**
 * Withdraw a waiting offer, conditional on it still waiting: if a steward
 * answered it in the meantime, nothing changes and this returns false. The
 * one write behind campaigns.withdrawContribution (account holders) and
 * offerStatus.withdraw (the status link). A waiting offer holds no place on
 * its need, so no counter moves.
 */
export async function withdrawPendingOffer(contributionId: number): Promise<boolean> {
  const database = await db.getDb();
  if (!database) throw new Error("Database not available");
  const [result] = await database.execute(sql`
    UPDATE campaign_contributions SET status = 'withdrawn'
    WHERE id = ${contributionId} AND status = 'pending'
  `);
  return Number((result as any)?.affectedRows ?? 0) === 1;
}

/**
 * Sanitize plain text and keep it within a column's size. Entity-encoding
 * (& to &amp;) can lengthen text past the limit its input passed, so the cut
 * happens after sanitizing and never leaves half an entity behind.
 */
export function sanitizeCapped(input: string, max: number): string {
  const clean = sanitizeInput(String(input ?? "").trim()).trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/&[#A-Za-z0-9]*$/, "").trimEnd();
}

/**
 * Store a note from the status link, at most OFFER_REPLY_DAILY_MAX per offer
 * in a rolling 24 hours. The offer's row is locked while counting, so two
 * notes sent at once can't both slip under the cap. Returns the new
 * message's id, or 'limit'.
 */
export async function recordContributorNote(
  contributionId: number,
  body: string,
  now: Date = new Date(),
): Promise<{ id: number } | "limit"> {
  const database = await db.getDb();
  if (!database) throw new Error("Database not available");
  const since = new Date(now.getTime() - DAY_MS);
  return database.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM campaign_contributions WHERE id = ${contributionId} FOR UPDATE`);
    const [rows] = await tx.execute(sql`
      SELECT COUNT(*) AS n FROM contribution_messages
      WHERE contributionId = ${contributionId} AND createdAt >= ${since}
    `);
    if (Number((rows as unknown as Array<{ n: number }>)[0]?.n ?? 0) >= OFFER_REPLY_DAILY_MAX) return "limit" as const;
    const [inserted] = await tx.execute(sql`
      INSERT INTO contribution_messages (contributionId, body, via, createdAt)
      VALUES (${contributionId}, ${body}, 'status_link', ${now})
    `);
    return { id: Number((inserted as any)?.insertId) };
  });
}

// ── The page's view ─────────────────────────────────────────────────────────

export type OfferCampaignState = "open" | "complete" | "did_not_complete" | "cancelled";

/**
 * What offerStatus.view returns. Only this offer, in words the person
 * already knows: no email, name, phone, account id or anyone else's data.
 * server/offer-status.test.ts pins the key set (OFFER_STATUS_VIEW_KEYS).
 */
export type OfferStatusView = {
  projectName: string;
  campaignTitle: string;
  projectPath: string;
  offerTitle: string;
  needTitle: string | null;
  verb: NeedVerb | "Freeform";
  status: string;
  steps: OfferStep[];
  ending: { key: OfferEndingKey; text: string } | null;
  stepLine: string;
  acceptedHours: number | null;
  lend: { from: string | null; until: string | null } | null;
  /** The stewards' note to this person (ownerNotes), as plain text. */
  stewardNote: string | null;
  /** Only while the offer stands (section 11). */
  arrivalNote: ResolvedArrivalNote | null;
  /** Up to two, after a decline, a release or a close. */
  otherNeeds: OtherNeed[];
  canWithdraw: boolean;
  canReply: boolean;
  linkedToAccount: boolean;
  campaignState: OfferCampaignState;
  expiresAt: string;
};

export const OFFER_STATUS_VIEW_KEYS = [
  "projectName", "campaignTitle", "projectPath", "offerTitle", "needTitle", "verb",
  "status", "steps", "ending", "stepLine", "acceptedHours", "lend",
  "stewardNote", "arrivalNote", "otherNeeds",
  "canWithdraw", "canReply", "linkedToAccount", "campaignState", "expiresAt",
] as const satisfies ReadonlyArray<keyof OfferStatusView>;

/** Endings after which the page points at other open needs. */
const POINT_ELSEWHERE: ReadonlyArray<OfferEndingKey> = [
  "rejected",
  "released",
  "released_at_close",
  "expired",
  "closed_with_campaign",
  "campaign_cancelled",
];

function campaignStateOf(status: string): OfferCampaignState {
  if (status === "completed" || status === "funded") return "complete";
  if (status === "closed") return "did_not_complete";
  if (status === "cancelled") return "cancelled";
  return "open";
}

const plainText = (s: string | null | undefined): string => decodeBasicEntities(String(s ?? "")).trim();

/**
 * Put the page's view together for one offer. Reads the campaign, the need,
 * the arrival note (only while the offer stands) and, after an ending that
 * leaves the person free, up to two other open needs. `today` feeds the step
 * line (a lend reads Lent once its day comes).
 */
export async function buildOfferStatusView(
  contribution: CampaignContribution,
  expiresAt: Date,
  opts: { today?: string; campaign?: Campaign | null; item?: CampaignItem | null } = {},
): Promise<OfferStatusView | null> {
  const campaign = opts.campaign ?? (await db.getCampaignById(contribution.campaignId));
  if (!campaign) return null;
  const item = opts.item !== undefined
    ? opts.item
    : contribution.campaignItemId
      ? await db.getCampaignItemById(contribution.campaignItemId)
      : null;
  const today = opts.today ?? todayUtc();
  const status = String(contribution.status);
  const standing = (STANDING_OFFER_STATUSES as readonly string[]).includes(status);
  const hoursNeed = isHoursNeed(item);
  const acceptedHours = hoursNeed && standing ? Number(contribution.quantityPledged) || null : null;
  const offerMode = contribution.offerMode === "give" || contribution.offerMode === "lend" ? contribution.offerMode : null;

  const line = offerSteps({
    status,
    acceptedHours,
    offerMode,
    returnedAt: contribution.returnedAt ?? null,
    campaignStatus: String(campaign.status),
    closeReleasedAt: contribution.closeReleasedAt ?? null,
    availableFrom: contribution.availableFrom ?? null,
    needStartsOn: item ? (item.shiftStartsAt ?? item.neededFrom ?? null) : null,
  }, today);

  let arrivalNote: ResolvedArrivalNote | null = null;
  if (standing) {
    try {
      arrivalNote = await db.getResolvedArrivalNote(campaign.id, contribution.campaignItemId ?? null);
    } catch (err) {
      console.warn("[offer-status] arrival note read failed (non-fatal):", (err as Error)?.message);
    }
  }

  const otherNeeds = line.ending && POINT_ELSEWHERE.includes(line.ending.key)
    ? await otherOpenNeeds(campaign.id, OFFER_OTHER_NEEDS)
    : [];

  const linked = contribution.userId != null;
  const kind = item ? kindForItem(item) : null;
  const note = plainText(contribution.ownerNotes);

  return {
    projectName: plainText(campaign.projectName) || plainText(campaign.title) || "the project",
    campaignTitle: plainText(campaign.title) || "this campaign",
    projectPath: projectPathForCampaignFocus(campaign),
    offerTitle: plainText(contribution.title) || "Your offer",
    needTitle: item ? plainText(needTitle(item)) || null : null,
    verb: kind ? needVerb(kind) ?? "Offer" : "Freeform",
    status,
    steps: line.steps,
    ending: line.ending,
    stepLine: line.stepLine,
    acceptedHours,
    lend: offerMode === "lend"
      ? { from: toDay(contribution.availableFrom ?? null), until: toDay(contribution.lendUntil ?? null) }
      : null,
    stewardNote: note || null,
    arrivalNote,
    otherNeeds,
    canWithdraw: !linked && status === "pending",
    canReply: !linked && status !== "withdrawn" && !campaign.isDemo,
    linkedToAccount: linked,
    campaignState: campaignStateOf(String(campaign.status)),
    expiresAt: expiresAt.toISOString(),
  };
}
