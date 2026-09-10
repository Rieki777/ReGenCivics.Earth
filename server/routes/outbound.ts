import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import { adminProcedure, rateLimited, router } from "../_core/trpc";
import { getDb } from "../db";
import { newsletterIssues } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { emailDocumentFromMarkdown } from "../lib/emailHtml";
import { loadRecipientLogs } from "../lib/outbound-history";
import { NEWSLETTER_POSTAL_ADDRESS, isLetterLayout } from "../../shared/letterLayout";
import {
  HISTORY_VISIBLE_STATUSES,
  attachHistoryStats,
  buildHistoryTimeline,
  buildRecipientRows,
  cleanLetterSubject,
} from "../../shared/outboundHistory";
import { previewUnsubscribeUrl } from "../lib/newsletter-issue-email";
import { invokeLLM, isLLMConfigured } from "../_core/llm";
import {
  attachDraftToLastUserMessage,
  buildNewsletterDraftAgentSystemPrompt,
  DRAFT_AGENT_SCHEMA,
  parseDraftAgentOutput,
  stripEmailPii,
} from "../lib/emailDraftAgent";

const letterLayoutZ = z.enum(["plain", "announcement", "one_pager"]);
const sourceZ = z.enum([
  "homepage",
  "investor_form",
  "connect_form",
  "apply_form",
  "footer",
  "exit_intent",
  "other",
]);

const audienceZ = z.object({
  sources: z.array(sourceZ).max(16).default([]),
  activeOnly: z.literal(true).default(true),
});

function fail(err: unknown, fallback: string): never {
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: err instanceof Error ? err.message : fallback,
  });
}

export const outboundRouter = router({
  saveDraft: adminProcedure
    .use(rateLimited({ windowMs: 60_000, max: 30 }))
    .input(z.object({
      issueId: z.number().int().positive().optional(),
      subject: z.string().min(1).max(300),
      body: z.string().min(1).max(50000),
      layout: letterLayoutZ.default("announcement"),
      templateKey: z.string().max(100).nullable().optional(),
      audience: audienceZ.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const audience = input.audience ?? { sources: [], activeOnly: true as const };
      if (input.issueId) {
        const [existing] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, input.issueId)).limit(1);
        if (!existing || existing.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
        }
        if (existing.status === "sending" || existing.status === "sent") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A sent letter cannot be edited." });
        }
        await db.update(newsletterIssues).set({
          subject: input.subject,
          body: input.body,
          layout: input.layout,
          templateKey: input.templateKey ?? existing.templateKey,
          audience,
        }).where(eq(newsletterIssues.id, existing.id));
        return { id: existing.id };
      }
      const inserted = await db.insert(newsletterIssues).values({
        subject: input.subject,
        body: input.body,
        layout: input.layout,
        templateKey: input.templateKey ?? null,
        audience,
        status: "draft",
        createdBy: ctx.user.id,
      });
      return { id: inserted[0].insertId };
    }),

  listIssues: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: newsletterIssues.id,
      subject: newsletterIssues.subject,
      status: newsletterIssues.status,
      layout: newsletterIssues.layout,
      recipientCount: newsletterIssues.recipientCount,
      sentCount: newsletterIssues.sentCount,
      failedCount: newsletterIssues.failedCount,
      sentAt: newsletterIssues.sentAt,
      createdAt: newsletterIssues.createdAt,
    }).from(newsletterIssues).orderBy(desc(newsletterIssues.createdAt)).limit(50);
  }),

  listHistory: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const issues = await db.select({
      id: newsletterIssues.id,
      subject: newsletterIssues.subject,
      status: newsletterIssues.status,
      layout: newsletterIssues.layout,
      audience: newsletterIssues.audience,
      recipientCount: newsletterIssues.recipientCount,
      sentCount: newsletterIssues.sentCount,
      failedCount: newsletterIssues.failedCount,
      sentAt: newsletterIssues.sentAt,
      scheduledFor: newsletterIssues.scheduledFor,
      createdAt: newsletterIssues.createdAt,
    }).from(newsletterIssues)
      .where(inArray(newsletterIssues.status, [...HISTORY_VISIBLE_STATUSES]))
      .orderBy(desc(newsletterIssues.createdAt))
      .limit(50);
    if (issues.length === 0) return [];
    const { recipients, logs } = await loadRecipientLogs(issues.map((row) => row.id));
    return attachHistoryStats(issues, recipients, logs);
  }),

  getIssue: adminProcedure
    .input(z.object({ issueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [issue] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, input.issueId)).limit(1);
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
      void ctx;
      return issue;
    }),

  getHistoryDetail: adminProcedure
    .input(z.object({ issueId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [issue] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, input.issueId)).limit(1);
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Letter not found." });
      const { recipients, logs } = await loadRecipientLogs([issue.id]);
      const [item] = attachHistoryStats([issue], recipients, logs);
      const layout = isLetterLayout(issue.layout) ? issue.layout : "plain";
      const html = emailDocumentFromMarkdown(issue.body, layout, {
        managePreferencesUrl: previewUnsubscribeUrl(),
        postalAddress: ENV.harvestPostalAddress || NEWSLETTER_POSTAL_ADDRESS,
      });
      return {
        ...(item ?? {
          ...issue,
          subjectDisplay: cleanLetterSubject(issue.subject),
          audienceSummary: "All active subscribers",
          statusLabel: issue.status,
          stats: {
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            complained: 0,
            failed: 0,
            total: issue.recipientCount,
            openPercent: null as number | null,
            clickPercent: null as number | null,
            bounceFailCount: issue.failedCount,
          },
          when: issue.sentAt ?? issue.scheduledFor ?? issue.createdAt,
        }),
        body: issue.body,
        html,
        timeline: buildHistoryTimeline(issue, logs),
        recipients: buildRecipientRows(recipients, logs),
      };
    }),

  sendPreview: adminProcedure
    .use(rateLimited({ windowMs: 60_000, max: 10 }))
    .input(z.object({ issueId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { buildIssuePreview } = await import("../lib/newsletter-issue-email");
      try {
        return await buildIssuePreview({ issueId: input.issueId, createdBy: ctx.user.id });
      } catch (err) {
        fail(err, "Preview failed");
      }
    }),

  confirmSend: adminProcedure
    .use(rateLimited({ windowMs: 60_000, max: 5 }))
    .input(z.object({
      issueId: z.number().int().positive(),
      confirmToken: z.string().min(20).max(2000),
      idempotencyKey: z.string().min(8).max(64),
    }))
    .mutation(async ({ ctx, input }) => {
      const { confirmAndSendIssue } = await import("../lib/newsletter-issue-email");
      try {
        return await confirmAndSendIssue({
          issueId: input.issueId,
          createdBy: ctx.user.id,
          confirmToken: input.confirmToken,
          idempotencyKey: input.idempotencyKey,
        });
      } catch (err) {
        fail(err, "Send refused");
      }
    }),

  draftWithAgent: adminProcedure
    .use(rateLimited({ windowMs: 60 * 60 * 1000, max: 20 }))
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      })).min(1).max(20),
      currentSubject: z.string().max(300).optional(),
      currentBody: z.string().max(20000).optional(),
      currentLayout: letterLayoutZ.optional(),
      audienceLabel: z.string().max(80).optional(),
      recipientCount: z.number().int().min(0).max(100000).optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isLLMConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The writing partner is not configured on this server.",
        });
      }

      const messages = input.messages.map((m) => ({
        role: m.role,
        content: stripEmailPii(m.content).slice(0, 8000),
      }));
      const withDraft = attachDraftToLastUserMessage(
        messages,
        input.currentSubject ?? "",
        input.currentBody ?? "",
        input.currentLayout ?? "announcement",
      );

      const res = await invokeLLM({
        messages: [
          {
            role: "system",
            content: buildNewsletterDraftAgentSystemPrompt({
              audienceLabel: input.audienceLabel ?? "active subscribers",
              recipientCount: input.recipientCount ?? 0,
              currentLayout: input.currentLayout ?? "announcement",
            }),
          },
          ...withDraft,
        ],
        maxTokens: 2000,
        task: "standard",
        outputSchema: DRAFT_AGENT_SCHEMA,
      });

      const parsed = parseDraftAgentOutput(res.choices[0]?.message?.content ?? "{}");
      return {
        reply: parsed.reply || "Here's an updated draft. Apply it when you are ready, then send yourself.",
        subject: parsed.subject,
        body: parsed.body,
        layout: parsed.layout && isLetterLayout(parsed.layout) ? parsed.layout : parsed.layout,
      };
    }),
});
