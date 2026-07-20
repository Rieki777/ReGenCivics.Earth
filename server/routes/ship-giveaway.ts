/**
 * shipGiveaway router - the public entry layer for the Free Voyage Giveaway.
 *
 * A zero-effort base entry (email only) for the public sweepstakes. Verified
 * entries feed the SAME weighted draw as quest threshold entrants and approved
 * nominations (see drawFreeVoyageWinner in ./ship.ts); this router only owns the
 * public-entry source, the referral loop, and the funnel tag. The draw, the audit
 * trail, and the exclusions are unchanged.
 *
 * Security posture (BUILD-PLAYBOOK, this is new public input + new email):
 *  - Every procedure is public, zod-bounded, and checkRateLimit'd per IP.
 *  - Free text is sanitizeInput'd before storage; the userId is taken from
 *    ctx.user, never from input.
 *  - enter is idempotent and does not reveal whether an email already exists (no
 *    enumeration): it always returns { ok: true } and only (re)sends the
 *    verification email when the address is still unconfirmed.
 *  - The verify token is the entrant's capability for tag/bonus: it is emailed to
 *    the address it belongs to, the same shape as the concierge session token.
 *
 * Word discipline (campaign brief, STEERING section 1): nothing user-facing here
 * says "raffle" or "tickets". Public words are "entries" and "the draw".
 */
import { z } from "zod";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { shipGiveawayEntries, shipNominations, shipQuestCompletions, type ShipGiveawayEntry } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { checkRateLimit } from "../rate-limit";
import { sanitizeInput } from "../_core/security";
import { isGiveawayRulesApproved } from "../lib/ship-config";
import {
  publicEntryTickets, emptyBonus, normalizeBonus, GIVEAWAY_BONUS, REFERRAL_CREDIT_CAP,
  GIVEAWAY_ENTRIES_OPEN_YMD, GIVEAWAY_ENTRIES_CLOSE_YMD, GIVEAWAY_ENTRIES_CLOSE_ISO,
  GIVEAWAY_DRAW_YMD, GIVEAWAY_ARV_USD,
} from "@shared/shipGiveaway";
import { emailVerifyGiveawayEntry, emailGiveawayWelcome } from "../lib/ship-emails";

type DB = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function db(): Promise<DB> {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  return d;
}

// Referral codes: uppercase, no 0/O/1/I so they read cleanly aloud and in print.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 7): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}
function newVerifyToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 64 hex chars, fits verifyToken
}
function affectedOf(r: unknown): number {
  const a = r as { affectedRows?: number; rowsAffected?: number } & Array<{ affectedRows?: number }>;
  return a?.affectedRows ?? a?.[0]?.affectedRows ?? a?.rowsAffected ?? 0;
}
function insertIdOf(r: unknown): number | null {
  const a = r as { insertId?: number } & Array<{ insertId?: number }>;
  return a?.insertId ?? a?.[0]?.insertId ?? null;
}

async function uniqueReferralCode(d: DB): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = randomCode(7);
    const [existing] = await d
      .select({ id: shipGiveawayEntries.id })
      .from(shipGiveawayEntries)
      .where(eq(shipGiveawayEntries.referralCode, code))
      .limit(1);
    if (!existing) return code;
  }
  return randomCode(12); // vanishingly unlikely; widen and move on
}

/** True once the promotion's close instant has passed (server clock is UTC). */
function entriesClosed(): boolean {
  return Date.now() > Date.parse(GIVEAWAY_ENTRIES_CLOSE_ISO);
}

/** enter() gate: the rules must be published (counsel sign-off) and the window open. */
function assertEntriesOpen(): void {
  if (!isGiveawayRulesApproved()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Entries open when the official rules publish. Please check back soon." });
  }
  if (entriesClosed()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Entries for the free voyage draw have closed." });
  }
}

const verifyUrlFor = (token: string) => `${ENV.appUrl}/ship/giveaway?verify=${token}`;
const referralUrlFor = (code: string) => `${ENV.appUrl}/ship/giveaway?crew=${code}`;

/** The entrant's own view: total entries, their referral standing, and tag state.
 *  Runs one grouped query over the confirmed-referral counts to place them on the
 *  leaderboard without pulling every row. */
async function entrantState(d: DB, entry: ShipGiveawayEntry) {
  const bonus = normalizeBonus(entry.bonusTickets);
  const rows = await d
    .select({ code: shipGiveawayEntries.referredBy, c: sql<number>`COUNT(*)` })
    .from(shipGiveawayEntries)
    .where(and(isNotNull(shipGiveawayEntries.verifiedAt), isNotNull(shipGiveawayEntries.referredBy)))
    .groupBy(shipGiveawayEntries.referredBy);
  let referralCount = 0;
  const counts: number[] = [];
  for (const r of rows) {
    const c = Number(r.c ?? 0);
    counts.push(c);
    if (r.code === entry.referralCode) referralCount = c;
  }
  const leaderboardPosition = referralCount > 0 ? 1 + counts.filter((c) => c > referralCount).length : null;
  return {
    referralCode: entry.referralCode,
    referralUrl: referralUrlFor(entry.referralCode),
    verified: entry.verifiedAt != null,
    funnelTag: entry.funnelTag ?? null,
    needsTag: entry.funnelTag == null,
    entries: publicEntryTickets(bonus),
    bonus,
    referralCount,
    leaderboardPosition,
  };
}

async function entryByToken(d: DB, token: string): Promise<ShipGiveawayEntry> {
  const [entry] = await d.select().from(shipGiveawayEntries).where(eq(shipGiveawayEntries.verifyToken, token)).limit(1);
  if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "This link is not valid." });
  return entry;
}

const tokenSchema = z.string().trim().min(16).max(64).regex(/^[a-f0-9]+$/i);

export const shipGiveawayRouter = router({
  // Zero-effort base entry: an email, optionally a referral code and a source tag.
  // Idempotent and non-enumerating; sends the verification email.
  enter: publicProcedure
    .input(
      z.object({
        email: z.string().trim().email().max(320),
        referredBy: z.string().trim().max(16).regex(/^[A-Za-z0-9]+$/).optional(),
        src: z.string().trim().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "ship_giveaway_enter");
      assertEntriesOpen();
      const d = await db();
      const email = input.email.trim().toLowerCase();
      const referredBy = input.referredBy ? input.referredBy.toUpperCase() : null;
      const src = input.src ? sanitizeInput(input.src) : null;
      const userId = ctx.user?.id ?? null;

      const [existing] = await d.select().from(shipGiveawayEntries).where(eq(shipGiveawayEntries.email, email)).limit(1);
      if (existing) {
        // Link a now-signed-in player to a prior anonymous entry (draw exclusion).
        if (!existing.userId && userId) {
          await d.update(shipGiveawayEntries).set({ userId }).where(eq(shipGiveawayEntries.id, existing.id));
        }
        // Resend the confirmation only while still unconfirmed; never reveal state.
        if (!existing.verifiedAt) {
          await emailVerifyGiveawayEntry(email, { verifyUrl: verifyUrlFor(existing.verifyToken) });
          await d.update(shipGiveawayEntries).set({ verifyEmailSentAt: new Date() }).where(eq(shipGiveawayEntries.id, existing.id));
        }
        return { ok: true };
      }

      const referralCode = await uniqueReferralCode(d);
      const verifyToken = newVerifyToken();
      await d.insert(shipGiveawayEntries).values({
        email,
        userId,
        verifyToken,
        referralCode,
        referredBy,
        src,
        bonusTickets: emptyBonus(),
        verifyEmailSentAt: new Date(),
      });
      await emailVerifyGiveawayEntry(email, { verifyUrl: verifyUrlFor(verifyToken) });
      return { ok: true };
    }),

  // Confirm the email. First confirmation credits the referrer (+5, capped) and
  // sends the welcome email. Concurrency-safe: only the update that flips
  // verifiedAt from null does the crediting, so a double-click cannot double-pay.
  verify: publicProcedure
    .input(z.object({ token: tokenSchema }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "ship_giveaway_verify");
      const d = await db();
      const entry = await entryByToken(d, input.token);

      if (!entry.verifiedAt) {
        const upd = await d
          .update(shipGiveawayEntries)
          .set({ verifiedAt: new Date() })
          .where(and(eq(shipGiveawayEntries.id, entry.id), isNull(shipGiveawayEntries.verifiedAt)));
        if (affectedOf(upd) === 1) {
          if (entry.referredBy) {
            const [referrer] = await d
              .select()
              .from(shipGiveawayEntries)
              .where(eq(shipGiveawayEntries.referralCode, entry.referredBy))
              .limit(1);
            if (referrer && referrer.id !== entry.id && referrer.email !== entry.email) {
              const rb = normalizeBonus(referrer.bonusTickets);
              rb.referrals = Math.min(rb.referrals + GIVEAWAY_BONUS.perReferral, REFERRAL_CREDIT_CAP);
              await d.update(shipGiveawayEntries).set({ bonusTickets: rb }).where(eq(shipGiveawayEntries.id, referrer.id));
            }
          }
          if (!entry.welcomeEmailSentAt) {
            await emailGiveawayWelcome(entry.email, { referralUrl: referralUrlFor(entry.referralCode) });
            await d.update(shipGiveawayEntries).set({ welcomeEmailSentAt: new Date() }).where(eq(shipGiveawayEntries.id, entry.id));
          }
        }
      }

      const [fresh] = await d.select().from(shipGiveawayEntries).where(eq(shipGiveawayEntries.id, entry.id)).limit(1);
      return entrantState(d, fresh ?? entry);
    }),

  // The one-tap funnel question on the thank-you screen (skippable on the client).
  tag: publicProcedure
    .input(z.object({ token: tokenSchema, funnelTag: z.enum(["land", "voyage", "support", "curious"]) }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "ship_giveaway_tag");
      const d = await db();
      const entry = await entryByToken(d, input.token);
      await d.update(shipGiveawayEntries).set({ funnelTag: input.funnelTag }).where(eq(shipGiveawayEntries.id, entry.id));
      entry.funnelTag = input.funnelTag;
      return entrantState(d, entry);
    }),

  // Optional bonus entries. Each is idempotent (flat credit, set once). Nomination
  // text routes into the existing shipNominations pipeline so the project joins the
  // map + draw review exactly as a direct nomination does.
  bonus: publicProcedure
    .input(
      z.object({
        token: tokenSchema,
        kind: z.enum(["nomination", "quest", "instagram", "youtube"]),
        nomineeName: z.string().trim().min(2).max(200).optional(),
        nominationText: z.string().trim().min(10).max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "ship_giveaway_bonus");
      const d = await db();
      const entry = await entryByToken(d, input.token);
      const bonus = normalizeBonus(entry.bonusTickets);
      let credited = false;
      const patch: Partial<typeof shipGiveawayEntries.$inferInsert> = {};

      if (input.kind === "nomination") {
        if (!input.nomineeName || !input.nominationText) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Add the project name and why the ship should visit." });
        }
        const nomineeName = sanitizeInput(input.nomineeName);
        const reason = sanitizeInput(input.nominationText);
        const ins = await d.insert(shipNominations).values({
          nominatorUserId: entry.userId ?? null,
          nomineeName,
          nomineeContact: entry.email,
          reason,
          isSelfNomination: false,
        });
        patch.nominationText = reason;
        patch.nominationId = insertIdOf(ins);
        if (bonus.nomination === 0) {
          bonus.nomination = GIVEAWAY_BONUS.nomination;
          credited = true;
        }
      } else if (input.kind === "quest") {
        // Verified via a linked account with at least one verified quest action.
        if (entry.userId && bonus.quest === 0) {
          const [qc] = await d
            .select({ id: shipQuestCompletions.id })
            .from(shipQuestCompletions)
            .where(and(eq(shipQuestCompletions.userId, entry.userId), eq(shipQuestCompletions.status, "verified")))
            .limit(1);
          if (qc) {
            bonus.quest = GIVEAWAY_BONUS.quest;
            credited = true;
          }
        }
      } else if (input.kind === "instagram") {
        if (bonus.ig === 0) {
          bonus.ig = GIVEAWAY_BONUS.instagram;
          credited = true;
        }
      } else if (input.kind === "youtube") {
        if (bonus.yt === 0) {
          bonus.yt = GIVEAWAY_BONUS.youtube;
          credited = true;
        }
      }

      patch.bonusTickets = bonus;
      await d.update(shipGiveawayEntries).set(patch).where(eq(shipGiveawayEntries.id, entry.id));
      entry.bonusTickets = bonus;
      const state = await entrantState(d, entry);
      return { ...state, credited };
    }),

  // Public aggregate for the page (verified count + dates + the rules gate). With a
  // token, also returns the caller's own standing so the thank-you screen refreshes.
  stats: publicProcedure
    .input(z.object({ token: tokenSchema.optional() }).optional())
    .query(async ({ input }) => {
      const d = await db();
      const [vc] = await d
        .select({ n: sql<number>`COUNT(*)` })
        .from(shipGiveawayEntries)
        .where(isNotNull(shipGiveawayEntries.verifiedAt));
      const base = {
        rulesApproved: isGiveawayRulesApproved(),
        entriesOpenYmd: GIVEAWAY_ENTRIES_OPEN_YMD,
        entriesCloseYmd: GIVEAWAY_ENTRIES_CLOSE_YMD,
        entriesCloseIso: GIVEAWAY_ENTRIES_CLOSE_ISO,
        drawYmd: GIVEAWAY_DRAW_YMD,
        arvUsd: GIVEAWAY_ARV_USD,
        entriesClosed: entriesClosed(),
        verifiedEntries: Number(vc?.n ?? 0),
        bonus: {
          perReferral: GIVEAWAY_BONUS.perReferral,
          referralCap: REFERRAL_CREDIT_CAP,
          nomination: GIVEAWAY_BONUS.nomination,
          quest: GIVEAWAY_BONUS.quest,
          instagram: GIVEAWAY_BONUS.instagram,
          youtube: GIVEAWAY_BONUS.youtube,
        },
      };
      if (input?.token) {
        const [entry] = await d.select().from(shipGiveawayEntries).where(eq(shipGiveawayEntries.verifyToken, input.token)).limit(1);
        if (entry) return { ...base, you: await entrantState(d, entry) };
      }
      return base;
    }),
});
