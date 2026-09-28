/**
 * fundingContacts router: people and conversations for the funding engine
 * (Phase 4), built for logging a conversation on a phone at an event.
 *
 * Security posture (BUILD-PLAYBOOK: new procedures):
 *  - Every procedure is adminProcedure: CSRF protection and the admin role
 *    check apply.
 *  - Every input is zod-bounded; emails and LinkedIn links are validated.
 *  - Nothing is sent. Follow-ups come back as Gmail compose links Rye opens
 *    and sends himself, and do-not-contact rows never appear among them.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  CHANNELS,
  contactDetail,
  contactUpdateInput,
  dueFollowUps,
  listContacts,
  markFollowUpDone,
  pacificToday,
  quickAdd,
  quickAddInput,
  updateContact,
} from "../funding/contacts";
import { fundingTouches, fundingContacts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

export const fundingContactsRouter = router({
  /** Log a conversation in one step: the contact (new or matched by email) and the touch. */
  quickAdd: adminProcedure.input(quickAddInput).mutation(async ({ input, ctx }) => quickAdd(await requireDb(), input, ctx.user.id)),

  /** Contacts, most recently touched first. */
  list: adminProcedure
    .input(z.object({ search: z.string().max(200).optional() }).optional())
    .query(async ({ input }) => listContacts(await requireDb(), input?.search)),

  /** One contact with every conversation. */
  get: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => contactDetail(await requireDb(), input.id)),

  /** Log another conversation with a known contact. */
  addTouch: adminProcedure
    .input(
      z.object({
        contactId: z.number().int().positive(),
        channel: z.enum(CHANNELS),
        direction: z.enum(["inbound", "outbound", "both"]).default("both"),
        summary: z.string().trim().min(1).max(4000),
        nextStep: z.string().trim().max(500).optional(),
        followUpAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { contact } = await contactDetail(db, input.contactId);
      await db.insert(fundingTouches).values({
        contactId: contact.id,
        pipelineId: contact.pipelineId,
        channel: input.channel,
        direction: input.direction,
        summary: input.summary,
        nextStep: input.nextStep?.trim() || null,
        followUpAt: input.followUpAt ?? null,
        createdBy: ctx.user.id,
      });
      await db.update(fundingContacts).set({ lastTouchAt: new Date() }).where(eq(fundingContacts.id, contact.id));
      return contactDetail(db, contact.id);
    }),

  /** Edit a contact: warmth, do-not-contact, region and lawful basis, the funder row, notes. */
  update: adminProcedure.input(contactUpdateInput).mutation(async ({ input }) => updateContact(await requireDb(), input)),

  /** Follow-ups due through today (Pacific) or a given day, with Gmail links. */
  followUps: adminProcedure
    .input(z.object({ through: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional())
    .query(async ({ input }) => dueFollowUps(await requireDb(), input?.through ?? pacificToday())),

  /** A follow-up is done (sent from Gmail, or not needed). */
  doneFollowUp: adminProcedure
    .input(z.object({ touchId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await markFollowUpDone(await requireDb(), input.touchId);
      return { ok: true as const };
    }),
});
