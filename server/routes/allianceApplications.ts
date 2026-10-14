/**
 * Alliance partner applications (ADR-72).
 *
 * The applicant side mirrors /apply: one application per person, a draft that
 * saves as they go, submit when the required fields are there, edits allowed
 * until the partnership is decided. The admin side mirrors the Applications
 * tab: a list, one application's detail and timeline, status changes through
 * setAllianceApplicationStatus (server/lib/allianceApproval.ts), the Circle
 * invite panel and backlog, and converting an alliance inquiry from /connect
 * into an application.
 */
import { z } from "zod";
import { and, desc, eq, isNull, notInArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, rateLimited, router } from "../_core/trpc";
import * as db from "../db";
import { getDb } from "../db";
import { allianceApplicationEvents, allianceApplications, generalInquiries } from "../../drizzle/schema";
import { sendEmail, toAbsoluteUrl } from "../_core/email";
import { notifyOwner } from "../_core/notification";
import { textForEmail, textForSubject } from "@shared/htmlText";
import { cleanRepoUrl } from "@shared/interopTools";
import {
  ALLIANCE_LOCKED,
  ALLIANCE_SENDABLE,
  ALLIANCE_STATUSES,
  ALLIANCE_STATUS_PATH,
  cleanRoles,
  missingForSubmit,
} from "@shared/allianceApplication";
import {
  allianceTimeline,
  circleInviteBacklog,
  circleInviteState,
  getAllianceApplication,
  sendCircleInviteById,
  setAllianceApplicationStatus,
} from "../lib/allianceApproval";
import { voteInviteOutcomeLabel } from "../lib/approvalHandoff";

async function database() {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return d;
}

const text = (max: number) => z.string().max(max).optional().nullable();

/** Every field the applicant can write. All optional: a draft saves as it grows. */
const fieldsInput = z.object({
  contactName: text(255),
  organizationName: text(255),
  organizationUrl: text(512),
  roles: z.array(z.string().max(40)).max(30).optional(),
  otherSupport: text(255),
  scope: z.enum(["local", "global"]).optional(),
  location: text(255),
  country: text(100),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  supportDescription: text(5000),
  partnershipDescription: text(5000),
  toolRepoUrl: text(500),
});
type FieldsInput = z.infer<typeof fieldsInput>;

const LINK_ERROR = "That does not look like a link. Use a web address, like yourorganization.org.";

/** Trim, empty to null, links cleaned to http or https. Only fields present are written. */
function cleanFields(input: FieldsInput) {
  const out: Partial<typeof allianceApplications.$inferInsert> = {};
  const str = (v: string | null | undefined) => (v == null ? null : v.trim() || null);
  if (input.contactName !== undefined) out.contactName = str(input.contactName);
  if (input.organizationName !== undefined) out.organizationName = str(input.organizationName) ?? "";
  if (input.organizationUrl !== undefined) {
    const raw = str(input.organizationUrl);
    const url = cleanRepoUrl(raw);
    if (raw && !url) throw new TRPCError({ code: "BAD_REQUEST", message: LINK_ERROR });
    out.organizationUrl = url;
  }
  if (input.toolRepoUrl !== undefined) {
    const raw = str(input.toolRepoUrl);
    const url = cleanRepoUrl(raw);
    if (raw && !url) throw new TRPCError({ code: "BAD_REQUEST", message: LINK_ERROR });
    out.toolRepoUrl = url;
  }
  if (input.roles !== undefined) out.roles = JSON.stringify(cleanRoles(input.roles));
  if (input.otherSupport !== undefined) out.otherSupport = str(input.otherSupport);
  if (input.scope !== undefined) out.scope = input.scope;
  if (input.location !== undefined) out.location = str(input.location);
  if (input.country !== undefined) out.country = str(input.country);
  if (input.latitude !== undefined) out.latitude = input.latitude;
  if (input.longitude !== undefined) out.longitude = input.longitude;
  if (input.supportDescription !== undefined) out.supportDescription = str(input.supportDescription);
  if (input.partnershipDescription !== undefined) out.partnershipDescription = str(input.partnershipDescription);
  return out;
}

const LOCKED_MESSAGE = "This partnership is already decided, so the application can't change. Write to us from /connect if something is out of date.";

/**
 * The signed-in person's applications. An application an admin converted from
 * their inquiry waits under their email with no user; the first signed-in
 * visit with that email claims it.
 */
async function claimAndList(user: { id: number; email?: string | null }) {
  const d = await database();
  const email = user.email?.trim().toLowerCase();
  if (email) {
    await d
      .update(allianceApplications)
      .set({ userId: user.id })
      .where(and(isNull(allianceApplications.userId), sql`LOWER(${allianceApplications.contactEmail}) = ${email}`));
  }
  return d
    .select()
    .from(allianceApplications)
    .where(eq(allianceApplications.userId, user.id))
    .orderBy(desc(allianceApplications.createdAt));
}

const WRITE_LIMIT = { windowMs: 60_000, max: 40 };

export const allianceApplicationsRouter = router({
  /** The signed-in person's alliance applications, newest first. */
  mine: protectedProcedure.query(async ({ ctx }) => claimAndList(ctx.user)),

  /**
   * Save the draft (or an edit to a sent application). Creates the person's
   * application on the first save; one per person.
   */
  save: protectedProcedure
    .use(rateLimited(WRITE_LIMIT))
    .input(fieldsInput)
    .mutation(async ({ ctx, input }) => {
      const d = await database();
      const fields = cleanFields(input);
      const [existing] = await claimAndList(ctx.user);
      if (!existing) {
        if (!ctx.user.email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Your account needs an email address before you can apply." });
        }
        const res = await d.insert(allianceApplications).values({
          userId: ctx.user.id,
          contactEmail: ctx.user.email,
          contactName: ctx.user.name ?? null,
          organizationName: "",
          status: "draft",
          ...fields,
        });
        const id = (Array.isArray(res) ? (res[0] as { insertId?: number }) : (res as { insertId?: number }))?.insertId;
        return id ? await getAllianceApplication(id) : null;
      }
      if ((ALLIANCE_LOCKED as readonly string[]).includes(existing.status)) {
        throw new TRPCError({ code: "FORBIDDEN", message: LOCKED_MESSAGE });
      }
      if (Object.keys(fields).length > 0) {
        // The status guard sits in the write itself, so an approval that lands
        // between the read and this update is never overwritten.
        await d
          .update(allianceApplications)
          .set(fields)
          .where(and(eq(allianceApplications.id, existing.id), notInArray(allianceApplications.status, [...ALLIANCE_LOCKED])));
      }
      return getAllianceApplication(existing.id);
    }),

  /** Send the application for review. Says what is missing instead of failing quietly. */
  submit: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 6 }))
    .mutation(async ({ ctx }) => {
      const d = await database();
      const [app] = await claimAndList(ctx.user);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Start your application first." });
      if (!(ALLIANCE_SENDABLE as readonly string[]).includes(app.status)) {
        return { ok: true as const, alreadySent: true, status: app.status };
      }
      const missing = missingForSubmit(app);
      if (missing.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Add ${missing.join(", ")} before sending.` });
      }
      const res = await d
        .update(allianceApplications)
        .set({ status: "submitted", submittedAt: new Date() })
        .where(and(eq(allianceApplications.id, app.id), eq(allianceApplications.status, app.status)));
      const affected = (Array.isArray(res) ? (res[0] as { affectedRows?: number }) : (res as { affectedRows?: number }))?.affectedRows ?? 0;
      if (affected === 0) return { ok: true as const, alreadySent: true, status: app.status };

      await allianceTimeline(app.id, "status_change", app.status === "draft" ? "Submitted by the applicant" : "Sent again by the applicant", null);
      try {
        const { declarePath } = await import("../lib/tierDetector");
        await declarePath(ctx.user.id, "ally");
      } catch (err) {
        console.warn("[allianceApplications] declarePath failed:", err);
      }
      try {
        await notifyOwner({
          title: `New alliance partner application: ${app.organizationName}`,
          content: `**Organization:** ${app.organizationName}\n**Contact:** ${app.contactName ?? ""} ${app.contactEmail}\n**Support:** ${app.supportDescription ?? ""}\n\nReview it in Admin > Alliance.`,
        });
      } catch (err) {
        console.warn("[allianceApplications] owner notification failed:", err);
      }
      const org = textForEmail(app.organizationName);
      await sendEmail({
        to: [app.contactEmail],
        subject: `Application received: ${textForSubject(app.organizationName)}`,
        html: `
          <h2 style="color:#1a472a;margin-top:0;">We have your application</h2>
          ${app.contactName ? `<p style="color:#333;line-height:1.6;">Hi ${textForEmail(app.contactName)},</p>` : ""}
          <p style="color:#333;line-height:1.6;">Thank you for applying to be an Alliance Partner. We have the application for <strong>${org}</strong>, and the team reads each one as it comes in.</p>
          <p style="color:#333;line-height:1.6;">When it is approved, we email you how to vote for the Interoperability Circle's weekly call time and how to join the calls. Until then you can change anything in your application.</p>
          <p style="color:#333;line-height:1.6;"><a href="${textForEmail(toAbsoluteUrl(ALLIANCE_STATUS_PATH))}" style="color:#1a472a;font-weight:bold;">See where your application stands</a></p>
          <p style="color:#4a7c59;font-weight:bold;margin-top:25px;">The ReGen Civics Team</p>
        `,
        template: "alliance_application_received",
        inquiryType: "alliance_application",
        inquiryId: app.id,
        recipientName: app.contactName ?? undefined,
      }).catch((err) => console.warn("[allianceApplications] confirmation email failed:", err));
      return { ok: true as const, alreadySent: false, status: "submitted" as const };
    }),

  // ─── Admin ───────────────────────────────────────────────────────────────

  /** Every application, newest first. Drafts only when asked for. */
  list: adminProcedure
    .input(z.object({ includeDrafts: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const d = await database();
      const rows = await d
        .select()
        .from(allianceApplications)
        .where(input?.includeDrafts ? undefined : notInArray(allianceApplications.status, ["draft"]))
        .orderBy(desc(allianceApplications.submittedAt), desc(allianceApplications.createdAt));
      return rows;
    }),

  /** One application with its timeline. */
  get: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const app = await getAllianceApplication(input.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      const d = await database();
      const events = await d
        .select()
        .from(allianceApplicationEvents)
        .where(eq(allianceApplicationEvents.allianceApplicationId, input.id))
        .orderBy(desc(allianceApplicationEvents.createdAt), desc(allianceApplicationEvents.id));
      return { app, events };
    }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(ALLIANCE_STATUSES), notify: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const result = await setAllianceApplicationStatus({
        id: input.id,
        status: input.status,
        adminUserId: ctx.user.id,
        notify: input.notify,
      });
      return { success: true, ...result };
    }),

  /** The note the applicant sees on their status page. */
  setReviewNote: adminProcedure
    .input(z.object({ id: z.number().int(), note: z.string().max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const d = await database();
      const note = input.note.trim() || null;
      await d.update(allianceApplications).set({ reviewNote: note }).where(eq(allianceApplications.id, input.id));
      await allianceTimeline(input.id, "note_added", note ? `Note for the applicant: ${note}` : "Note for the applicant cleared", ctx.user.id);
      return { ok: true as const };
    }),

  /**
   * Turn an alliance inquiry from /connect into an application. Copies every
   * field the inquiry carries, links the account with that email when there
   * is one, and marks the inquiry completed. With approve set (the default in
   * Admin), the application is approved at once, which sends the Circle vote
   * invite and signs them up for the Circle.
   */
  convertInquiry: adminProcedure
    .input(z.object({
      inquiryId: z.number().int(),
      organizationName: z.string().trim().min(1).max(255),
      approve: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const d = await database();
      const [already] = await d
        .select({ id: allianceApplications.id })
        .from(allianceApplications)
        .where(eq(allianceApplications.sourceInquiryId, input.inquiryId))
        .limit(1);
      if (already) {
        return { id: already.id, created: false, handoff: null, label: "This inquiry was converted before." };
      }
      const inquiry = await db.getGeneralInquiryById(input.inquiryId);
      if (!inquiry) throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      if (inquiry.pathType !== "alliance") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only alliance inquiries convert into alliance applications." });
      }
      const email = inquiry.email.trim().toLowerCase();
      const account = await db.getUserByEmail(email).catch(() => undefined);
      const roles = cleanRoles([
        ...cleanRoles(inquiry.organizationRole),
        ...cleanRoles(inquiry.allianceSupportCategories),
      ]);
      const res = await d.insert(allianceApplications).values({
        userId: account?.id ?? null,
        contactEmail: email,
        contactName: inquiry.fullName ?? null,
        organizationName: input.organizationName,
        organizationUrl: cleanRepoUrl(inquiry.organizationUrl) ?? null,
        roles: JSON.stringify(roles),
        otherSupport: inquiry.otherAllianceSupport ?? null,
        scope: inquiry.organizationScope === "global" ? "global" : "local",
        country: inquiry.organizationCountry ?? null,
        latitude: inquiry.organizationLatitude ?? null,
        longitude: inquiry.organizationLongitude ?? null,
        supportDescription: inquiry.allianceSupportDescription ?? null,
        partnershipDescription: inquiry.partnershipDescription ?? null,
        status: "submitted",
        submittedAt: inquiry.createdAt ?? new Date(),
        sourceInquiryId: inquiry.id,
      });
      const id = (Array.isArray(res) ? (res[0] as { insertId?: number }) : (res as { insertId?: number }))?.insertId;
      if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create the application." });
      await allianceTimeline(id, "admin_action", `Converted from alliance inquiry #${inquiry.id}`, ctx.user.id);
      await d.update(generalInquiries).set({ status: "completed" }).where(eq(generalInquiries.id, inquiry.id));

      if (input.approve === false) return { id, created: true, handoff: null, label: "Converted. It waits in Applications for review." };
      const change = await setAllianceApplicationStatus({ id, status: "approved", adminUserId: ctx.user.id });
      const invite = change.handoff?.invite;
      return {
        id,
        created: true,
        handoff: change.handoff,
        label: invite ? `Converted and approved. ${voteInviteOutcomeLabel(invite)}.` : "Converted and approved.",
      };
    }),

  /** Which alliance inquiries already became applications, for the Convert button. */
  convertedInquiries: adminProcedure.query(async () => {
    const d = await database();
    const rows = await d
      .select({ inquiryId: allianceApplications.sourceInquiryId, id: allianceApplications.id })
      .from(allianceApplications)
      .where(sql`${allianceApplications.sourceInquiryId} IS NOT NULL`);
    return rows.filter((r): r is { inquiryId: number; id: number } => r.inquiryId != null);
  }),

  inviteState: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => circleInviteState(input.id)),

  sendInvite: adminProcedure
    .input(z.object({ id: z.number().int(), force: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const outcome = await sendCircleInviteById(input.id, { adminUserId: ctx.user.id, force: input.force });
      return { outcome, label: voteInviteOutcomeLabel(outcome) };
    }),

  inviteBacklog: adminProcedure.query(async () => circleInviteBacklog()),

  sendInviteBacklog: adminProcedure.mutation(async ({ ctx }) => {
    const backlog = await circleInviteBacklog();
    let sent = 0;
    let failed = 0;
    for (const item of backlog) {
      const outcome = await sendCircleInviteById(item.id, { adminUserId: ctx.user.id });
      if (outcome === "sent") sent += 1;
      else if (outcome === "rate_limited" || outcome === "held") return { sent, failed, noEmail: 0, stoppedBy: outcome };
      else if (outcome !== "already_sent") failed += 1;
    }
    return { sent, failed, noEmail: 0, stoppedBy: null };
  }),
});
