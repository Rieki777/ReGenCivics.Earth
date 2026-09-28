/**
 * Campaign notices on the notification spine.
 *
 * Every campaign event (an offer arrives, waits, or a steward answers it, a
 * role fills or opens up again, a campaign goes live, opens to followers,
 * nears its close date, completes, closes or is cancelled) writes rows through
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

/** "1 hour a week", "30 hours a week". */
function hoursAWeek(n: number): string {
  return n === 1 ? "1 hour a week" : `${n} hours a week`;
}

/**
 * A filled role opened up again (a release, lowered hours or more hours
 * needed). Goes to account holders who offered to the role and are still
 * waiting (pending), and to those not taken ('rejected'), whom
 * notifyRoleReopened passes while ROLE_REOPENED_REACHES_DECLINED is on (it is,
 * from the ruling of 2026-09-27). Never the actor, never
 * anyone in `excludeIds` (the person just released, the person whose hours
 * changed, anyone who already holds hours on the role). Only for a live
 * campaign. One row per person per reopening: the key carries the need, the
 * new open hours and the moment it reopened, so a retry of the same event
 * dedupes and a later reopening is a new notice.
 */
export function buildRoleReopened(args: {
  campaign: NotifyCampaign;
  item: NotifyItem;
  openHours: number;
  waitingIds: number[];
  notSelectedIds: number[];
  excludeIds?: Array<number | null | undefined>;
  reopenedAt: Date;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign, item } = args;
  if (campaign.status && campaign.status !== "active") return [];
  const open = Math.floor(Number(args.openHours) || 0);
  if (open <= 0) return [];
  const exclude = [args.actorId, ...(args.excludeIds ?? [])];
  const waiting = recipientsOf(args.waitingIds, exclude);
  const notSelected = recipientsOf(args.notSelectedIds, [...exclude, ...waiting]);
  const lead = `${needTitleOf(item)} at ${projectNameOf(campaign)} has ${hoursAWeek(open)} open again.`;
  const row = (uid: number, body: string): NotificationInput => ({
    userId: uid,
    type: "role_reopened",
    title: "A role you offered to has opened up",
    body,
    link: projectLink(campaign, "needs"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    dedupeKey: `cp:rolereopened:${item.id}:o${open}:${args.reopenedAt.getTime()}:u${uid}`,
  });
  return [
    ...waiting.map((uid) => row(uid, `${lead} Your offer is still with the stewards.`)),
    ...notSelected.map((uid) => row(uid, `${lead} If you'd still like to give your time, you're welcome to offer again.`)),
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
  const needTitle = plain(contribution.title);
  if (contributorId) {
    out.push({
      userId: contributorId,
      type: "claim_expired",
      title: "Your place closed",
      body: `Your place for "${needTitle}" on ${campaignTitleOf(campaign)} passed its delivery window, so the need is open again. You can offer again any time.`,
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
      title: "A place closed",
      body: `The place for "${needTitle}" on ${campaignTitleOf(campaign)} passed its delivery window, so it is open again.`,
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

// ─── Nudges, the opening, the final stretch and the close (2026-09-27) ──────
// Build spec 2026-09-27, sections 8.3, 9.3 and 12.3. Every row here is one
// person, keyed so a retried or concurrent run writes it once.

/** A waiting offer, as the nudge and the "still waiting" note read it. */
export type NudgeContribution = {
  id: number;
  title: string;
  userId?: number | null;
  contributorName?: string | null;
  isAnonymous?: number | boolean | null;
};

function isOn(v: number | boolean | null | undefined): boolean {
  return v === true || (typeof v === "number" && v !== 0);
}

/**
 * A steward nudge about an offer still waiting on them (type offer_waiting):
 * step 1 at 2 days, step 2 at a week. Every steward, never the contributor
 * themselves. `Someone` when the offer is anonymous.
 */
export function buildStewardNudge(args: {
  campaign: NotifyCampaign;
  contribution: NudgeContribution;
  stewardIds: number[];
  step: 1 | 2;
}): NotificationInput[] {
  const { campaign, contribution, step } = args;
  const who = isOn(contribution.isAnonymous) ? "Someone" : plain(contribution.contributorName) || "Someone";
  const offer = plain(contribution.title) || "something";
  const camp = campaignTitleOf(campaign);
  const title = step === 1 ? `${who}'s offer is waiting on you` : `${who} has waited a week to hear back`;
  const body = step === 1
    ? `${who} offered "${offer}" to ${camp} 2 days ago. A yes, a no or a question keeps it moving.`
    : `${who} offered "${offer}" to ${camp} a week ago. If it isn't a fit, a kind no frees them to offer somewhere else.`;
  return recipientsOf(args.stewardIds, [contribution.userId]).map((uid) => ({
    userId: uid,
    type: "offer_waiting" as const,
    title,
    body,
    link: projectLink(campaign, "review"),
    actorId: null,
    campaignId: campaign.id,
    contributionId: contribution.id,
    dedupeKey: `cp:nudge:${contribution.id}:s${step}:u${uid}`,
  }));
}

/** The contributor's own note at 14 days (type offer_still_waiting). Account holders only. */
export function buildStillWaiting(args: { campaign: NotifyCampaign; contribution: NudgeContribution }): NotificationInput[] {
  const { campaign, contribution } = args;
  const uid = recipientsOf([contribution.userId])[0];
  if (!uid) return [];
  const project = projectNameOf(campaign);
  return [{
    userId: uid,
    type: "offer_still_waiting",
    title: `Your offer to ${project} is still waiting`,
    body: `The stewards of ${project} haven't answered your offer of "${plain(contribution.title) || "your help"}" yet. It stays open until they do, and you can withdraw it from Your contributions if your plans change.`,
    link: projectLink(campaign, "your-contributions"),
    actorId: null,
    campaignId: campaign.id,
    contributionId: contribution.id,
    dedupeKey: `cp:wait:${contribution.id}:u${uid}`,
  }];
}

/**
 * Crowdpooling opens at a project (type campaign_opened): to its followers,
 * never its stewards or the admin who opened it. `openLine` is the reading's
 * open line ("12 needs still open. 5 roles, 4 things, 3 shifts.") and
 * `closes` its "Closes {date}", each left out when there is none. One per
 * campaign and person, so a re-approval never repeats it.
 */
export function buildCampaignOpened(args: {
  campaign: NotifyCampaign;
  followerIds: number[];
  stewardIds: number[];
  openLine?: string | null;
  closes?: string | null;
  actorId?: number | null;
}): NotificationInput[] {
  const { campaign } = args;
  const project = projectNameOf(campaign);
  const open = plain(args.openLine);
  const closes = plain(args.closes);
  const body = `${project} is asking for help.${open ? ` ${open}` : ""}${closes ? ` ${closes}.` : ""}`;
  return recipientsOf(args.followerIds, [args.actorId, ...args.stewardIds]).map((uid) => ({
    userId: uid,
    type: "campaign_opened" as const,
    title: `Crowdpooling is open at ${project}`,
    body,
    link: projectLink(campaign, "needs"),
    actorId: args.actorId ?? null,
    campaignId: campaign.id,
    dedupeKey: `cp:opened:${campaign.id}:u${uid}`,
  }));
}

/**
 * Two weeks before the close (type campaign_final_stretch): up to three open
 * needs by name and the close date. Nothing when no need is open. The job
 * chooses the recipients (followers, minus stewards and anyone who offered).
 */
export function buildFinalStretch(args: {
  campaign: NotifyCampaign;
  recipientIds: number[];
  needLines: string[];
  closesOn: string;
}): NotificationInput[] {
  const { campaign } = args;
  const lines = args.needLines.map((l) => plain(l)).filter(Boolean).slice(0, 3);
  if (lines.length === 0) return [];
  const project = projectNameOf(campaign);
  const body = `${lines.join("; ")}. Crowdpooling at ${project} closes on ${plain(args.closesOn)}.`;
  return recipientsOf(args.recipientIds).map((uid) => ({
    userId: uid,
    type: "campaign_final_stretch" as const,
    title: `These needs are still open at ${project}`,
    body,
    link: projectLink(campaign, "needs"),
    actorId: null,
    campaignId: campaign.id,
    dedupeKey: `cp:stretch:${campaign.id}:u${uid}`,
  }));
}

/**
 * A campaign closed at its close date without completing (type
 * campaign_closed). Three kinds of reader, each once, in this order so a
 * steward who also offered hears as a steward:
 *   - stewards: how many offers the close released, and what stays with them;
 *   - account contributors: their own lines (closeLinesFor in
 *     shared/campaignClose.ts), then the other-needs line;
 *   - account followers: a short note that they still follow the project.
 */
export function buildCampaignClosed(args: {
  campaign: NotifyCampaign;
  closedOn: string;
  stewardIds: number[];
  releasedCount: number;
  contributors: Array<{ userId: number | null | undefined; lines: string[] }>;
  followerIds: number[];
  otherNeedsLine: string;
}): NotificationInput[] {
  const { campaign } = args;
  const camp = campaignTitleOf(campaign);
  const project = projectNameOf(campaign);
  const closedOn = plain(args.closedOn);
  const title = `${camp} closed without completing`;
  const row = (uid: number, body: string, anchor?: string): NotificationInput => ({
    userId: uid,
    type: "campaign_closed",
    title,
    body,
    link: projectLink(campaign, anchor),
    actorId: null,
    campaignId: campaign.id,
    dedupeKey: `cp:close:${campaign.id}:u${uid}`,
  });

  const n = Math.max(0, Math.floor(Number(args.releasedCount) || 0));
  const released = n === 0
    ? ""
    : n === 1
      ? " 1 offer that hadn't started was released with a thank-you."
      : ` ${n} offers that hadn't started were released with a thank-you.`;
  const stewardBody = `Crowdpooling closed on ${closedOn}.${released} Offers already underway stay with you to mark delivered or release. Help already given stays recorded in the project's token.`;

  const stewards = recipientsOf(args.stewardIds);
  const out: NotificationInput[] = stewards.map((uid) => row(uid, stewardBody, "steward-tools"));

  const seen = new Set<number>(stewards);
  const other = plain(args.otherNeedsLine);
  for (const c of args.contributors) {
    const uid = recipientsOf([c.userId], Array.from(seen))[0];
    if (!uid) continue;
    seen.add(uid);
    const lines = c.lines.map((l) => plain(l)).filter(Boolean);
    const lead = lines.length > 0 ? lines.join(" ") : `Crowdpooling at ${project} closed on ${closedOn} without completing.`;
    out.push(row(uid, excerpt(other ? `${lead} ${other}` : lead, 500), "your-contributions"));
  }

  const followerBody = `Crowdpooling at ${project} closed on ${closedOn} without completing. You still follow ${project}, so you'll hear when it asks again.`;
  for (const uid of recipientsOf(args.followerIds, Array.from(seen))) out.push(row(uid, followerBody));
  return out;
}

/** '"a"', '"a" and "b"', '"a", "b" and 2 more'. */
function quotedTitles(titles: string[]): string {
  const q = titles.map((t) => `"${plain(t) || "your help"}"`);
  if (q.length <= 1) return q[0] ?? `"your help"`;
  if (q.length === 2) return `${q[0]} and ${q[1]}`;
  return `${q[0]}, ${q[1]} and ${q.length - 2} more`;
}

/**
 * A campaign completed at its close date while someone's offer was still
 * waiting (type campaign_closed): their offer closes with thanks, then the
 * other-needs line. One notice per person, however many offers waited.
 */
export function buildOfferClosedAtCompletion(args: {
  campaign: NotifyCampaign;
  recipients: Array<{ userId: number | null | undefined; titles: string[] }>;
  otherNeedsLine: string;
}): NotificationInput[] {
  const { campaign } = args;
  const other = plain(args.otherNeedsLine);
  const out: NotificationInput[] = [];
  const seen = new Set<number>();
  for (const r of args.recipients) {
    const uid = recipientsOf([r.userId], Array.from(seen))[0];
    if (!uid || r.titles.length === 0) continue;
    seen.add(uid);
    const lead = r.titles.length === 1
      ? `It completed before the stewards answered your offer of ${quotedTitles(r.titles)}, so your offer is closed with our thanks.`
      : `It completed before the stewards answered your offers of ${quotedTitles(r.titles)}, so they're closed with our thanks.`;
    out.push({
      userId: uid,
      type: "campaign_closed",
      title: `${campaignTitleOf(campaign)} is complete`,
      body: excerpt(other ? `${lead} ${other}` : lead, 500),
      link: projectLink(campaign, "your-contributions"),
      actorId: null,
      campaignId: campaign.id,
      dedupeKey: `cp:close:${campaign.id}:u${uid}`,
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

/**
 * Whether a reopened role also invites back people whose offer a steward
 * declined. On since Rye's ruling of 2026-09-27: people a steward declined
 * hear too, and the steward's dialog says so before they act
 * (REOPEN_NOTICE_* in shared/stewardQueue.ts, read by
 * stewardActionDescription and NeedsGlance). They get the "you're welcome to
 * offer again" copy in buildRoleReopened; someone with a waiting offer as
 * well hears the waiting copy only.
 */
export const ROLE_REOPENED_REACHES_DECLINED = true;

/**
 * A filled role opened up again. The route computes openHours inside the
 * transaction that moved the counters (reopenedOpenHours in
 * shared/roleCapacity.ts) and calls this only when it is above 0.
 */
export async function notifyRoleReopened(
  args: {
    campaign: NotifyCampaign;
    item: NotifyItem;
    openHours: number;
    excludeUserIds?: Array<number | null | undefined>;
    actorId?: number | null;
    at?: Date;
  },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("role reopened", async () => {
    const { getDb } = await import("../db");
    const database = await getDb();
    if (!database) return 0;
    const rows = await database
      .select({ userId: campaignContributions.userId, status: campaignContributions.status })
      .from(campaignContributions)
      .where(and(
        eq(campaignContributions.campaignItemId, args.item.id),
        isNotNull(campaignContributions.userId),
        inArray(campaignContributions.status, [
          "pending",
          ...(ROLE_REOPENED_REACHES_DECLINED ? (["rejected"] as const) : []),
          "accepted",
          "fulfilled",
          "thanked",
        ]),
      ));
    const idsWith = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).map((r) => r.userId);
    // Someone who already holds hours on this role is in; they hear nothing.
    const holders = idsWith(["accepted", "fulfilled", "thanked"]);
    return deliver(buildRoleReopened({
      campaign: args.campaign,
      item: args.item,
      openHours: args.openHours,
      waitingIds: recipientsOf(idsWith(["pending"])),
      notSelectedIds: ROLE_REOPENED_REACHES_DECLINED ? recipientsOf(idsWith(["rejected"])) : [],
      excludeIds: [...(args.excludeUserIds ?? []), ...holders],
      reopenedAt: args.at ?? new Date(),
      actorId: args.actorId,
    }), deps);
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

/** Every steward of a campaign, for the daily job's notices. Never throws. */
export async function stewardIdsOf(campaign: NotifyCampaign): Promise<number[]> {
  return safeStewards(campaign);
}

/**
 * Crowdpooling opened at a project: its followers hear (campaign follows and
 * project follows, server/db.ts getCampaignFollowerUserIds), never its
 * stewards or the actor. The route passes the reading's open line and close
 * date, and calls this only for a real campaign.
 */
export async function notifyCampaignOpened(
  args: { campaign: NotifyCampaign; openLine?: string | null; closes?: string | null; actorId?: number | null },
  deps: NotifyDeps = {},
): Promise<number> {
  return run("campaign opened", async () => {
    if (args.campaign.status && UNPUBLISHED_STATUSES.includes(args.campaign.status)) return 0;
    const { getCampaignFollowerUserIds } = await import("../db");
    const [followerIds, stewardIds] = await Promise.all([
      getCampaignFollowerUserIds(args.campaign.id),
      safeStewards(args.campaign),
    ]);
    return deliver(buildCampaignOpened({ ...args, followerIds, stewardIds }), deps);
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
  // banned-terms-allow: a log label naming the claim_expired event, never shown to anyone
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
