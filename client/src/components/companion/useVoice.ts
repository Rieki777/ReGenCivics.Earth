/**
 * The voice layer for the Conversational Companion, v2.
 *
 *  - Ears (speech to text): browser SpeechRecognition where available. Where it
 *    is missing (notably some iOS versions), the caller falls back to a server
 *    transcription endpoint (guarded by STT_API_KEY) or plain typing.
 *  - Mouth (text to speech), best voice first with graceful decay:
 *      1. Hosted signature voices (server-side, behind TTS_API_KEY): unique
 *         character voices, available when the member picked one and the
 *         server is configured.
 *      2. Kokoro voices (kokoroVoices.ts): natural voices generated in the
 *         browser. The default everywhere; ~90MB one-time model download,
 *         cached, offline after that.
 *      3. Device speechSynthesis voices: the old path, kept as the floor so a
 *         browser that can't run Kokoro still speaks.
 *
 * Everything degrades gracefully: no mic permission, or no SpeechRecognition,
 * means the person just types. Captions always render, so voice is never
 * required to follow along.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { trpc } from "@/lib/trpc";
import { filterVoicesForGender, sortVoices, voiceMatchesGender, type VoiceGender } from "@shared/voices";
import {
  curatedVoiceById, defaultVoiceFor, isKokoroVoiceId, kokoroEngineState, kokoroSpeak, kokoroStop,
  kokoroSupported, preloadKokoro, subscribeKokoroEngine, waitForKokoro, type KokoroEngineState,
} from "./kokoroVoices";
import {
  cachedHostedAudio, hostedStop, hostedVoiceKey, isHostedVoiceId, playHostedAudio, rememberHostedAudio,
} from "./hostedVoices";

type AnyWindow = Window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

/** How long a first utterance will wait for the Kokoro model before falling back. */
const KOKORO_FIRST_WAIT_MS = 12_000;

export function speechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as AnyWindow;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function mediaRecorderSupported(): boolean {
  return typeof window !== "undefined" && typeof (window as any).MediaRecorder !== "undefined";
}

/** Every device voice this browser offers. Empty when speech synthesis is unavailable. */
export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSynthesisSupported()) return [];
  try { return window.speechSynthesis.getVoices() ?? []; } catch { return []; }
}

/**
 * The device voices this browser offers, kept fresh. Browsers populate the list
 * asynchronously and fire `voiceschanged` when it lands, so a component that
 * reads it once on mount often sees an empty array. This re-renders when they
 * arrive.
 */
export function useAvailableVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listVoices());
  useEffect(() => {
    if (!speechSynthesisSupported()) return;
    const load = () => setVoices(listVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);
  return voices;
}

/** The device voices a member may pick for a persona of this gender, best ones first. */
export function useVoiceChoices(gender: VoiceGender): SpeechSynthesisVoice[] {
  const voices = useAvailableVoices();
  return useMemo(() => sortVoices(filterVoicesForGender(voices, gender)), [voices, gender]);
}

/** The Kokoro engine state as React state, for "warming up" hints. */
export function useKokoroEngineState(): KokoroEngineState {
  return useSyncExternalStore(subscribeKokoroEngine, kokoroEngineState, () => "idle" as const);
}

const VOICE_KEY_PREFIX = "companion-voice:";

/**
 * The member's chosen voice for one persona, remembered on this device.
 *
 * The stored value is one of three shapes: "kokoro:<id>" (a curated Kokoro
 * voice, stable across devices), "hosted:<key>" (a signature character voice),
 * or a bare device voiceURI from the pre-Kokoro era, which still resolves so
 * nobody's old choice breaks. It lives in localStorage rather than the
 * database because the legacy device URIs only mean something here.
 */
export function useVoicePreference(personaKey: string): [string | null, (uri: string | null) => void] {
  const key = VOICE_KEY_PREFIX + personaKey;
  const [uri, setUri] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return window.localStorage.getItem(key); } catch { return null; }
  });
  const set = useCallback((v: string | null) => {
    setUri(v);
    try {
      if (v) window.localStorage.setItem(key, v);
      else window.localStorage.removeItem(key);
    } catch { /* private mode: keep it in memory for this session */ }
  }, [key]);
  return [uri, set];
}

/**
 * Decide which device voice actually speaks on the fallback path.
 *
 * The saved choice is a hint, never a guarantee: it only wins if the voice still
 * exists on this device AND still matches the persona's gender. That second
 * check is what makes changing your Guide's face from the Grandmother to the
 * Wanderer quietly drop a woman's voice instead of leaving a mismatch. Otherwise
 * fall back to the first gender-matched voice, then to anything at all.
 */
export function resolveVoice(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
  preferredUri: string | null,
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  if (preferredUri && !isKokoroVoiceId(preferredUri) && !isHostedVoiceId(preferredUri)) {
    const saved = voices.find((v) => v.voiceURI === preferredUri);
    if (saved && voiceMatchesGender(saved.name, gender)) return saved;
  }
  const matching = sortVoices(filterVoicesForGender(voices, gender));
  return matching[0] ?? sortVoices(voices)[0] ?? null;
}

export type SpeechOptions = {
  /** The persona's gender, so we never speak a man's line in a woman's voice. */
  gender?: VoiceGender;
  /** The member's chosen voice id for this persona, if any. */
  voiceURI?: string | null;
};

/**
 * Speak text aloud unless silent. `speak` accepts an optional voice override
 * (the picker's Hear-it button uses it); otherwise the member's saved choice,
 * then the Kokoro default for the persona's gender, decides. Returns a stop()
 * to cancel in-flight speech.
 */
export function useSpeech(silent: boolean, opts: SpeechOptions = {}) {
  const { gender = "neutral", voiceURI = null } = opts;
  const [speaking, setSpeaking] = useState(false);
  // Invalidates awaited work (model load, synthesis) after a stop or a newer speak.
  const seqRef = useRef(0);
  const speakMut = trpc.companion.speak.useMutation();
  const speakMutRef = useRef(speakMut);
  speakMutRef.current = speakMut;

  // Warm the Kokoro model as soon as a speaking surface mounts un-silenced, so
  // the first reply usually finds it ready.
  useEffect(() => {
    if (!silent) void preloadKokoro();
  }, [silent]);

  const stop = useCallback(() => {
    seqRef.current += 1;
    kokoroStop();
    hostedStop();
    if (speechSynthesisSupported()) {
      try { window.speechSynthesis.cancel(); } catch { /* nothing speaking */ }
    }
    setSpeaking(false);
  }, []);

  const speakWithDevice = useCallback((text: string, preferredUri: string | null) => {
    if (!speechSynthesisSupported()) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = resolveVoice(listVoices(), gender, preferredUri);
      if (voice) u.voice = voice;
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  }, [gender]);

  const speakWithKokoro = useCallback(async (text: string, chosenId: string | null, seq: number) => {
    const voice = curatedVoiceById(chosenId) ?? defaultVoiceFor(gender);
    if (kokoroSupported()) {
      const ready = await waitForKokoro(KOKORO_FIRST_WAIT_MS);
      if (seq !== seqRef.current) return;
      if (ready) {
        try {
          await kokoroSpeak(text, voice.kokoroId, {
            onStart: () => setSpeaking(true),
            onEnd: () => setSpeaking(false),
          });
          return;
        } catch {
          if (seq !== seqRef.current) return;
        }
      }
    }
    speakWithDevice(text, chosenId);
  }, [gender, speakWithDevice]);

  const speakWithHosted = useCallback(async (text: string, chosenId: string, seq: number): Promise<boolean> => {
    const key = hostedVoiceKey(chosenId);
    try {
      let url = cachedHostedAudio(key, text);
      if (!url) {
        const res = await speakMutRef.current.mutateAsync({ voice: key, text });
        url = rememberHostedAudio(key, text, res.audio, res.mime);
      }
      if (seq !== seqRef.current) return true;
      await playHostedAudio(url, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const speak = useCallback((text: string, overrideVoiceId?: string) => {
    if (silent || !text.trim()) return;
    stop();
    const seq = ++seqRef.current;
    const chosen = overrideVoiceId ?? voiceURI;
    void (async () => {
      if (chosen && isHostedVoiceId(chosen)) {
        const ok = await speakWithHosted(text, chosen, seq);
        if (ok || seq !== seqRef.current) return;
        // The hosted voice is unavailable right now; the Kokoro default carries the line.
        await speakWithKokoro(text, null, seq);
        return;
      }
      if (!chosen || isKokoroVoiceId(chosen)) {
        await speakWithKokoro(text, chosen, seq);
        return;
      }
      speakWithDevice(text, chosen);
    })();
  }, [silent, stop, voiceURI, speakWithHosted, speakWithKokoro, speakWithDevice]);

  return { speak, stop, speaking };
}

export type ListenState = "idle" | "listening" | "unsupported";

/**
 * Live dictation via browser SpeechRecognition. onFinal fires with the recognized
 * text when a phrase completes. interim updates as the person speaks so captions
 * move live. Returns start/stop and the current state.
 */
export function useListening(opts: {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (kind: string) => void;
}) {
  const { onFinal, onInterim, onError } = opts;
  const recRef = useRef<any>(null);
  const supported = useMemo(speechRecognitionSupported, []);
  const [state, setState] = useState<ListenState>(supported ? "idle" : "unsupported");
  // Keep the latest callbacks without re-creating the recognizer.
  const cb = useRef({ onFinal, onInterim, onError });
  cb.current = { onFinal, onInterim, onError };

  useEffect(() => {
    if (!supported) return;
    const w = window as AnyWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim && cb.current.onInterim) cb.current.onInterim(interim);
      if (final.trim()) cb.current.onFinal(final.trim());
    };
    rec.onerror = (e: any) => { cb.current.onError?.(e?.error ?? "error"); setState("idle"); };
    rec.onend = () => setState((s) => (s === "listening" ? "idle" : s));
    recRef.current = rec;
    return () => { try { rec.abort(); } catch {} };
  }, [supported]);

  const start = useCallback(() => {
    if (!supported || !recRef.current) return;
    try { recRef.current.start(); setState("listening"); }
    catch { /* already started */ }
  }, [supported]);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch {}
    setState("idle");
  }, []);

  return { supported, state, start, stop };
}

const SILENT_KEY = "companion-silent";

/** Silence toggle: spoken voice + captions, or captions only. Persists. */
export function useSilentPreference(): [boolean, (v: boolean) => void] {
  const [silent, setSilent] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(SILENT_KEY) === "1"; } catch { return false; }
  });
  const set = useCallback((v: boolean) => {
    setSilent(v);
    try { window.localStorage.setItem(SILENT_KEY, v ? "1" : "0"); } catch {}
  }, []);
  return [silent, set];
}
