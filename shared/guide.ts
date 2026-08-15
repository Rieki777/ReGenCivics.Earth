/**
 * The ReGen Guide: the general companion every member designs for themselves.
 * This shared config holds the parts the client and server both need: the four
 * portrait archetypes and the three tones. The Guide's forum/governance persona
 * (ADR-23) is a separate system and is unchanged by any of this.
 *
 * A member names their own Guide, picks its face and tone, and turns voice on or
 * off. Those choices live in user_guide_preferences (one row per user) and are
 * loaded server-side by the authenticated user id, so the Guide only ever knows
 * the person asking.
 */
import type { VoiceGender } from "./voices";

export type GuideTone = "gentle" | "playful" | "direct";

export const GUIDE_TONES: Array<{ id: GuideTone; label: string; blurb: string }> = [
  { id: "gentle", label: "Gentle", blurb: "Warm, patient, unhurried." },
  { id: "playful", label: "Playful", blurb: "Light, funny, a little mischievous." },
  { id: "direct", label: "Direct", blurb: "Plain and to the point, no fluff." },
];

/** The instruction appended to the system prompt for each tone. */
export const GUIDE_TONE_PROMPT: Record<GuideTone, string> = {
  gentle: "Your tone is gentle: warm, patient, unhurried. Reassure when someone is unsure.",
  playful: "Your tone is playful: light and a little funny, with the odd bit of mischief, while still being genuinely helpful.",
  direct: "Your tone is direct: plain and to the point. Short answers. No filler, no throat-clearing.",
};

export type GuideArchetype = {
  key: string;
  /** A short name for the face (the member renames the Guide itself). */
  label: string;
  /** Served from /images/guide/. */
  portrait: string;
  /**
   * The face's gender, so the voice picker only offers matching voices. The
   * Lantern-Bearer is androgynous and the Fox is an animal, so both take any
   * voice. Changing the face re-matches the voice (see resolveVoice).
   */
  gender: VoiceGender;
};

export const GUIDE_ARCHETYPES: GuideArchetype[] = [
  { key: "guide-archetype-1", label: "The Lantern-Bearer", portrait: "guide-archetype-1.webp", gender: "neutral" },
  { key: "guide-archetype-2", label: "The Grandmother", portrait: "guide-archetype-2.webp", gender: "female" },
  { key: "guide-archetype-3", label: "The Fox", portrait: "guide-archetype-3.webp", gender: "neutral" },
  { key: "guide-archetype-4", label: "The Wanderer", portrait: "guide-archetype-4.webp", gender: "male" },
];

export const DEFAULT_GUIDE_PORTRAIT_KEY = "guide-archetype-1";
export const DEFAULT_GUIDE_TONE: GuideTone = "gentle";

export function guideArchetype(key: string | null | undefined): GuideArchetype {
  return GUIDE_ARCHETYPES.find((a) => a.key === key) ?? GUIDE_ARCHETYPES[0];
}

export function isGuideTone(v: string): v is GuideTone {
  return v === "gentle" || v === "playful" || v === "direct";
}

export function guidePortraitUrl(key: string | null | undefined): string {
  return `/images/guide/${guideArchetype(key).portrait}`;
}

/** Preferences shape shared client/server. */
export type GuidePreferences = {
  guideName: string;
  portraitKey: string;
  tone: GuideTone;
  voiceEnabled: boolean;
};

export const DEFAULT_GUIDE_NAME = "your ReGen Guide";
