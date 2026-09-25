/**
 * Campaign notices on the notification spine.
 *
 * Every campaign event (an offer arrives, a steward answers, a role fills, a
 * campaign goes live, completes or is cancelled) writes rows through
 * insertNotification (server/lib/forum-notify.ts), which drives the bell, web
 * push and the recipient's email by their campaignsEmail preference.
 *
 * Two layers:
 *   - Pure builders (build*) return NotificationInput[] from plain objects.
 *     No database. Tested row by row in server/campaign-notify.test.ts.
 *   - Handlers (notify*) gather recipients from the database, call a builder
 *     and insert each row inside its own try/catch. They NEVER throw: a
 *     notice failing must not undo the steward's action. Routes await them
 *     (so a wiring test that mocks insertNotification sees every call).
 *
 * Rules:
 *   - The actor never gets their own notice.
 *   - Admins are never added as recipients; stewards come from
 *     getCampaignStewardIds (server/lib/project-steward.ts).
 *   - Text is stored as plain text. Campaign fields arrive sanitized (HTML
 *     entities), so builders decode them once; the bell renders text, and
 *     the email path escapes again.
 *   - Links point at the project page (shared/projectKey.ts) plus an anchor.
 *   - Contributors without an account are not handled here; they keep the
 *     direct emails in server/_core/email.ts.
 */
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { decodeBasicEntities } from "../../shared/htmlText";
import { projectPathForCampaignFocus } from "../../shared/projectKey";
import { isHoursNeed } from "../../shared/roleCapacity";
import { campaignContributions } from "../../drizzle/schema";
import { excerpt, insertNotification, type NotificationInput } from "./forum-notify";
import { getCampaignStewardIds } from "./project-steward";

// ─── Input shapes (plain objects; routes pass drizzle rows) ─────────────────

export type NotifyCampaign = {
  id: number;
  title: string;
  projectName?: string | null;
  applicationId?: number | null;
  userId: number;
  /** When known: unpublished campaigns (draft, in review, sent back) never reach followers. */
  status?: string | null;
};

/** Campaign statuses nobody outside the stewards can see. */
const UNPUBLISHED_STATUSES = ["draft", "pending_review", "rejected"];

export type NotifyContribution = {
  id: number;
  campaignId: number;
  userId?: number | null;
  title: string;
  contributorName?: string | null;
  quantityPledged?: number | null;
  hoursPerWeek?: number | null;
  roleTitle?: string | null;
  campaignItemId?: number | null;
};

export type NotifyItem = {
  id: number;
  kind: string;
  capacityUnit?: string | null;
  quantityWanted: number;
  roleTitle?: string | null;
  equipmentName?: string | null;
  resourceName?: string | null;
  category?: string | null;
};

export type NotifySuggestion = { title: string };

type Insert = (n: NotificationInput) => Promise<boolean>;
export type NotifyDeps = { insert?: Insert };

// ─── Small pure helpers ─────────────────────────────────────────────────────

const plain = (s: string | null | undefined): string => decodeBasicEntities((s ?? "").trim());

export function campaignTitleOf(c: NotifyCampaign): string {
  return plain(c.title) || "this campaign";
}

export function projectNameOf(c: NotifyCampaign): string {
  return plain(c.projectName) || plain(c.title) || "the project";
}

export function projectLink(c: NotifyCampaign, anchor?: string): string {
  // Focused on this campaign (?campaign=), so a project with several
  // campaigns opens on the one the notice is about.
  const path = projectPathForCampaignFocus({
    id: c.id,
    applicationId: c.applicationId ?? null,
    projectName: c.projectName ?? null,
    title: c.title,
  });
  return anchor ? `${path}#${anchor}` : path;
}

/** The need's own name: role title, equipment or resource name. */
export function needTitleOf(item: NotifyItem | null | undefined, contribution?: NotifyContribution | null): string {
  const fromItem = item ? plain(item.roleTitle) || plain(item.equipmentName) || plain(item.resourceName) : "";
  return fromItem || plain(contribution?.roleTitle) || plain(contribution?.title) || "this need";
}

/** Unique positive ids, minus anyone in `exclude`. */
export function recipientsOf(ids: Array<number | null | undefined>, exclude: Array<number | null | undefined> = []): number[] {
  const skip = new Set(exclude.filter((x): x is number => typeof x === "number"));
  const out: number[] = [];
  for (const id of ids) {
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) continue;
    if (skip.has(id) || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

function withNote(base: string, note: string | null | undefined, label = "Note from the stewards"): string {
  const n = plain(note);
  return n ? `${base} ${label}: ${n}` : base;
}

// ─── Builders (pure) ────────────────────────────────────────────────────────

export function buildProposalReceived(args: {
  campaign: NotifyCampaign;
  contribution: NotifyContribution;
  item?: NotifyItem | null;
  stewardIds: number[];
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign, contribution, item } = args;
  const who = plain(contribution.contributorName) || "Someone";
  const hours = isHoursNeed(item) ? Number(contribution.hoursPerWeek ?? contribution.quantityPledged ?? 0) : 0;
  const body = hours > 0
    ? `${who} offered "${plain(contribution.title)}" for ${hours} hours a week.`
    : `${who} offered "${plain(contribution.title)}".`;
  return recipientsOf(args.stewardIds, [args.actorId, contribution.userId]).map((uid) => ({
    userId: uid,
    type: "new_contribution",
    title: `New offer for ${campaignTitleOf(campaign)}`,
    body,
    link: projectLink(campaign, "review"),
    actorId: args.actorId ?? contribution.userId ?? null,
    campaignId: campaign.id,
    contributionId: contribution.id,
    dedupeKey: `cp:new:${contribution.id}:u${uid}`,
  }));
}

export function buildProposalAccepted(args: {
  campaign: NotifyCampaign;
  contribution: NotifyContribution;
  item?: NotifyItem | null;
  note?: string | null;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign, contribution, item } = args;
  const uid = recipientsOf([contribution.userId], [args.actorId])[0];
  if (!uid) return [];
  const base = isHoursNeed(item)
    ? `You're in for ${Number(contribution.quantityPledged ?? 0)} hours a week as ${needTitleOf(item, contribution)}.`
    : `"${plain(contribution.title)}" is accepted.`;
  return [{
    userId: uid,
    type: "contribution_accepted",
    title: `${projectNameOf(campaign)} accepted your offer`,
    body: withNote(base, args.note),
    link: projectLink(campaign, "your-contributions"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    contributionId: contribution.id,
    dedupeKey: `cp:contrib:${contribution.id}:accepted`,
  }];
}

export function buildProposalDeclined(args: {
  campaign: NotifyCampaign;
  contribution: NotifyContribution;
  note?: string | null;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign, contribution } = args;
  const uid = recipientsOf([contribution.userId], [args.actorId])[0];
  if (!uid) return [];
  const base = withNote(`The stewards can't take "${plain(contribution.title)}" right now.`, args.note);
  return [{
    userId: uid,
    type: "contribution_rejected",
    title: `An update on your offer to ${projectNameOf(campaign)}`,
    body: `${base} Other campaigns could use this offer, have a look.`,
    link: projectLink(campaign, "your-contributions"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    contributionId: contribution.id,
    dedupeKey: `cp:contrib:${contribution.id}:rejected`,
  }];
}

export function buildRoleFilled(args: {
  campaign: NotifyCampaign;
  item: NotifyItem;
  holderIds: number[];
  stewardIds: number[];
  triggerContributionId: number;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign, item } = args;
  const role = needTitleOf(item);
  const stewards = recipientsOf(args.stewardIds, [args.actorId]);
  const holders = recipientsOf(args.holderIds, [args.actorId, ...stewards]);
  const common = {
    type: "role_filled" as const,
    title: `${role} is filled`,
    link: projectLink(campaign, "needs"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
  };
  const key = (uid: number) => `cp:rolefilled:${item.id}:${args.triggerContributionId}:u${uid}`;
  return [
    ...holders.map((uid) => ({
      ...common,
      userId: uid,
      body: `${projectNameOf(campaign)} now has all ${Number(item.quantityWanted)} hours a week this role asked for. Thank you for being part of it.`,
      dedupeKey: key(uid),
    })),
    ...stewards.map((uid) => ({
      ...common,
      userId: uid,
      body: "Every hour this role needs is accepted. New offers for it are closed until you release someone or raise the hours.",
      dedupeKey: key(uid),
    })),
  ];
}

export function buildHoursChanged(args: {
  campaign: NotifyCampaign;
  contribution: NotifyContribution;
  item?: NotifyItem | null;
  hours: number;
  at: Date;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign, contribution } = args;
  const uid = recipientsOf([contribution.userId], [args.actorId])[0];
  if (!uid) return [];
  const epochMinutes = Math.floor(args.at.getTime() / 60000);
  return [{
    userId: uid,
    type: "contribution_accepted",
    title: `Your hours for ${needTitleOf(args.item, contribution)} changed`,
    body: `The stewards of ${projectNameOf(campaign)} set your place at ${Number(args.hours)} hours a week.`,
    link: projectLink(campaign, "your-contributions"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    contributionId: contribution.id,
    dedupeKey: `cp:contrib:${contribution.id}:hours:${Number(args.hours)}:${epochMinutes}`,
  }];
}

export function buildReleased(args: {
  campaign: NotifyCampaign;
  contribution: NotifyContribution;
  item?: NotifyItem | null;
  note?: string | null;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign, contribution } = args;
  const uid = recipientsOf([contribution.userId], [args.actorId])[0];
  if (!uid) return [];
  const place = args.item ? needTitleOf(args.item, contribution) : plain(contribution.roleTitle) || plain(contribution.title);
  return [{
    userId: uid,
    type: "contribution_released",
    title: `Your place in ${place} is freed up`,
    body: withNote(`The stewards of ${projectNameOf(campaign)} released your place.`, args.note),
    link: projectLink(campaign, "your-contributions"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    contributionId: contribution.id,
    dedupeKey: `cp:contrib:${contribution.id}:released`,
  }];
}

export function buildDelivered(args: {
  campaign: NotifyCampaign;
  contribution: NotifyContribution;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign, contribution } = args;
  const uid = recipientsOf([contribution.userId], [args.actorId])[0];
  if (!uid) return [];
  return [{
    userId: uid,
    type: "contribution_delivered",
    title: `${projectNameOf(campaign)} marked your contribution delivered`,
    body: `"${plain(contribution.title)}" is on the record, and it now grows on your Living Tree.`,
    link: projectLink(campaign, "your-contributions"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    contributionId: contribution.id,
    dedupeKey: `cp:contrib:${contribution.id}:delivered`,
  }];
}

export function buildThanked(args: {
  campaign: NotifyCampaign;
  contribution: NotifyContribution;
  note: string;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign, contribution } = args;
  const uid = recipientsOf([contribution.userId], [args.actorId])[0];
  if (!uid) return [];
  return [{
    userId: uid,
    type: "contribution_thanked",
    title: `A thank-you from ${projectNameOf(campaign)}`,
    body: excerpt(plain(args.note), 500),
    link: projectLink(campaign, "your-contributions"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    contributionId: contribution.id,
    dedupeKey: `cp:contrib:${contribution.id}:thanked`,
  }];
}

export function buildUpdatePosted(args: {
  campaign: NotifyCampaign;
  update: { id: number; updateNumber: number; title: string };
  followerIds: number[];
  authorId?: number | null;
}): NotificationInput[] {
  const { campaign, update } = args;
  return recipientsOf(args.followerIds, [args.authorId]).map((uid) => ({
    userId: uid,
    type: "campaign_update" as const,
    title: `Update #${update.updateNumber} from ${campaignTitleOf(campaign)}`,
    body: plain(update.title),
    link: projectLink(campaign, "updates"),
    actorId: args.authorId ?? null,
    campaignId: campaign.id,
    dedupeKey: `cp:update:${update.id}:u${uid}`,
  }));
}

export function buildCampaignApproved(args: {
  campaign: NotifyCampaign;
  stewardIds: number[];
  reviewNotes?: string | null;
  reviewedAt: Date;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign } = args;
  const body = withNote("Your campaign passed review and is open for offers.", args.reviewNotes, "Notes from the review");
  return recipientsOf(args.stewardIds, [args.actorId]).map((uid) => ({
    userId: uid,
    type: "campaign_approved" as const,
    title: `${campaignTitleOf(campaign)} is live`,
    body,
    link: projectLink(campaign, "steward-tools"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    dedupeKey: `cp:status:${campaign.id}:active:${args.reviewedAt.getTime()}:u${uid}`,
  }));
}

export function buildCampaignDeclined(args: {
  campaign: NotifyCampaign;
  stewardIds: number[];
  reviewNotes?: string | null;
  reviewedAt: Date;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign } = args;
  const notes = plain(args.reviewNotes);
  const body = notes
    || "The review team sent this campaign back. Reach out to the team through the Connect page at regencivics.earth/connect for next steps.";
  return recipientsOf(args.stewardIds, [args.actorId]).map((uid) => ({
    userId: uid,
    type: "campaign_declined" as const,
    title: `Review notes on ${campaignTitleOf(campaign)}`,
    body,
    link: projectLink(campaign, "steward-tools"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    dedupeKey: `cp:status:${campaign.id}:rejected:${args.reviewedAt.getTime()}:u${uid}`,
  }));
}

export function buildCampaignCompleted(args: {
  campaign: NotifyCampaign;
  stewardIds: number[];
  contributorIds: number[];
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign } = args;
  return recipientsOf([...args.stewardIds, ...args.contributorIds], [args.actorId]).map((uid) => ({
    userId: uid,
    type: "campaign_completed" as const,
    title: `${campaignTitleOf(campaign)} is complete`,
    body: "Thank you to everyone who brought this one home.",
    link: projectLink(campaign),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    dedupeKey: `cp:status:${campaign.id}:completed:u${uid}`,
  }));
}

export function buildCampaignCancelled(args: {
  campaign: NotifyCampaign;
  recipientIds: number[];
  message?: string | null;
  suggestions: NotifySuggestion[];
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign } = args;
  const titles = args.suggestions.slice(0, 3).map((s) => plain(s.title)).filter(Boolean);
  const nudge = titles.length > 0
    ? `These campaigns could use your energy: ${titles.join(", ")}.`
    : "Browse live campaigns at regencivics.earth/campaigns.";
  const message = plain(args.message);
  const body = message ? `${excerpt(message, 300)} ${nudge}` : nudge;
  return recipientsOf(args.recipientIds, [args.actorId]).map((uid) => ({
    userId: uid,
    type: "campaign_cancelled" as const,
    title: `${campaignTitleOf(campaign)} has been cancelled`,
    body,
    link: projectLink(campaign, "cancelled"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    dedupeKey: `cp:cancel:${campaign.id}:u${uid}`,
  }));
}

export function buildClaimExpired(args: {
  campaign: NotifyCampaign;
  contribution: NotifyContribution;
  stewardIds: number[];
}): NotificationInput[] {
  const { campaign, contribution } = args;
  const out: NotificationInput[] = [];
  const contributorId = recipientsOf([contribution.userId])[0];
  const claimTitle = plain(contribution.title);
  if (contributorId) {
    out.push({
      userId: contributorId,
      type: "claim_expired",
      title: "Your claim expired",
      body: `Your claim "${claimTitle}" on ${campaignTitleOf(campaign)} passed its delivery window, so the need is open again. You can claim it again any time.`,
      link: projectLink(campaign, "your-contributions"),
      campaignId: campaign.id,
      contributionId: contribution.id,
      dedupeKey: `cp:claimexp:${contribution.id}:contributor`,
    });
  }
  for (const uid of recipientsOf(args.stewardIds, [contributorId])) {
    out.push({
      userId: uid,
      type: "claim_expired",
      title: "A claim expired",
      body: `The claim "${claimTitle}" on ${campaignTitleOf(campaign)} expired, so its slots are open again.`,
      link: projectLink(campaign, "review"),
      campaignId: campaign.id,
      contributionId: contribution.id,
      dedupeKey: `cp:claimexp:${contribution.id}:u${uid}`,
    });
  }
  return out;
}

export function buildChainConfirmed(args: {
  campaign: NotifyCampaign;
  contribution: NotifyContribution;
  stewardIds: number[];
  txLink?: string | null;
}): NotificationInput[] {
  const { campaign, contribution } = args;
  const out: NotificationInput[] = [];
  const projectName = projectNameOf(campaign);
  const needTitle = plain(contribution.title) || "your contribution";
  const contributorId = recipientsOf([contribution.userId])[0];
  if (contributorId) {
    out.push({
      userId: contributorId,
      type: "campaign_milestone",
      title: "Your contribution is confirmed on chain",
      body: `${projectName} formalized "${needTitle}" on Hypha and issued its tokens.${args.txLink ? ` View on Basescan: ${args.txLink}` : ""}`,
      link: projectLink(campaign),
      campaignId: campaign.id,
      contributionId: contribution.id,
      dedupeKey: `cp:chain:${contribution.id}:u${contributorId}`,
    });
  }
  for (const uid of recipientsOf(args.stewardIds, [contributorId])) {
    out.push({
      userId: uid,
      type: "campaign_milestone",
      title: "A contribution was confirmed on chain",
      body: `"${needTitle}" was formalized on Hypha for ${projectName}.`,
      link: projectLink(campaign),
      campaignId: campaign.id,
      contributionId: contribution.id,
      dedupeKey: `cp:chain:${contribution.id}:u${uid}`,
    });
  }
  return out;
}

// ─── Handlers (DB, never throw) ─────────────────────────────────────────────

/** Insert each row on its own; one failure never stops the rest. Returns rows sent without error. */
export async function deliver(inputs: NotificationInput[], deps: NotifyDeps = {}): Promise<number> {
  const insert = deps.insert ?? insertNotification;
  let ok = 0;
  for (const n of inputs) {
    try {
      await insert(n);
      ok++;
    } catch (err) {
      console.warn(`[campaign-notify] ${n.type} for user ${n.userId} failed:`, err);
    }
  }
  return ok;
}

async function safeStewards(campaign: NotifyCampaign): Promise<number[]> {
  try {
    return await getCampaignStewardIds({ userId: campaign.userId, applicationId: campaign.applicationId ?? null });
  } catch (err) {
    console.warn("[campaign-notify] steward lookup failed:", err);
    return recipientsOf([campaign.userId]);
  }
}

async function run(label: string, fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[campaign-notify] ${label} failed:`, err);
    return 0;
  }
}

/** Account holders with a row on this need (or campaign) in the given statuses. */
async function contributorUserIds(filter: { campaignId?: number; itemId?: number; statuses: string[] }): Promise<number[]> {
  const { getDb } = await import("../db");
  const database = await getDb();
  if (!database) return [];
  const conds = [isNotNull(campaignContributions.userId), inArray(campaignContributions.status, filter.statuses as any)];
  if (filter.campaignId) conds.push(eq(campaignContributions.campaignId, filter.campaignId));
  if (filter.itemId) conds.push(eq(campaignContributions.campaignItemId, filter.itemId));
  const rows = await database
    .select({ userId: campaignContributions.userId })
    .from(campaignContributions)
    .where(and(...conds));
  return recipientsOf(rows.map((r) => r.userId));
}

export async function notifyProposalReceived(
  args: { campaign: NotifyCampaign; contribution: NotifyContribution; item?: NotifyItem | null; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("proposal received", async () =>
    deliver(buildProposalReceived({ ...args, stewardIds: await safeStewards(args.campaign) }), deps));
}

export async function notifyProposalAccepted(
  args: { campaign: NotifyCampaign; contribution: NotifyContribution; item?: NotifyItem | null; note?: string | null; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("proposal accepted", async () => deliver(buildProposalAccepted(args), deps));
}

export async function notifyProposalDeclined(
  args: { campaign: NotifyCampaign; contribution: NotifyContribution; note?: string | null; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("proposal declined", async () => deliver(buildProposalDeclined(args), deps));
}

export async function notifyRoleFilled(
  args: { campaign: NotifyCampaign; item: NotifyItem; triggerContributionId: number; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("role filled", async () => {
    const [holderIds, stewardIds] = await Promise.all([
      contributorUserIds({ itemId: args.item.id, statuses: ["accepted", "fulfilled", "thanked"] }),
      safeStewards(args.campaign),
    ]);
    return deliver(buildRoleFilled({ ...args, holderIds, stewardIds }), deps);
  });
}

export async function notifyHoursChanged(
  args: { campaign: NotifyCampaign; contribution: NotifyContribution; item?: NotifyItem | null; hours: number; actorId?: number | null; at?: Date },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("hours changed", async () => deliver(buildHoursChanged({ ...args, at: args.at ?? new Date() }), deps));
}

export async function notifyReleased(
  args: { campaign: NotifyCampaign; contribution: NotifyContribution; item?: NotifyItem | null; note?: string | null; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("released", async () => deliver(buildReleased(args), deps));
}

export async function notifyDelivered(
  args: { campaign: NotifyCampaign; contribution: NotifyContribution; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("delivered", async () => deliver(buildDelivered(args), deps));
}

export async function notifyThanked(
  args: { campaign: NotifyCampaign; contribution: NotifyContribution; note: string; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("thanked", async () => deliver(buildThanked(args), deps));
}

export async function notifyUpdatePosted(
  args: { campaign: NotifyCampaign; update: { id: number; updateNumber: number; title: string }; authorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("update posted", async () => {
    // A draft or in-review campaign is for its stewards only: its updates
    // reach nobody else (a follow made by id must not leak them).
    if (args.campaign.status && UNPUBLISHED_STATUSES.includes(args.campaign.status)) return 0;
    const { getCampaignFollowerUserIds } = await import("../db");
    // Followers, plus account holders whose offer stands on this campaign:
    // the composer asks stewards to write to their contributors, so those
    // people hear about it too. recipientsOf in the builder dedupes.
    const [followerIds, contributorIds] = await Promise.all([
      getCampaignFollowerUserIds(args.campaign.id),
      contributorUserIds({ campaignId: args.campaign.id, statuses: ["accepted", "fulfilled", "thanked"] }),
    ]);
    return deliver(buildUpdatePosted({ ...args, followerIds: [...followerIds, ...contributorIds] }), deps);
  });
}

export async function notifyCampaignApproved(
  args: { campaign: NotifyCampaign; reviewNotes?: string | null; reviewedAt?: Date; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("campaign approved", async () =>
    deliver(buildCampaignApproved({
      ...args,
      reviewedAt: args.reviewedAt ?? new Date(),
      stewardIds: await safeStewards(args.campaign),
    }), deps));
}

export async function notifyCampaignDeclined(
  args: { campaign: NotifyCampaign; reviewNotes?: string | null; reviewedAt?: Date; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("campaign declined", async () =>
    deliver(buildCampaignDeclined({
      ...args,
      reviewedAt: args.reviewedAt ?? new Date(),
      stewardIds: await safeStewards(args.campaign),
    }), deps));
}

export async function notifyCampaignCompleted(
  args: { campaign: NotifyCampaign; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("campaign completed", async () => {
    const [stewardIds, contributorIds] = await Promise.all([
      safeStewards(args.campaign),
      contributorUserIds({ campaignId: args.campaign.id, statuses: ["accepted", "fulfilled", "thanked"] }),
    ]);
    return deliver(buildCampaignCompleted({ ...args, stewardIds, contributorIds }), deps);
  });
}

/**
 * The cancel service (server/lib/campaign-cancel.ts) gathers the recipients
 * (stewards, account contributors, account followers); this only builds and
 * sends. Returns the number of people notified.
 */
export async function notifyCampaignCancelled(
  args: { campaign: NotifyCampaign; recipientIds: number[]; message?: string | null; suggestions: NotifySuggestion[]; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("campaign cancelled", async () => deliver(buildCampaignCancelled(args), deps));
}

export async function notifyClaimExpired(
  args: { campaign: NotifyCampaign; contribution: NotifyContribution },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("claim expired", async () =>
    deliver(buildClaimExpired({ ...args, stewardIds: await safeStewards(args.campaign) }), deps));
}

export async function notifyChainConfirmed(
  args: { campaign: NotifyCampaign; contribution: NotifyContribution; txLink?: string | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("chain confirmed", async () =>
    deliver(buildChainConfirmed({ ...args, stewardIds: await safeStewards(args.campaign) }), deps));
}
