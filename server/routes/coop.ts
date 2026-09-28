/**
 * coop router: "tell us you're interested" in the member-owned cooperative in
 * design (shared/fund.ts COOP; funding engine Phase 0, drizzle/0275).
 *
 * This replaces the letter-of-intent pledge form. The old form asked for a
 * pledge amount against a $250,000 minimum and an accredited-investor
 * self-certification. Under the cooperative framing (FUNDING_ENGINE_PLAN v1.2)
 * no amount, minimum or accreditation question may appear anywhere: a
 * purchasing cooperative keeps its "bought for use" footing only while nothing
 * in the funnel reads as an offer. So the form collects who someone is, which
 * of the nine forms of capital they might bring, and consent to be contacted.
 * Nothing else.
 *
 * Interest is its own record and its own act (the Sept legal research's
 * "two records, two acts"): it never creates a membership, a contribution or
 * an account.
 *
 * Security posture (BUILD-PLAYBOOK: a new public procedure):
 *  - submitInterest is public, CSRF-protected like every publicProcedure, and
 *    rate limited per IP (coop_interest in server/rate-limit.ts).
 *  - Every field is length-bounded and validated server-side; capitalForms is
 *    an allowlist of CAPITAL_TYPES; consent must be literally true.
 *  - The confirmation email escapes the submitted name before it reaches HTML.
 *  - Admin reads and status changes are adminProcedure.
 */
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { coopInterest } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { sendEmail } from "../_core/email";
import { notifyIfEnabled } from "../notify-with-prefs";
import { CAPITAL_TYPES } from "@shared/capitals";
import { COOP } from "@shared/fund";
import { escapeHtml } from "@shared/htmlText";

export const COOP_INTEREST_KINDS = ["land_project", "person", "organization", "funder"] as const;
export const COOP_INTEREST_STATUSES = ["new", "contacted", "in_conversation", "archived"] as const;

const KIND_LABEL: Record<(typeof COOP_INTEREST_KINDS)[number], string> = {
  land_project: "a land project",
  person: "a person",
  organization: "an organization",
  funder: "a funder or foundation",
};

export const submitInterestInput = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320),
  kind: z.enum(COOP_INTEREST_KINDS),
  organization: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  capitalForms: z.array(z.enum(CAPITAL_TYPES)).max(CAPITAL_TYPES.length).default([]),
  message: z.string().trim().max(4000).optional(),
  consent: z.literal(true),
  source: z.string().trim().max(60).optional(),
});

function requireDb() {
  return getDb().then((db) => {
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db;
  });
}

function emptyToNull(value: string | undefined): string | null {
  const s = (value ?? "").trim();
  return s ? s : null;
}

/** The confirmation email. Plain, one idea, no offer language. Exposed for tests. */
export function interestConfirmationHtml(name: string): string {
  const safe = escapeHtml(name);
  return [
    `<p>Hi ${safe},</p>`,
    `<p>Thanks for telling us you're interested in the ${escapeHtml(COOP.name)}.</p>`,
    `<p>${escapeHtml(COOP.interestPromise)}</p>`,
    `<p>${escapeHtml(COOP.statement)}</p>`,
    `<p style="font-size:12px;color:#5b6b5f">${escapeHtml(COOP.notAnOffer)}</p>`,
  ].join("\n");
}

export const coopRouter = router({
  /** Public: record interest in the cooperative. No amounts, no minimums. */
  submitInterest: publicProcedure.input(submitInterestInput).mutation(async ({ ctx, input }) => {
    await checkRateLimit(ctx, "coop_interest");
    const db = await requireDb();

    // De-duplicate repeats in the same order, so a form submitted twice
    // does not store two rows with the same choices.
    const capitalForms = Array.from(new Set(input.capitalForms));

    await db.insert(coopInterest).values({
      name: input.name,
      email: input.email.toLowerCase(),
      kind: input.kind,
      organization: emptyToNull(input.organization),
      location: emptyToNull(input.location),
      capitalForms,
      message: emptyToNull(input.message),
      source: emptyToNull(input.source),
      userId: ctx.user?.id ?? null,
    });

    // Best effort: the record is what matters, so a mail or notification
    // failure never fails the submission.
    try {
      await sendEmail({
        to: input.email,
        subject: "Thanks for your interest in the cooperative",
        html: interestConfirmationHtml(input.name),
        template: "coop_interest_confirmation",
        inquiryType: "coop_interest",
        recipientName: input.name,
      });
    } catch (err) {
      console.warn("[coop] confirmation email failed:", err);
    }
    try {
      await notifyIfEnabled("loiSubmissions", {
        title: "Cooperative interest",
        content: `${input.name} (${input.email}) is interested in the cooperative as ${KIND_LABEL[input.kind]}.${
          capitalForms.length ? ` Might bring: ${capitalForms.join(", ")}.` : ""
        }`,
      });
    } catch (err) {
      console.warn("[coop] owner notification failed:", err);
    }

    return { ok: true as const };
  }),

  /** Admin: every interest record, newest first. */
  listInterest: adminProcedure
    .input(z.object({ status: z.enum(COOP_INTEREST_STATUSES).optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(coopInterest)
        .where(input?.status ? eq(coopInterest.status, input.status) : undefined)
        .orderBy(desc(coopInterest.createdAt))
        .limit(500);
    }),

  /** Admin: counts by kind and status, for the admin header. */
  interestStats: adminProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select({ kind: coopInterest.kind, status: coopInterest.status, n: sql<number>`COUNT(*)` })
      .from(coopInterest)
      .groupBy(coopInterest.kind, coopInterest.status);
    return rows.map((r) => ({ ...r, n: Number(r.n) }));
  }),

  /** Admin: move a record along. */
  setInterestStatus: adminProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(COOP_INTEREST_STATUSES) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(coopInterest).set({ status: input.status }).where(eq(coopInterest.id, input.id));
      return { ok: true as const };
    }),
});
