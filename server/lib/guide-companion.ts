/**
 * The personal ReGen Guide: helpers that turn a member's saved preferences into
 * a persona preamble, and load that member's OWN data for the Guide's context.
 *
 * This is the general assistant every member designs (name, face, tone, voice).
 * It is separate from the forum/governance Guide in regenGuide.ts (ADR-23), whose
 * behavior is unchanged.
 *
 * Security (AI-AUTOMATION-RISKS.md): the context is built strictly from the
 * authenticated member's own rows (every query is keyed by their user id). No
 * cross-user data is ever loaded. The member's chat text stays untrusted input;
 * the persona and guardrails live in the system prompt.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { playerProfiles, shipBookings, userGuidePreferences } from "../../drizzle/schema";
import type { User } from "../../drizzle/schema";
import {
  GUIDE_TONE_PROMPT, isGuideTone,
  type GuidePreferences, type GuideTone,
} from "../../shared/guide";

/**
 * Build the persona preamble that renames the Guide and sets its tone. Prepended
 * to the base chat system prompt (whose facts + guardrails still apply). Passing
 * null yields a neutral preamble so a member who has not designed a Guide yet
 * still gets the normal assistant.
 */
export function buildGuidePersona(prefs: GuidePreferences | null): string {
  const name = (prefs?.guideName || "").trim();
  const tone: GuideTone = prefs && isGuideTone(prefs.tone) ? prefs.tone : "gentle";
  const lines: string[] = [];
  if (name) {
    lines.push(`This member designed you as their personal companion. Your name in this conversation is "${name}". When you refer to yourself, use that name, not "Your ReGen Guide".`);
  }
  lines.push(GUIDE_TONE_PROMPT[tone]);
  return lines.join(" ");
}

/** Load a member's Guide preferences by their user id. Null if none saved. */
export async function fetchGuidePreferences(userId: number): Promise<GuidePreferences | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(userGuidePreferences)
    .where(eq(userGuidePreferences.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    guideName: row.guideName,
    portraitKey: row.portraitKey,
    tone: isGuideTone(row.tone) ? row.tone : "gentle",
    voiceEnabled: Boolean(row.voiceEnabled),
  };
}

export type GuideContextParts = {
  name?: string | null;
  tokens?: { regen: number; rgvoice: number; rcivics: number } | null;
  bookings: Array<{ startDate: string; endDate: string; status: string }>;
};

/**
 * Render the "who you're talking to" block from ONE member's parts. Pure and
 * synchronous so it is easy to test. It only ever describes the parts it is
 * given, and it always tells the model to refuse cross-user requests.
 */
export function renderGuideContext(parts: GuideContextParts): string {
  const lines: string[] = [
    "## WHO YOU ARE TALKING TO",
    "This is the only member you can see. Never reference or reveal anyone else's data. If they ask about another person's tokens, bookings, or profile, say you can only see their own.",
  ];
  const name = (parts.name ?? "").trim();
  if (name) lines.push(`- Name: ${name}`);
  if (parts.tokens) {
    lines.push(`- Token balances (total, private + public): ${parts.tokens.regen} ReGen, ${parts.tokens.rgvoice} RGVoice, ${parts.tokens.rcivics} RCivics.`);
  }
  if (parts.bookings.length) {
    const next = parts.bookings[0];
    lines.push(`- Ship: ${parts.bookings.length} active voyage request(s). The next runs ${next.startDate} to ${next.endDate} (status: ${next.status}).`);
  } else {
    lines.push("- Ship: no voyage requests yet.");
  }
  lines.push("Answer questions about their own quests, tokens, and voyages from this. If something is not here, say you do not have it in front of you rather than guessing.");
  return "\n\n" + lines.join("\n");
}

/**
 * Build the "who you're talking to" context from the member's OWN data only.
 * Every read is keyed by user.id; nothing about any other member is loaded. Safe
 * to call for any authenticated user; returns "" if data cannot be read.
 */
export async function buildGuideContext(user: Pick<User, "id" | "name">): Promise<string> {
  const db = await getDb();
  if (!db) return "";
  try {
    const [profile] = await db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, user.id))
      .limit(1);

    const bookings = await db
      .select({ startDate: shipBookings.startDate, endDate: shipBookings.endDate, status: shipBookings.status })
      .from(shipBookings)
      .where(and(eq(shipBookings.userId, user.id), inArray(shipBookings.status, ["requested", "approved", "platform_pending", "confirmed", "active"])))
      .orderBy(asc(shipBookings.startDate));

    return renderGuideContext({
      name: profile?.displayName || user.name || null,
      tokens: profile
        ? {
            regen: (profile.rgenBalance ?? 0) + (profile.regenPrivate ?? 0),
            rgvoice: (profile.rvoiceBalance ?? 0) + (profile.rgvoicePrivate ?? 0),
            rcivics: (profile.rcivicsPublic ?? 0) + (profile.rcivicsPrivate ?? 0),
          }
        : null,
      bookings,
    });
  } catch (err) {
    console.error("[guide] buildGuideContext failed", err);
    return "";
  }
}
