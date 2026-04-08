// server/routes/newsletter.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { newsletterSubscribers } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { notifyOwner } from "../_core/notification";
import { ENV } from "../_core/env";
import { SignJWT, jwtVerify } from "jose";

export const newsletterRouter = router({
  // Subscribe to newsletter, creates pending subscriber (isActive=0) and sends confirmation email
  subscribe: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      source: z.enum(["homepage", "investor_form", "connect_form", "apply_form", "footer", "exit_intent", "other"]).default("other"),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "newsletter_subscribe");
      const subscriberId = await db.createNewsletterSubscriber({
        email: input.email,
        name: input.name || null,
        source: input.source,
        isActive: 0, // pending email confirmation (GDPR double opt-in)
      });

      // Sign a 24h confirmation JWT and send email (best-effort)
      try {
        const secret = new TextEncoder().encode(ENV.cookieSecret);
        const token = await new SignJWT({ email: input.email, purpose: 'newsletter-confirm' })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('24h')
          .sign(secret);
        const confirmUrl = `${ENV.appUrl}/newsletter/confirm?token=${encodeURIComponent(token)}`;
        const { sendEmail } = await import("../_core/email");
        await sendEmail({
          to: input.email,
          subject: 'Confirm your ReGen Civics newsletter subscription',
          html: `
            <h2>Welcome to the ReGen Civics newsletter!</h2>
            <p>Click the button below to confirm your subscription and stay informed about the Regenerative Renaissance.</p>
            <p style="margin: 24px 0;">
              <a href="${confirmUrl}" style="background:#1a472a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                Confirm Subscription
              </a>
            </p>
            <p style="color:#888;font-size:13px;">This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.</p>
          `,
        });
      } catch {
        // Email failure is non-fatal, subscriber record is created, admin can manually activate
      }

      return { id: subscriberId, success: true, pendingConfirmation: true };
    }),

  // Confirm newsletter subscription via email link (public)
  confirm: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const secret = new TextEncoder().encode(ENV.cookieSecret);
        const { payload } = await jwtVerify(input.token, secret);
        if (payload.purpose !== 'newsletter-confirm' || typeof payload.email !== 'string') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid confirmation token' });
        }
        await db.activateNewsletterSubscriber(payload.email);
        return { success: true };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Confirmation link is invalid or has expired' });
      }
    }),

  // Get all newsletter subscribers (admin only)
  list: adminProcedure.query(async () => {
    return db.getAllNewsletterSubscribers();
  }),

  // Admin: Get active newsletter subscribers (admin only)
  listActive: adminProcedure.query(async () => {
    return db.getActiveNewsletterSubscribers();
  }),

  // Unsubscribe from newsletter (public, rate limited to prevent email enumeration)
  unsubscribe: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "newsletter_unsubscribe");
      await db.unsubscribeNewsletter(input.email);
      // Always return success to prevent email enumeration
      return { success: true };
    }),

  // Self-service: check if logged-in user has already subscribed
  hasSubscribed: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.email) return { subscribed: false };
    const dbConn = await getDb();
    if (!dbConn) return { subscribed: false };
    const rows = await dbConn.select({ id: newsletterSubscribers.id }).from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, ctx.user.email)).limit(1);
    return { subscribed: rows.length > 0 };
  }),

  // Toggle recording email notifications for the authenticated user
  toggleRecordingNotify: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "No email on your account" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Find or create subscriber row
      const [existing] = await database.select().from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, user.email)).limit(1);

      if (existing) {
        await database.update(newsletterSubscribers)
          .set({ notifyRecordings: input.enabled ? 1 : 0 })
          .where(eq(newsletterSubscribers.id, existing.id));
      } else {
        await database.insert(newsletterSubscribers).values({
          email: user.email,
          name: user.name ?? null,
          source: "other",
          isActive: 1,
          notifyRecordings: input.enabled ? 1 : 0,
        });
      }
      return { enabled: input.enabled };
    }),

  // Get recording notification status for the authenticated user
  recordingNotifyStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user?.email) return { enabled: false };

    const database = await getDb();
    if (!database) return { enabled: false };

    const [sub] = await database.select({ notifyRecordings: newsletterSubscribers.notifyRecordings })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, user.email)).limit(1);

    return { enabled: (sub?.notifyRecordings ?? 0) === 1 };
  }),
});

export const videoSuggestionsRouter = router({
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
});

export const emailRouter = router({
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

      const { sendEmail, emailTemplates } = await import("../_core/email");

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

      const { sendEmail, emailTemplates } = await import("../_core/email");

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

      const { emailTemplates } = await import("../_core/email");

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

      const { sendEmail, emailTemplates: templates } = await import("../_core/email");
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
});
