/**
 * Hosted TTS synthesis for the signature character voices (Qwen3-TTS,
 * Apache 2.0, served by DeepInfra). Live only when TTS_API_KEY is set; the
 * client falls back to browser Kokoro voices whenever this path is missing or
 * fails, so a provider outage can never silence a companion.
 *
 * Endpoint contract (verified against api.deepinfra.com/models/Qwen/Qwen3-TTS):
 *   POST /v1/inference/Qwen/Qwen3-TTS
 *   { input, voice, language, instruct, response_format } -> { audio, ... }
 * `voice` is a preset name (Serena, Ryan, ...) or a cloned voice_id created
 * once via /v1/voices/add. TTS_VOICE_MAP maps our registry keys to cloned
 * voice_ids as they get approved; until then the preset+instruct fallback in
 * ttsVoices.ts speaks.
 *
 * Cost control: replies are capped at 600 characters by the router, repeated
 * lines (greetings, invitations, previews) come from an in-memory cache, and
 * the public procedure sits behind checkRateLimit. At DeepInfra's $20 per 1M
 * characters, a cached greeting costs a fraction of a cent once.
 */
import { ENV } from "../_core/env";
import { signatureVoiceByKey, signatureVoicesForPersona } from "./ttsVoices";
import { isTtsConfigured } from "./companion";

const DEEPINFRA_TTS_URL = "https://api.deepinfra.com/v1/inference/Qwen/Qwen3-TTS";
const SYNTH_TIMEOUT_MS = 30_000;

export type SynthesizedSpeech = { audio: string; mime: string };

// ── Cache ─────────────────────────────────────────────────────────────────────
// Greetings and invitation lines repeat for every visitor; synthesize once.

const MAX_CACHE_ENTRIES = 200;
const cache = new Map<string, SynthesizedSpeech>();

function cacheGet(key: string): SynthesizedSpeech | null {
  const hit = cache.get(key);
  if (!hit) return null;
  // Refresh recency so hot lines stay resident.
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function cacheSet(key: string, value: SynthesizedSpeech) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

// ── Public surface ────────────────────────────────────────────────────────────

/**
 * Signature voices are live only when BOTH the key exists AND Rye has flipped
 * TTS_VOICES_LIVE. The key can sit in Railway with zero exposure and zero
 * spend until then (his call 2026-07-17: key added, not paying yet, Kokoro
 * stays the default everywhere).
 */
export function areSignatureVoicesLive(): boolean {
  return isTtsConfigured() && ENV.ttsVoicesLive;
}

/** The signature voices a persona's picker should offer. Empty when TTS is off. */
export function hostedVoicesForPersona(personaId: string) {
  if (!areSignatureVoicesLive()) return [];
  return signatureVoicesForPersona(personaId).map((v) => ({
    id: v.key,
    label: v.label,
    tone: v.tone,
    gender: v.gender,
  }));
}

/**
 * Synthesize one spoken line in a signature voice. Returns base64 audio.
 * Throws on unknown voice, missing config, or provider failure; the router
 * translates those into a TRPCError and the client falls back to Kokoro.
 */
export async function synthesizeSignatureVoice(voiceKey: string, text: string): Promise<SynthesizedSpeech> {
  if (!areSignatureVoicesLive()) throw new Error("signature voices are not live");
  const voice = signatureVoiceByKey(voiceKey);
  if (!voice) throw new Error("unknown signature voice");

  const clean = text.trim();
  const cacheKey = `${voiceKey} ${clean}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // A cloned voice_id (from an approved designed clip) wins over the preset.
  const mapped = ENV.ttsVoiceMap[voiceKey];
  const body = {
    input: clean,
    voice: mapped || voice.preset,
    language: "English",
    instruct: voice.instruct,
    response_format: "mp3",
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNTH_TIMEOUT_MS);
  try {
    const res = await fetch(DEEPINFRA_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.ttsApiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`tts provider returned ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as { audio?: string };
    if (!data.audio) throw new Error("tts provider returned no audio");

    // The audio field is a data URL (data:audio/mpeg;base64,...) or bare base64.
    let mime = "audio/mpeg";
    let base64 = data.audio;
    const dataUrl = /^data:([^;,]+);base64,(.*)$/s.exec(data.audio);
    if (dataUrl) {
      mime = dataUrl[1] || mime;
      base64 = dataUrl[2] ?? "";
    }
    const result: SynthesizedSpeech = { audio: base64, mime };
    cacheSet(cacheKey, result);
    return result;
  } finally {
    clearTimeout(timer);
  }
}
