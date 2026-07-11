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

/** Pick a warm, natural local voice for the persona. Prefers en, non-robotic. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = en.length ? en : voices;
  // Prefer named natural voices where present.
  const preferred = pool.find((v) => /samantha|karen|moira|serena|allison|ava|natural|female/i.test(v.name));
  return preferred ?? pool[0] ?? null;
}

/** Speak text aloud unless silent. Returns a stop() to cancel in-flight speech. */
export function useSpeech(silent: boolean) {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!speechSynthesisSupported()) return;
    const load = () => { voiceRef.current = pickVoice(); };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { try { window.speechSynthesis.onvoiceschanged = null; } catch {} };
  }, []);

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
