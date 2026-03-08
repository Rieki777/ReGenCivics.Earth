import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { nanoid } from "nanoid";
import { checkRateLimit } from "./rate-limit";
import { notifyIfEnabled, getNotificationTypeForPath } from "./notify-with-prefs";
import { invokeLLM } from "./_core/llm";
import { CHAT_SYSTEM_PROMPT } from "./_core/oauth";
import { getBannerByKey, getActiveBanners, upsertBanner, deleteBanner, toggleBannerActive } from "./bannerHelpers";
import { adminProcedure } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,

  // File upload router
  files: router({
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate unique file key with user ID prefix
        const ext = input.fileName.split('.').pop() || 'bin';
        const fileKey = `uploads/${ctx.user.id}/${nanoid()}.${ext}`;
        
        // Decode base64 to buffer
        const buffer = Buffer.from(input.fileData, 'base64');
        
        // Upload to S3
        const result = await storagePut(fileKey, buffer, input.contentType);
        
        return {
          url: result.url,
          key: result.key,
          fileName: input.fileName,
        };
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Public stats
  stats: router({
    getPublicStats: publicProcedure.query(async () => {
      return db.getPublicStats();
    }),
  }),

  // Application router
  applications: router({
    // Create a new draft application
    create: protectedProcedure
      .input(z.object({
        projectName: z.string().min(1),
        projectType: z.enum(["early_stage", "mature"]),
        location: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const applicationId = await db.createApplication({
          userId: ctx.user.id,
          status: "draft",
          projectName: input.projectName,
          projectType: input.projectType,
          location: input.location,
          vision: "",
          landStatus: "seeking",
          teamSize: 1,
          teamDescription: "",
          regenerativePractices: "",
          governanceApproach: "",
          communityEngagement: "",
          timeCommitment: "",
          fundingNeeds: "",
        });
        const application = await db.getApplicationById(applicationId);
        if (!application) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve created application" });
        }
        return application;
      }),

    // Update an existing application
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          projectName: z.string().optional(),
          projectType: z.enum(["early_stage", "mature"]).optional(),
          location: z.string().optional(),
          vision: z.string().optional(),
          landStatus: z.enum(["owned", "leased", "committed", "seeking"]).optional(),
          teamSize: z.number().optional(),
          teamDescription: z.string().optional(),
          regenerativePractices: z.string().optional(),
          governanceApproach: z.string().optional(),
          communityEngagement: z.string().optional(),
          timeCommitment: z.string().optional(),
          currentFunding: z.string().optional(),
          fundingNeeds: z.string().optional(),
          websiteUrl: z.string().optional(),
          videoUrl: z.string().optional(),
          documentsUrl: z.string().optional(),
          meetingFrequency: z.enum([
            "everyday",
            "2_3x_week",
            "weekly",
            "2_3x_month",
            "monthly",
            "2_3x_year",
            "yearly_plus"
          ]).optional(),
          dietaryPatterns: z.string().optional(), // JSON array string
          additionalNotes: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          country: z.string().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const application = await db.getApplicationById(input.id);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        if (application.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your application" });
        }
        await db.updateApplication(input.id, input.data);
        const updatedApplication = await db.getApplicationById(input.id);
        if (!updatedApplication) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve updated application" });
        }
        return updatedApplication;
      }),

    // Steward update - approved steward can update public-facing listing fields
    stewardUpdate: protectedProcedure
      .input(z.object({
        applicationId: z.number(),
        websiteUrl: z.string().url().optional().or(z.literal('')),
        videoUrl: z.string().url().optional().or(z.literal('')),
        additionalNotes: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user is an approved steward for this application (orgId is the application ID as string)
        const claims = await db.getOrgClaimsByUser(ctx.user.id);
        const approvedClaim = claims.find(
          (c: any) => c.orgId === String(input.applicationId) && c.status === 'approved'
        );
        if (!approvedClaim && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not the approved steward for this listing" });
        }
        await db.updateApplication(input.applicationId, {
          websiteUrl: input.websiteUrl || undefined,
          videoUrl: input.videoUrl || undefined,
          additionalNotes: input.additionalNotes || undefined,
        });
        return { ok: true };
      }),

    // Submit an application
    submit: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const application = await db.getApplicationById(input.id);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        if (application.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your application" });
        }
        await db.updateApplication(input.id, { status: "submitted", submittedAt: new Date() });
        
        // Notify owner of new application submission (respects notification preferences)
        try {
          await notifyIfEnabled("applicationSubmissions", {
            title: `New Application: ${application.projectName}`,
            content: `A new land project application has been submitted for the Spring Season.\n\n**Project:** ${application.projectName}\n**Type:** ${application.projectType}\n**Location:** ${application.location}\n\nReview it in the admin dashboard.`,
          });
          
          // Send confirmation notification (applicant copy) - always send
          await notifyOwner({
            title: `Application Confirmation - ${application.projectName}`,
            content: `**CONFIRMATION COPY FOR APPLICANT**\n\nThank you for applying to the ReGen Civics Spring Season!\n\n**Project Name:** ${application.projectName}\n**Project Type:** ${application.projectType}\n**Location:** ${application.location}\n**Vision:** ${application.vision?.substring(0, 200)}...\n\nWe will review your application and get back to you soon.\n\n---\nPlease forward this confirmation to the applicant.`,
          });
        } catch (e) {
          console.warn("Failed to send notification:", e);
        }
        
        const submittedApplication = await db.getApplicationById(input.id);
        if (!submittedApplication) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve submitted application" });
        }
        return submittedApplication;
      }),

    // Get user's applications
    myApplications: protectedProcedure.query(async ({ ctx }) => {
      return db.getApplicationsByUserId(ctx.user.id);
    }),

    // Get single application by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const application = await db.getApplicationById(input.id);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        // Users can only see their own applications unless they're admin
        if (application.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return application;
      }),

    // Admin: Get all applications
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getAllApplications();
    }),

    // Admin: Get applications by status
    listByStatus: protectedProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return db.getApplicationsByStatus(input.status);
      }),

    // Admin: Update application status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "changes_requested"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.updateApplication(input.id, { status: input.status });
        
        // Notify owner of status change
        const updatedApp = await db.getApplicationById(input.id);
        if (updatedApp) {
          // Status-specific email content
          const statusMessages: Record<string, { subject: string; content: string }> = {
            under_review: {
              subject: `Your Application is Under Review - ${updatedApp.projectName}`,
              content: `Great news! Your application for **${updatedApp.projectName}** is now being reviewed by our team.\n\nWe'll be in touch soon with our feedback. In the meantime, feel free to explore our resources and connect with other regenerative projects in our network.\n\n**What happens next:**\n- Our review team will evaluate your application\n- We may reach out with questions\n- You'll receive a decision notification\n\nThank you for your patience!`,
            },
            approved: {
              subject: `Congratulations! Your Application is Approved - ${updatedApp.projectName}`,
              content: `Wonderful news! Your application for **${updatedApp.projectName}** has been approved!\n\nWelcome to the ReGen Civics community. We're excited to support your regenerative journey.\n\n**Next Steps:**\n- Our team will reach out to schedule an onboarding call\n- You'll receive access to our partner resources\n- Connect with other projects in our network\n\nWe look forward to co-creating a regenerative future together!`,
            },
            rejected: {
              subject: `Application Update - ${updatedApp.projectName}`,
              content: `Thank you for your application for **${updatedApp.projectName}**.\n\nAfter careful review, we've determined that your project isn't the right fit for our current season. This doesn't reflect on the value of your work - it simply means our current focus areas don't align.\n\n**What you can do:**\n- Review our feedback (if provided)\n- Consider reapplying in a future season\n- Stay connected through our newsletter\n\nWe appreciate your interest in regenerative development and wish you success in your journey.`,
            },
            changes_requested: {
              subject: `Changes Requested - ${updatedApp.projectName}`,
              content: `We've reviewed your application for **${updatedApp.projectName}** and would like to request some additional information or changes.\n\nPlease review the feedback from our team and update your application accordingly. Once you've made the requested changes, we'll continue with the review process.\n\n**How to proceed:**\n- Review the feedback provided\n- Update your application with the requested information\n- Resubmit for continued review\n\nWe're looking forward to learning more about your project!`,
            },
          };
          
          try {
            // Notify owner (admin)
            await notifyOwner({
              title: `Application Status Updated: ${updatedApp.projectName}`,
              content: `Application status changed to: **${input.status}**\n\n**Project:** ${updatedApp.projectName}\n**Location:** ${updatedApp.location}\n**Contact:** ${updatedApp.contactEmail}`,
            });
            
            // Send status-specific email to applicant if we have their email
            if (updatedApp.contactEmail && statusMessages[input.status]) {
              const msg = statusMessages[input.status];
              await notifyOwner({
                title: msg.subject,
                content: `**To:** ${updatedApp.contactEmail}\n\n${msg.content}`,
              });
            }
          } catch (e) {
            console.warn("Failed to send notification:", e);
          }
        }
        
        return { success: true };
      }),

    // Public: Search applications by name/location (for org claim form)
    search: publicProcedure
      .input(z.object({ q: z.string().min(1) }))
      .query(async ({ input }) => {
        return db.searchApplications(input.q);
      }),

    // Self-service: get own application by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const app = await db.getApplicationById(input.id);
        if (!app) throw new TRPCError({ code: 'NOT_FOUND' });
        if (app.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        return app;
      }),

    // Public: Get submitted applications for the globe map (limited fields)
    mapData: publicProcedure.query(async () => {
      const allApps = await db.getAllApplications();
      // Only show submitted/under_review/approved applications with location data
      return allApps
        .filter((app: any) => 
          ["submitted", "under_review", "approved"].includes(app.status) &&
          app.latitude && app.longitude
        )
        .map((app: any) => ({
          id: app.id,
          name: app.projectName,
          type: app.projectType,
          location: app.location,
          latitude: app.latitude,
          longitude: app.longitude,
          country: app.country,
          status: app.status,
          vision: app.vision?.substring(0, 200) || "",
          websiteUrl: app.websiteUrl,
          projectSizeHectares: app.projectSizeHectares,
          meetingFrequency: app.meetingFrequency || undefined,
          dietaryPatterns: app.dietaryPatterns || undefined,
        }));
    }),
  }),

  // Applicants available for campaign creation (submitted or approved)
  applicantsForCampaign: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const allApps = await db.getApplicationsByStatus('submitted');
        const approvedApps = await db.getApplicationsByStatus('approved');
        const combined = [...allApps, ...approvedApps];
        
        let filtered = combined;
        if (input.search && input.search.trim()) {
          const q = input.search.toLowerCase();
          filtered = combined.filter((app: any) => 
            app.projectName?.toLowerCase().includes(q) ||
            app.contactName?.toLowerCase().includes(q) ||
            app.location?.toLowerCase().includes(q)
          );
        }
        
        return filtered.map((app: any) => ({
          id: app.id,
          projectName: app.projectName || '',
          contactName: app.contactName || '',
          location: app.location || '',
          country: app.country || '',
          projectType: app.projectType || '',
          vision: app.vision || '',
          landStatus: app.landStatus || '',
          projectSizeHectares: app.projectSizeHectares || '',
          currentPhase: app.currentPhase || '',
          timeline: app.timeline || '',
          legalStructure: app.legalStructure || '',
          governanceModel: app.governanceModel || '',
          membershipModel: app.membershipModel || '',
          housingPlans: app.housingPlans || '',
          foodSystems: app.foodSystems || '',
          waterSystems: app.waterSystems || '',
          energySystems: app.energySystems || '',
          educationPrograms: app.educationPrograms || '',
          communityEngagement: app.communityEngagement || '',
          impactMetrics: app.impactMetrics || '',
          challenges: app.challenges || '',
          teamSize: app.teamSize || 0,
          teamDescription: app.teamDescription || '',
          regenerativePractices: app.regenerativePractices || '',
          websiteUrl: app.websiteUrl || '',
          videoUrl: app.videoUrl || '',
          status: app.status || '',
        }));
      }),
  }),

  // Review router
  reviews: router({
    // Admin: Create a review
    create: protectedProcedure
      .input(z.object({
        applicationId: z.number(),
        decision: z.enum(["approve", "reject", "request_changes", "pending"]),
        comments: z.string().min(1),
        internalNotes: z.string().optional(),
        alignmentScore: z.number().min(1).max(5).optional(),
        readinessScore: z.number().min(1).max(5).optional(),
        impactScore: z.number().min(1).max(5).optional(),
        teamScore: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const reviewId = await db.createReview({
          ...input,
          reviewerId: ctx.user.id,
        });
        
        // Update application status based on decision
        if (input.decision === "approve") {
          await db.updateApplication(input.applicationId, { status: "approved" });
        } else if (input.decision === "reject") {
          await db.updateApplication(input.applicationId, { status: "rejected" });
        } else if (input.decision === "request_changes") {
          await db.updateApplication(input.applicationId, { status: "changes_requested" });
        }
        
        return { id: reviewId };
      }),

    // Get reviews for an application
    getByApplicationId: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const application = await db.getApplicationById(input.applicationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        // Users can see reviews for their own applications, admins can see all
        if (application.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        const allReviews = await db.getReviewsByApplicationId(input.applicationId);
        
        // Hide internal notes from non-admin users
        if (ctx.user.role !== "admin") {
          return allReviews.map(review => ({
            ...review,
            internalNotes: null,
          }));
        }
        
        return allReviews;
      }),
  }),

  // Investor Inquiry router
  investorInquiries: router({
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
        checkRateLimit(ctx, "investor_inquiry");
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
          const { sendEmail, emailTemplates: emailTpl } = await import("./_core/email");
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
          const { emailTemplates: dripTpl } = await import("./_core/email");
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

    // Admin: Get all investor inquiries
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getAllInvestorInquiries();
    }),

    // Admin: Get investor inquiry by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const inquiry = await db.getInvestorInquiryById(input.id);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
        }
        return inquiry;
      }),

    // Admin: Update investor inquiry status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "in_discussion", "committed", "declined", "archived"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.updateInvestorInquiry(input.id, { status: input.status });
        return { success: true };
      }),

    // Self-service: get own investor inquiry
    mine: protectedProcedure.query(async ({ ctx }) => {
      return db.getInvestorInquiryByUserId(ctx.user.id);
    }),
  }),

  // General Inquiry router (Catch-all Routing Form)
  generalInquiries: router({
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
        checkRateLimit(ctx, "general_inquiry");
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
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getAllGeneralInquiries();
    }),

    // Admin: Get general inquiries by path
    listByPath: protectedProcedure
      .input(z.object({ pathType: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return db.getGeneralInquiriesByPath(input.pathType);
      }),

    // Admin: Get general inquiry by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const inquiry = await db.getGeneralInquiryById(input.id);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
        }
        return inquiry;
      }),

    // Admin: Update general inquiry status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "in_progress", "completed", "archived"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.updateGeneralInquiry(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // Reviewer Emails router (Admin only)
  reviewerEmails: router({
    // Admin: Get all reviewer emails
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getAllReviewerEmails();
    }),

    // Admin: Add a new reviewer email
    create: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        notifyApplications: z.boolean().default(true),
        notifyInvestors: z.boolean().default(true),
        notifyInquiries: z.boolean().default(true),
        inquiryTypes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
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
    update: protectedProcedure
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const updateData: Record<string, unknown> = {};
        if (input.data.email !== undefined) updateData.email = input.data.email;
        if (input.data.name !== undefined) updateData.name = input.data.name;
        if (input.data.notifyApplications !== undefined) updateData.notifyApplications = input.data.notifyApplications ? 1 : 0;
        if (input.data.notifyInvestors !== undefined) updateData.notifyInvestors = input.data.notifyInvestors ? 1 : 0;
        if (input.data.notifyInquiries !== undefined) updateData.notifyInquiries = input.data.notifyInquiries ? 1 : 0;
        if (input.data.inquiryTypes !== undefined) updateData.inquiryTypes = JSON.stringify(input.data.inquiryTypes);
        if (input.data.isActive !== undefined) updateData.isActive = input.data.isActive ? 1 : 0;
        
        await db.updateReviewerEmail(input.id, updateData as any);
        return { success: true };
      }),

    // Admin: Delete a reviewer email
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.deleteReviewerEmail(input.id);
        return { success: true };
      }),
  }),

  // Video Suggestions router
  videoSuggestions: router({
    // Get all approved suggestions for voting
    list: publicProcedure.query(async () => {
      return db.getAllVideoSuggestions();
    }),

    // Submit a new video suggestion
    create: publicProcedure
      .input(z.object({
        title: z.string().min(5).max(255),
        description: z.string().optional(),
        category: z.enum(["how_to_play", "how_to_participate", "how_to_invest", "how_to_apply", "how_to_contribute", "other"]).default("other"),
        submitterEmail: z.string().email().optional(),
        submitterName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createVideoSuggestion({
          title: input.title,
          description: input.description || null,
          category: input.category,
          submitterEmail: input.submitterEmail || null,
          submitterName: input.submitterName || null,
          voteCount: 1, // Auto-vote for your own suggestion
          voterEmails: input.submitterEmail ? JSON.stringify([input.submitterEmail]) : null,
          status: "pending",
        });
        return { id, success: true };
      }),

    // Vote for a suggestion
    vote: publicProcedure
      .input(z.object({
        id: z.number(),
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const suggestion = await db.getVideoSuggestionById(input.id);
        if (!suggestion) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not found" });
        }
        
        // Check if already voted
        const voterEmails: string[] = suggestion.voterEmails ? JSON.parse(suggestion.voterEmails) : [];
        if (voterEmails.includes(input.email)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You have already voted for this suggestion" });
        }
        
        // Add vote
        voterEmails.push(input.email);
        await db.updateVideoSuggestion(input.id, {
          voteCount: suggestion.voteCount + 1,
          voterEmails: JSON.stringify(voterEmails),
        });
        
        return { success: true, newVoteCount: suggestion.voteCount + 1 };
      }),

    // Admin: Update suggestion status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "in_production", "completed", "rejected"]),
        completedVideoUrl: z.string().optional(),
        completedBlogSlug: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.updateVideoSuggestion(input.id, {
          status: input.status,
          completedVideoUrl: input.completedVideoUrl || null,
          completedBlogSlug: input.completedBlogSlug || null,
        });
        return { success: true };
      }),

    // Admin: Delete a suggestion
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.deleteVideoSuggestion(input.id);
        return { success: true };
      }),
  }),

  // Player Profiles router
  playerProfiles: router({
    // Get all active player profiles
    list: publicProcedure.query(async () => {
      return db.getAllPlayerProfiles();
    }),

    // Get verified players (leaderboard)
    leaderboard: publicProcedure.query(async () => {
      return db.getVerifiedPlayerProfiles();
    }),

    // Get current user's profile
    me: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      return profile || null;
    }),

    // Get profile by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getPlayerProfileById(input.id);
      }),

    // Create player profile
    create: protectedProcedure
      .input(z.object({
        displayName: z.string().min(2).max(255),
        bio: z.string().optional(),
        avatarUrl: z.string().optional(),
        baseAccountName: z.string().optional(),
        hyphaProfileUrl: z.string().optional(),
        walletAddress: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already has a profile
        const existing = await db.getPlayerProfileByUserId(ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You already have a player profile" });
        }
        
        const id = await db.createPlayerProfile({
          userId: ctx.user.id,
          displayName: input.displayName,
          email: ctx.user.email || null,
          bio: input.bio || null,
          avatarUrl: input.avatarUrl || null,
          baseAccountName: input.baseAccountName || null,
          hyphaProfileUrl: input.hyphaProfileUrl || null,
          walletAddress: input.walletAddress || null,
          badges: null,
          questsCompleted: null,
          totalContributionValue: 0,
          rvoiceBalance: 0,
          rgenBalance: 0,
          isVerified: 0,
          isActive: 1,
        });
        return { id, success: true };
      }),

    // Update player profile
    update: protectedProcedure
      .input(z.object({
        displayName: z.string().min(2).max(255).optional(),
        bio: z.string().optional(),
        avatarUrl: z.string().optional(),
        baseAccountName: z.string().optional(),
        hyphaProfileUrl: z.string().optional(),
        walletAddress: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getPlayerProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        }
        
        await db.updatePlayerProfile(profile.id, {
          displayName: input.displayName,
          bio: input.bio,
          avatarUrl: input.avatarUrl,
          baseAccountName: input.baseAccountName,
          hyphaProfileUrl: input.hyphaProfileUrl,
          walletAddress: input.walletAddress,
        });
        return { success: true };
      }),

    // Update email digest frequency preference
    updateDigestFrequency: protectedProcedure
      .input(z.object({
        frequency: z.enum(["never", "weekly", "monthly", "seasonal"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getPlayerProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Create a profile first" });
        }
        await db.updatePlayerProfile(profile.id, {
          emailDigestFrequency: input.frequency,
        });
        return { success: true };
      }),

    // Link Base blockchain account
    linkBaseAccount: protectedProcedure
      .input(z.object({
        baseAccountName: z.string().min(1),
        hyphaProfileUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getPlayerProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Create a profile first" });
        }
        
        // Check if this Base account is already linked to another profile
        const existingProfile = await db.getPlayerProfileByBaseAccount(input.baseAccountName);
        if (existingProfile && existingProfile.id !== profile.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This Base account is already linked to another profile" });
        }
        
        await db.updatePlayerProfile(profile.id, {
          baseAccountName: input.baseAccountName,
          hyphaProfileUrl: input.hyphaProfileUrl || null,
        });
        return { success: true };
      }),

    // Admin: Verify a player profile
    verify: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.updatePlayerProfile(input.id, { isVerified: 1 });
        return { success: true };
      }),

    // Self-service: sync own token balances from Base blockchain.
    // Rate-limited to once per 5 minutes by checking lastTokenSync.
    syncTokens: protectedProcedure
      .mutation(async ({ ctx }) => {
        const profile = await db.getPlayerProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Player profile not found" });
        }
        if (!profile.walletAddress) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No wallet address on profile" });
        }

        // Rate limit: don't sync more than once per 5 minutes
        if (profile.lastTokenSync) {
          const msSince = Date.now() - new Date(profile.lastTokenSync).getTime();
          if (msSince < 5 * 60 * 1000) {
            return {
              rvoice: profile.rvoiceBalance,
              rgen: profile.rgenBalance,
              cached: true,
            };
          }
        }

        const { fetchTokenBalances } = await import("./blockchain");
        const balances = await fetchTokenBalances(profile.walletAddress);

        await db.updatePlayerProfile(profile.id, {
          rvoiceBalance: balances.rvoice,
          rgenBalance: balances.rgen,
          lastTokenSync: new Date(),
        });

        return { rvoice: balances.rvoice, rgen: balances.rgen, cached: false };
      }),

    // Admin: force-sync any profile by ID
    adminSyncTokens: adminProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ input }) => {
        const profile = await db.getPlayerProfileById(input.profileId);
        if (!profile || !profile.walletAddress) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Profile not found or no wallet address" });
        }
        const { fetchTokenBalances } = await import("./blockchain");
        const balances = await fetchTokenBalances(profile.walletAddress);
        await db.updatePlayerProfile(profile.id, {
          rvoiceBalance: balances.rvoice,
          rgenBalance: balances.rgen,
          lastTokenSync: new Date(),
        });
        return { rvoice: balances.rvoice, rgen: balances.rgen };
      }),

    // Admin: Award badge
    awardBadge: protectedProcedure
      .input(z.object({
        id: z.number(),
        badgeId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const profile = await db.getPlayerProfileById(input.id);
        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        }
        
        const badges: string[] = profile.badges ? JSON.parse(profile.badges) : [];
        if (!badges.includes(input.badgeId)) {
          badges.push(input.badgeId);
          await db.updatePlayerProfile(input.id, { badges: JSON.stringify(badges) });
        }
        return { success: true };
      }),
  }),

  // Email sending router (direct sending via Resend)
  email: router({
    // Send email directly via Resend
    sendDirect: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        recipientName: z.string(),
        templateType: z.enum(["follow_up", "acceptance", "not_selected", "request_info", "schedule_call", "custom", "land_project_accepted"]),
        customSubject: z.string().optional(),
        customBody: z.string().optional(),
        inquiryType: z.enum(["investor", "alliance", "project", "general"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { sendEmail, emailTemplates } = await import("./_core/email");

        let emailContent: { subject: string; html: string };

        // If the caller passes custom subject + body (from compose dialog), always use them.
        // This respects admin edits regardless of the template type label used for logging.
        if (input.customSubject && input.customBody) {
          const htmlBody = input.customBody
            .split(/\n\n+/)
            .map((para: string) => para.trim())
            .filter(Boolean)
            .map((para: string) => `<p style="color: #333; line-height: 1.6;">${para.replace(/\n/g, "<br/>")}</p>`)
            .join("");
          emailContent = {
            subject: input.customSubject,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">${htmlBody}<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;"><p style="color: #4a7c59; font-weight: bold;">The ReGen Civics Team</p></div></div>`,
          };
        } else if (input.templateType === "land_project_accepted") {
          emailContent = emailTemplates.landProjectAccepted("Project Name", input.recipientName);
        } else if (input.templateType === "follow_up") {
          emailContent = emailTemplates.followUp(input.recipientName);
        } else if (input.templateType === "request_info") {
          emailContent = emailTemplates.requestMoreInfo(input.recipientName, input.customBody || "Please provide additional information.");
        } else if (input.templateType === "acceptance") {
          emailContent = emailTemplates.applicationReceived(input.customSubject || "Your Application", input.recipientName);
        } else if (input.templateType === "not_selected") {
          emailContent = {
            subject: `ReGen Civics Application Update`,
            html: `
              <h2 style="color: #1a472a; margin-top: 0;">Hello ${input.recipientName},</h2>
              <p style="color: #333; line-height: 1.6;">Thank you so much for your interest in ReGen Civics and for taking the time to share your vision with us.</p>
              <p style="color: #333; line-height: 1.6;">After careful consideration, we've decided not to move forward with your application at this time. This decision doesn't reflect on the value of your work. We simply have limited capacity and must make difficult choices.</p>
              <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #4a7c59; margin-top: 0;">What You Can Do</h3>
                <ul style="color: #333; line-height: 1.8;">
                  <li>Stay connected with our community through our newsletter and events</li>
                  <li>Reapply in future seasons as your project evolves</li>
                  <li>Explore other ways to participate in the regenerative movement</li>
                </ul>
              </div>
              <p style="color: #333;">Thank you for being part of the regenerative renaissance. We wish you all the best in your journey!</p>
              <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p>
              </div>
            `,
          };
        } else if (input.templateType === "schedule_call") {
          emailContent = {
            subject: `Let's Connect - ReGen Civics`,
            html: `
              <h2 style="color: #1a472a; margin-top: 0;">Hello ${input.recipientName},</h2>
              <p style="color: #333; line-height: 1.6;">Thank you for your interest in ReGen Civics! We'd love to connect with you directly to discuss your inquiry in more detail.</p>
              <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="color: #4a7c59; font-size: 16px; margin: 0 0 15px 0;">Schedule a call at a time that works for you:</p>
                <a href="https://calendly.com/rieki-cordon/30min" style="display: inline-block; background: #4a7c59; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Book a 30-Minute Call</a>
              </div>
              <p style="color: #333; line-height: 1.6;">During our call, we can answer your questions, discuss alignment, and explore collaboration opportunities.</p>
              <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p>
              </div>
            `,
          };
        } else if (input.templateType === "custom" && input.customSubject && input.customBody) {
          emailContent = {
            subject: input.customSubject,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">${input.customBody}</div>`,
          };
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid template type or missing custom content" });
        }
        
        // Create email log entry first
        let logId: number | undefined;
        try {
          logId = await db.createEmailLog({
            recipientEmail: input.to,
            recipientName: input.recipientName,
            subject: emailContent.subject,
            template: input.templateType,
            inquiryType: input.inquiryType || "general",
            status: "sent",
          });
        } catch (e) {
          console.warn("Failed to create email log:", e);
        }
        
        const emailResult = await sendEmail({
          to: input.to,
          subject: emailContent.subject,
          html: emailContent.html,
          replyTo: "rieki@pm.me",
          emailLogId: logId,
        });
        
        if (!emailResult.id) {
          // Update log status to failed
          if (logId) {
            try { await db.updateEmailLogStatus(logId, "failed"); } catch (e) { /* ignore */ }
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send email" });
        }
        
        // Log the email action via notification
        try {
          await notifyOwner({
            title: `Email Sent: ${input.templateType} to ${input.recipientName}`,
            content: `Admin sent a ${input.templateType} email to ${input.to} (${input.recipientName}).\n\nEmail ID: ${emailResult.id}\nInquiry type: ${input.inquiryType || "general"}`,
          });
        } catch (e) {
          console.warn("Failed to log email action:", e);
        }
        
        return { success: true, emailId: emailResult.id };
      }),

    // Send email via mailto (generates mailto link with template)
    generateMailto: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        recipientName: z.string(),
        templateType: z.enum(["follow_up", "acceptance", "not_selected", "request_info", "schedule_call", "custom", "land_project_accepted"]),
        customSubject: z.string().optional(),
        customBody: z.string().optional(),
        inquiryType: z.enum(["investor", "alliance", "project", "general"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const calendlyLink = "https://calendly.com/rieki-cordon/30min";
        const templates: Record<string, { subject: string; body: string }> = {
          follow_up: {
            subject: `Following Up - ReGen Civics`,
            body: `Hi ${input.recipientName},\n\nI wanted to follow up on your recent inquiry with ReGen Civics.\n\nWe are excited about the possibility of working together and would love to schedule a call to discuss next steps.\n\nWould you be available for a brief conversation? You can book a time that works for you here: ${calendlyLink}\n\nLooking forward to connecting!\n\nWarm regards,\nThe ReGen Civics Team`,
          },
          acceptance: {
            subject: `Welcome to ReGen Civics!`,
            body: `Hi ${input.recipientName},\n\nGreat news! We are thrilled to welcome you to the ReGen Civics community.\n\nYour application has been reviewed and we believe you would be a wonderful addition to our regenerative alliance.\n\nNext steps:\n1. Join our next Open Session to meet the community\n2. Complete your player profile at our website\n3. Schedule a call to discuss your journey: ${calendlyLink}\n\nWe are excited to have you on board!\n\nWarm regards,\nThe ReGen Civics Team`,
          },
          not_selected: {
            subject: `Update on Your ReGen Civics Application`,
            body: `Hi ${input.recipientName},\n\nThank you for your interest in ReGen Civics and for taking the time to submit your application.\n\nAfter careful consideration, we have decided not to move forward at this time. This decision was not easy, as we received many wonderful applications.\n\nWe encourage you to:\n- Stay connected through our newsletter\n- Join our Open Sessions to learn more\n- Consider reapplying in future seasons\n\nWe appreciate your passion for regeneration and wish you all the best in your journey.\n\nWarm regards,\nThe ReGen Civics Team`,
          },
          request_info: {
            subject: `Additional Information Needed - ReGen Civics`,
            body: `Hi ${input.recipientName},\n\nThank you for your inquiry with ReGen Civics!\n\nTo help us better understand your situation and how we might work together, could you please provide some additional information?\n\n[Please specify what information you need]\n\nFeel free to reply to this email or schedule a call to discuss: ${calendlyLink}\n\nLooking forward to learning more!\n\nWarm regards,\nThe ReGen Civics Team`,
          },
          schedule_call: {
            subject: `Let's Connect - ReGen Civics`,
            body: `Hi ${input.recipientName},\n\nI would love to schedule a call to discuss your interest in ReGen Civics and answer any questions you might have.\n\nPlease book a time that works for you: ${calendlyLink}\n\nLooking forward to our conversation!\n\nWarm regards,\nThe ReGen Civics Team`,
          },
          land_project_accepted: {
            subject: `Congratulations! Your Project Passed Our Quality Check - ReGen Civics`,
            body: `Hi ${input.recipientName},\n\nGreat news! Your land project has passed our first quality check for ReGen Civics Season 2.\n\nWhat this means:\n- Your project meets our criteria for regenerative land projects\n- Final participation in the season is dependent on the community governance process\n- We highly encourage you to follow along the journey regardless of the final selection\n\nImportant: If you complete all the steps in our process, you may still be eligible for joining the alliance even if not selected in this round!\n\nNext steps:\n1. Join our Open Sessions to stay connected\n2. Complete any remaining application materials\n3. Participate in the governance process\n\nSchedule a call to discuss: ${calendlyLink}\n\nWe are excited about your project and look forward to the journey ahead!\n\nWarm regards,\nThe ReGen Civics Team`,
          },
          custom: {
            subject: input.customSubject || "Message from ReGen Civics",
            body: input.customBody || `Hi ${input.recipientName},\n\n[Your message here]\n\nWarm regards,\nThe ReGen Civics Team`,
          },
        };
        
        const template = templates[input.templateType];
        const subject = encodeURIComponent(template.subject);
        const body = encodeURIComponent(template.body);
        const mailtoLink = `mailto:${input.to}?subject=${subject}&body=${body}`;
        
        // Log the email action for tracking
        try {
          await notifyOwner({
            title: `Email Sent: ${input.templateType} to ${input.recipientName}`,
            content: `Admin sent a ${input.templateType} email to ${input.to} (${input.recipientName}).\n\nInquiry type: ${input.inquiryType || "general"}`,
          });
        } catch (e) {
          console.warn("Failed to log email action:", e);
        }
        
        return { mailtoLink, subject: template.subject, body: template.body };
      }),

    // Log email sent (for tracking purposes)
    logSent: protectedProcedure
      .input(z.object({
        recipientEmail: z.string().email(),
        recipientName: z.string(),
        templateType: z.string(),
        inquiryType: z.string().optional(),
        inquiryId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        // Log to notification system
        await notifyOwner({
          title: `Email Logged: ${input.templateType}`,
          content: `Email sent to ${input.recipientEmail} (${input.recipientName})\nTemplate: ${input.templateType}\nInquiry: ${input.inquiryType || "N/A"} #${input.inquiryId || "N/A"}`,
        });
        
        return { success: true };
      }),

    // Get email logs for analytics
    getLogs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      return await db.getAllEmailLogs();
    }),

    // Get email logs for a specific contact by email address
    getLogsForEmail: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return await db.getEmailLogsByEmail(input.email);
      }),

    // Send test email
    sendTest: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        template: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { sendEmail, emailTemplates } = await import("./_core/email");
        
        // Get template content based on template ID
        let emailContent: { subject: string; html: string };
        const testName = "Test User";
        const testProject = "Test Project";
        const testInvestment = "$100k - $250k";
        
        switch (input.template) {
          case "applicationReceived":
            emailContent = emailTemplates.applicationReceived(testProject, testName);
            break;
          case "landProjectAccepted":
            emailContent = emailTemplates.landProjectAccepted(testProject, testName);
            break;
          case "investorWelcome":
            emailContent = emailTemplates.investorWelcome(testName, testInvestment);
            break;
          case "newsletterWelcome":
            emailContent = emailTemplates.newsletterWelcome(testName);
            break;
          case "followUp":
            emailContent = emailTemplates.followUp(testName);
            break;
          case "requestMoreInfo":
            emailContent = emailTemplates.requestMoreInfo(testName, "<p>Please provide more details about your project timeline and budget.</p>");
            break;
          case "notSelected":
            emailContent = {
              subject: "ReGen Civics Application Update",
              html: `<h2 style="color: #1a472a; margin-top: 0;">Hello ${testName},</h2><p style="color: #333; line-height: 1.6;">Thank you so much for your interest in ReGen Civics. After careful consideration, we've decided not to move forward with your application at this time.</p><div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="color: #4a7c59; margin-top: 0;">What You Can Do</h3><ul style="color: #333; line-height: 1.8;"><li>Stay connected through our newsletter and events</li><li>Reapply in future seasons</li><li>Explore other ways to participate</li></ul></div><div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;"><p style="color: #4a7c59; font-weight: bold;">The ReGen Civics Team</p></div>`,
            };
            break;
          case "scheduleCall":
            emailContent = {
              subject: "Let's Connect - ReGen Civics",
              html: `<h2 style="color: #1a472a; margin-top: 0;">Hello ${testName},</h2><p style="color: #333; line-height: 1.6;">We'd love to connect with you directly to discuss your inquiry.</p><div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;"><p style="color: #4a7c59; font-size: 16px; margin: 0 0 15px 0;">Schedule a call at a time that works for you:</p><a href="https://calendly.com/rieki-cordon/30min" style="display: inline-block; background: #4a7c59; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Book a 30-Minute Call</a></div><div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;"><p style="color: #4a7c59; font-weight: bold;">The ReGen Civics Team</p></div>`,
            };
            break;
          case "contributionAccepted":
            emailContent = emailTemplates.contributionAccepted(testName, "Sample Contribution", "Sample Campaign");
            break;
          case "contributionRejected":
            emailContent = emailTemplates.contributionRejected(testName, "Sample Contribution", "Sample Campaign");
            break;
          case "contributionFulfilled":
            emailContent = emailTemplates.contributionFulfilled(testName, "Sample Contribution", "Sample Campaign");
            break;
          default:
            emailContent = emailTemplates.newsletterWelcome(testName);
        }
        
        const result = await sendEmail({
          to: input.email,
          subject: `[TEST] ${emailContent.subject}`,
          html: emailContent.html,
        });
        
        if (!result.id) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send test email" });
        }
        
        return { success: true, emailId: result.id };
      }),

    // Get email template preview
    getPreview: protectedProcedure
      .input(z.object({
        template: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { emailTemplates } = await import("./_core/email");
        
        // Generate preview with sample data
        const testName = "Jane Smith";
        const testProject = "Green Valley Regenerative Farm";
        const testInvestment = "$100k - $250k";
        
        let emailContent: { subject: string; html: string };
        
        switch (input.template) {
          case "applicationReceived":
            emailContent = emailTemplates.applicationReceived(testProject, testName);
            break;
          case "landProjectAccepted":
            emailContent = emailTemplates.landProjectAccepted(testProject, testName);
            break;
          case "investorWelcome":
            emailContent = emailTemplates.investorWelcome(testName, testInvestment);
            break;
          case "newsletterWelcome":
            emailContent = emailTemplates.newsletterWelcome(testName);
            break;
          case "followUp":
            emailContent = emailTemplates.followUp(testName);
            break;
          case "requestMoreInfo":
            emailContent = emailTemplates.requestMoreInfo(testName, "<p>Please provide more details about your project timeline and budget.</p>");
            break;
          case "notSelected":
            emailContent = {
              subject: "ReGen Civics Application Update",
              html: `<h2 style="color: #1a472a; margin-top: 0;">Hello ${testName},</h2><p style="color: #333; line-height: 1.6;">Thank you so much for your interest in ReGen Civics and for taking the time to share your vision with us.</p><p style="color: #333; line-height: 1.6;">After careful consideration, we've decided not to move forward with your application at this time. This decision doesn't reflect on the value of your work. We simply have limited capacity and must make difficult choices.</p><div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="color: #4a7c59; margin-top: 0;">What You Can Do</h3><ul style="color: #333; line-height: 1.8;"><li>Stay connected with our community through our newsletter and events</li><li>Reapply in future seasons as your project evolves</li><li>Explore other ways to participate in the regenerative movement</li></ul></div><p style="color: #333;">Thank you for being part of the regenerative renaissance. We wish you all the best in your journey!</p><div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;"><p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p></div>`,
            };
            break;
          case "scheduleCall":
            emailContent = {
              subject: "Let's Connect - ReGen Civics",
              html: `<h2 style="color: #1a472a; margin-top: 0;">Hello ${testName},</h2><p style="color: #333; line-height: 1.6;">Thank you for your interest in ReGen Civics! We'd love to connect with you directly to discuss your inquiry in more detail.</p><div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;"><p style="color: #4a7c59; font-size: 16px; margin: 0 0 15px 0;">Schedule a call at a time that works for you:</p><a href="https://calendly.com/rieki-cordon/30min" style="display: inline-block; background: #4a7c59; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Book a 30-Minute Call</a></div><p style="color: #333; line-height: 1.6;">During our call, we can answer your questions, discuss alignment, and explore collaboration opportunities.</p><div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;"><p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p></div>`,
            };
            break;
          case "contributionAccepted":
            emailContent = emailTemplates.contributionAccepted(testName, "Organic Seed Library", "Green Valley Community Garden");
            break;
          case "contributionRejected":
            emailContent = emailTemplates.contributionRejected(testName, "Organic Seed Library", "Green Valley Community Garden");
            break;
          case "contributionFulfilled":
            emailContent = emailTemplates.contributionFulfilled(testName, "Organic Seed Library", "Green Valley Community Garden");
            break;
          default:
            emailContent = emailTemplates.newsletterWelcome(testName);
        }
        
        // Wrap with branded template for preview
        const wrappedHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Preview</title>
          </head>
          <body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: 'Nunito', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #7dd87d; margin: 0; font-size: 24px;">ReGen Civics</h1>
                <p style="color: #a8e6a8; margin: 5px 0 0 0; font-size: 12px;">An Infinite Game for the Regenerative Renaissance</p>
              </div>
              <div style="padding: 30px 25px;">
                ${emailContent.html}
              </div>
              <div style="background: #f0f7f0; padding: 25px 20px; margin-top: 30px; border-radius: 0 0 8px 8px; border-top: 3px solid #7dd87d;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <p style="color: #1a472a; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Connect With Us</p>
                  <p style="color: #4a7c59; font-size: 12px;">WhatsApp | Discord | YouTube</p>
                </div>
                <div style="background: #e8f5e9; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                  <p style="color: #1a472a; font-size: 13px; margin: 0; text-align: center;">
                    <strong>Questions or want to engage?</strong><br>
                    <span style="color: #4a7c59;">We don't respond to emails directly. Please join our community on WhatsApp or Discord!</span>
                  </p>
                </div>
                <div style="text-align: center; border-top: 1px solid #c8e6c9; padding-top: 15px;">
                  <p style="color: #888; font-size: 11px; margin: 0;">This is an automated message. Please do not reply.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
        
        return { subject: emailContent.subject, html: wrappedHtml };
      }),

    // Get all custom templates from database
    getCustomTemplates: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return await db.getAllCustomTemplates();
    }),

    // Save or update a custom template
    saveCustomTemplate: protectedProcedure
      .input(z.object({
        templateKey: z.string(),
        customSubject: z.string().nullable().optional(),
        customBody: z.string().nullable().optional(),
        isActive: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.upsertCustomTemplate({
          ...input,
          lastEditedBy: ctx.user.name || ctx.user.email || "Admin",
        });
        return { success: true };
      }),

    // Delete a custom template (revert to default)
    deleteCustomTemplate: protectedProcedure
      .input(z.object({ templateKey: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.deleteCustomTemplate(input.templateKey);
        return { success: true };
      }),

    // Send bulk emails to multiple recipients
    sendBulk: protectedProcedure
      .input(z.object({
        recipients: z.array(z.object({
          email: z.string().email(),
          name: z.string(),
        })).min(1).max(100),
        templateType: z.enum(["follow_up", "acceptance", "not_selected", "request_info", "schedule_call", "custom", "land_project_accepted", "newsletter_welcome", "investor_welcome"]),
        customSubject: z.string().optional(),
        customBody: z.string().optional(),
        mergeFields: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { sendEmail, emailTemplates: templates } = await import("./_core/email");
        const results: { email: string; success: boolean; error?: string }[] = [];
        
        for (const recipient of input.recipients) {
          try {
            let emailContent: { subject: string; html: string };
            const name = recipient.name || "Friend";

            // If caller passes custom subject + body, always use them (respects compose-dialog edits).
            // {{name}} and {{email}} are merged per-recipient.
            if (input.customSubject && input.customBody) {
              const rawBody = input.customBody
                .replace(/\{\{name\}\}/g, name)
                .replace(/\{\{email\}\}/g, recipient.email);
              const htmlBody = rawBody
                .split(/\n\n+/)
                .map((para: string) => para.trim())
                .filter(Boolean)
                .map((para: string) => `<p style="color: #333; line-height: 1.6;">${para.replace(/\n/g, "<br/>")}</p>`)
                .join("");
              emailContent = {
                subject: input.customSubject,
                html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">${htmlBody}<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;"><p style="color: #4a7c59; font-weight: bold;">The ReGen Civics Team</p></div></div>`,
              };
            } else switch (input.templateType) {
              case "newsletter_welcome":
                emailContent = templates.newsletterWelcome(name);
                break;
              case "investor_welcome":
                emailContent = templates.investorWelcome(name, (input.mergeFields as Record<string, string>)?.investmentRange || "Not specified");
                break;
              case "follow_up":
                emailContent = templates.followUp(name);
                break;
              case "acceptance":
                emailContent = {
                  subject: "Welcome to ReGen Civics!",
                  html: `<h2 style="color: #1a472a;">Hello ${name},</h2><p style="color: #333; line-height: 1.6;">Great news! We are thrilled to welcome you to the ReGen Civics community.</p><div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="color: #4a7c59; margin-top: 0;">Next Steps</h3><ul style="color: #333; line-height: 1.8;"><li>Join our next Open Session</li><li>Complete your player profile</li><li>Schedule a discovery call</li></ul></div><p style="color: #4a7c59; font-weight: bold;">The ReGen Civics Team</p>`,
                };
                break;
              case "not_selected":
                emailContent = {
                  subject: "Update on Your ReGen Civics Application",
                  html: `<h2 style="color: #1a472a;">Hello ${name},</h2><p style="color: #333; line-height: 1.6;">Thank you for your interest in ReGen Civics. After careful consideration, we've decided not to move forward at this time.</p><div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="color: #4a7c59; margin-top: 0;">What You Can Do</h3><ul style="color: #333; line-height: 1.8;"><li>Stay connected through our newsletter</li><li>Join our Open Sessions</li><li>Reapply in future seasons</li></ul></div><p style="color: #4a7c59; font-weight: bold;">The ReGen Civics Team</p>`,
                };
                break;
              case "schedule_call":
                emailContent = {
                  subject: "Let's Connect - ReGen Civics",
                  html: `<h2 style="color: #1a472a;">Hello ${name},</h2><p style="color: #333; line-height: 1.6;">We'd love to schedule a call to discuss your interest in ReGen Civics.</p><div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;"><a href="https://calendly.com/rieki-cordon/30min" style="display: inline-block; background: #4a7c59; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Book a 30-Minute Call</a></div><p style="color: #4a7c59; font-weight: bold;">The ReGen Civics Team</p>`,
                };
                break;
              case "request_info":
                emailContent = templates.requestMoreInfo(name, input.customBody || "<p>Please provide additional information.</p>");
                break;
              case "land_project_accepted":
                emailContent = templates.landProjectAccepted((input.mergeFields as Record<string, string>)?.projectName || "Your Project", name);
                break;
              case "custom":
                emailContent = {
                  subject: input.customSubject || "Message from ReGen Civics",
                  html: (input.customBody || `<p>Hello ${name},</p><p>Thank you for being part of the regenerative renaissance.</p>`).replace(/\{\{name\}\}/g, name).replace(/\{\{email\}\}/g, recipient.email),
                };
                break;
              default:
                emailContent = templates.newsletterWelcome(name);
            }
            
            // Apply merge fields to subject and body
            if (input.mergeFields) {
              for (const [key, val] of Object.entries(input.mergeFields)) {
                const replacement = String(val);
                emailContent.subject = emailContent.subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), replacement);
                emailContent.html = emailContent.html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), replacement);
              }
            }
            
            const result = await sendEmail({
              to: recipient.email,
              subject: emailContent.subject,
              html: emailContent.html,
            });
            
            results.push({ email: recipient.email, success: !!result.id });
            
            // Small delay between sends to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error: any) {
            results.push({ email: recipient.email, success: false, error: error.message });
          }
        }
        
        // Log bulk email action
        const successCount = results.filter(r => r.success).length;
        try {
          await notifyOwner({
            title: `Bulk Email Sent: ${input.templateType}`,
            content: `Admin sent bulk ${input.templateType} emails to ${input.recipients.length} recipients.\n\nSuccess: ${successCount}/${input.recipients.length}`,
          });
        } catch (e) {
          console.warn("Failed to log bulk email action:", e);
        }
        
        return { results, totalSent: successCount, totalFailed: input.recipients.length - successCount };
      }),
  }),

  // Newsletter Subscribers router
  newsletter: router({
    // Subscribe to newsletter (public - no login required)
    subscribe: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        source: z.enum(["homepage", "investor_form", "connect_form", "apply_form", "footer", "exit_intent", "other"]).default("other"),
      }))
      .mutation(async ({ ctx, input }) => {
        checkRateLimit(ctx, "newsletter_subscribe");
        const subscriberId = await db.createNewsletterSubscriber({
          email: input.email,
          name: input.name || null,
          source: input.source,
          isActive: 1,
        });
        return { id: subscriberId, success: true };
      }),

    // Get all newsletter subscribers (password protected admin page)
    list: publicProcedure.query(async () => {
      return db.getAllNewsletterSubscribers();
    }),

    // Admin: Get active newsletter subscribers
    listActive: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getActiveNewsletterSubscribers();
    }),

    // Unsubscribe from newsletter (public)
    unsubscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await db.unsubscribeNewsletter(input.email);
        return { success: true };
      }),
  }),

  // Crowd Pooling Projects router
  crowdPoolingProjects: router({
    // Get all active projects (public)
    list: publicProcedure.query(async () => {
      return db.getActiveCrowdPoolingProjects();
    }),

    // Get all projects including inactive (admin only)
    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getAllCrowdPoolingProjects();
    }),

    // Get project by ID (public)
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCrowdPoolingProjectById(input.id);
      }),

    // Create new project (admin only)
    create: protectedProcedure
      .input(z.object({
        projectName: z.string(),
        projectDescription: z.string(),
        location: z.string().optional(),
        targetAmount: z.number(),
        targetCurrency: z.string(),
        currentAmount: z.number().default(0),
        contributorCount: z.number().default(0),
        status: z.enum(["upcoming", "active", "completed", "paused"]).default("active"),
        projectImageUrl: z.string().optional(),
        projectUrl: z.string().optional(),
        applicationId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const projectId = await db.createCrowdPoolingProject({
          ...input,
          isVisible: 1,
        });
        return { id: projectId, success: true };
      }),

    // Update project (admin only)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectName: z.string().optional(),
        projectDescription: z.string().optional(),
        location: z.string().optional(),
        targetAmount: z.number().optional(),
        targetCurrency: z.string().optional(),
        currentAmount: z.number().optional(),
        contributorCount: z.number().optional(),
        status: z.enum(["upcoming", "active", "completed", "paused"]).optional(),
        projectImageUrl: z.string().optional(),
        projectUrl: z.string().optional(),
        isVisible: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { id, ...data } = input;
        await db.updateCrowdPoolingProject(id, data);
        return { success: true };
      }),

    // Delete project (admin only - soft delete)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.deleteCrowdPoolingProject(input.id);
        return { success: true };
      }),
  }),

  // Crowd Pooling Proposals Router
  crowdPoolingProposals: router({
    // Submit a proposal to a project (public - no login required)
    submit: publicProcedure
      .input(z.object({
        projectId: z.number(),
        contributorName: z.string().min(1),
        contributorEmail: z.string().email(),
        proposalData: z.string(), // JSON string with all contribution details
        totalContribution: z.number(),
        financialContribution: z.number(),
        futureValueContribution: z.number(),
        contributorNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        checkRateLimit(ctx, "crowd_pooling_proposal");
        // Verify project exists
        const project = await db.getCrowdPoolingProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        // Create the proposal
        const proposalId = await db.createProposal({
          projectId: input.projectId,
          contributorName: input.contributorName,
          contributorEmail: input.contributorEmail,
          proposalData: input.proposalData,
          totalContribution: input.totalContribution,
          financialContribution: input.financialContribution,
          futureValueContribution: input.futureValueContribution,
          contributorNotes: input.contributorNotes || null,
        });
        
        // Notify owner of new proposal (respects notification preferences)
        try {
          await notifyIfEnabled("campaignContributions", {
            title: `New Proposal for ${project.projectName}`,
            content: `${input.contributorName} submitted a proposal worth $${input.totalContribution.toLocaleString()} (Financial: $${input.financialContribution.toLocaleString()}, Future Value: $${input.futureValueContribution.toLocaleString()})`,
          });
        } catch (e) {
          console.warn('Failed to send proposal notification:', e);
        }
        
        return { success: true, proposalId };
      }),

    // Get proposals for a project (public - shows stats only)
    getProjectStats: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectProposalStats(input.projectId);
      }),

    // Get all proposals for a project (admin only)
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return db.getProposalsByProject(input.projectId);
      }),

    // Update proposal status (admin only)
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "accepted", "rejected", "withdrawn"]),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.updateProposalStatus(input.id, input.status, input.reviewNotes);
        return { success: true };
      }),
  }),

  // Saved Contributions Router - for saving contribution forms to user profile
  savedContributions: router({
    // Get all saved contributions for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSavedContributionsByUser(ctx.user.id);
    }),

    // Get a specific saved contribution
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const contribution = await db.getSavedContributionById(input.id, ctx.user.id);
        if (!contribution) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Saved contribution not found" });
        }
        return contribution;
      }),

    // Get the user's default contribution form
    getDefault: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDefaultSavedContribution(ctx.user.id);
    }),

    // Save a new contribution form
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        isDefault: z.boolean().optional(),
        projectName: z.string().optional(),
        targetAmount: z.number().optional(),
        currency: z.string().optional(),
        contributorName: z.string().optional(),
        contributorEmail: z.string().email().optional().or(z.literal("")),
        immediateContributions: z.string(), // JSON string
        futureContributions: z.string(), // JSON string
        totalImmediateValue: z.number().optional(),
        totalFutureValue: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createSavedContribution({
          userId: ctx.user.id,
          name: input.name,
          isDefault: input.isDefault || false,
          projectName: input.projectName || null,
          targetAmount: input.targetAmount || null,
          currency: input.currency || "USD",
          contributorName: input.contributorName || null,
          contributorEmail: input.contributorEmail || null,
          immediateContributions: input.immediateContributions,
          futureContributions: input.futureContributions,
          totalImmediateValue: input.totalImmediateValue || 0,
          totalFutureValue: input.totalFutureValue || 0,
        });
        return { id, success: true };
      }),

    // Update an existing saved contribution
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        isDefault: z.boolean().optional(),
        projectName: z.string().optional(),
        targetAmount: z.number().optional(),
        currency: z.string().optional(),
        contributorName: z.string().optional(),
        contributorEmail: z.string().email().optional().or(z.literal("")),
        immediateContributions: z.string().optional(),
        futureContributions: z.string().optional(),
        totalImmediateValue: z.number().optional(),
        totalFutureValue: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateSavedContribution(id, ctx.user.id, data);
        return { success: true };
      }),

    // Delete a saved contribution
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSavedContribution(input.id, ctx.user.id);
        return { success: true };
      }),

    // Set a contribution as the default
    setDefault: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.setDefaultSavedContribution(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Campaigns router
  campaigns: router({
    // List all campaigns (with optional filtering)
    list: publicProcedure
      .input(z.object({
        status: z.enum(['draft', 'pending_review', 'active', 'funded', 'completed', 'cancelled', 'rejected']).optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const campaignList = await db.listCampaigns(input?.status, input?.search);
        // Enrich each campaign with its cover image for card display
        const enriched = await Promise.all(
          campaignList.map(async (c) => {
            const images = await db.getCampaignImages(c.id);
            const coverImage = images.find(img => img.isCover === 1) || images[0] || null;
            return {
              ...c,
              coverImage,
              imageCount: images.length,
            };
          })
        );
        return enriched;
      }),

    // Get a single campaign by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) return null;
        
        // Get campaign items and images
        const items = await db.getCampaignItems(input.id);
        const images = await db.getCampaignImages(input.id);
        const coverImage = images.find(img => img.isCover === 1) || images[0] || null;
        
        return {
          ...campaign,
          items,
          images,
          coverImage,
          contributorsCount: 0, // TODO: Implement contributors tracking
        };
      }),

    // Get campaign items for a campaign
    getItems: publicProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCampaignItems(input.campaignId);
      }),

    // Create a new campaign
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().min(1),
        projectName: z.string().min(1).max(255),
        location: z.string().optional(),
        financialTarget: z.number().min(0),
        currency: z.string().default('USD'),
        // Link to application
        applicationId: z.number().optional(),
        // Rich project data
        vision: z.string().optional(),
        landStatus: z.string().optional(),
        landSize: z.string().optional(),
        currentPhase: z.string().optional(),
        timeline: z.string().optional(),
        legalStructure: z.string().optional(),
        governanceModel: z.string().optional(),
        membershipModel: z.string().optional(),
        housingPlans: z.string().optional(),
        foodSystems: z.string().optional(),
        waterSystems: z.string().optional(),
        energySystems: z.string().optional(),
        educationPrograms: z.string().optional(),
        communityEngagement: z.string().optional(),
        impactMetrics: z.string().optional(),
        challenges: z.string().optional(),
        teamSize: z.number().optional(),
        teamDescription: z.string().optional(),
        regenerativePractices: z.string().optional(),
        websiteUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        projectImageUrl: z.string().optional(),
        daoLink: z.string().optional(),
        durationDays: z.number().min(1).max(365).default(90),
        items: z.array(z.object({
          category: z.enum(['land', 'equipment', 'role', 'resource']),
          // Land fields
          hectares: z.number().optional(),
          region: z.string().optional(),
          features: z.array(z.string()).optional(),
          videoUrl: z.string().optional(),
          landDescription: z.string().optional(),
          // Equipment fields
          equipmentName: z.string().optional(),
          equipmentQuantity: z.number().optional(),
          equipmentCategory: z.string().optional(),
          // Role fields
          roleTitle: z.string().optional(),
          hoursPerWeek: z.number().optional(),
          durationMonths: z.number().optional(),
          roleDescription: z.string().optional(),
          // Resource fields
          resourceName: z.string().optional(),
          resourceQuantity: z.number().optional(),
          resourceUnit: z.string().optional(),
          resourceDescription: z.string().optional(),
          // Common
          estimatedValue: z.number().min(0),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaignId = await db.createCampaign(ctx.user.id, input);
        return { id: campaignId, success: true };
      }),

    // Get contributions for a campaign
    getContributions: publicProcedure
      .input(z.object({
        campaignId: z.number(),
        status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn', 'fulfilled']).optional(),
      }))
      .query(async ({ input }) => {
        if (input.status) {
          return await db.getContributionsByCampaignAndStatus(input.campaignId, input.status);
        }
        return await db.getContributionsByCampaign(input.campaignId);
      }),

    // Submit a contribution to a campaign
    submitContribution: publicProcedure
      .input(z.object({
        campaignId: z.number(),
        campaignItemId: z.number().optional(),
        contributorName: z.string().min(1).max(255),
        contributorEmail: z.string().email(),
        contributorPhone: z.string().optional(),
        contributorBio: z.string().optional(),
        contributionType: z.enum(['land', 'equipment', 'role', 'resource', 'financial']),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        // Land-specific
        landHectares: z.number().optional(),
        landRegion: z.string().optional(),
        landFeatures: z.array(z.string()).optional(),
        // Equipment-specific
        equipmentName: z.string().optional(),
        equipmentQuantity: z.number().optional(),
        equipmentCondition: z.string().optional(),
        // Role-specific
        roleTitle: z.string().optional(),
        hoursPerWeek: z.number().optional(),
        durationMonths: z.number().optional(),
        skills: z.array(z.string()).optional(),
        // Resource-specific
        resourceName: z.string().optional(),
        resourceQuantity: z.number().optional(),
        resourceUnit: z.string().optional(),
        // Financial-specific
        financialAmount: z.number().optional(),
        financialCurrency: z.string().optional(),
        paymentMethod: z.string().optional(),
        // Common
        estimatedValue: z.number().min(0),
        contributorNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        checkRateLimit(ctx, "campaign_contribution");
        // Verify campaign exists and is active
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
        }
        if (campaign.status !== 'active') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Campaign is not accepting contributions' });
        }

        const contributionId = await db.createContribution({
          campaignId: input.campaignId,
          campaignItemId: input.campaignItemId,
          userId: ctx.user?.id,
          contributorName: input.contributorName,
          contributorEmail: input.contributorEmail,
          contributorPhone: input.contributorPhone,
          contributorBio: input.contributorBio,
          contributionType: input.contributionType,
          title: input.title,
          description: input.description,
          landHectares: input.landHectares,
          landRegion: input.landRegion,
          landFeatures: input.landFeatures ? JSON.stringify(input.landFeatures) : null,
          equipmentName: input.equipmentName,
          equipmentQuantity: input.equipmentQuantity,
          equipmentCondition: input.equipmentCondition,
          roleTitle: input.roleTitle,
          hoursPerWeek: input.hoursPerWeek,
          durationMonths: input.durationMonths,
          skills: input.skills ? JSON.stringify(input.skills) : null,
          resourceName: input.resourceName,
          resourceQuantity: input.resourceQuantity,
          resourceUnit: input.resourceUnit,
          financialAmount: input.financialAmount,
          financialCurrency: input.financialCurrency || 'USD',
          paymentMethod: input.paymentMethod,
          estimatedValue: input.estimatedValue,
          contributorNotes: input.contributorNotes,
          status: 'pending',
        });

        // Notify campaign owner (respects notification preferences)
        try {
          await notifyIfEnabled("campaignContributions", {
            title: `New Contribution: ${input.title}`,
            content: `A new ${input.contributionType} contribution has been submitted to campaign "${campaign.title}".\n\n**Contributor:** ${input.contributorName}\n**Type:** ${input.contributionType}\n**Value:** $${input.estimatedValue.toLocaleString()}\n\nReview it in the campaign dashboard.`,
          });
        } catch (e) {
          console.warn('Failed to send contribution notification:', e);
        }

        return { id: contributionId, success: true };
      }),

    // Update contribution status (campaign owner only)
    updateContributionStatus: protectedProcedure
      .input(z.object({
        contributionId: z.number(),
        status: z.enum(['accepted', 'rejected', 'fulfilled']),
        ownerNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const contribution = await db.getContributionById(input.contributionId);
        if (!contribution) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Contribution not found' });
        }

        // Verify user owns the campaign
        const campaign = await db.getCampaignById(contribution.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
        }
        if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to manage this campaign' });
        }

        await db.updateContributionStatus(input.contributionId, input.status, input.ownerNotes);

        // Update campaign pledged totals if accepting/rejecting
        if (input.status === 'accepted' || input.status === 'rejected') {
          await db.updateCampaignPledgedTotals(contribution.campaignId);
        }

        // Send email notification to contributor
        try {
          const { sendEmail, emailTemplates } = await import("./_core/email");
          let emailContent: { subject: string; html: string };
          
          switch (input.status) {
            case 'accepted':
              emailContent = emailTemplates.contributionAccepted(
                contribution.contributorName,
                contribution.title,
                campaign.title,
                input.ownerNotes
              );
              break;
            case 'rejected':
              emailContent = emailTemplates.contributionRejected(
                contribution.contributorName,
                contribution.title,
                campaign.title,
                input.ownerNotes
              );
              break;
            case 'fulfilled':
              emailContent = emailTemplates.contributionFulfilled(
                contribution.contributorName,
                contribution.title,
                campaign.title,
                input.ownerNotes
              );
              break;
          }
          
          // Email sending disabled per user request
          // await sendEmail({
          //   to: contribution.contributorEmail,
          //   subject: emailContent.subject,
          //   html: emailContent.html,
          //   template: `contribution_${input.status}`,
          //   recipientName: contribution.contributorName,
          // });
          
          console.log(`[Contribution] Email sending disabled - would have sent to ${contribution.contributorEmail} for status: ${input.status}`);
        } catch (emailError) {
          console.warn('[Contribution] Failed to send status notification email:', emailError);
          // Don't fail the mutation if email fails
        }

        // Create in-app notification for the contributor if they have an account
        if (contribution.userId) {
          try {
            const notificationType = input.status === 'accepted' 
              ? 'contribution_accepted' 
              : input.status === 'rejected' 
                ? 'contribution_rejected' 
                : 'system';
            
            const notificationTitle = input.status === 'accepted'
              ? `Contribution Accepted!`
              : input.status === 'rejected'
                ? `Contribution Update`
                : `Contribution Fulfilled`;
            
            const notificationMessage = input.status === 'accepted'
              ? `Your contribution "${contribution.title}" to ${campaign.title} has been accepted! ${input.ownerNotes ? `Note: ${input.ownerNotes}` : ''}`
              : input.status === 'rejected'
                ? `Your contribution "${contribution.title}" to ${campaign.title} was not accepted. ${input.ownerNotes ? `Reason: ${input.ownerNotes}` : 'Please contact the campaign owner for more details.'}`
                : `Your contribution "${contribution.title}" to ${campaign.title} has been marked as fulfilled. Thank you for your support!`;
            
            await db.createUserNotification({
              userId: contribution.userId,
              type: notificationType as any,
              title: notificationTitle,
              message: notificationMessage,
              campaignId: contribution.campaignId,
              contributionId: contribution.id,
            });
            if (!process.env.VITEST) console.log(`[Notification] In-app notification created for user ${contribution.userId}`);
          } catch (notifError) {
            console.warn('[Notification] Failed to create in-app notification:', notifError);
          }
        }

        return { success: true };
      }),

    // Withdraw a contribution (contributor only)
    withdrawContribution: publicProcedure
      .input(z.object({
        contributionId: z.number(),
        contributorEmail: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const contribution = await db.getContributionById(input.contributionId);
        if (!contribution) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Contribution not found' });
        }

        // Verify email matches
        if (contribution.contributorEmail !== input.contributorEmail) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Email does not match' });
        }

        // Can only withdraw pending contributions
        if (contribution.status !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only withdraw pending contributions' });
        }

        await db.updateContributionStatus(input.contributionId, 'withdrawn');
        return { success: true };
      }),

    // Get user's contributions
    myContributions: protectedProcedure.query(async ({ ctx }) => {
      return await db.getContributionsByUser(ctx.user.id);
    }),

    // Get campaigns owned by user
    myCampaigns: protectedProcedure.query(async ({ ctx }) => {
      const allCampaigns = await db.listCampaigns();
      return allCampaigns.filter(c => c.userId === ctx.user.id);
    }),

    // Update campaign status (owner only)
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['draft', 'pending_review', 'active', 'funded', 'completed', 'cancelled', 'rejected']),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
        }
        if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to update this campaign' });
        }
        await db.updateCampaignStatus(input.id, input.status);
        return { success: true };
      }),

    // Track campaign page view
    trackView: publicProcedure
      .input(z.object({
        campaignId: z.number(),
        visitorId: z.string().optional(),
        referrer: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        userAgent: z.string().optional(),
        deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.trackCampaignView({
          campaignId: input.campaignId,
          visitorId: input.visitorId,
          userId: ctx.user?.id,
          referrer: input.referrer,
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          userAgent: input.userAgent,
          deviceType: input.deviceType,
        });
        return { success: true };
      }),

    // Get campaign analytics (owner only)
    getAnalytics: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
        }
        if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to view analytics' });
        }
        
        const analytics = await db.getCampaignAnalytics(input.campaignId);
        const conversion = await db.getCampaignConversionRate(input.campaignId);
        
        return {
          ...analytics,
          conversion,
        };
      }),

    // ---- Campaign Images ----

    // Upload an image to a campaign
    uploadImage: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded
        contentType: z.string(),
        fileSize: z.number(),
        category: z.enum(['land', 'team', 'progress', 'infrastructure', 'community', 'other']),
        caption: z.string().max(500).optional(),
        isCover: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the campaign
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
        }
        if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to upload images to this campaign' });
        }

        // Validate file size (max 5MB)
        if (input.fileSize > 5 * 1024 * 1024) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Image must be under 5MB' });
        }

        // Validate content type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(input.contentType)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
        }

        // Upload to S3
        const ext = input.fileName.split('.').pop() || 'jpg';
        const fileKey = `campaigns/${input.campaignId}/images/${nanoid()}.${ext}`;
        const buffer = Buffer.from(input.fileData, 'base64');
        const { url, key } = await storagePut(fileKey, buffer, input.contentType);

        // Save to database
        const imageId = await db.addCampaignImage({
          campaignId: input.campaignId,
          uploadedByUserId: ctx.user.id,
          url,
          fileKey: key,
          fileName: input.fileName,
          mimeType: input.contentType,
          fileSize: input.fileSize,
          category: input.category,
          caption: input.caption,
          isCover: input.isCover,
        });

        return { id: imageId, url, key, success: true };
      }),

    // Get all images for a campaign
    getImages: publicProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCampaignImages(input.campaignId);
      }),

    // Delete a campaign image
    deleteImage: protectedProcedure
      .input(z.object({ imageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await db.deleteCampaignImage(input.imageId, ctx.user.id);
        if (!deleted) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Image not found or not authorized to delete' });
        }
        return { success: true };
      }),

    // Set an image as the campaign cover
    setCoverImage: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        imageId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
        }
        if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
        }
        await db.setCampaignCoverImage(input.campaignId, input.imageId);
        return { success: true };
      }),
  }),

  // User Notifications router
  notifications: router({
    // Get user's notifications
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserNotifications(ctx.user.id, input?.limit || 50);
      }),

    // Get unread count
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotificationCount(ctx.user.id);
    }),

    // Mark notification as read
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationAsRead(input.id, ctx.user.id);
        return { success: true };
      }),

    // Mark all notifications as read
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),

    // Delete notification
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNotification(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Admin router
  admin: router({
    // Get notification preferences (admin only)
    getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getNotificationPreferences();
    }),

    // Update notification preferences (admin only)
    updateNotificationPreferences: protectedProcedure
      .input(z.object({
        // Toggle fields (tinyint: 0 or 1)
        applicationSubmissions: z.number().min(0).max(1).optional(),
        investorInquiries: z.number().min(0).max(1).optional(),
        allianceRequests: z.number().min(0).max(1).optional(),
        workWithRegens: z.number().min(0).max(1).optional(),
        roleRequests: z.number().min(0).max(1).optional(),
        loiSubmissions: z.number().min(0).max(1).optional(),
        campaignContributions: z.number().min(0).max(1).optional(),
        newsletterSignups: z.number().min(0).max(1).optional(),
        // Email routing fields (comma-separated emails or null)
        applicationEmails: z.string().nullable().optional(),
        investorEmails: z.string().nullable().optional(),
        allianceEmails: z.string().nullable().optional(),
        workWithRegensEmails: z.string().nullable().optional(),
        roleRequestEmails: z.string().nullable().optional(),
        loiEmails: z.string().nullable().optional(),
        campaignEmails: z.string().nullable().optional(),
        newsletterEmails: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.updateNotificationPreferences(input);
        return { success: true };
      }),
  }),

  // Letter of Intent (LOI) router
  loi: router({
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
        checkRateLimit(ctx, "letter_of_intent");
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
          const { sendEmail } = await import("./_core/email");
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
<p>📄 <a href="https://regencivics.earth/opportunity" style="color:#4a7c59">Read the full investment opportunity</a></p>
<p>📅 <a href="https://calendly.com/rieki-cordon/30min" style="color:#4a7c59">Schedule a discovery call with Rieki</a></p>
<p style="color:#666;font-size:12px;margin-top:32px">Questions? Reply to this email or reach us at <a href="mailto:Rieki@pm.me">Rieki@pm.me</a></p>
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
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getAllLettersOfIntent();
    }),

    // Get LOI stats (admin only)
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getLetterOfIntentStats();
    }),

    // Get LOI by ID (admin only)
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return db.getLetterOfIntentById(input.id);
      }),

    // Update LOI status (admin only)
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "withdrawn", "converted"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await db.updateLetterOfIntentStatus(input.id, input.status);
        return { success: true };
      }),
   }),

  // AI Chat assistant
  chat: router({
    ask: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).max(20),
      }))
      .mutation(async ({ ctx, input }) => {
        checkRateLimit(ctx, "chat_ask");
        const llmMessages = [
          { role: "system" as const, content: CHAT_SYSTEM_PROMPT },
          ...input.messages.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        const response = await invokeLLM({ messages: llmMessages });
        const content = response.choices?.[0]?.message?.content
          ?? "I am not sure how to help with that. Please try rephrasing your question.";
        return { content };
      }),
  }),

  // ==========================================
  // Forum / Community Discussion
  // ==========================================
  forum: router({
    // List all categories with post counts
    categories: publicProcedure.query(async () => {
      const categories = await db.listForumCategories();
      const counts = await db.getForumCategoryPostCounts();
      return categories.map(c => ({ ...c, postCount: counts[c.id] || 0 }));
    }),

    // Get a single category by slug
    categoryBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getForumCategoryBySlug(input.slug);
      }),

    // List posts, optionally filtered by category
    posts: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const posts = await db.listForumPosts(input.categoryId, input.limit, input.offset);
        // Enrich with author info
        const enriched = await Promise.all(posts.map(async (post) => {
          const author = await db.getUserById(post.authorId);
          return {
            ...post,
            authorName: author?.name || 'Anonymous',
            authorAvatar: null,
          };
        }));
        return enriched;
      }),

    // Get a single post with full details
    postById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const post = await db.getForumPost(input.id);
        if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
        const author = await db.getUserById(post.authorId);
        const category = await db.listForumCategories().then(cats => cats.find(c => c.id === post.categoryId));
        return {
          ...post,
          authorName: author?.name || 'Anonymous',
          authorAvatar: null,
          categoryName: category?.name || 'Unknown',
          categorySlug: category?.slug || 'general',
        };
      }),

    // List replies for a post
    replies: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        const replies = await db.listForumReplies(input.postId);
        const enriched = await Promise.all(replies.map(async (reply) => {
          const author = await db.getUserById(reply.authorId);
          return {
            ...reply,
            authorName: author?.name || 'Anonymous',
            authorAvatar: null,
          };
        }));
        return enriched;
      }),

    // Get like counts and user's likes for a post
    likes: publicProcedure
      .input(z.object({ postId: z.number(), userId: z.number().optional() }))
      .query(async ({ input }) => {
        const counts = await db.getForumLikeCounts(input.postId);
        const userLikes = input.userId ? await db.getUserForumLikes(input.userId, input.postId) : { likedPost: false, likedReplies: [] };
        return { ...counts, ...userLikes };
      }),

    // Create a new post (auth required)
    createPost: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        title: z.string().min(3).max(300),
        content: z.string().min(10).max(10000),
      }))
      .mutation(async ({ ctx, input }) => {
        const postId = await db.createForumPost({
          categoryId: input.categoryId,
          authorId: ctx.user.id,
          title: input.title,
          content: input.content,
        });
        return { id: postId };
      }),

    // Create a reply (auth required)
    createReply: protectedProcedure
      .input(z.object({
        postId: z.number(),
        content: z.string().min(1).max(5000),
        parentReplyId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const replyId = await db.createForumReply({
          postId: input.postId,
          authorId: ctx.user.id,
          content: input.content,
          parentReplyId: input.parentReplyId,
        });
        return { id: replyId };
      }),

    // Toggle like on post or reply (auth required)
    toggleLike: protectedProcedure
      .input(z.object({
        postId: z.number().optional(),
        replyId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!input.postId && !input.replyId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Must specify postId or replyId' });
        }
        const liked = await db.toggleForumLike(ctx.user.id, input.postId, input.replyId);
        return { liked };
      }),

    // Delete a post (author or admin)
    deletePost: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getForumPost(input.id);
        if (!post) throw new TRPCError({ code: 'NOT_FOUND' });
        if (post.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
        }
        await db.deleteForumPost(input.id);
        return { success: true };
      }),

    // Delete a reply (author, admin, or moderator)
    deleteReply: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isMod = await db.isForumModerator(ctx.user.id);
        if (ctx.user.role !== 'admin' && !isMod) {
          // Check if author - for now just allow since we can't easily look up reply author
        }
        await db.deleteForumReply(input.id);
        return { success: true };
      }),

    // Report a post or reply
    report: protectedProcedure
      .input(z.object({
        postId: z.number().optional(),
        replyId: z.number().optional(),
        reason: z.enum(['spam', 'harassment', 'inappropriate', 'misinformation', 'other']),
        details: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createForumReport({
          reporterId: ctx.user.id,
          postId: input.postId,
          replyId: input.replyId,
          reason: input.reason,
          details: input.details,
        });
        return { id };
      }),

    // Pin/unpin a post (admin or moderator)
    togglePin: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isMod = await db.isForumModerator(ctx.user.id);
        if (ctx.user.role !== 'admin' && !isMod) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only moderators can pin posts' });
        }
        const pinned = await db.togglePinPost(input.postId);
        return { pinned };
      }),

    // Lock/unlock a post (admin or moderator)
    toggleLock: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isMod = await db.isForumModerator(ctx.user.id);
        if (ctx.user.role !== 'admin' && !isMod) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only moderators can lock posts' });
        }
        const locked = await db.toggleLockPost(input.postId);
        return { locked };
      }),

    // Check if user is moderator
    isModerator: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return { isModerator: await db.isForumModerator(input.userId) };
      }),

    // Check if user is banned
    isBanned: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return { isBanned: await db.isUserBanned(input.userId) };
      }),

    // Get user profile
    userProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        const profile = await db.getUserProfile(input.userId);
        const stats = await db.getUserForumStats(input.userId);
        const recentPosts = await db.getUserRecentPosts(input.userId, 5);
        const recentReplies = await db.getUserRecentReplies(input.userId, 5);
        return {
          user: user ? { id: user.id, name: user.name, createdAt: user.createdAt } : null,
          profile,
          stats,
          recentPosts,
          recentReplies,
        };
      }),

    // Update own profile
    updateProfile: protectedProcedure
      .input(z.object({
        bio: z.string().max(500).optional(),
        location: z.string().max(255).optional(),
        website: z.string().max(500).optional(),
        preferredLanguage: z.string().max(10).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // Quest Suggestions
  quests: router({
    // List quest suggestions
    suggestions: publicProcedure
      .input(z.object({
        sortBy: z.enum(['votes', 'newest']).default('votes'),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const suggestions = await db.listQuestSuggestions(input.sortBy, input.limit, input.offset);
        const enriched = await Promise.all(suggestions.map(async (s) => {
          const author = await db.getUserById(s.authorId);
          return { ...s, authorName: author?.name || 'Anonymous' };
        }));
        return enriched;
      }),

    // Get user's votes
    myVotes: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserQuestVotes(ctx.user.id);
    }),

    // Submit a quest suggestion
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(3).max(300),
        description: z.string().min(10).max(5000),
        category: z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createQuestSuggestion({
          authorId: ctx.user.id,
          title: input.title,
          description: input.description,
          category: input.category,
        });
        return { id };
      }),

    // Vote for a quest suggestion
    toggleVote: protectedProcedure
      .input(z.object({ suggestionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const voted = await db.toggleQuestVote(ctx.user.id, input.suggestionId);
        return { voted };
      }),
  }),

  // Translation
  translate: router({
    // Translate forum content
    content: publicProcedure
      .input(z.object({
        contentType: z.enum(['post', 'reply', 'quest_suggestion']),
        contentId: z.number(),
        targetLang: z.string().max(10),
        sourceText: z.string(),
        sourceTitle: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check cache first
        const cached = await db.getCachedTranslation(input.contentType, input.contentId, input.targetLang);
        if (cached) {
          return {
            translatedTitle: cached.translatedTitle,
            translatedContent: cached.translatedContent,
            fromCache: true,
          };
        }

        // Use LLM to translate
        const { invokeLLM } = await import('./_core/llm').catch(() => ({ invokeLLM: null }));
        
        if (!invokeLLM) {
          // Fallback: return original text
          return {
            translatedTitle: input.sourceTitle || null,
            translatedContent: input.sourceText,
            fromCache: false,
          };
        }

        try {
          const langNames: Record<string, string> = {
            en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French',
            id: 'Indonesian', de: 'German', zh: 'Chinese (Simplified)', ar: 'Arabic',
            hi: 'Hindi', ja: 'Japanese',
          };
          const targetLangName = langNames[input.targetLang] || input.targetLang;

          const prompt = input.sourceTitle
            ? `Translate the following title and content to ${targetLangName}. Return JSON with "title" and "content" fields. Keep any markdown formatting.\n\nTitle: ${input.sourceTitle}\n\nContent: ${input.sourceText}`
            : `Translate the following text to ${targetLangName}. Return JSON with a "content" field. Keep any markdown formatting.\n\n${input.sourceText}`;

          const response = await invokeLLM({
            messages: [
              { role: 'system', content: 'You are a translator. Return only valid JSON with the translated text. Preserve markdown formatting.' },
              { role: 'user', content: prompt },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'translation',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Translated title (if provided)' },
                    content: { type: 'string', description: 'Translated content' },
                  },
                  required: ['content'],
                  additionalProperties: false,
                },
              },
            },
          });

          const parsed = JSON.parse(response.choices[0].message.content as string);

          // Cache the translation
          await db.saveCachedTranslation({
            contentType: input.contentType,
            contentId: input.contentId,
            sourceLang: 'en', // Assume source is English for now
            targetLang: input.targetLang,
            translatedTitle: parsed.title || null,
            translatedContent: parsed.content,
          });

          return {
            translatedTitle: parsed.title || null,
            translatedContent: parsed.content,
            fromCache: false,
          };
        } catch (error) {
          console.error('Translation error:', error);
          return {
            translatedTitle: input.sourceTitle || null,
            translatedContent: input.sourceText,
            fromCache: false,
          };
        }
      }),
  }),

  // Admin moderation
  moderation: router({
    // List reports (admin/mod only)
    reports: protectedProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const isMod = await db.isForumModerator(ctx.user.id);
        if (ctx.user.role !== 'admin' && !isMod) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const reports = await db.listForumReports(input.status);
        const enriched = await Promise.all(reports.map(async (r) => {
          const reporter = await db.getUserById(r.reporterId);
          return { ...r, reporterName: reporter?.name || 'Unknown' };
        }));
        return enriched;
      }),

    // Update report status
    updateReport: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['reviewed', 'dismissed', 'actioned']),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMod = await db.isForumModerator(ctx.user.id);
        if (ctx.user.role !== 'admin' && !isMod) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await db.updateReportStatus(input.id, input.status, ctx.user.id);
        return { success: true };
      }),

    // List moderators (admin only)
    moderators: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const mods = await db.listForumModerators();
      const enriched = await Promise.all(mods.map(async (m) => {
        const user = await db.getUserById(m.userId);
        return { ...m, userName: user?.name || 'Unknown', userEmail: user?.email || '' };
      }));
      return enriched;
    }),

    // Add moderator (admin only)
    addModerator: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await db.addForumModerator(input.userId, ctx.user.id);
        return { success: true };
      }),

    // Remove moderator (admin only)
    removeModerator: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await db.removeForumModerator(input.userId);
        return { success: true };
      }),

    // Ban user (admin/mod)
    banUser: protectedProcedure
      .input(z.object({
        userId: z.number(),
        reason: z.string().max(500).optional(),
        days: z.number().optional(), // null = permanent
      }))
      .mutation(async ({ ctx, input }) => {
        const isMod = await db.isForumModerator(ctx.user.id);
        if (ctx.user.role !== 'admin' && !isMod) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const expiresAt = input.days ? new Date(Date.now() + input.days * 86400000) : undefined;
        await db.banUser(input.userId, ctx.user.id, input.reason, expiresAt);
        return { success: true };
      }),

    // Unban user (admin/mod)
    unbanUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isMod = await db.isForumModerator(ctx.user.id);
        if (ctx.user.role !== 'admin' && !isMod) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await db.unbanUser(input.userId);
        return { success: true };
      }),

    // List banned users
    bannedUsers: protectedProcedure.query(async ({ ctx }) => {
      const isMod = await db.isForumModerator(ctx.user.id);
      if (ctx.user.role !== 'admin' && !isMod) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const bans = await db.listBannedUsers();
      const enriched = await Promise.all(bans.map(async (b) => {
        const user = await db.getUserById(b.userId);
        const bannedByUser = await db.getUserById(b.bannedBy);
        return { ...b, userName: user?.name || 'Unknown', bannedByName: bannedByUser?.name || 'Unknown' };
      }));
      return enriched;
    }),
  }),
  banners: router({
    getByKey: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await getBannerByKey(input.key);
      }),
    getActive: publicProcedure.query(async () => {
      return await getActiveBanners();
    }),
    upsert: adminProcedure
      .input(z.object({
        key: z.string(),
        title: z.string(),
        content: z.string(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await upsertBanner(input);
      }),
    delete: adminProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input }) => {
        return await deleteBanner(input.key);
      }),
    toggle: adminProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input }) => {
        return await toggleBannerActive(input.key);
      }),
  }),

  // User profile onboarding router
  userProfiles: router({
    // Get current user's extended profile (path, onboarding fields, etc.)
    getMe: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserProfile(ctx.user.id);
    }),

    // Set the user's path (called once from PathSelectionScreen)
    setPath: protectedProcedure
      .input(z.object({
        path: z.enum(["investor", "land_project", "ally", "player"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserProfile(ctx.user.id, {
          path: input.path,
          onboardingComplete: 1,
        });
        return { success: true };
      }),

    // Update extended profile fields (called from ProfileEditForm)
    updateProfile: protectedProcedure
      .input(z.object({
        displayName: z.string().max(255).optional(),
        bio: z.string().optional(),
        location: z.string().max(255).optional(),
        avatarUrl: z.string().max(500).optional(),
        investmentRange: z.string().max(255).optional(),
        projectName: z.string().max(255).optional(),
        projectUrl: z.string().max(500).optional(),
        organizationName: z.string().max(255).optional(),
        questInterests: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ============================================
  // Contact Notes
  // ============================================
  contactNotes: router({
    list: protectedProcedure
      .input(z.object({ contactType: z.string(), contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await db.getContactNotes(input.contactType, input.contactId);
      }),

    create: protectedProcedure
      .input(z.object({
        contactType: z.string(),
        contactId: z.number(),
        note: z.string().min(1).max(2000),
        authorName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await db.createContactNote({
          contactType: input.contactType,
          contactId: input.contactId,
          note: input.note,
          authorName: input.authorName || ctx.user.name || "Admin",
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.deleteContactNote(input.id);
      }),
  }),

  // ============================================
  // Contact Tags
  // ============================================
  contactTags: router({
    list: protectedProcedure
      .input(z.object({ contactType: z.string(), contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await db.getContactTags(input.contactType, input.contactId);
      }),

    add: protectedProcedure
      .input(z.object({
        contactType: z.string(),
        contactId: z.number(),
        tag: z.string().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await db.addContactTag({
          contactType: input.contactType,
          contactId: input.contactId,
          tag: input.tag.trim().toLowerCase(),
        });
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.removeContactTag(input.id);
      }),
  }),

  // ============================================
  // Scheduled Emails
  // ============================================
  scheduledEmails: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return await db.getScheduledEmails();
    }),

    schedule: protectedProcedure
      .input(z.object({
        recipientEmail: z.string().email(),
        recipientName: z.string().optional(),
        subject: z.string().min(1),
        body: z.string().min(1),
        inquiryType: z.string().optional(),
        scheduledFor: z.string(), // ISO datetime string
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await db.createScheduledEmail({
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName,
          subject: input.subject,
          body: input.body,
          inquiryType: input.inquiryType || "general",
          scheduledFor: new Date(input.scheduledFor),
        });
      }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateScheduledEmailStatus(input.id, 'cancelled');
      }),
  }),

  // ─── Project Join Requests ────────────────────────────────────────────────
  projectJoinRequests: router({
    // Public: anyone can submit a join request (comes from /connect form)
    create: publicProcedure
      .input(z.object({
        submitterName: z.string().min(1),
        submitterEmail: z.string().email(),
        submitterMessage: z.string().optional(),
        targetType: z.enum(["land_project", "alliance_org"]),
        targetId: z.string().min(1),
        targetName: z.string().min(1),
        connectInquiryId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Find approved steward for this org (if any)
        const claims = await db.getAllOrgClaims();
        const approved = claims.find(
          c => c.orgId === input.targetId && c.status === 'approved'
        );
        const id = await db.createProjectJoinRequest({
          ...input,
          stewardUserId: approved?.userId ?? null,
        });
        return { id };
      }),

    // Steward: see requests routed to them
    myRequests: protectedProcedure.query(async ({ ctx }) => {
      return db.getJoinRequestsForSteward(ctx.user.id);
    }),

    // Admin: see all requests
    listAll: adminProcedure.query(async () => {
      return db.getAllJoinRequests();
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "reviewed", "accepted", "rejected"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Allow admin or the steward assigned to the request
        const all = await db.getAllJoinRequests();
        const req = all.find(r => r.id === input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.role !== "admin" && req.stewardUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateJoinRequestStatus(input.id, input.status);
        return { ok: true };
      }),
  }),

  // ─── Org Claims ───────────────────────────────────────────────────────────
  orgClaims: router({
    // Any authenticated user can claim an org (pending admin approval)
    claim: protectedProcedure
      .input(z.object({
        orgType: z.enum(["land_project", "alliance_org"]),
        orgId: z.string().min(1),
        orgName: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createOrgClaim({
          userId: ctx.user.id,
          orgType: input.orgType,
          orgId: input.orgId,
          orgName: input.orgName,
        });
        return { id };
      }),

    // Get own claims
    mine: protectedProcedure.query(async ({ ctx }) => {
      return db.getOrgClaimsByUser(ctx.user.id);
    }),

    // Admin: see all claims
    listAll: adminProcedure.query(async () => {
      return db.getAllOrgClaims();
    }),

    // Admin: approve or reject a claim
    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const claim = await db.updateOrgClaimStatus(input.id, 'approved');
        if (claim) {
          // Route all pending join requests for this org to the new steward
          await db.routeJoinRequestsToSteward(claim.orgId, claim.userId);
        }
        return { ok: true };
      }),

    reject: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateOrgClaimStatus(input.id, 'rejected');
        return { ok: true };
      }),

    // Admin: directly assign a user as steward (no pending step required)
    adminAssign: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        orgType: z.enum(["land_project", "alliance_org"]),
        orgId: z.string().min(1),
        orgName: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createOrgClaim({
          userId: input.userId,
          orgType: input.orgType,
          orgId: input.orgId,
          orgName: input.orgName,
        });
        const claim = await db.updateOrgClaimStatus(id, 'approved');
        if (claim) {
          await db.routeJoinRequestsToSteward(claim.orgId, claim.userId);
        }
        return { id, ok: true };
      }),
  }),

  // ─── Admin AI Chat ────────────────────────────────────────────────────────
  adminAI: router({
    chat: adminProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).max(30),
        // Live context snapshot passed from the client
        context: z.object({
          activeTab: z.string().optional(),
          investorCount: z.number().optional(),
          inquiryCount: z.number().optional(),
          applicationCount: z.number().optional(),
          selectedContactEmail: z.string().optional(),
          selectedContactName: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const ctx = input.context ?? {};
        const contextBlock = [
          ctx.activeTab ? `Active admin tab: ${ctx.activeTab}` : null,
          ctx.investorCount !== undefined ? `Total investors in DB: ${ctx.investorCount}` : null,
          ctx.inquiryCount !== undefined ? `Total general inquiries: ${ctx.inquiryCount}` : null,
          ctx.applicationCount !== undefined ? `Total applications: ${ctx.applicationCount}` : null,
          ctx.selectedContactEmail ? `Currently viewing contact: ${ctx.selectedContactName ?? ''} <${ctx.selectedContactEmail}>` : null,
        ].filter(Boolean).join("\n");

        const systemPrompt = `You are an AI admin assistant for ReGen Civics  -  a regenerative civilization project coordinating land projects, alliance organizations, and investors.

You live inside the /admin dashboard and help administrators (like Rieki and the team) coordinate the Infinite Game.

## Your Role
- Help the admin navigate, search, and make sense of the data in the dashboard
- Suggest next actions based on contact status, age of inquiry, and pipeline health
- Draft emails, plan follow-ups, and help prioritize attention
- Explain what each table/tab does and how to use it
- Learn the team's patterns and suggest automations

## Admin Dashboard Tabs
- **Overview**: Key metrics and stats (investor count, inquiry count, applications)
- **Applications**: Land project applications from potential season participants
- **Investors**: Investor inquiry pipeline with status tracking
- **Alliance**: General inquiries (alliance orgs, collaborations, etc.)
- **Live**: People wanting to live at a land project
- **Create**: "Create with ReGens" collaboration requests
- **Other**: Catch-all inquiries
- **Kanban**: Drag-and-drop view of investor/inquiry/application pipelines
- **Settings**: Email templates, newsletter subscribers, scheduled emails

## Available Actions
When you want the admin to take an action, include a JSON action block in your response wrapped in <action> tags. The UI will render these as buttons.

Examples:
<action>{"type":"navigate","tab":"investors","label":"Go to Investors tab"}</action>
<action>{"type":"compose","to":"email@example.com","subject":"Following up on your inquiry","label":"Draft email to contact"}</action>
<action>{"type":"search","query":"search term","label":"Search for this contact"}</action>
<action>{"type":"focus","contactEmail":"email@example.com","label":"Open contact card"}</action>

## Current Context
${contextBlock || "No specific context provided."}

## Communication Style
- Be direct, warm, and efficient
- Use bullet points for lists
- Flag urgent items (old inquiries, stale applications)
- Suggest concrete next steps
- When you don't know something specific about the data, say so  -  you can only see what the admin shares with you`;

        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];

        const response = await invokeLLM({ messages: llmMessages, maxTokens: 1500 });
        const content = response.choices?.[0]?.message?.content ?? "I'm not sure how to help with that. Could you rephrase?";
        return { content };
      }),
  }),

  // ─── Player Contributions ─────────────────────────────────────────────────
  playerContributions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getPlayerContributionsByProfileId(profile.id);
    }),

    create: protectedProcedure
      .input(z.object({
        capitalType: z.enum(["financial","social","cultural","living","intellectual","experiential","material","spiritual"]),
        title: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        estimatedValue: z.number().int().min(0).optional(),
        projectName: z.string().max(255).optional(),
        evidenceUrl: z.string().url().optional().or(z.literal('')),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getPlayerProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Create a profile first" });
        const id = await db.createPlayerContribution({
          profileId: profile.id,
          userId: ctx.user.id,
          capitalType: input.capitalType,
          title: input.title,
          description: input.description,
          estimatedValue: input.estimatedValue,
          projectName: input.projectName,
          evidenceUrl: input.evidenceUrl || undefined,
        });
        // Update cached total on profile
        const all = await db.getPlayerContributionsByProfileId(profile.id);
        const total = all.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
        await db.updatePlayerProfile(profile.id, { totalContributionValue: total });
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership before deleting
        const profile = await db.getPlayerProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        await db.deletePlayerContribution(input.id, ctx.user.id);
        // Recalculate cached total
        const all = await db.getPlayerContributionsByProfileId(profile.id);
        const total = all.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
        await db.updatePlayerProfile(profile.id, { totalContributionValue: total });
        return { ok: true };
      }),

    adminVerify: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["verified", "rejected"]),
      }))
      .mutation(async ({ input }) => {
        await db.updatePlayerContributionStatus(input.id, input.status);
        return { ok: true };
      }),
  }),

  // ─── Public Site Tour AI ──────────────────────────────────────────────────
  siteTour: router({
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).max(20),
        currentPage: z.string().optional(),
        userRole: z.enum(["guest", "user", "admin"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const page = input.currentPage ?? "/";
        const role = input.userRole ?? "guest";

        const systemPrompt = `You are the ReGen Civics site guide  -  a warm, knowledgeable companion helping visitors discover and navigate the platform.

Current visitor context:
- Page: ${page}
- Role: ${role}

Your knowledge base:
- ReGen Civics is a regenerative civilization venture fund + infinite collaborative game
- Fund: targets 12-18% net IRR + $RCivics token appreciation. Min investment $250K. Quarterly distributions from Year 3. 8% preferred return, 20% carry, 1.5% management fee.
- Quests: 13 original quests (gold shimmer) + growing quest library (green shimmer). Earn RVoice + ReGen tokens. Start at /quests.
- Land projects: regenerative land-backed investments. Apply at /apply. Browse approved projects at /land.
- Alliance orgs: partner organizations supporting the regenerative ecosystem. Learn at /alliance.
- Investors: submit Letter of Intent at /loi. Read the full opportunity at /opportunity. Allocation explorer at /opportunity#calculator.
- Governance: RCVoice (earned through contributions, governs proposals) vs RGVoice (broader governance). Explained at /governance.
- Tokenomics: $RCivics token on Hypha DAO. Live stats coming soon. Learn at /tokenomics.
- Player profile: create at /player-profile. Complete quests, earn tokens, link your Hypha account.
- Contribution calculator: estimate 8-forms-of-capital contribution value at /calculator.
- Crowd pooling: pool capital for land projects at /crowd-pooling.
- Regen Games: coming soon at /regen-games. Custom land games at /custom-games.
- Map: global network of projects at /map.
- Blog/Learn: insights and updates at /blog.

Page-specific context:
${page === '/' ? '- You are on the home page. Offer to explain the fund, the game, or direct them to key sections.' : ''}
${page.includes('/opportunity') ? '- You are on the investment opportunity page. Visitor may be a potential LP.' : ''}
${page.includes('/quest') ? '- You are on the quests page. Help them understand how to earn tokens.' : ''}
${page.includes('/governance') ? '- You are on the governance page. Explain the two-token model.' : ''}
${page.includes('/player') ? '- You are on the player profile page. Help them get set up.' : ''}
${page.includes('/tokenomics') ? '- You are on the tokenomics page. Token distributions have not begun yet.' : ''}
${page.includes('/land') ? '- You are on the land projects page. Help them understand the land investment thesis.' : ''}
${page.includes('/apply') ? '- You are on the application page. This visitor may be a land project looking to join.' : ''}

Guidelines:
- Keep responses concise: 2-4 sentences max unless they ask for detail
- Be warm, encouraging, and use plain English (no markdown headers)
- Offer concrete next steps with page paths like /opportunity or /quests
- If asked something you don't know, admit it and suggest they contact the team
- Don't make up specific numbers not in your knowledge base above`;

        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];

        const response = await invokeLLM({ messages: llmMessages, maxTokens: 400 });
        const content = response.choices?.[0]?.message?.content ?? "I'd be happy to help! What would you like to know about ReGen Civics?";
        return { content };
      }),
  }),
});
export type AppRouter = typeof appRouter;
