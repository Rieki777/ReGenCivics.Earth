// server/routes/investors.ts
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { investorInquiries as investorInquiriesTbl } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { notifyOwner } from "../_core/notification";
import { notifyIfEnabled, getNotificationTypeForPath } from "../notify-with-prefs";

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
      });

      // Auto-send investor welcome email with deck + /opportunity link
      try {
        const { sendEmail, emailTemplates: emailTpl } = await import("../_core/email");
        const rangeLabelsForEmail: Record<string, string> = {
          "under_250k": "Under $250K (Legacy)",
          "250k_1m": "$250K - $1M",
          "1m_5m": "$1M - $5M",
          "5m_10m": "$5M - $10M",
          "over_10m": "Over $10M",
        };
        const investorEmailRange = input.investmentRange ? rangeLabelsForEmail[input.investmentRange] || "Not specified" : "Not specified";
        const welcomeEmail = emailTpl.investorWelcome(input.fullName, investorEmailRange);
        await sendEmail({
          to: input.email,
          subject: welcomeEmail.subject,
          html: welcomeEmail.html,
        });
      } catch (emailErr) {
        console.warn("Failed to send investor welcome email:", emailErr);
      }

      // Schedule investor drip sequence (Day 3, 7, 14, 30)
      try {
        const { emailTemplates: dripTpl } = await import("../_core/email");
        const now = Date.now();
        const drip = [
          { days: 3,  template: dripTpl.investorDripDay3(input.fullName) },
          { days: 7,  template: dripTpl.investorDripDay7(input.fullName) },
          { days: 14, template: dripTpl.investorDripDay14(input.fullName) },
          { days: 30, template: dripTpl.investorDripDay30(input.fullName) },
        ];
        for (const { days, template } of drip) {
          const scheduledFor = new Date(now + days * 24 * 60 * 60 * 1000);
          await db.createScheduledEmail({
            recipientEmail: input.email,
            recipientName: input.fullName,
            subject: template.subject,
            body: template.html,
            inquiryType: "investor",
            scheduledFor,
          });
        }
      } catch (dripErr) {
        console.warn("Failed to schedule investor drip emails:", dripErr);
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
  // Submit a new general inquiry (public - no login required)
  submit: publicProcedure
    .input(z.object({
      // Routing Path
      pathType: z.enum(["land_partner", "create_with_regens", "alliance", "finance", "live", "role", "something_else"]),

      // Contact Information (common to all paths)
      email: z.string().email(),
      fullName: z.string().optional(),

      // Path 1: Land Partner specific fields
      projectUrl: z.string().optional(),
      projectInspiration: z.string().optional(),
      projectProgress: z.string().optional(), // JSON array of checkboxes

      // Path 2: Create with ReGens specific fields
      allianceOrganizations: z.string().optional(), // JSON array of selected orgs
      otherOrganization: z.string().optional(),

      // Path 3: Alliance specific fields
      organizationUrl: z.string().optional(),
      organizationRole: z.string().optional(), // JSON array of role tags
      organizationScope: z.string().optional(), // "local" or "global"
      organizationLatitude: z.number().optional(),
      organizationLongitude: z.number().optional(),
      organizationCountry: z.string().optional(),
      partnershipDescription: z.string().optional(),

      // Path 5: Live specific fields
      landProjects: z.string().optional(), // JSON array of selected projects
      otherProject: z.string().optional(),

      // Path 6: Role specific fields
      roleArchetypes: z.string().optional(), // JSON array
      roleInterest: z.string().optional(),
      whyIdeal: z.string().optional(),
      seasonDeliverables: z.string().optional(),
      videoPitchUrl: z.string().optional(),
      cvWebsite: z.string().optional(),

      // Path 7: Something else specific fields
      uniqueContribution: z.string().optional(),

      // New enhanced fields
      capitalTypes: z.string().optional(), // JSON array of 9 forms of capital
      allianceSupportCategories: z.string().optional(), // JSON array of support categories
      otherAllianceSupport: z.string().optional(),
      allianceSupportDescription: z.string().optional(),
      valueContribution: z.string().optional(),
      whyIdealFit: z.string().optional(),
      organizationalCapital: z.string().optional(), // JSON array of org capital types

      // General fields
      additionalNotes: z.string().optional(),
      referralSource: z.string().optional(),
      newsletterOptIn: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "general_inquiry");
      const inquiryId = await db.createGeneralInquiry({
        userId: ctx.user?.id || null,
        status: "new",
        pathType: input.pathType,
        email: input.email,
        fullName: input.fullName || null,
        projectUrl: input.projectUrl || null,
        projectInspiration: input.projectInspiration || null,
        projectProgress: input.projectProgress || null,
        allianceOrganizations: input.allianceOrganizations || null,
        otherOrganization: input.otherOrganization || null,
        organizationUrl: input.organizationUrl || null,
        organizationRole: input.organizationRole || null,
        organizationScope: input.organizationScope || null,
        organizationLatitude: input.organizationLatitude || null,
        organizationLongitude: input.organizationLongitude || null,
        organizationCountry: input.organizationCountry || null,
        partnershipDescription: input.partnershipDescription || null,
        landProjects: input.landProjects || null,
        otherProject: input.otherProject || null,
        roleArchetypes: input.roleArchetypes || null,
        roleInterest: input.roleInterest || null,
        whyIdeal: input.whyIdeal || null,
        seasonDeliverables: input.seasonDeliverables || null,
        videoPitchUrl: input.videoPitchUrl || null,
        cvWebsite: input.cvWebsite || null,
        uniqueContribution: input.uniqueContribution || null,
        capitalTypes: input.capitalTypes || null,
        allianceSupportCategories: input.allianceSupportCategories || null,
        otherAllianceSupport: input.otherAllianceSupport || null,
        allianceSupportDescription: input.allianceSupportDescription || null,
        valueContribution: input.valueContribution || null,
        whyIdealFit: input.whyIdealFit || null,
        organizationalCapital: input.organizationalCapital || null,
        additionalNotes: input.additionalNotes || null,
        referralSource: input.referralSource || null,
        newsletterOptIn: input.newsletterOptIn ? 1 : 0,
      });

      // Notify owner of new inquiry
      try {
        const pathLabels: Record<string, string> = {
          "land_partner": "Land Partner Application",
          "create_with_regens": "Create with ReGens",
          "alliance": "Alliance Partnership",
          "finance": "Finance the Renaissance",
          "live": "Live at Land Project",
          "role": "Role Application",
          "something_else": "Other Inquiry",
        };
        // Use path-based notification type mapping
        const notifType = getNotificationTypeForPath(input.pathType);
        await notifyIfEnabled(notifType, {
          title: `New Inquiry: ${pathLabels[input.pathType]}`,
          content: `A new inquiry has been submitted!\n\n**Path:** ${pathLabels[input.pathType]}\n**Email:** ${input.email}\n**Name:** ${input.fullName || "Not provided"}\n\nReview it in the admin dashboard.`,
        });

        // Send confirmation notification (applicant copy) - always send
        await notifyOwner({
          title: `Inquiry Confirmation - ${pathLabels[input.pathType]}`,
          content: `**CONFIRMATION COPY FOR APPLICANT**\n\nThank you for connecting with ReGen Civics!\n\n**Applicant Email:** ${input.email}\n**Name:** ${input.fullName || "Not provided"}\n**Inquiry Type:** ${pathLabels[input.pathType]}\n\nWe will review your submission and get back to you soon.\n\n---\nPlease forward this confirmation to the applicant at ${input.email}`,
        });
      } catch (e) {
        console.warn("Failed to send notification:", e);
      }

      return { id: inquiryId, success: true };
    }),

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
  // Submit LOI (public - no login required)
  submit: publicProcedure
    .input(z.object({
      fullName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      organization: z.string().optional(),
      role: z.string().optional(),
      pledgeAmount: z.number().min(1),
      investorType: z.enum(["individual", "family_office", "foundation", "impact_fund", "institutional", "other"]),
      investmentTimeline: z.enum(["immediate", "3_months", "6_months", "1_year", "flexible"]).default("flexible"),
      geographicPreference: z.string().optional(),
      sectorInterests: z.string().optional(),
      motivations: z.string().optional(),
      questionsForTeam: z.string().optional(),
      additionalNotes: z.string().optional(),
      referralSource: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "letter_of_intent");
      const loiId = await db.createLetterOfIntent({
        ...input,
        phone: input.phone || null,
        organization: input.organization || null,
        role: input.role || null,
        geographicPreference: input.geographicPreference || null,
        sectorInterests: input.sectorInterests || null,
        motivations: input.motivations || null,
        questionsForTeam: input.questionsForTeam || null,
        additionalNotes: input.additionalNotes || null,
        referralSource: input.referralSource || null,
        status: "pending",
        userId: null,
      });

      // Send confirmation email to the investor
      try {
        const { sendEmail, toAbsoluteUrl } = await import("../_core/email");
        await sendEmail({
          to: input.email,
          subject: "Your Letter of Intent  -  ReGen Civics",
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a472a">
<h2 style="color:#1a472a">Thank you, ${input.fullName}!</h2>
<p>We've received your Letter of Intent for <strong>$${input.pledgeAmount.toLocaleString()}</strong>. We're thrilled to have you as a potential capital partner in the regenerative transition.</p>
<p><strong>What happens next:</strong></p>
<ul>
<li>We'll review your LOI and reach out within 2–3 business days.</li>
<li>No capital moves until we reach &gt;$20M in committed LOIs  -  your pledge is non-binding until then.</li>
</ul>
<h3 style="color:#1a472a">Keep the momentum going</h3>
<p>📄 <a href="${toAbsoluteUrl('/opportunity')}" style="color:#4a7c59">Read the full investment opportunity</a></p>
<p>📅 <a href="https://calendly.com/rieki-cordon/30min" style="color:#4a7c59">Schedule a discovery call with Rieki</a></p>
<p style="color:#666;font-size:12px;margin-top:32px">Questions? Reply to this email or <a href="${toAbsoluteUrl('/connect')}" style="color:#4a7c59">reach us through our investor contact form</a>.</p>
<p style="color:#666;font-size:12px">ReGen Civics  -  Building the coordination layer for the regenerative transition.</p>
</div>`,
        });
      } catch (e) {
        console.warn("Failed to send LOI confirmation email:", e);
      }

      // Notify owner of new LOI (respects notification preferences)
      try {
        await notifyIfEnabled("loiSubmissions", {
          title: "New Letter of Intent Submitted",
          content: `${input.fullName} (${input.email}) has submitted an LOI for $${input.pledgeAmount.toLocaleString()}. Investor type: ${input.investorType}.`,
        });
      } catch (e) {
        console.warn("Failed to send notification:", e);
      }

      return { id: loiId, success: true };
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
