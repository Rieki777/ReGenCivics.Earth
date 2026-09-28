/**
 * Funding contacts and conversations (funding engine Phase 4, plan v1.3
 * sections 4.3, 4.7 and 9): log a conversation on a phone in under a minute,
 * and see every due follow-up as an Open in Gmail link.
 *
 * The app never sends anything. A follow-up link opens Gmail's compose window
 * with the address, a subject and a starting note filled in; Rye edits it and
 * clicks send himself (handoff rule 3, plan 4.5). Nothing here touches
 * LinkedIn beyond storing a profile URL Rye typed (User Agreement section 8.2).
 * A contact marked do-not-contact never appears in the follow-ups.
 */
import { z } from "zod";
import { and, desc, eq, inArray, isNull, lte, or, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { fundingContacts, fundingTouches, type FundingContactRow, type FundingTouchRow } from "../../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export const CHANNELS = ["email", "linkedin", "call", "meeting", "form", "event"] as const;
export const WARMTH_LABELS = ["Cold", "Met", "Warm", "Champion"] as const;
export const REGIONS = ["us", "eu", "uk", "ca", "other"] as const;

const LINKEDIN = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company|pub)\/[^\s]+$/i;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** The phone form: a name and what was said are enough. */
export const quickAddInput = z.object({
  name: z.string().trim().min(1).max(160),
  organization: z.string().trim().max(200).optional(),
  summary: z.string().trim().min(1).max(4000),
  warmth: z.number().int().min(0).max(3).default(1),
  followUpAt: z.string().regex(YMD, "Use YYYY-MM-DD").nullable().optional(),
  nextStep: z.string().trim().max(500).optional(),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  linkedinUrl: z.string().trim().regex(LINKEDIN, "Paste a linkedin.com/in/ or /company/ link").max(500).optional().or(z.literal("")),
  source: z.string().trim().max(120).optional(),
  channel: z.enum(CHANNELS).default("event"),
  pipelineId: z.number().int().positive().nullable().optional(),
  region: z.enum(REGIONS).nullable().optional(),
});
export type QuickAddInput = z.infer<typeof quickAddInput>;

function blankToNull(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

/**
 * Gmail's compose window, prefilled. Pure. The note is a starting point Rye
 * edits: it names where we met and the next step, and signs off as Rye.
 */
export function gmailComposeUrl(c: { name: string; email: string | null; source: string | null }, t: { nextStep: string | null }): string | null {
  if (!c.email) return null;
  const first = c.name.trim().split(/\s+/)[0] || c.name;
  const where = c.source ? ` at ${c.source}` : "";
  const subject = c.source ? `Good to meet you${where}` : "Following up";
  const body = [`Hi ${first},`, "", `Good to meet you${where}.${t.nextStep ? ` ${t.nextStep}` : ""}`, "", "Rye"].join("\n");
  const params = new URLSearchParams({ view: "cm", fs: "1", to: c.email, su: subject, body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Log a conversation. A known email lands on the same contact; otherwise a new contact starts. */
export async function quickAdd(db: Db, input: QuickAddInput, userId: number | null) {
  const email = blankToNull(input.email)?.toLowerCase() ?? null;
  const now = new Date();
  return db.transaction(async (tx) => {
    let contact: FundingContactRow | undefined;
    if (email) {
      [contact] = await tx.select().from(fundingContacts).where(eq(fundingContacts.email, email)).limit(1);
    }
    const matchedExisting = Boolean(contact);
    if (contact) {
      const patch: Partial<FundingContactRow> = { lastTouchAt: now, warmth: Math.max(contact.warmth, input.warmth) };
      if (!contact.organization && input.organization) patch.organization = input.organization;
      if (!contact.linkedinUrl && blankToNull(input.linkedinUrl)) patch.linkedinUrl = blankToNull(input.linkedinUrl);
      if (!contact.pipelineId && input.pipelineId) patch.pipelineId = input.pipelineId;
      await tx.update(fundingContacts).set(patch).where(eq(fundingContacts.id, contact.id));
    } else {
      const [created] = await tx
        .insert(fundingContacts)
        .values({
          name: input.name,
          organization: blankToNull(input.organization),
          email,
          linkedinUrl: blankToNull(input.linkedinUrl),
          warmth: input.warmth,
          source: blankToNull(input.source),
          pipelineId: input.pipelineId ?? null,
          region: input.region ?? null,
          lastTouchAt: now,
          createdBy: userId,
        })
        .$returningId();
      [contact] = await tx.select().from(fundingContacts).where(eq(fundingContacts.id, created.id)).limit(1);
    }
    const [touch] = await tx
      .insert(fundingTouches)
      .values({
        contactId: contact!.id,
        pipelineId: input.pipelineId ?? contact!.pipelineId ?? null,
        channel: input.channel,
        summary: input.summary,
        nextStep: blankToNull(input.nextStep),
        followUpAt: input.followUpAt ?? null,
        occurredAt: now,
        createdBy: userId,
      })
      .$returningId();
    return { contactId: contact!.id, touchId: touch.id, matchedExisting };
  });
}

/** Contacts, most recently touched first, with their last conversation. */
export async function listContacts(db: Db, search?: string, limit = 100) {
  const term = search?.trim();
  const where = term
    ? or(
        like(fundingContacts.name, `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`),
        like(fundingContacts.organization, `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`),
        like(fundingContacts.email, `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`),
      )
    : undefined;
  const contacts = await db
    .select()
    .from(fundingContacts)
    .where(where)
    .orderBy(sql`${fundingContacts.lastTouchAt} IS NULL`, desc(fundingContacts.lastTouchAt))
    .limit(limit);
  if (!contacts.length) return [];
  const touches = await db
    .select()
    .from(fundingTouches)
    .where(inArray(fundingTouches.contactId, contacts.map((c) => c.id)))
    .orderBy(desc(fundingTouches.occurredAt));
  const last = new Map<number, FundingTouchRow>();
  for (const t of touches) if (!last.has(t.contactId)) last.set(t.contactId, t);
  return contacts.map((c) => ({ ...c, lastTouch: last.get(c.id) ?? null }));
}

export async function contactDetail(db: Db, id: number) {
  const [contact] = await db.select().from(fundingContacts).where(eq(fundingContacts.id, id)).limit(1);
  if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
  const touches = await db.select().from(fundingTouches).where(eq(fundingTouches.contactId, id)).orderBy(desc(fundingTouches.occurredAt));
  return { contact, touches };
}

/**
 * Follow-ups due by a day (today in Pacific time by default) and not done,
 * with a Gmail link where there is an address. Do-not-contact is honored.
 */
export async function dueFollowUps(db: Db, throughYmd: string) {
  const rows = await db
    .select({ touch: fundingTouches, contact: fundingContacts })
    .from(fundingTouches)
    .innerJoin(fundingContacts, eq(fundingContacts.id, fundingTouches.contactId))
    .where(
      and(
        lte(fundingTouches.followUpAt, throughYmd),
        isNull(fundingTouches.followUpDoneAt),
        eq(fundingContacts.doNotContact, false),
      ),
    )
    .orderBy(fundingTouches.followUpAt);
  return rows.map(({ touch, contact }) => ({
    touchId: touch.id,
    followUpAt: touch.followUpAt,
    nextStep: touch.nextStep,
    summary: touch.summary,
    contact: { id: contact.id, name: contact.name, organization: contact.organization, email: contact.email, linkedinUrl: contact.linkedinUrl },
    gmailUrl: gmailComposeUrl(contact, touch),
  }));
}

export async function markFollowUpDone(db: Db, touchId: number) {
  const [row] = await db.select({ id: fundingTouches.id }).from(fundingTouches).where(eq(fundingTouches.id, touchId)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Follow-up not found" });
  await db.update(fundingTouches).set({ followUpDoneAt: new Date() }).where(eq(fundingTouches.id, touchId));
}

export const contactUpdateInput = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(160).optional(),
  organization: z.string().trim().max(200).nullable().optional(),
  role: z.string().trim().max(160).nullable().optional(),
  email: z.string().trim().email().max(320).nullable().optional().or(z.literal("")),
  linkedinUrl: z.string().trim().regex(LINKEDIN).max(500).nullable().optional().or(z.literal("")),
  warmth: z.number().int().min(0).max(3).optional(),
  region: z.enum(REGIONS).nullable().optional(),
  lawfulBasis: z.enum(["legitimate_interest", "consent"]).nullable().optional(),
  doNotContact: z.boolean().optional(),
  pipelineId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
});

export async function updateContact(db: Db, input: z.infer<typeof contactUpdateInput>) {
  const { id, ...rest } = input;
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    patch[k] = typeof v === "string" ? (k === "email" ? blankToNull(v)?.toLowerCase() ?? null : blankToNull(v)) : v;
  }
  if (Object.keys(patch).length) await db.update(fundingContacts).set(patch).where(eq(fundingContacts.id, id));
  return contactDetail(db, id);
}

/** Today's date in Pacific time, YYYY-MM-DD. */
export function pacificToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
