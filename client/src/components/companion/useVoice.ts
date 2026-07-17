/**
 * The voice layer for the Conversational Companion, v1 pragmatic.
 *
 *  - Ears (speech to text): browser SpeechRecognition where available. Where it
 *    is missing (notably some iOS versions), the caller falls back to a server
 *    transcription endpoint (guarded by STT_API_KEY) or plain typing.
 *  - Mouth (text to speech): browser speechSynthesis, picking the best local
 *    voice. The v2 upgrade path is a hosted voice behind TTS_API_KEY; swapping is
 *    config, not code.
 *
 * Everything degrades gracefully: no mic permission, or no SpeechRecognition,
 * means the person just types. Captions always render, so voice is never
 * required to follow along.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterVoicesForGender, sortVoices, voiceMatchesGender, type VoiceGender } from "@shared/voices";

type AnyWindow = Window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

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

/** Every voice this device offers. Empty when speech synthesis is unavailable. */
export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSynthesisSupported()) return [];
  try { return window.speechSynthesis.getVoices() ?? []; } catch { return []; }
}

/**
 * The voices this device offers, kept fresh. Browsers populate the list
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

/** The voices a member may pick for a persona of this gender, best ones first. */
export function useVoiceChoices(gender: VoiceGender): SpeechSynthesisVoice[] {
  const voices = useAvailableVoices();
  return useMemo(() => sortVoices(filterVoicesForGender(voices, gender)), [voices, gender]);
}

const VOICE_KEY_PREFIX = "companion-voice:";

/**
 * The member's chosen voice for one persona, remembered on this device.
 *
 * Voices belong to the device, not the account: a macOS voiceURI means nothing
 * on Windows. So this lives in localStorage rather than the database, and a
 * choice that is unavailable here is simply ignored (see resolveVoice).
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
 * Decide which voice actually speaks.
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
  if (preferredUri) {
    const saved = voices.find((v) => v.voiceURI === preferredUri);
    if (saved && voiceMatchesGender(saved.name, gender)) return saved;
  }
  const matching = sortVoices(filterVoicesForGender(voices, gender));
  return matching[0] ?? sortVoices(voices)[0] ?? null;
}

export type SpeechOptions = {
  /** The persona's gender, so we never speak a man's line in a woman's voice. */
  gender?: VoiceGender;
  /** The member's chosen voiceURI for this persona, if any. */
  voiceURI?: string | null;
};

/** Speak text aloud unless silent. Returns a stop() to cancel in-flight speech. */
export function useSpeech(silent: boolean, opts: SpeechOptions = {}) {
  const { gender = "neutral", voiceURI = null } = opts;
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!speechSynthesisSupported()) return;
    const load = () => { voiceRef.current = resolveVoice(listVoices(), gender, voiceURI); };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, [gender, voiceURI]);

  const stop = useCallback(() => {
    if (!speechSynthesisSupported()) return;
    try { window.speechSynthesis.cancel(); } catch {}
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (silent || !speechSynthesisSupported() || !text.trim()) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  }, [silent]);

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
