/**
 * What happens when a land project application is approved.
 *
 * Every admin path that changes an application's status (the status dropdown,
 * bulk approve, the kanban board, a scored review) goes through
 * setApplicationStatus, so an approval does the same things whichever button
 * made it:
 *
 *   1. The status moves with a compare-and-set, so two admins (or a bulk
 *      approve racing a kanban drag) cannot both run the handoff.
 *   2. Tier detection runs (Land Project Co-Creator).
 *   3. The project gets its pinned thread in the Land Projects forum, once.
 *   4. The applicant gets the vote invite: vote for the Season's weekly call
 *      time on /season-schedule, and how to join the sessions.
 *
 * The handoff is idempotent per application, not per status change. The
 * kanban board offers Undo, and an approved, un-approved, re-approved project
 * must not get a second thread or a second invite. The thread is found by its
 * title; the invite is found in email_logs (template + application id), which
 * also lets Admin show whether each invite went out and send it again.
 *
 * sendEmail never throws on a hold, a rate limit or a provider error; it
 * returns a status. The handoff carries that status back to the admin and
 * writes it to the application's timeline, so an invite that did not go out
 * is visible and can be sent again from the application's panel.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { applicationEvents, applications, emailLogs, forumPosts, users } from "../../drizzle/schema";
import * as db from "../db";
import { getDb } from "../db";
import { sendEmail, toAbsoluteUrl, type EmailSendStatus } from "../_core/email";
import { notifyOwner } from "../_core/notification";
import { getOrCreateTeamUserId, LAND_PROJECTS_CATEGORY_SLUG } from "./team-user";
import { clearBadgeCache } from "./memberBadges";
import { moveFooterHtml, seasonEpisodeRows, sessionWhen, stillRunning } from "./seasonSchedule";
import { ACTIVE_SEASON, seasonConfig } from "@shared/seasonSchedule";
import { ACCEPTANCE_LINE } from "@shared/applicationWindow";
import { textForEmail, textForSubject } from "@shared/htmlText";

export type ApplicationStatus = (typeof applications.$inferSelect)["status"];

/** Statuses that mean the project is in. Moving into this set is an approval. */
export const APPROVED_STATUSES: readonly ApplicationStatus[] = ["approved", "active"];

/** email_logs.template for the vote invite. Admin reads invite state by it. */
export const VOTE_INVITE_TEMPLATE = "land_project_vote_invite";

/** email_logs statuses that mean the invite reached Resend. */
const INVITE_DELIVERED = ["sent", "delivered"] as const;

export function isApprovedStatus(status: string | null | undefined): boolean {
  return status != null && (APPROVED_STATUSES as readonly string[]).includes(status);
}

/** True when a status change lets a project in: from outside the approved set into it. */
export function isApprovalTransition(previous: string | null | undefined, next: string): boolean {
  return isApprovedStatus(next) && !isApprovedStatus(previous);
}

export type VoteInviteOutcome =
  | EmailSendStatus
  | "already_sent"
  | "no_email"
  | "not_approved"
  | "not_requested";

export type ThreadOutcome = "created" | "exists" | "failed";

export type HandoffResult = { thread: ThreadOutcome; invite: VoteInviteOutcome };

export type StatusChangeResult = {
  previous: ApplicationStatus | null;
  /** False when the status was already this, or another admin changed it first. */
  changed: boolean;
  /** Set only when this change was an approval. */
  handoff: HandoffResult | null;
};

/** Plain words for each outcome, shared by the timeline and the admin toasts. */
export function voteInviteOutcomeLabel(outcome: VoteInviteOutcome): string {
  switch (outcome) {
    case "sent": return "Vote invite sent";
    case "already_sent": return "Vote invite already sent earlier";
    case "no_email": return "Vote invite not sent: the applicant has no email address";
    case "not_approved": return "Vote invite not sent: the application is not approved";
    case "not_requested": return "Approved without the vote invite email";
    case "held": return "Vote invite held: outbound email is paused (EMAIL_HOLD)";
    case "rate_limited": return "Vote invite not sent: the hourly email limit was reached. Send it again later.";
    case "provider_error": return "Vote invite not sent: the email provider returned an error. Send it again.";
  }
}

async function database() {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return d;
}

async function timeline(applicationId: number, eventType: "status_change" | "email_sent" | "admin_action", description: string, adminUserId: number | null) {
  try {
    const d = await database();
    await d.insert(applicationEvents).values({ applicationId, eventType, description, adminUserId });
  } catch (err) {
    console.warn("[approvalHandoff] timeline write failed:", err);
  }
}

/**
 * The status messages the site owner still forwards by hand. Approval is not
 * here: the applicant gets the vote invite directly.
 */
const OWNER_FORWARD: Partial<Record<ApplicationStatus, (project: string) => { subject: string; content: string }>> = {
  under_review: (project) => ({
    subject: `Your Application is Under Review - ${project}`,
    content: `Great news! Your application for **${project}** is now being reviewed by our team.\n\nWe'll be in touch soon with our feedback. In the meantime, feel free to explore our resources and connect with other regenerative projects in our network.\n\n**What happens next:**\n- Our review team will evaluate your application\n- We may reach out with questions\n- You'll receive a decision notification\n\nThank you for your patience!`,
  }),
  rejected: (project) => ({
    subject: `Application Update - ${project}`,
    content: `Thank you for your application for **${project}**.\n\nAfter careful review, we've determined that your project isn't the right fit for our current season. This doesn't reflect on the value of your work - it simply means our current focus areas don't align.\n\n**What you can do:**\n- Review our feedback (if provided)\n- Consider reapplying in a future season\n- Stay connected through our newsletter\n\nWe appreciate your interest in regenerative development and wish you success in your work.`,
  }),
  changes_requested: (project) => ({
    subject: `Changes Requested - ${project}`,
    content: `We've reviewed your application for **${project}** and would like to request some additional information or changes.\n\nPlease review the feedback from our team and update your application accordingly. Once you've made the requested changes, we'll continue with the review process.\n\n**How to proceed:**\n- Review the feedback provided\n- Update your application with the requested information\n- Resubmit for continued review\n\nWe're looking forward to learning more about your project!`,
  }),
};

/**
 * Change an application's status and, when that change is an approval, run the
 * handoff. The single entry point for every admin status change.
 */
export async function setApplicationStatus(opts: {
  id: number;
  status: ApplicationStatus;
  adminUserId: number;
  /** Email the vote invite on approval. Defaults to true. */
  notify?: boolean;
}): Promise<StatusChangeResult> {
  const d = await database();
  const [row] = await d
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.id, opts.id))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
  const previous = row.status;
  if (previous === opts.status) return { previous, changed: false, handoff: null };

  // Compare-and-set: only the writer that saw the old status moves it, so a
  // concurrent approval cannot run the handoff twice.
  const result = await d
    .update(applications)
    .set({ status: opts.status })
    .where(and(eq(applications.id, opts.id), eq(applications.status, previous)));
  const affected = (Array.isArray(result) ? (result[0] as { affectedRows?: number }) : (result as { affectedRows?: number }))?.affectedRows ?? 0;
  if (affected === 0) return { previous, changed: false, handoff: null };

  await timeline(opts.id, "status_change", `Status changed to: ${opts.status}`, opts.adminUserId);
  // The vote badges read approvals; a change shows on the next tally.
  clearBadgeCache();
  await db.logAdminAction({
    adminUserId: opts.adminUserId,
    action: "application.status_change",
    entityType: "application",
    entityId: opts.id,
    description: `Changed application status to: ${opts.status}`,
    metadata: { newStatus: opts.status, previousStatus: previous },
  });

  const app = await db.getApplicationById(opts.id);

  if (isApprovedStatus(opts.status) && app?.userId) {
    try {
      const { detectTierProgression } = await import("./tierDetector");
      await detectTierProgression(app.userId);
    } catch (err) {
      console.warn("[approvalHandoff] tier detection failed (non-fatal):", err);
    }
  }

  if (app) {
    try {
      await notifyOwner({
        title: `Application Status Updated: ${app.projectName}`,
        content: `Application status changed to: **${opts.status}**\n\n**Project:** ${app.projectName}\n**Location:** ${app.location}\n**Contact:** ${app.contactEmail}`,
      });
      const forward = OWNER_FORWARD[opts.status];
      if (app.contactEmail && forward) {
        const msg = forward(app.projectName);
        await notifyOwner({ title: msg.subject, content: `**To:** ${app.contactEmail}\n\n${msg.content}` });
      }
    } catch (err) {
      console.warn("[approvalHandoff] owner notification failed:", err);
    }
  }

  let handoff: HandoffResult | null = null;
  if (app && isApprovalTransition(previous, opts.status)) {
    const thread = await ensureLandProjectThread(app);
    const invite = opts.notify === false
      ? "not_requested" as const
      : await sendVoteInvite(app, { adminUserId: opts.adminUserId });
    if (invite === "not_requested") {
      await timeline(opts.id, "admin_action", voteInviteOutcomeLabel(invite), opts.adminUserId);
    }
    handoff = { thread, invite };
  }

  return { previous, changed: true, handoff };
}

type HandoffApplication = NonNullable<Awaited<ReturnType<typeof db.getApplicationById>>>;

function landProjectThreadTitle(app: Pick<HandoffApplication, "projectName" | "location">): string {
  return `${app.projectName} - ${app.location}`.slice(0, 300);
}

function landProjectThreadContent(app: HandoffApplication): string {
  const typeLabel = app.projectType === "early_stage" ? "early-stage" : "mature";
  const landStatusLabel: Record<string, string> = { owned: "owned", leased: "leased", committed: "committed to purchase", seeking: "seeking land" };

  const metrics: string[] = [];
  if (app.projectSizeHectares) metrics.push(`${app.projectSizeHectares} hectares`);
  if (app.currentPeopleCount) metrics.push(`${app.currentPeopleCount} people currently`);
  if (app.intendedPeopleCount) metrics.push(`${app.intendedPeopleCount} intended`);

  let mixedUseStr = "";
  try {
    const mu = JSON.parse(app.mixedUse ?? "[]");
    if (Array.isArray(mu) && mu.length) mixedUseStr = mu.join(", ");
  } catch { /* ignore */ }

  return [
    `**${app.projectName}** is a ${typeLabel} regenerative land project based in ${app.location}${app.country ? `, ${app.country}` : ""}.`,
    "",
    `**Vision**`,
    app.vision,
    "",
    `**Land status:** ${landStatusLabel[app.landStatus] ?? app.landStatus}`,
    metrics.length ? `**Scale:** ${metrics.join(" | ")}` : "",
    mixedUseStr ? `**Uses:** ${mixedUseStr}` : "",
    app.meetingFrequency ? `**Community gathering:** ${app.meetingFrequency.replace(/_/g, " ")}` : "",
    "",
    `**Regenerative practices**`,
    app.regenerativePractices,
    "",
    `**Governance approach**`,
    app.governanceApproach,
    "",
    `**Community engagement**`,
    app.communityEngagement,
    "",
    `**Team:** ${app.teamDescription} (${app.teamSize} people)`,
    "",
    `**Current funding:** ${app.currentFunding || "Not disclosed"}`,
    `**Funding needs:** ${app.fundingNeeds}`,
    "",
    app.timeCommitment ? `**Time commitment:** ${app.timeCommitment}` : "",
    app.websiteUrl ? `**Website:** ${app.websiteUrl}` : "",
    "",
    `---`,
    `Follow this thread for updates from the team. Ask questions, offer support, or share resources below.`,
    "",
    `[Apply to support this project](/apply) | [View on map](/map)`,
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** The project's pinned Land Projects thread, made once. */
async function ensureLandProjectThread(app: HandoffApplication): Promise<ThreadOutcome> {
  try {
    const cats = await db.listForumCategories();
    let category = cats.find((c) => c.slug === LAND_PROJECTS_CATEGORY_SLUG);
    if (!category) {
      const catId = await db.createForumCategory({
        name: "Land Projects",
        slug: LAND_PROJECTS_CATEGORY_SLUG,
        description: "Land projects approved by ReGen Civics. Follow updates, ask questions, and connect with the teams.",
        sortOrder: 99,
      });
      category = { id: catId, slug: LAND_PROJECTS_CATEGORY_SLUG, name: "Land Projects" } as (typeof cats)[number];
    }

    const title = landProjectThreadTitle(app);
    const d = await database();
    const [existing] = await d
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(and(eq(forumPosts.categoryId, category.id), eq(forumPosts.title, title)))
      .limit(1);
    if (existing) return "exists";

    const teamAuthorId = await getOrCreateTeamUserId();
    if (!teamAuthorId) {
      console.warn("[approvalHandoff] no Team user; skipping the land project thread");
      return "failed";
    }
    await db.createForumPost({
      categoryId: category.id,
      authorId: teamAuthorId,
      title,
      content: landProjectThreadContent(app),
      isPinned: 1,
      postType: "discussion",
    });
    return "created";
  } catch (err) {
    console.warn("[approvalHandoff] land project thread failed:", err);
    return "failed";
  }
}

// ─── The vote invite ─────────────────────────────────────────────────────────

export type VoteInviteState = {
  /** When the last invite reached Resend, if one did. */
  sentAt: Date | null;
  /** The last attempt's email_logs status, sent or not. */
  lastStatus: string | null;
  lastAttemptAt: Date | null;
};

/** What Admin shows for one application's invite. */
export async function voteInviteState(applicationId: number): Promise<VoteInviteState> {
  return inviteLogState(VOTE_INVITE_TEMPLATE, "application", applicationId);
}

/**
 * One invite's state from email_logs, by template and the record it was sent
 * for. Shared by the land project and alliance partner invites.
 */
export async function inviteLogState(template: string, inquiryType: string, inquiryId: number): Promise<VoteInviteState> {
  const d = await database();
  const rows = await d
    .select({ status: emailLogs.status, sentAt: emailLogs.sentAt })
    .from(emailLogs)
    .where(and(
      eq(emailLogs.template, template),
      eq(emailLogs.inquiryType, inquiryType),
      eq(emailLogs.inquiryId, inquiryId),
    ))
    .orderBy(desc(emailLogs.sentAt), desc(emailLogs.id))
    .limit(20);
  const delivered = rows.find((r) => (INVITE_DELIVERED as readonly string[]).includes(r.status));
  return {
    sentAt: delivered?.sentAt ?? null,
    lastStatus: rows[0]?.status ?? null,
    lastAttemptAt: rows[0]?.sentAt ?? null,
  };
}

/** Application ids among these that already got an invite through. */
export async function applicationsWithInvite(ids: number[]): Promise<Set<number>> {
  return idsWithInvite(VOTE_INVITE_TEMPLATE, "application", ids);
}

/** Record ids among these whose invite (this template) reached Resend. */
export async function idsWithInvite(template: string, inquiryType: string, ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const d = await database();
  const rows = await d
    .select({ id: emailLogs.inquiryId })
    .from(emailLogs)
    .where(and(
      eq(emailLogs.template, template),
      eq(emailLogs.inquiryType, inquiryType),
      inArray(emailLogs.inquiryId, ids),
      inArray(emailLogs.status, [...INVITE_DELIVERED]),
    ));
  return new Set(rows.map((r) => r.id).filter((id): id is number => id != null));
}

export type VoteInviteSession = { title: string; start: Date };

export type VoteInviteCopyInput = {
  recipientName: string | null;
  projectName: string;
  seasonName: string;
  /** False once the Season's last session has passed. */
  running: boolean;
  next: VoteInviteSession | null;
  footerHtml: string;
};

const p = `style="color:#333;line-height:1.6;"`;
const h3 = `style="color:#4a7c59;margin:24px 0 8px 0;"`;

function button(url: string, label: string): string {
  return `<div style="text-align:center;margin:18px 0;"><a href="${textForEmail(url)}" style="display:inline-block;background:#1a472a;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">${textForEmail(label)}</a></div>`;
}

/** Subject and body of the vote invite. Pure, so the copy is testable. */
export function voteInviteEmail(input: VoteInviteCopyInput): { subject: string; html: string } {
  const project = textForEmail(input.projectName);
  const season = textForEmail(input.seasonName);
  const hello = input.recipientName ? `<p ${p}>Hi ${textForEmail(input.recipientName)},</p>` : "";
  const voteUrl = toAbsoluteUrl("/season-schedule", { campaign: "vote-invite" });
  const scheduleUrl = toAbsoluteUrl("/schedule", { campaign: "vote-invite" });
  const statusUrl = toAbsoluteUrl("/apply/status", { campaign: "vote-invite" });
  const next = input.next
    ? `<p ${p}>The next session is ${textForEmail(input.next.title)}, ${textForEmail(sessionWhen(input.next.start))}.</p>`
    : "";

  const steps = input.running
    ? `
      <h3 ${h3}>1. Vote for your weekly call time</h3>
      <p ${p}>The land projects in ${season} choose the weekly call time together. Mark every time your team can make, and the time that works for the most projects becomes the Season's call. You can change your picks any week, and the call moves with the group.</p>
      ${button(voteUrl, "Vote for a call time")}
      <h3 ${h3}>2. Join the calls</h3>
      <p ${p}>You are on the list for every session. A reminder with the link to join arrives before each one, so you only need to watch your inbox.</p>
      ${next}
      <p ${p}><a href="${textForEmail(scheduleUrl)}" style="color:#1a472a;font-weight:bold;">See every session and add them to your calendar</a></p>
      <h3 ${h3}>3. Your next steps</h3>
      <p ${p}>Your status page keeps every next step in one place: your project page, the readiness checklist and your campaign.</p>
      ${button(statusUrl, "Open your status page")}`
    : `
      <p ${p}>${season} has held its last session. When the next Season opens its call time vote, it will be on the Season Schedule, and your status page keeps every next step in one place.</p>
      ${button(statusUrl, "Open your status page")}
      <p ${p}><a href="${textForEmail(voteUrl)}" style="color:#1a472a;font-weight:bold;">The Season Schedule</a></p>`;

  return {
    subject: `${textForSubject(input.projectName)} is accepted: vote for your call time`,
    html: `
      <h2 style="color:#1a472a;margin-top:0;">Welcome to ${season}</h2>
      ${hello}
      <p ${p}><strong>${project}</strong> is accepted into the ReGen Civics incubator. ${textForEmail(ACCEPTANCE_LINE)}</p>
      ${steps}
      <div style="margin-top:25px;padding-top:20px;border-top:1px solid #e0e0e0;">
        <p style="color:#4a7c59;font-weight:bold;margin-bottom:5px;">The ReGen Civics Team</p>
      </div>
      ${input.footerHtml}
    `,
  };
}

/**
 * Email one approved applicant the vote invite. Skips an application that
 * already got one unless force is set (Admin's "Send again").
 */
export async function sendVoteInvite(
  app: HandoffApplication,
  opts: { adminUserId: number | null; force?: boolean; now?: Date },
): Promise<VoteInviteOutcome> {
  const outcome = await attemptVoteInvite(app, opts);
  await timeline(
    app.id,
    outcome === "sent" ? "email_sent" : "admin_action",
    voteInviteOutcomeLabel(outcome),
    opts.adminUserId,
  );
  return outcome;
}

async function attemptVoteInvite(
  app: HandoffApplication,
  opts: { force?: boolean; now?: Date },
): Promise<VoteInviteOutcome> {
  if (!isApprovedStatus(app.status)) return "not_approved";
  if (!app.contactEmail) return "no_email";
  if (!opts.force && (await applicationsWithInvite([app.id])).has(app.id)) return "already_sent";

  const now = opts.now ?? new Date();
  const config = seasonConfig(ACTIVE_SEASON);
  let running = false;
  let next: VoteInviteSession | null = null;
  if (config) {
    running = stillRunning(config, now);
    try {
      const rows = await seasonEpisodeRows(await database(), config.season);
      const upcoming = rows.find((r) => r.status === "upcoming" && new Date(r.startTime).getTime() > now.getTime());
      if (upcoming) next = { title: upcoming.title, start: new Date(upcoming.startTime) };
    } catch (err) {
      console.warn("[approvalHandoff] next session lookup failed:", err);
    }
  }

  const { subject, html } = voteInviteEmail({
    recipientName: app.contactName ?? null,
    projectName: app.projectName,
    seasonName: config?.name ?? "the Season",
    running: running && config != null,
    next,
    footerHtml: await moveFooterHtml(app.contactEmail, "season2"),
  });

  const result = await sendEmail({
    to: [app.contactEmail],
    subject,
    html,
    template: VOTE_INVITE_TEMPLATE,
    inquiryType: "application",
    inquiryId: app.id,
    recipientName: app.contactName ?? undefined,
  });
  return result.status;
}

/** Send the invite for one application by id (Admin's per-application button). */
export async function sendVoteInviteById(id: number, opts: { adminUserId: number; force?: boolean }): Promise<VoteInviteOutcome> {
  const app = await db.getApplicationById(id);
  if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
  return sendVoteInvite(app, opts);
}

/** Approved projects that never got an invite through: the backlog Admin can send. */
export async function voteInviteBacklog(): Promise<Array<{ id: number; projectName: string; contactEmail: string | null }>> {
  const d = await database();
  // Seeded rows are the Season 1 batch the team entered by hand; nobody there
  // applied, so nobody there is waiting for an invite.
  const rows = await d
    .select({ id: applications.id, projectName: applications.projectName, contactEmail: users.email })
    .from(applications)
    .leftJoin(users, eq(users.id, applications.userId))
    .where(and(inArray(applications.status, [...APPROVED_STATUSES]), eq(applications.adminSeeded, 0)));
  const invited = await applicationsWithInvite(rows.map((r) => r.id));
  return rows.filter((r) => !invited.has(r.id));
}

/**
 * Send the backlog one at a time, stopping at the first rate limit or hold so
 * the rest wait for the next hour instead of each logging a failure. Projects
 * with no email address are counted, never attempted.
 */
export async function sendVoteInviteBacklog(adminUserId: number): Promise<{
  sent: number;
  failed: number;
  noEmail: number;
  stoppedBy: VoteInviteOutcome | null;
}> {
  const backlog = await voteInviteBacklog();
  let sent = 0;
  let failed = 0;
  const noEmail = backlog.filter((b) => !b.contactEmail).length;
  for (const item of backlog) {
    if (!item.contactEmail) continue;
    const outcome = await sendVoteInviteById(item.id, { adminUserId });
    if (outcome === "sent") sent += 1;
    else if (outcome === "rate_limited" || outcome === "held") return { sent, failed, noEmail, stoppedBy: outcome };
    else if (outcome !== "already_sent") failed += 1;
  }
  return { sent, failed, noEmail, stoppedBy: null };
}
