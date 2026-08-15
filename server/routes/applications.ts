// server/routes/applications.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { applicationEvents, orgClaims } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { notifyOwner } from "../_core/notification";
import { notifyIfEnabled } from "../notify-with-prefs";
import { sendEmail, toAbsoluteUrl } from "../_core/email";
import { currentIncubatorSeason } from "../../shared/incubatorSeason";

export const applicationsRouter = router({
  // Create a new draft application
  create: protectedProcedure
    .input(z.object({
      projectName: z.string().min(1),
      projectType: z.enum(["early_stage", "mature"]),
      location: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "apply_create");

      // One-per-user guard: prevent duplicate applications
      const existing = await db.getApplicationsByUserId(ctx.user.id);
      if (existing.length > 0) {
        // Return the existing application instead of creating a duplicate
        return existing[0];
      }

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

      // Auto-declare the Land Project path. Idempotent (insert-or-noop).
      // Tier criterion fires later when status moves to 'approved' / 'active';
      // the cron picks that up. We don't run the detector inline here because
      // a fresh draft application doesn't satisfy any criterion yet.
      try {
        const { declarePath } = await import("../lib/tierDetector");
        await declarePath(ctx.user.id, "land_project");
      } catch (err) {
        console.warn("[applications.create] declarePath failed (non-fatal):", err);
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
        // Size + community metrics. The form always sent these; zod strips
        // unknown keys, so before this they were silently dropped (bug fix).
        projectSizeHectares: z.number().optional(),
        currentPeopleCount: z.number().optional(),
        currentHouseholdCount: z.number().optional(),
        intendedPeopleCount: z.number().optional(),
        intendedHouseholdCount: z.number().optional(),
        mixedUse: z.string().optional(), // JSON array string
        // Conversation record from the Gardener companion on /apply. JSON array
        // of turns; capped well above the client's 60-turn ceiling.
        companionTranscript: z.string().max(400_000).optional(),
        // Optional needs/offers capture (Phase B2): stored here through the
        // draft flow, mirrored to the board tables on submit.
        needsText: z.string().max(2000).optional(),
        offersText: z.string().max(2000).optional(),
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
        (c) => c.orgId === String(input.applicationId) && c.status === 'approved'
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
      await checkRateLimit(ctx, "application_submit");
      const application = await db.getApplicationById(input.id);
      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }
      if (application.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your application" });
      }
      await db.updateApplication(input.id, {
        status: "submitted",
        submittedAt: new Date(),
        stewardUserId: ctx.user.id,
        season: currentIncubatorSeason(),
      });

      // Backfill map coordinates when the applicant submitted without dropping a
      // pin on /apply. The pin is optional, so a text-only location would leave
      // the project invisible on the globe (mapData requires lat+lng). Best-effort:
      // a geocoding hiccup must never block the submission.
      if ((application.latitude == null || application.longitude == null) && application.location) {
        try {
          const { geocodeLocation } = await import("../lib/geocode");
          const geo = await geocodeLocation(application.location);
          if (geo) {
            await db.updateApplication(input.id, {
              latitude: geo.lat,
              longitude: geo.lng,
              country: application.country || geo.country || undefined,
            });
          }
        } catch (e) {
          console.warn("[Geocode] Application submit backfill failed:", e);
        }
      }

      // Mirror the optional needs/offers capture to the board tables (Phase B2).
      // Non-fatal by design: a board hiccup never blocks a submission.
      const { captureFormNeedsOffers } = await import("../lib/needsOffersStore");
      await captureFormNeedsOffers({
        source: "incubator_application",
        sourceId: input.id,
        ownerId: ctx.user.id,
        contactName: application.projectName,
        needsText: application.needsText,
        offersText: application.offersText,
      });

      // Notify owner of new application submission (respects notification preferences)
      // Also send confirmation email directly to the applicant
      try {
        await notifyIfEnabled("applicationSubmissions", {
          title: `New Application: ${application.projectName}`,
          content: `A new land project application has been submitted for the Spring Season.\n\n**Project:** ${application.projectName}\n**Type:** ${application.projectType}\n**Location:** ${application.location}\n\nReview it in the admin dashboard.`,
        });

        // Send transactional confirmation email to the applicant
        const applicantUser = await db.getUserById(ctx.user.id);
        if (applicantUser?.email) {
          const applicantName = applicantUser.name || "Applicant";
          await sendEmail({
            to: applicantUser.email,
            subject: `Application Received: ${application.projectName}`,
            html: `
              <h2>Your Application Has Been Received</h2>
              <p>Hi ${applicantName},</p>
              <p>Thank you for applying to the <strong>ReGen Civics Incubator</strong>! We have received your application for <strong>${application.projectName}</strong> and our team will review it carefully.</p>
              <h3>What happens next?</h3>
              <ol>
                <li><strong>Review (1–2 weeks):</strong> Our team reviews your application for fit with the ReGenerative Renaissance mission.</li>
                <li><strong>Invitation to Connect:</strong> If your project is a strong fit, we will reach out to schedule a call.</li>
                <li><strong>Season Decision:</strong> Final decisions are communicated before the season kickoff.</li>
              </ol>
              <h3>Your Application Summary</h3>
              <ul>
                <li><strong>Project:</strong> ${application.projectName}</li>
                <li><strong>Type:</strong> ${application.projectType === "early_stage" ? "Early Stage" : "Mature Project"}</li>
                <li><strong>Location:</strong> ${application.location}</li>
              </ul>
              <p>In the meantime, explore the <a href="${toAbsoluteUrl('/community')}">Community</a>, introduce yourself in the <a href="${toAbsoluteUrl('/community')}">Forum</a>, or complete your <a href="${toAbsoluteUrl('/profile')}">Player Profile</a>.</p>
              <p>With gratitude,<br>The ReGen Civics Team</p>
            `,
            template: "application_confirmation",
            inquiryType: "application",
            inquiryId: application.id,
            recipientName: applicantName,
          }).catch((e) => console.warn("[Email] Applicant confirmation failed:", e));
        }

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

  // Admin: Get all non-draft applications (submitted, under_review, approved, active, etc.)
  // ── ReGen impact schema (Phase C1, improvement 7) ──────────────────────────
  // Admin-edited structured impact record, validated against shared/impact.ts
  // on every write. Public display goes through publicImpactSummary() only.
  adminGetImpact: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const app = await db.getApplicationById(input.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      const { parseImpactData } = await import("@shared/impact");
      return { id: app.id, projectName: app.projectName, impact: parseImpactData(app.impactData) };
    }),

  adminSetImpact: adminProcedure
    .input(
      z.object({
        id: z.number(),
        impact: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ input }) => {
      const app = await db.getApplicationById(input.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      const { impactDataSchema } = await import("@shared/impact");
      const parsed = impactDataSchema.omit({ updatedAt: true }).safeParse(input.impact);
      if (!parsed.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Impact data failed validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
        });
      }
      await db.updateApplication(input.id, {
        impactData: { ...parsed.data, updatedAt: new Date().toISOString() },
      });
      return { ok: true };
    }),

  list: adminProcedure.query(async () => {
    return db.getAllApplications();
  }),

  // Admin: Get draft applications separately
  listDrafts: adminProcedure.query(async () => {
    return db.getDraftApplications();
  }),

  // Admin: Get applications by status
  listByStatus: adminProcedure
    .input(z.object({ status: z.string() }))
    .query(async ({ input }) => {
      return db.getApplicationsByStatus(input.status);
    }),

  // Admin: Update application status
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "submitted", "under_review", "approved", "active", "inactive", "rejected", "changes_requested"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateApplication(input.id, { status: input.status });

      // Inline tier detection on approval. Land Project Co-Creator
      // criterion fires the moment status moves to 'approved' or
      // 'active'. We look up the application to get its userId and
      // run the detector for that user. Non-fatal if it errors.
      if (input.status === "approved" || input.status === "active") {
        try {
          const app = await db.getApplicationById(input.id);
          if (app?.userId) {
            const { detectTierProgression } = await import("../lib/tierDetector");
            await detectTierProgression(app.userId);
          }
        } catch (err) {
          console.warn("[applications.updateStatus] tier detection failed (non-fatal):", err);
        }
      }

      // Log to application events table
      try {
        const drizzleDb = await getDb();
        if (drizzleDb) {
          await drizzleDb.insert(applicationEvents).values({
            applicationId: input.id,
            eventType: 'status_change',
            description: `Status changed to: ${input.status}`,
            adminUserId: ctx.user.id,
          });
        }
      } catch (e) {
        console.warn("Failed to log application event:", e);
      }

      // Also write to the immutable admin audit log
      await db.logAdminAction({
        adminUserId: ctx.user.id,
        action: "application.status_change",
        entityType: "application",
        entityId: input.id,
        description: `Changed application status to: ${input.status}`,
        metadata: { newStatus: input.status },
      });

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

        // Auto-create forum thread in Active Projects category on approval
        if (input.status === "approved") {
          try {
            const cats = await db.listForumCategories();
            let landProjectsCat = cats.find(c => c.slug === "land-projects");

            // Auto-create the category if it doesn't exist
            if (!landProjectsCat) {
              const catId = await db.createForumCategory({
                name: "Land Projects",
                slug: "land-projects",
                description: "Land projects approved by ReGen Civics. Follow updates, ask questions, and connect with the teams.",
                sortOrder: 99,
              });
              landProjectsCat = { id: catId, slug: "land-projects", name: "Land Projects" } as any;
            }

            if (landProjectsCat) {
              const typeLabel = updatedApp.projectType === "early_stage" ? "early-stage" : "mature";
              const landStatusLabel: Record<string, string> = { owned: "owned", leased: "leased", committed: "committed to purchase", seeking: "seeking land" };

              // Build rich community metrics line
              const metrics: string[] = [];
              if (updatedApp.projectSizeHectares) metrics.push(`${updatedApp.projectSizeHectares} hectares`);
              if (updatedApp.currentPeopleCount) metrics.push(`${updatedApp.currentPeopleCount} people currently`);
              if (updatedApp.intendedPeopleCount) metrics.push(`${updatedApp.intendedPeopleCount} intended`);

              // Build mixed use label
              let mixedUseStr = "";
              try {
                const mu = JSON.parse(updatedApp.mixedUse ?? "[]");
                if (Array.isArray(mu) && mu.length) mixedUseStr = mu.join(", ");
              } catch { /* ignore */ }

              const threadContent = [
                `**${updatedApp.projectName}** is a ${typeLabel} regenerative land project based in ${updatedApp.location}${updatedApp.country ? `, ${updatedApp.country}` : ""}.`,
                "",
                `**Vision**`,
                updatedApp.vision,
                "",
                `**Land status:** ${landStatusLabel[updatedApp.landStatus] ?? updatedApp.landStatus}`,
                metrics.length ? `**Scale:** ${metrics.join(" | ")}` : "",
                mixedUseStr ? `**Uses:** ${mixedUseStr}` : "",
                updatedApp.meetingFrequency ? `**Community gathering:** ${updatedApp.meetingFrequency.replace(/_/g, " ")}` : "",
                "",
                `**Regenerative practices**`,
                updatedApp.regenerativePractices,
                "",
                `**Governance approach**`,
                updatedApp.governanceApproach,
                "",
                `**Community engagement**`,
                updatedApp.communityEngagement,
                "",
                `**Team:** ${updatedApp.teamDescription} (${updatedApp.teamSize} people)`,
                "",
                `**Current funding:** ${updatedApp.currentFunding || "Not disclosed"}`,
                `**Funding needs:** ${updatedApp.fundingNeeds}`,
                "",
                updatedApp.timeCommitment ? `**Time commitment:** ${updatedApp.timeCommitment}` : "",
                updatedApp.websiteUrl ? `**Website:** ${updatedApp.websiteUrl}` : "",
                "",
                `---`,
                `Follow this thread for updates from the team. Ask questions, offer support, or share resources below.`,
                "",
                `[Apply to support this project](/apply) | [View on map](/map)`,
              ].filter(l => l !== null && l !== undefined && !(l === "" && false)).join("\n").replace(/\n{3,}/g, "\n\n").trim();

              await db.createForumPost({
                categoryId: landProjectsCat.id,
                authorId: 1,
                title: `${updatedApp.projectName} - ${updatedApp.location}`,
                content: threadContent,
                isPinned: 1,
                postType: "discussion",
              });
            }
          } catch (e) {
            console.warn("Failed to auto-create forum thread for approved project:", e);
          }
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

  // Public: Full detail for a single submitted/approved application.
  // Returns all applicant-authored answer fields. Excludes contact info
  // (userId, stewardUserId) and internal review metadata (adminSeeded, etc.).
  // Only serves applications in submitted | under_review | approved | active.
  publicDetail: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const app = await db.getApplicationById(input.id);
      if (!app) return null;
      const visibleStatuses = ["submitted", "under_review", "approved", "active"];
      if (!visibleStatuses.includes(app.status ?? "")) return null;
      return {
        id: app.id,
        projectName: app.projectName,
        projectType: app.projectType,
        location: app.location,
        country: app.country,
        vision: app.vision,
        landStatus: app.landStatus,
        teamSize: app.teamSize,
        teamDescription: app.teamDescription,
        projectSizeHectares: app.projectSizeHectares,
        currentPeopleCount: app.currentPeopleCount,
        currentHouseholdCount: app.currentHouseholdCount,
        intendedPeopleCount: app.intendedPeopleCount,
        intendedHouseholdCount: app.intendedHouseholdCount,
        mixedUse: app.mixedUse,
        meetingFrequency: app.meetingFrequency,
        dietaryPatterns: app.dietaryPatterns,
        regenerativePractices: app.regenerativePractices,
        governanceApproach: app.governanceApproach,
        communityEngagement: app.communityEngagement,
        timeCommitment: app.timeCommitment,
        currentFunding: app.currentFunding,
        fundingNeeds: app.fundingNeeds,
        websiteUrl: app.websiteUrl,
        videoUrl: app.videoUrl,
        additionalNotes: app.additionalNotes,
        projectStatus: app.projectStatus,
        endorsementCount: app.endorsementCount,
        contributionCount: app.contributionCount,
        submittedAt: app.submittedAt,
      };
    }),

  // Public: Get submitted applications for the globe map (limited fields)
  mapData: publicProcedure.query(async () => {
    const allApps = await db.getAllApplications();
    // Only show submitted/under_review/approved applications with location data
    return allApps
      .filter((app) =>
        ["submitted", "under_review", "approved", "active"].includes(app.status ?? '') &&
        app.latitude && app.longitude
      )
      .map((app) => ({
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
        stewardUserId: app.stewardUserId ?? null,
      }));
  }),
});

export const applicantsForCampaignRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const allApps = await db.getApplicationsByStatus('submitted');
      const approvedApps = await db.getApplicationsByStatus('approved');
      const activeApps = await db.getApplicationsByStatus('active');
      const combined = [...allApps, ...approvedApps, ...activeApps];

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
});

export const reviewsRouter = router({
  // Admin: Create a review
  create: adminProcedure
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
});

export const orgClaimsRouter = router({
  // Search land projects and alliance orgs by name
  search: publicProcedure
    .input(z.object({ q: z.string() }))
    .query(async ({ input }) => {
      const { q } = input;
      if (!q || q.length < 2) return [];
      const ALLIANCE_ORGS_LIST = [
        { id: "hypha", name: "Hypha DAO" },
        { id: "seeds", name: "SEEDS" },
        { id: "nestr", name: "Nestr.io" },
        { id: "kinship_earth", name: "Kinship Earth" },
        { id: "open_future", name: "Open Future Coalition" },
        { id: "united_planet", name: "UP.Game (United Planet)" },
        { id: "gaia_biolab", name: "Gaia Union BioLab" },
        { id: "closer", name: "Closer.earth" },
        { id: "oasa", name: "OASA.earth" },
        { id: "planetary_party", name: "Planetary Party" },
        { id: "dao_universe", name: "DAO Universe Club" },
        { id: "desa", name: "DESA" },
        { id: "permatours", name: "Permatours" },
        { id: "maptio", name: "Maptio" },
        { id: "local_scale", name: "LocalScale" },
      ];
      const landProjects = await db.searchApplications(q);
      const allianceOrgs = ALLIANCE_ORGS_LIST.filter(o =>
        o.name.toLowerCase().includes(q.toLowerCase())
      );
      return [
        ...landProjects.map(p => ({
          id: String(p.id),
          name: p.projectName ?? "",
          location: p.location ?? null,
          type: "land_project" as const,
        })),
        ...allianceOrgs.map(o => ({
          id: o.id,
          name: o.name,
          location: null as string | null,
          type: "alliance_org" as const,
        })),
      ];
    }),

  // Any authenticated user can claim an org (pending admin approval)
  claim: protectedProcedure
    .input(z.object({
      orgType: z.enum(["land_project", "alliance_org"]),
      orgId: z.string().min(1),
      orgName: z.string().min(1),
      // Detailed form data, land project or alliance org variant
      formData: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createOrgClaim({
        userId: ctx.user.id,
        orgType: input.orgType,
        orgId: input.orgId,
        orgName: input.orgName,
        formData: input.formData ?? null,
      });
      // Create (or find existing) forum thread for this entity immediately on claim.
      // The claimant is the author so they can introduce themselves right away.
      const forumThreadId = await db.ensureEntityForumThread(
        input.orgType,
        input.orgName,
        ctx.user.id,
      );
      return { id, forumThreadId };
    }),

  // Get own claims
  mine: protectedProcedure.query(async ({ ctx }) => {
    return db.getOrgClaimsByUser(ctx.user.id);
  }),

  // Admin: see all claims
  listAll: adminProcedure.query(async () => {
    return db.getAllOrgClaims();
  }),

  // Admin: approve a claim
  approve: adminProcedure
    .input(z.object({
      id: z.number(),
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const claim = await db.updateOrgClaimStatus(input.id, 'approved', input.adminNotes);
      if (claim) {
        // Check if the project already has a steward before overwriting
        if (claim.orgType === 'land_project') {
          const appId = parseInt(claim.orgId, 10);
          if (!isNaN(appId)) {
            const existing = await db.getApplicationById(appId);
            if (existing?.stewardUserId && existing.stewardUserId !== claim.userId) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "This project already has a steward assigned. Remove the current steward before approving a new claim.",
              });
            }
            await db.updateApplication(appId, { stewardUserId: claim.userId });
          }
        }
        // Route all pending join requests for this org to the new steward
        await db.routeJoinRequestsToSteward(claim.orgId, claim.userId);
        // Auto-create the forum thread for this entity if it doesn't exist yet
        await db.ensureEntityForumThread(claim.orgType, claim.orgName, ctx.user.id);
      }
      return { ok: true };
    }),

  reject: adminProcedure
    .input(z.object({
      id: z.number(),
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.updateOrgClaimStatus(input.id, 'rejected', input.adminNotes);
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
    .mutation(async ({ ctx, input }) => {
      const id = await db.createOrgClaim({
        userId: input.userId,
        orgType: input.orgType,
        orgId: input.orgId,
        orgName: input.orgName,
      });
      const claim = await db.updateOrgClaimStatus(id, 'approved');
      if (claim) {
        await db.routeJoinRequestsToSteward(claim.orgId, claim.userId);
        await db.ensureEntityForumThread(claim.orgType, claim.orgName, ctx.user.id);
      }
      return { id, ok: true };
    }),
});
