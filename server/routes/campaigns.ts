// server/routes/campaigns.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { campaigns as campaignsTable } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { notifyIfEnabled } from "../notify-with-prefs";
import { generateImage } from "../_core/imageGeneration";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";

export const campaignsRouter = router({
  // List all campaigns (with optional filtering)
  list: publicProcedure
    .input(z.object({
      status: z.enum(['draft', 'pending_review', 'active', 'funded', 'completed', 'cancelled', 'rejected']).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const campaignList = await db.listCampaigns(input?.status, input?.search);
      // Batch-fetch all images in one query (eliminates N+1)
      const imagesMap = await db.getCampaignImagesForMany(campaignList.map(c => c.id));
      return campaignList.map((c) => {
        const images = imagesMap[c.id] ?? [];
        const coverImage = images.find(img => img.isCover === 1) || images[0] || null;
        return { ...c, coverImage, imageCount: images.length };
      });
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
      // Fire-and-forget image generation — don't block mutation response
      generateImage({
        contentType: "campaign",
        contentId: campaignId,
        contextText: `${input.title}. ${(input.description ?? "").slice(0, 200)}`,
      }).then(({ url }) =>
        getDb().then(d => d?.update(campaignsTable).set({ generatedImageUrl: url }).where(eq(campaignsTable.id, campaignId)))
      ).catch(err => console.error(`Image gen failed for campaign ${campaignId}:`, err));
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
        const { sendEmail, emailTemplates } = await import("../_core/email");
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
});

export const crowdPoolingProjectsRouter = router({
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
});

export const crowdPoolingProposalsRouter = router({
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
});

export const savedContributionsRouter = router({
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
});
