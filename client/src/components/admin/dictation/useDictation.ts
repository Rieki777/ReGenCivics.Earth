/**
 * Admin-wide live dictation via the browser Web Speech API.
 *
 * This is the shared primitive Broadcast Voice, Outbound email compose, and
 * other long admin text fields should import. Do not add a second mic stack.
 *
 * Click-to-toggle and hold-to-talk live on DictationButton; this hook owns
 * recognition, caret insert, permission/unsupported errors, and cleanup.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { insertTranscript } from "./insertTranscript";
import { isSensitiveField } from "./sensitiveField";

type AnyWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

export type DictationState = "idle" | "listening" | "unsupported" | "denied";

export const DICTATION_UNSUPPORTED_MESSAGE =
  "This browser cannot listen. Type instead, or try Chrome.";
export const DICTATION_DENIED_MESSAGE =
  "Microphone access was blocked. Type instead, or allow the mic in the browser.";
export const DICTATION_GENERIC_ERROR =
  "Listening stopped. Type instead, or try the mic again.";
export const DICTATION_SENSITIVE_MESSAGE =
  "This field cannot take dictation.";

export function dictationSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as AnyWindow;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export type UseDictationOptions = {
  value: string;
  onChange: (next: string) => void;
  targetRef?: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  lang?: string;
  disabled?: boolean;
};

export type UseDictationResult = {
  supported: boolean;
  state: DictationState;
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
};

function readCaret(el: HTMLTextAreaElement | HTMLInputElement | null): { start: number; end: number } | null {
  if (!el) return null;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (typeof start !== "number") return null;
  return { start, end: typeof end === "number" ? end : start };
}

export function useDictation(opts: UseDictationOptions): UseDictationResult {
  const { value, onChange, targetRef, lang = "en-US", disabled = false } = opts;
  const supported = useMemo(dictationSupported, []);
  const [state, setState] = useState<DictationState>(supported ? "idle" : "unsupported");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<BrowserSpeechRecognition | null>(null);
  const wantRef = useRef(false);
  const liveRef = useRef(true);
  const caretRef = useRef<{ start: number; end: number } | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const rememberCaret = useCallback(() => {
    const saved = readCaret(targetRef?.current ?? null);
    if (saved) caretRef.current = saved;
  }, [targetRef]);

  const applyFinal = useCallback((transcript: string) => {
    const caret = caretRef.current;
    const result = insertTranscript(valueRef.current, transcript, caret?.start, caret?.end);
    onChangeRef.current(result.value);
    caretRef.current = { start: result.caret, end: result.caret };
    const el = targetRef?.current;
    if (el) {
      requestAnimationFrame(() => {
        try {
          el.focus();
          el.setSelectionRange(result.caret, result.caret);
        } catch {
          /* some input types throw on setSelectionRange */
        }
      });
    }
  }, [targetRef]);

  useEffect(() => {
    const el = targetRef?.current;
    if (!el) return;
    const save = () => rememberCaret();
    el.addEventListener("select", save);
    el.addEventListener("keyup", save);
    el.addEventListener("mouseup", save);
    el.addEventListener("input", save);
    el.addEventListener("focus", save);
    document.addEventListener("selectionchange", save);
    return () => {
      el.removeEventListener("select", save);
      el.removeEventListener("keyup", save);
      el.removeEventListener("mouseup", save);
      el.removeEventListener("input", save);
      el.removeEventListener("focus", save);
      document.removeEventListener("selectionchange", save);
    };
  }, [rememberCaret, targetRef, value]);

  useEffect(() => {
    liveRef.current = true;
    if (!supported) return;
    const w = window as AnyWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (event) => {
      if (!liveRef.current) return;
      let nextInterim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const row = event.results[i];
        if (row.isFinal) finalText += row[0].transcript;
        else nextInterim += row[0].transcript;
      }
      setInterim(nextInterim);
      if (finalText.trim()) applyFinal(finalText);
    };
    rec.onerror = (event) => {
      if (!liveRef.current) return;
      const kind = event?.error ?? "error";
      if (kind === "no-speech" || kind === "aborted") return;
      wantRef.current = false;
      setInterim("");
      if (kind === "not-allowed" || kind === "service-not-allowed") {
        setState("denied");
        setError(DICTATION_DENIED_MESSAGE);
        return;
      }
      setState("idle");
      setError(DICTATION_GENERIC_ERROR);
    };
    rec.onend = () => {
      if (!liveRef.current) return;
      setInterim("");
      if (wantRef.current && recRef.current === rec) {
        try {
          rec.start();
          setState("listening");
        } catch {
          wantRef.current = false;
          setState("idle");
        }
        return;
      }
      setState((current) => (current === "denied" ? current : "idle"));
    };
    recRef.current = rec;
    return () => {
      liveRef.current = false;
      wantRef.current = false;
      recRef.current = null;
      try { rec.abort(); } catch { /* already stopped */ }
    };
  }, [applyFinal, lang, supported]);

  const stop = useCallback(() => {
    wantRef.current = false;
    setInterim("");
    try { recRef.current?.stop(); } catch { /* nothing listening */ }
    setState((current) => {
      if (current === "unsupported" || current === "denied") return current;
      return "idle";
    });
  }, []);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (isSensitiveField(event.target)) stop();
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [stop]);

  const start = useCallback(() => {
    if (disabled) return;
    rememberCaret();
    if (isSensitiveField(targetRef?.current ?? null) || isSensitiveField(document.activeElement)) {
      wantRef.current = false;
      setError(DICTATION_SENSITIVE_MESSAGE);
      setState("idle");
      return;
    }
    if (!supported || !recRef.current) {
      setState("unsupported");
      setError(DICTATION_UNSUPPORTED_MESSAGE);
      return;
    }
    setError(null);
    wantRef.current = true;
    try {
      recRef.current.start();
      setState("listening");
    } catch {
      setState("listening");
    }
  }, [disabled, rememberCaret, supported, targetRef]);

  const toggle = useCallback(() => {
    if (wantRef.current || state === "listening") stop();
    else start();
  }, [start, state, stop]);

  return {
    supported,
    state,
    listening: state === "listening",
    interim,
    error,
    start,
    stop,
    toggle,
  };
}
