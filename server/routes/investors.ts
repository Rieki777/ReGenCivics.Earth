// server/routes/investors.ts
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { contactNotes, investorInquiries as investorInquiriesTbl } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { notifyOwner } from "../_core/notification";
import { notifyIfEnabled } from "../notify-with-prefs";
import { generalInquirySubmitInput, submitGeneralInquiry } from "../lib/generalInquiry";
import { isReminderNote } from "@shared/contactReminders";

export const investorInquiriesRouter = router({
  // Submit a new investor inquiry (public - no login required)
  submit: publicProcedure
    .input(z.object({
      // Contact Information
      fullName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      organization: z.string().optional(),
      role: z.string().optional(),
      location: z.string().optional(),

      // Investment Profile (all optional)
      investorType: z.enum(["individual", "family_office", "foundation", "impact_fund", "institutional", "other"]).optional(),
      investmentRange: z.enum(["under_250k", "250k_1m", "1m_5m", "5m_10m", "over_10m"]).optional(),
      investmentTimeline: z.enum(["immediate", "3_months", "6_months", "1_year", "exploring"]).optional(),

      // Investment Interests (optional)
      primaryInterest: z.enum(["land_projects", "alliance_fund", "both"]).optional(),
      geographicPreference: z.string().optional(),
      sectorInterests: z.string().optional(), // JSON array

      // Background & Motivation
      investmentExperience: z.string().optional(),
      motivations: z.string().optional(),
      impactGoals: z.string().optional(),
      questionsForTeam: z.string().optional(),

      // How They Found Us
      referralSource: z.string().optional(),

      // Additional
      documentsUrl: z.string().optional(),
      additionalNotes: z.string().optional(),

      // Preferences
      preferredContact: z.enum(["email", "phone", "video_call"]).optional(),
      newsletterOptIn: z.boolean().optional(),

      // Optional needs/offers capture (Phase B2), mirrored to the board tables
      needsText: z.string().max(2000).optional(),
      offersText: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "investor_inquiry");
      const inquiryId = await db.createInvestorInquiry({
        userId: ctx.user?.id || null,
        status: "new",
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        organization: input.organization || null,
        role: input.role || null,
        location: input.location || null,
        investorType: input.investorType || null,
        investmentRange: input.investmentRange || null,
        investmentTimeline: input.investmentTimeline || null,
        primaryInterest: input.primaryInterest || null,
        geographicPreference: input.geographicPreference || null,
        sectorInterests: input.sectorInterests || null,
        investmentExperience: input.investmentExperience || null,
        motivations: input.motivations || null,
        impactGoals: input.impactGoals || null,
        questionsForTeam: input.questionsForTeam || null,
        referralSource: input.referralSource || null,
        documentsUrl: input.documentsUrl || null,
        additionalNotes: input.additionalNotes || null,
        preferredContact: input.preferredContact || "email",
        newsletterOptIn: input.newsletterOptIn ? 1 : 0,
        needsText: input.needsText || null,
        offersText: input.offersText || null,
      });

      // Mirror the optional needs/offers capture to the board tables (Phase B2, non-fatal).
      {
        const { captureFormNeedsOffers } = await import("../lib/needsOffersStore");
        await captureFormNeedsOffers({
          source: "investor_inquiry",
          sourceId: inquiryId,
          ownerId: ctx.user?.id || null,
          contactName: input.fullName,
          contactEmail: input.email,
          needsText: input.needsText,
          offersText: input.offersText,
        });
      }

      // Dual-list: when opted in, also join the ReGen Civics newsletter (source=investor_form).
      // Same pending + confirmation flow as newsletter.subscribe (GDPR double opt-in).
      if (input.newsletterOptIn) {
        try {
          await db.createNewsletterSubscriber({
            email: input.email,
            name: input.fullName || null,
            source: "investor_form",
            isActive: 0,
          });
          try {
            const { ENV } = await import("../_core/env");
            const { signEmailLink } = await import("../lib/emailLinkSecret");
            const token = await signEmailLink({ email: input.email, purpose: "newsletter-confirm" }, "24h");
            const confirmUrl = `${ENV.appUrl}/newsletter/confirm?token=${encodeURIComponent(token)}`;
            const { sendEmail } = await import("../_core/email");
            await sendEmail({
              to: input.email,
              subject: "Confirm your ReGen Civics newsletter subscription",
              html: `
            <h2>Welcome to the ReGen Civics newsletter!</h2>
            <p>You opted in while submitting an investor inquiry. Click below to confirm and stay informed about the ReGenerative Renaissance.</p>
            <p style="margin: 24px 0;">
              <a href="${confirmUrl}" style="background:#1a472a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                Confirm Subscription
              </a>
            </p>
            <p style="color:#888;font-size:13px;">This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.</p>
          `,
            });
          } catch (confirmErr) {
            console.warn("Investor newsletter confirm email failed (subscriber row kept):", confirmErr);
          }
        } catch (nlErr) {
          console.warn("Failed to add investor to newsletter list:", nlErr);
        }
      }

      // One reply: the cooperative note (server/_core/email.ts). It used to be a
      // deck link plus a Day 3 / 7 / 14 / 30 drip that described the fund's
      // proposed terms, with no unsubscribe link or postal address. The drip
      // was stopped on 2026-09-27 (Phase 0): nothing is scheduled here any more,
      // and the stated investment range is never echoed back.
      try {
        const { sendEmail, emailTemplates: emailTpl } = await import("../_core/email");
        const welcomeEmail = emailTpl.investorWelcome(input.fullName);
        await sendEmail({
          to: input.email,
          subject: welcomeEmail.subject,
          html: welcomeEmail.html,
        });
      } catch (emailErr) {
        console.warn("Failed to send investor welcome email:", emailErr);
      }

      // Notify owner of new investor inquiry
      try {
        const rangeLabels: Record<string, string> = {
          "under_250k": "Under $250K (Legacy)",
          "250k_1m": "$250K - $1M",
          "1m_5m": "$1M - $5M",
          "5m_10m": "$5M - $10M",
          "over_10m": "Over $10M",
        };
        const rangeDisplay = input.investmentRange ? rangeLabels[input.investmentRange] || "Not specified" : "Not specified";
        const timelineDisplay = input.investmentTimeline || "Not specified";
        const interestDisplay = input.primaryInterest || "Not specified";

        await notifyIfEnabled("investorInquiries", {
          title: `New Investor Inquiry: ${input.fullName}`,
          content: `A new investor inquiry has been submitted!\n\n**Name:** ${input.fullName}\n**Email:** ${input.email}\n**Organization:** ${input.organization || "N/A"}\n**Investment Range:** ${rangeDisplay}\n**Timeline:** ${timelineDisplay}\n\nReview it in the admin dashboard.`,
        });

        // Send confirmation notification (applicant copy) - always send
        await notifyOwner({
          title: `Investor Inquiry Confirmation - ${input.fullName}`,
          content: `**CONFIRMATION COPY FOR APPLICANT**\n\nThank you for your interest in ReGen Civics!\n\n**Applicant Email:** ${input.email}\n**Name:** ${input.fullName}\n**Organization:** ${input.organization || "Individual"}\n**Investment Range:** ${rangeDisplay}\n**Timeline:** ${timelineDisplay}\n**Primary Interest:** ${interestDisplay}\n\n---\nPlease forward this confirmation to the applicant at ${input.email}`,
        });
      } catch (e) {
        console.warn("Failed to send notification:", e);
      }

      return { id: inquiryId, success: true };
    }),

  /**
   * Investor follow-up: a verified investor (one who has already submitted
   * the InvestorForm and got access to /opportunity) sends a question via
   * the "Contact our investor team" CTA. Creates a new investor_inquiries
   * row tagged with referralSource = "opportunity_followup" so admin sees
   * it threaded with the original investor record by email.
   *
   * Auto-populates from the prior submission (most recent inquiry by
   * email) when one exists, so we keep the investor profile context
   * (organization, investmentRange, etc.) consistent across messages.
   * Falls back to the values the client passes (from localStorage) when
   * there's no prior row to copy from.
   */
  submitFollowUp: publicProcedure
    .input(
      z.object({
        fullName: z.string().min(1).max(255),
        email: z.string().email(),
        message: z.string().min(1).max(4000),
        // Optional context the client can pass through (from localStorage
        // INVESTOR_LS_KEY) when we can't find a prior row.
        organization: z.string().max(255).optional(),
        role: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "investor_followup");

      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      }

      // Find the most recent prior inquiry from this email so we can
      // copy investor profile context (investorType, range, timeline,
      // primaryInterest, etc) onto the follow-up row. Admin sees the
      // same profile fields populated as the original.
      const prior = await drizzle
        .select()
        .from(investorInquiriesTbl)
        .where(eq(investorInquiriesTbl.email, input.email))
        .orderBy(sql`createdAt DESC`)
        .limit(1);

      const ctx0 = prior[0];

      const followUpId = await db.createInvestorInquiry({
        userId: ctx.user?.id ?? null,
        fullName: input.fullName,
        email: input.email,
        phone: ctx0?.phone ?? null,
        organization: input.organization ?? ctx0?.organization ?? null,
        role: input.role ?? ctx0?.role ?? null,
        location: ctx0?.location ?? null,
        investorType: ctx0?.investorType ?? null,
        investmentRange: ctx0?.investmentRange ?? null,
        investmentTimeline: ctx0?.investmentTimeline ?? null,
        primaryInterest: ctx0?.primaryInterest ?? null,
        geographicPreference: ctx0?.geographicPreference ?? null,
        sectorInterests: ctx0?.sectorInterests ?? null,
        investmentExperience: ctx0?.investmentExperience ?? null,
        motivations: ctx0?.motivations ?? null,
        impactGoals: ctx0?.impactGoals ?? null,
        // The actual message lives here. questionsForTeam is exactly what
        // the field is for; admin's investor view already surfaces it.
        questionsForTeam: input.message,
        referralSource: "opportunity_followup",
        documentsUrl: null,
        additionalNotes: ctx0
          ? `Follow-up from verified investor (originally submitted #${ctx0.id} on ${ctx0.createdAt?.toISOString?.() ?? "earlier"})`
          : "Follow-up from verified investor (no prior inquiry found by email)",
        preferredContact: ctx0?.preferredContact ?? "email",
        newsletterOptIn: ctx0?.newsletterOptIn ?? 0,
      });

      // Notify admin so the message lands as a tracked admin notification
      // alongside the standard investor inquiry stream.
      try {
        await notifyIfEnabled("investorInquiries", {
          title: `Investor follow-up: ${input.fullName}`,
          content: [
            `${input.fullName} (${input.email}) sent a follow-up via /opportunity:`,
            "",
            input.message,
            "",
            ctx0
              ? `Linked to original inquiry #${ctx0.id}.`
              : "No prior investor inquiry found by email.",
            "",
            "Review in admin > Investors.",
          ].join("\n"),
        });
      } catch (e) {
        console.warn("Failed to send investor follow-up notification:", e);
      }

      return { id: followUpId, success: true };
    }),

  // Admin: Get all investor inquiries
  list: adminProcedure.query(async () => {
    return db.getAllInvestorInquiries();
  }),

  // Admin: Get investor inquiry by ID
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const inquiry = await db.getInvestorInquiryById(input.id);
      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      return inquiry;
    }),

  // Admin: Update investor inquiry status
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "contacted", "in_discussion", "committed", "declined", "archived"]),
    }))
    .mutation(async ({ input }) => {
      await db.updateInvestorInquiry(input.id, { status: input.status });
      return { success: true };
    }),

  // Self-service: get own investor inquiry
  mine: protectedProcedure.query(async ({ ctx }) => {
    return db.getInvestorInquiryByUserId(ctx.user.id);
  }),

  // Self-service: check if user has already submitted
  hasSubmitted: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.email) return { submitted: false };
    const dbConn = await getDb();
    if (!dbConn) return { submitted: false };
    const { investorInquiries: tbl } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await dbConn.select({ id: tbl.id }).from(tbl)
      .where(eq(tbl.email, ctx.user.email)).limit(1);
    return { submitted: rows.length > 0 };
  }),
});

export const generalInquiriesRouter = router({
  // Submit a new general inquiry (public - no login required).
  // The body lives in submitGeneralInquiry so the season board can use the same path.
  submit: publicProcedure
    .input(generalInquirySubmitInput)
    .mutation(({ ctx, input }) => submitGeneralInquiry(ctx, input)),

  // Admin: Get all general inquiries
  list: adminProcedure.query(async () => {
    return db.getAllGeneralInquiries();
  }),

  // Admin: Get general inquiries by path
  listByPath: adminProcedure
    .input(z.object({ pathType: z.string() }))
    .query(async ({ input }) => {
      return db.getGeneralInquiriesByPath(input.pathType);
    }),

  // Admin: Get general inquiry by ID
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const inquiry = await db.getGeneralInquiryById(input.id);
      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      return inquiry;
    }),

  // Admin: Update general inquiry status
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "contacted", "in_progress", "completed", "archived"]),
    }))
    .mutation(async ({ input }) => {
      await db.updateGeneralInquiry(input.id, { status: input.status });
      return { success: true };
    }),
});


export const loiRouter = router({
  /**
   * Prefill the pledge form from the inquiry this person already filled in.
   *
   * Rye, 2026-08-30: "the LOI submission form is pre-filled with the
   * information so they don't have to type it twice." The inquiry already
   * captures every LOI field except the pledge amount itself.
   *
   * protectedProcedure, and it takes NO email argument on purpose. A public
   * prefill-by-email would hand anybody a stranger's name, phone, organisation
   * and stated investment range for the cost of guessing an address. Identity
   * comes from the session or not at all. A signed-out visitor who has just
   * completed /investor in the same browser is prefilled client-side instead.
   */
  prefill: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.email) return null;
    const dbConn = await getDb();
    if (!dbConn) return null;
    const { investorInquiries: tbl } = await import("../../drizzle/schema");
    const { eq, desc: d } = await import("drizzle-orm");
    const rows = await dbConn
      .select({
        fullName: tbl.fullName,
        email: tbl.email,
        phone: tbl.phone,
        organization: tbl.organization,
        role: tbl.role,
        investorType: tbl.investorType,
        investmentTimeline: tbl.investmentTimeline,
        geographicPreference: tbl.geographicPreference,
        sectorInterests: tbl.sectorInterests,
        motivations: tbl.motivations,
        questionsForTeam: tbl.questionsForTeam,
        referralSource: tbl.referralSource,
      })
      .from(tbl)
      .where(eq(tbl.email, ctx.user.email))
      .orderBy(d(tbl.id))
      .limit(1);
    return rows[0] ?? null;
  }),

  // Retired 2026-09-27 (ADR-62). This took a pledge amount against a proposed
  // minimum for a fund that no longer exists. The cooperative in design takes no
  // pledges; interest goes through coop.submitInterest (server/routes/coop.ts).
  // Kept as a stub so an old client gets a plain message instead of a 404, and
  // so nothing can store a pledge again.
  submit: publicProcedure
    .input(z.object({}).passthrough())
    .mutation(async ({ ctx }) => {
      await checkRateLimit(ctx, "letter_of_intent");
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "The letter of intent form is retired. To tell us you're interested in the cooperative, use the form at /loi.",
      });
    }),

  // Get all LOIs (admin only)
  list: adminProcedure.query(async () => {
    return db.getAllLettersOfIntent();
  }),

  // Get LOI stats (admin only)
  stats: adminProcedure.query(async () => {
    return db.getLetterOfIntentStats();
  }),

  // Get LOI by ID (admin only)
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getLetterOfIntentById(input.id);
    }),

  // Update LOI status (admin only)
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "withdrawn", "converted"]),
    }))
    .mutation(async ({ input }) => {
      await db.updateLetterOfIntentStatus(input.id, input.status);
      return { success: true };
    }),
});

export const reviewerEmailsRouter = router({
  // Admin: Get all reviewer emails
  list: adminProcedure.query(async () => {
    return db.getAllReviewerEmails();
  }),

  // Admin: Add a new reviewer email
  create: adminProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      notifyApplications: z.boolean().default(true),
      notifyInvestors: z.boolean().default(true),
      notifyInquiries: z.boolean().default(true),
      inquiryTypes: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const reviewerId = await db.createReviewerEmail({
        email: input.email,
        name: input.name || null,
        notifyApplications: input.notifyApplications ? 1 : 0,
        notifyInvestors: input.notifyInvestors ? 1 : 0,
        notifyInquiries: input.notifyInquiries ? 1 : 0,
        inquiryTypes: input.inquiryTypes ? JSON.stringify(input.inquiryTypes) : null,
        isActive: 1,
      });
      return { id: reviewerId, success: true };
    }),

  // Admin: Update a reviewer email
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        email: z.string().email().optional(),
        name: z.string().optional(),
        notifyApplications: z.boolean().optional(),
        notifyInvestors: z.boolean().optional(),
        notifyInquiries: z.boolean().optional(),
        inquiryTypes: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = {};
      if (input.data.email !== undefined) updateData.email = input.data.email;
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.notifyApplications !== undefined) updateData.notifyApplications = input.data.notifyApplications ? 1 : 0;
      if (input.data.notifyInvestors !== undefined) updateData.notifyInvestors = input.data.notifyInvestors ? 1 : 0;
      if (input.data.notifyInquiries !== undefined) updateData.notifyInquiries = input.data.notifyInquiries ? 1 : 0;
      if (input.data.inquiryTypes !== undefined) updateData.inquiryTypes = JSON.stringify(input.data.inquiryTypes);
      if (input.data.isActive !== undefined) updateData.isActive = input.data.isActive ? 1 : 0;

      await db.updateReviewerEmail(input.id, updateData as Parameters<typeof db.updateReviewerEmail>[1]);
      return { success: true };
    }),

  // Admin: Delete a reviewer email
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteReviewerEmail(input.id);
      return { success: true };
    }),
});

export const contactNotesRouter = router({
  list: adminProcedure
    .input(z.object({ contactType: z.string(), contactId: z.number() }))
    .query(async ({ input }) => {
      return await db.getContactNotes(input.contactType, input.contactId);
    }),

  /** All notes for a contact type (Investors list reminder chips). No new table. */
  listByType: adminProcedure
    .input(z.object({ contactType: z.string() }))
    .query(async ({ input }) => {
      const dbc = await getDb();
      if (!dbc) return [];
      const rows = await dbc.select().from(contactNotes)
        .where(eq(contactNotes.contactType, input.contactType))
        .orderBy(desc(contactNotes.createdAt));
      return rows.filter((r) => isReminderNote(r.note));
    }),

  create: adminProcedure
    .input(z.object({
      contactType: z.string(),
      contactId: z.number(),
      note: z.string().min(1).max(2000),
      authorName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await db.createContactNote({
        contactType: input.contactType,
        contactId: input.contactId,
        note: input.note,
        authorName: input.authorName || ctx.user.name || "Admin",
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteContactNote(input.id);
    }),
});

export const contactTagsRouter = router({
  list: adminProcedure
    .input(z.object({ contactType: z.string(), contactId: z.number() }))
    .query(async ({ input }) => {
      return await db.getContactTags(input.contactType, input.contactId);
    }),

  add: adminProcedure
    .input(z.object({
      contactType: z.string(),
      contactId: z.number(),
      tag: z.string().min(1).max(100),
    }))
    .mutation(async ({ input }) => {
      return await db.addContactTag({
        contactType: input.contactType,
        contactId: input.contactId,
        tag: input.tag.trim().toLowerCase(),
      });
    }),

  remove: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.removeContactTag(input.id);
    }),
});
