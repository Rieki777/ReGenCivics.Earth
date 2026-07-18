/**
 * Hosted signature voices: the character-specific voices (behind TTS_API_KEY)
 * that each persona can speak with, synthesized server-side and played here.
 *
 * This file holds the React-free plumbing: the id scheme, a small in-memory
 * audio cache so a replayed line never costs a second synthesis, and a single
 * shared player. The tRPC call itself happens in useVoice.ts, which owns the
 * hooks. When the server has no TTS_API_KEY these voices simply never appear;
 * the Kokoro voices and device voices carry on as always.
 */

/** Preference values for these voices are stored as "hosted:<persona>/<name>". */
export const HOSTED_PREFIX = "hosted:";

export function isHostedVoiceId(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(HOSTED_PREFIX);
}

/** "hosted:first-mate/tide" -> "first-mate/tide" */
export function hostedVoiceKey(id: string): string {
  return id.slice(HOSTED_PREFIX.length);
}

// ── Audio cache ───────────────────────────────────────────────────────────────
// Object URLs for synthesized lines, keyed by voice + text. Greetings and
// invitation lines repeat constantly; caching them means one synthesis each.

const MAX_CACHE = 50;
const cache = new Map<string, string>();

function cacheKey(voiceKey: string, text: string): string {
  return `${voiceKey}|${text}`;
}

export function cachedHostedAudio(voiceKey: string, text: string): string | null {
  return cache.get(cacheKey(voiceKey, text)) ?? null;
}

export function rememberHostedAudio(voiceKey: string, text: string, base64: string, mime: string): string {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime || "audio/mpeg" }));
  const key = cacheKey(voiceKey, text);
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      const stale = cache.get(oldest);
      if (stale) URL.revokeObjectURL(stale);
      cache.delete(oldest);
    }
  }
  cache.set(key, url);
  return url;
}

// ── Shared player ─────────────────────────────────────────────────────────────

let activeAudio: HTMLAudioElement | null = null;

/** Stop any in-flight hosted speech immediately. */
export function hostedStop(): void {
  if (activeAudio) {
    try { activeAudio.pause(); } catch { /* already stopped */ }
    activeAudio = null;
  }
}

/**
 * Play a cached or freshly synthesized line. Resolves when playback ends or
 * is stopped; rejects only when the audio cannot play at all.
 */
export function playHostedAudio(
  url: string,
  handlers: { onStart?: () => void; onEnd?: () => void } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    hostedStop();
    const audio = new Audio(url);
    activeAudio = audio;
    audio.onplay = () => handlers.onStart?.();
    audio.onended = () => { handlers.onEnd?.(); resolve(); };
    audio.onpause = () => { handlers.onEnd?.(); resolve(); };
    audio.onerror = () => { handlers.onEnd?.(); reject(new Error("hosted audio playback failed")); };
    audio.play().catch((err) => { handlers.onEnd?.(); reject(err); });
  });
}
