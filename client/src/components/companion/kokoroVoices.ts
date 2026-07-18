/**
 * Kokoro voice engine: natural, human-sounding voices for the speaking
 * companions, generated 100% in the visitor's browser.
 *
 * Kokoro-82M (Apache 2.0) runs locally via kokoro-js (WASM, or WebGPU where the
 * device has it). The model weights (~90MB quantized) download once from the
 * Hugging Face CDN on first speak and are cached by the browser after that, so
 * spoken text never leaves the device and the voices cost nothing at any scale.
 * See VOICE_TTS_RESEARCH_2026-07-17.md for the model comparison behind this.
 *
 * This module is deliberately React-free: a small state machine (idle, loading,
 * ready, failed) with a subscribe hook for useSyncExternalStore, plus a speak
 * queue that streams sentence by sentence so the first audio lands fast. The
 * hooks that consume it live in useVoice.ts. If anything here fails (old
 * browser, blocked download, no WASM), callers fall back to the device's
 * speechSynthesis voices exactly as before, so voice never breaks, it only
 * gets better.
 */
import type { VoiceGender } from "@shared/voices";

// ── The curated registry ──────────────────────────────────────────────────────

/** Preference values for these voices are stored as "kokoro:<id>". */
export const KOKORO_PREFIX = "kokoro:";

export type CuratedVoice = {
  /** The stored preference id, e.g. "kokoro:af_bella". Stable across devices. */
  id: string;
  /** The kokoro-js voice key. */
  kokoroId: string;
  /** Short display name for the picker. */
  label: string;
  /** A few words of character, shown next to the name. */
  tone: string;
  gender: Exclude<VoiceGender, "neutral">;
};

/**
 * The five voices we offer everywhere (chosen by ear from the Kokoro set).
 * Every persona gets all five; the ones matching the character's gender sort
 * first and provide the default.
 */
export const CURATED_VOICES: CuratedVoice[] = [
  { id: "kokoro:af_bella", kokoroId: "af_bella", label: "Bella", tone: "warm and expressive", gender: "female" },
  { id: "kokoro:bf_emma", kokoroId: "bf_emma", label: "Emma", tone: "warm British", gender: "female" },
  { id: "kokoro:am_puck", kokoroId: "am_puck", label: "Puck", tone: "bright and lively", gender: "male" },
  { id: "kokoro:bm_george", kokoroId: "bm_george", label: "George", tone: "steady British", gender: "male" },
  { id: "kokoro:bm_fable", kokoroId: "bm_fable", label: "Fable", tone: "British storyteller", gender: "male" },
];

export function isKokoroVoiceId(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(KOKORO_PREFIX);
}

/** The curated voice for a stored preference id, if it is one of ours. */
export function curatedVoiceById(id: string | null | undefined): CuratedVoice | null {
  if (!id) return null;
  return CURATED_VOICES.find((v) => v.id === id) ?? null;
}

/**
 * All five voices, ordered for a persona of this gender: matching voices first,
 * then the rest. Every character offers the full set; the ordering just puts
 * the natural fits on top.
 */
export function curatedVoicesFor(gender: VoiceGender): CuratedVoice[] {
  if (gender === "neutral") return CURATED_VOICES;
  return [...CURATED_VOICES].sort((a, b) => Number(b.gender === gender) - Number(a.gender === gender));
}

/** The voice a persona speaks with before the member has chosen one. */
export function defaultVoiceFor(gender: VoiceGender): CuratedVoice {
  const first = curatedVoicesFor(gender)[0];
  return first ?? CURATED_VOICES[0]!;
}

// ── Engine state machine ──────────────────────────────────────────────────────

export type KokoroEngineState = "idle" | "loading" | "ready" | "failed";

let engineState: KokoroEngineState = "idle";
const listeners = new Set<() => void>();
// Loose type: kokoro-js is loaded lazily so its class type never enters the
// main bundle graph.
let ttsInstance: { stream: (text: string, opts: { voice: string }) => AsyncGenerator<{ audio: { toBlob(): Blob } }, void, void> } | null = null;
let loadPromise: Promise<boolean> | null = null;

function setEngineState(next: KokoroEngineState) {
  engineState = next;
  for (const fn of listeners) fn();
}

export function kokoroEngineState(): KokoroEngineState {
  return engineState;
}

/** Subscribe for useSyncExternalStore; returns the unsubscribe. */
export function subscribeKokoroEngine(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True when this browser could plausibly run the engine at all. */
export function kokoroSupported(): boolean {
  return typeof window !== "undefined" && typeof WebAssembly !== "undefined";
}

/**
 * Kick off the model load. Safe to call any number of times; the download
 * happens once. Resolves true when the engine is ready.
 */
export function preloadKokoro(): Promise<boolean> {
  if (!kokoroSupported()) return Promise.resolve(false);
  if (loadPromise) return loadPromise;
  setEngineState("loading");
  loadPromise = (async () => {
    try {
      const { KokoroTTS } = await import("kokoro-js");
      // WebGPU is much faster where present; fp32 avoids its q8 artifacts.
      // On WASM, q8 keeps the one-time download near 90MB instead of 326MB.
      const webgpu = Boolean((navigator as { gpu?: unknown }).gpu);
      const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
        dtype: webgpu ? "fp32" : "q8",
        device: webgpu ? "webgpu" : "wasm",
      });
      ttsInstance = tts as unknown as typeof ttsInstance;
      setEngineState("ready");
      return true;
    } catch (err) {
      console.warn("[kokoro] engine load failed; falling back to device voices", err);
      setEngineState("failed");
      return false;
    }
  })();
  return loadPromise;
}

/** Wait for the engine, but never longer than timeoutMs. */
export async function waitForKokoro(timeoutMs: number): Promise<boolean> {
  if (engineState === "ready") return true;
  if (engineState === "failed" || !kokoroSupported()) return false;
  const load = preloadKokoro();
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  return Promise.race([load, timeout]);
}

// ── Speaking ──────────────────────────────────────────────────────────────────

/**
 * One active utterance at a time, matching how speechSynthesis.cancel() works.
 * A generation counter invalidates any chunk that finishes after a stop().
 */
let generation = 0;
let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;

function cleanupAudio() {
  if (activeAudio) {
    try { activeAudio.pause(); } catch { /* already stopped */ }
    activeAudio = null;
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}

/** Stop any in-flight Kokoro speech immediately. */
export function kokoroStop(): void {
  generation += 1;
  cleanupAudio();
}

function playBlob(blob: Blob, myGeneration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (myGeneration !== generation) return resolve();
    cleanupAudio();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    activeAudio = audio;
    activeUrl = url;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("audio playback failed"));
    audio.play().catch(reject);
  });
}

/**
 * Speak text in a Kokoro voice. Generates sentence by sentence and plays as it
 * goes, so the first audio arrives fast and later sentences synthesize while
 * earlier ones play. Resolves when the whole utterance has played or been
 * stopped. Throws if the engine is not ready; callers decide the fallback.
 */
export async function kokoroSpeak(
  text: string,
  kokoroId: string,
  handlers: { onStart?: () => void; onEnd?: () => void } = {},
): Promise<void> {
  if (!ttsInstance) throw new Error("kokoro engine not ready");
  const clean = text.trim();
  if (!clean) return;
  generation += 1;
  const myGeneration = generation;
  let started = false;

  // Producer fills the queue while the consumer plays it, so synthesis of the
  // next sentence overlaps playback of the current one.
  const queue: Blob[] = [];
  let producerDone = false;
  let producerError: unknown = null;
  const producer = (async () => {
    try {
      for await (const chunk of ttsInstance!.stream(clean, { voice: kokoroId })) {
        if (myGeneration !== generation) break;
        queue.push(chunk.audio.toBlob());
      }
    } catch (err) {
      producerError = err;
    } finally {
      producerDone = true;
    }
  })();

  try {
    while (myGeneration === generation) {
      const blob = queue.shift();
      if (blob) {
        if (!started) {
          started = true;
          handlers.onStart?.();
        }
        await playBlob(blob, myGeneration);
        continue;
      }
      if (producerDone) break;
      await new Promise((r) => setTimeout(r, 60));
    }
    if (producerError && !started) throw producerError;
  } finally {
    if (myGeneration === generation) cleanupAudio();
    if (started) handlers.onEnd?.();
    void producer;
  }
}
