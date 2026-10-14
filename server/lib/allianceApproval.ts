/**
 * What happens when an alliance partner application is approved (ADR-72).
 *
 * The alliance counterpart of approvalHandoff.ts, built the same way: every
 * admin status change goes through setAllianceApplicationStatus, a
 * compare-and-set on the old status decides who runs the handoff, and the
 * handoff runs once per application however many times the status moves.
 *
 * An approval:
 *   1. Registers the organization in `organisations` (once).
 *   2. Signs the contact up for every upcoming Interoperability Circle week,
 *      the same rows /interop-sessions' join writes, so reminders, the
 *      carry-forward onto new weeks and "Leave the Circle" all apply.
 *   3. Puts their tool in the Circle's register when they gave a repo.
 *   4. Emails the Circle vote invite: vote for the Circle's weekly time, how
 *      to join, the calendar, and their status page. It replaces the Circle's
 *      own welcome email for this person, so they get one letter, not two.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  allianceApplicationEvents,
  allianceApplications,
  interopTools,
  organisations,
  type AllianceApplication,
} from "../../drizzle/schema";
import * as db from "../db";
import { getDb } from "../db";
import { sendEmail, toAbsoluteUrl } from "../_core/email";
import { notifyOwner } from "../_core/notification";
import { clearBadgeCache } from "./memberBadges";
import { textForEmail, textForSubject } from "@shared/htmlText";
import { cleanRepoUrl } from "@shared/interopTools";
import { interopSlot, INTEROP_CIRCLE_TITLE } from "@shared/interopCircle";
import { ALLIANCE_STATUS_PATH, cleanRoles, type AllianceStatus } from "@shared/allianceApplication";
import {
  idsWithInvite,
  inviteLogState,
  isApprovalTransition,
  isApprovedStatus,
  voteInviteOutcomeLabel,
  type VoteInviteOutcome,
  type VoteInviteState,
} from "./approvalHandoff";
import { applicationTools, approveApplicationTools } from "./toolLibrary";
import {
  addCircleSignups,
  circleWhen,
  resolveCircleState,
  syncInteropCircle,
  unsubscribeLink,
  upcomingCircleRows,
} from "./interopCircle";

/** email_logs.template and inquiryType for the Circle vote invite. */
export const CIRCLE_INVITE_TEMPLATE = "alliance_partner_vote_invite";
export const ALLIANCE_INQUIRY_TYPE = "alliance_application";

export type AllianceHandoffResult = {
  organisation: "created" | "exists" | "failed";
  circle: "joined" | "no_sessions" | "failed";
  /** How many of the application's library tools this approval approved. */
  tools: number;
  invite: VoteInviteOutcome;
};

export type AllianceStatusChangeResult = {
  previous: AllianceStatus | null;
  changed: boolean;
  handoff: AllianceHandoffResult | null;
};

async function database() {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return d;
}

export async function allianceTimeline(
  allianceApplicationId: number,
  eventType: "status_change" | "email_sent" | "note_added" | "admin_action",
  description: string,
  adminUserId: number | null,
) {
  try {
    const d = await database();
    await d.insert(allianceApplicationEvents).values({ allianceApplicationId, eventType, description, adminUserId });
  } catch (err) {
    console.warn("[allianceApproval] timeline write failed:", err);
  }
}

export async function getAllianceApplication(id: number): Promise<AllianceApplication | null> {
  const d = await database();
  const [row] = await d.select().from(allianceApplications).where(eq(allianceApplications.id, id)).limit(1);
  return row ?? null;
}

/** The single entry point for every admin status change on an alliance application. */
export async function setAllianceApplicationStatus(opts: {
  id: number;
  status: AllianceStatus;
  adminUserId: number;
  /** Email the Circle vote invite on approval. Defaults to true. */
  notify?: boolean;
  /**
   * The application's pending library tools to approve with it. Omitted:
   * all of them. The approve dialog sends the ones left ticked (ADR-73).
   */
  toolIds?: number[];
}): Promise<AllianceStatusChangeResult> {
  const d = await database();
  const [row] = await d
    .select({ status: allianceApplications.status })
    .from(allianceApplications)
    .where(eq(allianceApplications.id, opts.id))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
  const previous = row.status;
  if (previous === opts.status) return { previous, changed: false, handoff: null };

  const result = await d
    .update(allianceApplications)
    .set({ status: opts.status })
    .where(and(eq(allianceApplications.id, opts.id), eq(allianceApplications.status, previous)));
  const affected = (Array.isArray(result) ? (result[0] as { affectedRows?: number }) : (result as { affectedRows?: number }))?.affectedRows ?? 0;
  if (affected === 0) return { previous, changed: false, handoff: null };

  await allianceTimeline(opts.id, "status_change", `Status changed to: ${opts.status}`, opts.adminUserId);
  // The vote badges read approvals; a change shows on the next tally.
  clearBadgeCache();
  await db.logAdminAction({
    adminUserId: opts.adminUserId,
    action: "alliance_application.status_change",
    entityType: "alliance_application",
    entityId: opts.id,
    description: `Changed alliance application status to: ${opts.status}`,
    metadata: { newStatus: opts.status, previousStatus: previous },
  });

  const app = await getAllianceApplication(opts.id);
  if (app) {
    try {
      await notifyOwner({
        title: `Alliance application: ${app.organizationName || app.contactEmail} is now ${opts.status.replace(/_/g, " ")}`,
        content: `**Organization:** ${app.organizationName}\n**Contact:** ${app.contactName ?? ""} ${app.contactEmail}`,
      });
    } catch (err) {
      console.warn("[allianceApproval] owner notification failed:", err);
    }
  }

  let handoff: AllianceHandoffResult | null = null;
  if (app && isApprovalTransition(previous, opts.status)) {
    const organisation = await ensureOrganisation(app);
    let tools = 0;
    try {
      tools = (await approveApplicationTools(await database(), app.id, opts.adminUserId, opts.toolIds)).length;
    } catch (err) {
      console.warn("[allianceApproval] tool approval failed:", err);
    }
    const circle = await joinCircle(app);
    const invite = opts.notify === false
      ? "not_requested" as const
      : await sendCircleInvite(app, { adminUserId: opts.adminUserId });
    if (invite === "not_requested") {
      await allianceTimeline(opts.id, "admin_action", voteInviteOutcomeLabel(invite), opts.adminUserId);
    }
    handoff = { organisation, circle, tools, invite };
  }
  return { previous, changed: true, handoff };
}

/** The organization's row in the registry, made once and linked from the application. */
async function ensureOrganisation(app: AllianceApplication): Promise<AllianceHandoffResult["organisation"]> {
  try {
    const d = await database();
    const orgId = `alliance-app-${app.id}`;
    const [existing] = await d.select({ id: organisations.id }).from(organisations).where(eq(organisations.orgId, orgId)).limit(1);
    let id: number | null = existing?.id ?? null;
    let outcome: AllianceHandoffResult["organisation"] = "exists";
    if (!id) {
      // Raw SQL naming only the columns the live table has: schema.ts also
      // declares regenerativeScore, regenerativeTier and communityRatingsCount,
      // which no migration ever created (grandfathered drift in
      // scripts/check-schema-drift.ts), and drizzle's insert names every
      // declared column, so it fails on production.
      const name = (app.organizationName || app.contactEmail).slice(0, 255);
      const url = cleanRepoUrl(app.organizationUrl) ?? null;
      const res = await d.execute(sql`
        INSERT INTO organisations (orgId, name, url, description, status)
        VALUES (${orgId}, ${name}, ${url}, ${app.supportDescription ?? null}, 'active')
      `);
      id = (Array.isArray(res) ? (res[0] as { insertId?: number }) : (res as { insertId?: number }))?.insertId ?? null;
      outcome = "created";
    } else {
      await d.update(organisations).set({ status: "active" }).where(eq(organisations.id, id));
    }
    if (id && app.organisationId !== id) {
      await d.update(allianceApplications).set({ organisationId: id }).where(eq(allianceApplications.id, app.id));
    }
    return outcome;
  } catch (err) {
    console.warn("[allianceApproval] organisation registry failed:", err);
    return "failed";
  }
}

/** Sign the contact up for every upcoming Circle week, and register their tool. */
async function joinCircle(app: AllianceApplication): Promise<AllianceHandoffResult["circle"]> {
  try {
    const d = await database();
    const now = new Date();
    let rows = (await upcomingCircleRows(d, now)).filter((r) => r.status !== "cancelled");
    if (!rows.length) {
      await syncInteropCircle({ force: true });
      rows = (await upcomingCircleRows(d, now)).filter((r) => r.status !== "cancelled");
    }
    if (!rows.length) return "no_sessions";
    const email = app.contactEmail.trim().toLowerCase();
    await addCircleSignups(d, rows.map((r) => r.id), [{ email, name: app.contactName ?? null }]);

    // The Circle's register takes one link: the repo they gave, else their
    // first app or software tool in the library.
    const libraryTools = await applicationTools(d, app.id);
    const firstSoftware = libraryTools.find((t) => t.status === "approved" && (t.toolKind ?? "software") === "software");
    const repoUrl = cleanRepoUrl(app.toolRepoUrl) ?? cleanRepoUrl(firstSoftware?.websiteUrl);
    const name = (app.organizationName || app.contactName || "").slice(0, 80) || null;
    const [byEmail] = await d.select({ id: interopTools.id }).from(interopTools).where(eq(interopTools.email, email)).limit(1);
    if (byEmail) {
      await d.update(interopTools).set({ ...(repoUrl ? { repoUrl } : {}), ...(name ? { name } : {}) }).where(eq(interopTools.id, byEmail.id));
    } else if (repoUrl || name) {
      await d.insert(interopTools).values({ email, voterKey: null, name, repoUrl, agent: null });
    }
    return "joined";
  } catch (err) {
    console.warn("[allianceApproval] Circle sign-up failed:", err);
    return "failed";
  }
}

// ─── The Circle vote invite ──────────────────────────────────────────────────

export type CircleInviteCopyInput = {
  recipientName: string | null;
  organizationName: string;
  /** "Wednesdays, 4pm PT", or null when no week is on the calendar yet. */
  slotLabel: string | null;
  next: Date | null;
  /** Their tools now listed in the library. */
  tools?: Array<{ name: string; slug: string }>;
  footerHtml: string;
};

const p = `style="color:#333;line-height:1.6;"`;
const h3 = `style="color:#4a7c59;margin:24px 0 8px 0;"`;

function button(url: string, label: string): string {
  return `<div style="text-align:center;margin:18px 0;"><a href="${textForEmail(url)}" style="display:inline-block;background:#1a472a;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">${textForEmail(label)}</a></div>`;
}

/** The tools section of the invite: each listing, and the Circle's interoperability sheet. */
function toolsBlock(tools: Array<{ name: string; slug: string }>): string {
  if (!tools.length) return "";
  const items = tools
    .map((t) => `<li><a href="${textForEmail(toAbsoluteUrl(`/tools/${t.slug}`))}" style="color:#1a472a;font-weight:bold;">${textForEmail(t.name)}</a></li>`)
    .join("");
  return `
      <h3 ${h3}>3. Your tools are in the ReGen Tools Library</h3>
      <ul ${p}>${items}</ul>
      <p ${p}>You can edit each listing from its page while you are signed in. To show how your tool connects with the others, fill in its interoperability sheet on the <a href="${textForEmail(toAbsoluteUrl("/interop-sessions"))}" style="color:#1a472a;font-weight:bold;">Circle page</a>.</p>`;
}

/** Subject and body of the Circle vote invite. Pure, so the copy is testable. */
export function circleInviteEmail(input: CircleInviteCopyInput): { subject: string; html: string } {
  const org = textForEmail(input.organizationName);
  const hello = input.recipientName ? `<p ${p}>Hi ${textForEmail(input.recipientName)},</p>` : "";
  const voteUrl = toAbsoluteUrl("/interop-sessions", { campaign: "circle-invite" });
  const calendarUrl = toAbsoluteUrl("/calendar/interop-circle.ics");
  const statusUrl = toAbsoluteUrl(ALLIANCE_STATUS_PATH, { campaign: "circle-invite" });
  const when = input.slotLabel && input.next
    ? `<p ${p}>Right now the Circle meets ${textForEmail(input.slotLabel)}. Your first session is ${textForEmail(circleWhen(input.next))}.</p>`
    : `<p ${p}>The next Circle weeks are being set now, and the Circle page shows them as soon as they are.</p>`;

  return {
    subject: `${textForSubject(input.organizationName)} is an Alliance Partner: vote for the Circle's call time`,
    html: `
      <h2 style="color:#1a472a;margin-top:0;">Welcome to the ReGen Civics Alliance</h2>
      ${hello}
      <p ${p}><strong>${org}</strong> is now an Alliance Partner. Alliance Partners meet in the ${textForEmail(INTEROP_CIRCLE_TITLE)}, the weekly 90-minute working group for the people building the tools and services under the land projects.</p>
      <h3 ${h3}>1. Vote for the Circle's weekly call time</h3>
      <p ${p}>The Circle picks its weekly time together. Mark every time you can make, and the time that works for the most people becomes the call. You can change your picks any week, and the call moves with the group.</p>
      ${button(voteUrl, "Vote for a call time")}
      <h3 ${h3}>2. Join the calls</h3>
      <p ${p}>You are signed up for every upcoming week. A reminder with the link to join arrives the day before and an hour before each session, and a recap follows it.</p>
      ${when}
      <p ${p}><a href="${textForEmail(calendarUrl)}" style="color:#1a472a;font-weight:bold;">Subscribe to the Circle calendar</a> and it keeps itself up to date when the time moves.</p>
      <p ${p}>Bring a link to your work, a sentence or two on what it does and who it serves, and what you would like to build with the other partners.</p>
      ${toolsBlock(input.tools ?? [])}
      <h3 ${h3}>${input.tools?.length ? "4" : "3"}. Your partnership page</h3>
      <p ${p}>Your status page keeps every next step in one place.</p>
      ${button(statusUrl, "Open your status page")}
      <div style="margin-top:25px;padding-top:20px;border-top:1px solid #e0e0e0;">
        <p style="color:#4a7c59;font-weight:bold;margin-bottom:5px;">The ReGen Civics Team</p>
      </div>
      ${input.footerHtml}
    `,
  };
}

/** Email one approved alliance partner the Circle invite, once unless forced. */
export async function sendCircleInvite(
  app: AllianceApplication,
  opts: { adminUserId: number | null; force?: boolean },
): Promise<VoteInviteOutcome> {
  const outcome = await attemptCircleInvite(app, opts);
  await allianceTimeline(app.id, outcome === "sent" ? "email_sent" : "admin_action", voteInviteOutcomeLabel(outcome), opts.adminUserId);
  return outcome;
}

async function attemptCircleInvite(app: AllianceApplication, opts: { force?: boolean }): Promise<VoteInviteOutcome> {
  if (!isApprovedStatus(app.status)) return "not_approved";
  if (!app.contactEmail) return "no_email";
  if (!opts.force && (await idsWithInvite(CIRCLE_INVITE_TEMPLATE, ALLIANCE_INQUIRY_TYPE, [app.id])).has(app.id)) return "already_sent";

  let slotLabel: string | null = null;
  let next: Date | null = null;
  try {
    const d = await database();
    const now = new Date();
    const rows = (await upcomingCircleRows(d, now)).filter((r) => r.status !== "cancelled");
    if (rows[0]) {
      next = new Date(rows[0].startTime);
      slotLabel = interopSlot((await resolveCircleState(d, now)).slot).label;
    }
  } catch (err) {
    console.warn("[allianceApproval] Circle schedule lookup failed:", err);
  }

  let tools: Array<{ name: string; slug: string }> = [];
  try {
    tools = (await applicationTools(await database(), app.id))
      .filter((t) => t.status === "approved")
      .map((t) => ({ name: t.name, slug: t.slug }));
  } catch (err) {
    console.warn("[allianceApproval] tool lookup failed:", err);
  }

  const leave = await unsubscribeLink(app.contactEmail);
  const { subject, html } = circleInviteEmail({
    recipientName: app.contactName ?? null,
    organizationName: app.organizationName || "Your organization",
    slotLabel,
    next,
    tools,
    footerHtml: `<p style="color:#8a8a8a;font-size:11px;margin:16px 0 0 0;line-height:1.6;">You are signed up for the ${textForEmail(INTEROP_CIRCLE_TITLE)} as an Alliance Partner. <a href="${textForEmail(leave)}" style="color:#8a8a8a;">Leave the Circle</a></p>`,
  });
  const result = await sendEmail({
    to: [app.contactEmail],
    subject,
    html,
    template: CIRCLE_INVITE_TEMPLATE,
    inquiryType: ALLIANCE_INQUIRY_TYPE,
    inquiryId: app.id,
    recipientName: app.contactName ?? undefined,
  });
  return result.status;
}

export async function circleInviteState(id: number): Promise<VoteInviteState> {
  return inviteLogState(CIRCLE_INVITE_TEMPLATE, ALLIANCE_INQUIRY_TYPE, id);
}

export async function sendCircleInviteById(id: number, opts: { adminUserId: number; force?: boolean }): Promise<VoteInviteOutcome> {
  const app = await getAllianceApplication(id);
  if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
  return sendCircleInvite(app, opts);
}

/** Approved partners whose invite never went through. */
export async function circleInviteBacklog(): Promise<Array<{ id: number; organizationName: string; contactEmail: string }>> {
  const d = await database();
  const rows = await d
    .select({ id: allianceApplications.id, organizationName: allianceApplications.organizationName, contactEmail: allianceApplications.contactEmail })
    .from(allianceApplications)
    .where(inArray(allianceApplications.status, ["approved", "active"]));
  const invited = await idsWithInvite(CIRCLE_INVITE_TEMPLATE, ALLIANCE_INQUIRY_TYPE, rows.map((r) => r.id));
  return rows.filter((r) => !invited.has(r.id));
}

/** Plain-text fields for an application, the shape Admin and the owner note read. */
export function allianceSummary(app: AllianceApplication): string {
  return [
    app.organizationName,
    app.organizationUrl,
    cleanRoles(app.roles).join(", "),
    app.scope === "local" ? [app.location, app.country].filter(Boolean).join(", ") : "Global",
  ].filter(Boolean).join(" · ");
}
