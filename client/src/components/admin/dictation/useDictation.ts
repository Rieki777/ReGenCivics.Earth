/**
 * Admin-wide live dictation via the browser Web Speech API.
 *
 * This is the shared primitive Broadcast Voice, Outbound email compose, and
 * other long admin text fields should import. Do not add a second mic stack.
 *
 * Click-to-toggle and hold-to-talk live on DictationButton; this hook owns
 * recognition, caret insert, permission/unsupported errors, and cleanup.
 * Interim phrases are inserted too. Chrome often withholds isFinal until a
 * pause, and the listening indicator stays on the whole time.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { insertTranscript } from "./insertTranscript";
import { queryMicrophonePermission, requestMicrophoneAccess } from "./micPermission";
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
/** Recognition armed and then produced no words. Shown instead of a stuck Listening ring. */
export const DICTATION_SILENT_MESSAGE =
  "No words came through. Check the microphone, or type instead.";
/**
 * Chrome's continuous pipeline can fire end within a few milliseconds of
 * start, with no error and no result. Two of those in a row is a dead mic,
 * not a pause. A real silence (no-speech) takes seconds, so it stays under
 * this threshold and the restart loop keeps listening.
 */
const INSTANT_END_MS = 400;
const INSTANT_END_LIMIT = 2;
/** How long Listening may stay up with zero transcripts before we say so. */
const SILENT_STALL_MS = 8000;
export const DICTATION_BLOCKED_TITLE =
  "Microphone permission is blocked for this site.";
export const DICTATION_BLOCKED_LEAD =
  "Allow the mic for this site in the browser site-info / microphone control. If it is already Allowed there, check OS mic privacy. Then try again — reload is only a fallback.";
export const DICTATION_BLOCKED_STEPS = [
  "Open the lock or site info control in the address bar",
  "Set Microphone to Allow for this site",
  "If still blocked, allow the browser under OS mic privacy (macOS Privacy & Security → Microphone, or Windows Privacy → Microphone)",
  "Press “I allowed it — try again”. Reload only if Allow does not stick.",
] as const;

function isAlreadyStartedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String(err.name) : "";
  const message = "message" in err ? String(err.message) : "";
  return name === "InvalidStateError" || /already started/i.test(message);
}

export function dictationSupported(): boolean {
  if (typeof window === "undefined") return false;
  // Web Speech only runs in a secure context. An insecure page must not
  // show Listening: start() cannot deliver words there.
  if (window.isSecureContext === false) return false;
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
  /** True after a start attempt while the browser has Blocked the mic. */
  blockedHelp: boolean;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => void;
  dismissBlockedHelp: () => void;
};

function readCaret(el: HTMLTextAreaElement | HTMLInputElement | null): { start: number; end: number } | null {
  if (!el) return null;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (typeof start !== "number") return null;
  return { start, end: typeof end === "number" ? end : start };
}

type SpeechRow = {
  isFinal?: boolean;
  0?: { transcript?: string };
  item?: (index: number) => { transcript?: string } | null;
};

/**
 * Chrome often keeps a phrase interim for the whole time Listening is on, and
 * only marks it final after a pause. Read both shapes (index and item()) so a
 * host result object cannot throw the handler and drop the phrase.
 */
function readTranscript(row: SpeechRow | undefined): string {
  if (!row) return "";
  const alt = row[0] ?? row.item?.(0) ?? undefined;
  const text = alt?.transcript;
  return typeof text === "string" ? text : "";
}

function joinSpeechPieces(parts: string[]): string {
  let acc = "";
  for (const part of parts) {
    const piece = part.replace(/\s+/g, " ").trim();
    if (!piece) continue;
    acc = acc ? `${acc} ${piece}` : piece;
  }
  return acc;
}

/** Rebuild the whole session utterance so a newer interim replaces the preview. */
function collectSpeech(results: ArrayLike<SpeechRow>): { interim: string; spoken: string } {
  const finalParts: string[] = [];
  const interimParts: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    const text = readTranscript(row);
    if (!text.trim()) continue;
    if (row?.isFinal) finalParts.push(text);
    else interimParts.push(text);
  }
  const finals = joinSpeechPieces(finalParts);
  const interim = joinSpeechPieces(interimParts);
  return { interim, spoken: joinSpeechPieces([finals, interim]) };
}

function clampRange(
  range: { start: number; end: number },
  length: number,
): { start: number; end: number } {
  const start = Math.min(Math.max(0, range.start), length);
  const end = Math.min(Math.max(start, range.end), length);
  return { start, end };
}

/**
 * Prefer a live caret. After the mic click blurs the field, keep the caret
 * captured while it was focused. With neither, append.
 */
function resolveRange(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
  saved: { start: number; end: number } | null,
): { start: number; end: number } {
  if (el && typeof document !== "undefined" && document.activeElement === el) {
    const live = readCaret(el);
    if (live) return clampRange(live, value.length);
  }
  if (saved) return clampRange(saved, value.length);
  return { start: value.length, end: value.length };
}

export function useDictation(opts: UseDictationOptions): UseDictationResult {
  const { value, onChange, targetRef, lang = "en-US", disabled = false } = opts;
  const supported = useMemo(dictationSupported, []);
  const [state, setState] = useState<DictationState>(supported ? "idle" : "unsupported");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blockedHelp, setBlockedHelp] = useState(false);

  const recRef = useRef<BrowserSpeechRecognition | null>(null);
  const wantRef = useRef(false);
  const liveRef = useRef(true);
  const caretRef = useRef<{ start: number; end: number } | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  /** Field text we last published, so a lagging render is not treated as an edit. */
  const renderedRef = useRef(value);
  const emittedRef = useRef(value);
  /** False while a session is ending, so a late result cannot insert the phrase twice. */
  const acceptResultsRef = useRef(true);
  const sessionRef = useRef<{
    base: string;
    start: number;
    end: number;
    spoken: string;
  } | null>(null);
  /** When the current recognizer arm called start(). Instant ends are measured from here. */
  const armAtRef = useRef(0);
  const sawResultRef = useRef(false);
  const instantMissRef = useRef(0);
  const everHeardRef = useRef(false);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  valueRef.current = value;
  onChangeRef.current = onChange;
  if (value !== renderedRef.current) {
    const echo = value === emittedRef.current;
    renderedRef.current = value;
    if (!echo && sessionRef.current) {
      const range = resolveRange(targetRef?.current ?? null, value, null);
      sessionRef.current = { base: value, start: range.start, end: range.end, spoken: "" };
      caretRef.current = range;
    }
  }

  const rememberCaret = useCallback(() => {
    const el = targetRef?.current ?? null;
    if (!el) return;
    // Unfocused inputs report selectionStart 0. Treat that as "no caret"
    // so speech appends instead of jumping to the front of existing text.
    if (document.activeElement !== el) return;
    const saved = readCaret(el);
    if (saved) caretRef.current = saved;
  }, [targetRef]);

  const placeCaret = useCallback((caret: number) => {
    const el = targetRef?.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        el.focus();
        el.setSelectionRange(caret, caret);
      } catch {
        /* some input types throw on setSelectionRange */
      }
    });
  }, [targetRef]);

  const publish = useCallback((next: string, caret: number) => {
    emittedRef.current = next;
    renderedRef.current = next;
    caretRef.current = { start: caret, end: caret };
    onChangeRef.current(next);
    placeCaret(caret);
  }, [placeCaret]);

  const shownValue = useCallback(() => {
    if (valueRef.current === renderedRef.current) return valueRef.current;
    if (emittedRef.current === renderedRef.current) return renderedRef.current;
    return valueRef.current;
  }, []);

  const beginSession = useCallback(() => {
    const shown = shownValue();
    const range = resolveRange(targetRef?.current ?? null, shown, caretRef.current);
    sessionRef.current = { base: shown, start: range.start, end: range.end, spoken: "" };
    acceptResultsRef.current = true;
  }, [shownValue, targetRef]);

  const applyCollected = useCallback((spoken: string, nextInterim: string) => {
    if (!acceptResultsRef.current) return;
    const session = sessionRef.current;
    if (!session) return;
    setInterim(nextInterim);
    if (!spoken.trim()) return;
    session.spoken = spoken;
    const rendered = insertTranscript(session.base, spoken, session.start, session.end);
    if (rendered.value !== renderedRef.current) publish(rendered.value, rendered.caret);
    else caretRef.current = { start: rendered.caret, end: rendered.caret };
  }, [publish]);

  /** Freeze the live preview into the base so the next phrase appends after it. */
  const commitSession = useCallback(() => {
    const session = sessionRef.current;
    if (!session?.spoken.trim()) return;
    const rendered = insertTranscript(session.base, session.spoken, session.start, session.end);
    session.base = rendered.value;
    session.start = rendered.caret;
    session.end = rendered.caret;
    session.spoken = "";
    if (rendered.value !== renderedRef.current) publish(rendered.value, rendered.caret);
    else caretRef.current = { start: rendered.caret, end: rendered.caret };
  }, [publish]);

  const engineRef = useRef({ applyCollected, commitSession, beginSession });
  engineRef.current = { applyCollected, commitSession, beginSession };

  const clearStall = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  const scheduleStall = useCallback(() => {
    if (stallTimerRef.current || everHeardRef.current) return;
    stallTimerRef.current = setTimeout(() => {
      stallTimerRef.current = null;
      if (!liveRef.current || !wantRef.current || everHeardRef.current) return;
      wantRef.current = false;
      acceptResultsRef.current = false;
      try { recRef.current?.stop(); } catch { /* already ending */ }
      setInterim("");
      setBlockedHelp(false);
      setState((current) => (current === "unsupported" || current === "denied" ? current : "idle"));
      setError(DICTATION_SILENT_MESSAGE);
    }, SILENT_STALL_MS);
  }, []);

  const noteArm = useCallback(() => {
    sawResultRef.current = false;
    armAtRef.current = Date.now();
    scheduleStall();
  }, [scheduleStall]);

  /**
   * Start the existing recognizer. "already" means it was already running, so
   * Listening is honest. Any other throw means nothing is capturing.
   */
  const tryStartRecognizer = useCallback((): "started" | "already" | "failed" | "missing" => {
    const rec = recRef.current;
    if (!rec) return "missing";
    try {
      rec.start();
      noteArm();
      acceptResultsRef.current = true;
      return "started";
    } catch (err) {
      if (isAlreadyStartedError(err)) {
        acceptResultsRef.current = true;
        return "already";
      }
      return "failed";
    }
  }, [noteArm]);

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
    // Single-utterance mode. Chrome's continuous pipeline can call end a few
    // milliseconds after start, with no error and no transcript, while the
    // button still shows Listening. onend restarts while the user wants the
    // mic, so a phrase pause still continues into the next one.
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (event) => {
      if (!liveRef.current || !acceptResultsRef.current) return;
      sawResultRef.current = true;
      everHeardRef.current = true;
      instantMissRef.current = 0;
      clearStall();
      const { interim: nextInterim, spoken } = collectSpeech(event.results);
      engineRef.current.applyCollected(spoken, nextInterim);
    };
    rec.onerror = (event) => {
      if (!liveRef.current) return;
      const kind = event?.error ?? "error";
      if (kind === "no-speech" || kind === "aborted") return;
      wantRef.current = false;
      clearStall();
      engineRef.current.commitSession();
      acceptResultsRef.current = false;
      setInterim("");
      if (kind === "not-allowed" || kind === "service-not-allowed") {
        setState("denied");
        setError(DICTATION_DENIED_MESSAGE);
        setBlockedHelp(true);
        return;
      }
      setState("idle");
      setError(DICTATION_GENERIC_ERROR);
    };
    rec.onend = () => {
      if (!liveRef.current) return;
      // Chrome ends the recognizer on a pause and the last phrase is often
      // still interim. Commit it before restart or the Ask field stays empty.
      acceptResultsRef.current = false;
      engineRef.current.commitSession();
      setInterim("");
      if (!(wantRef.current && recRef.current === rec)) {
        setState((current) => (current === "denied" ? current : "idle"));
        return;
      }
      const elapsed = Date.now() - armAtRef.current;
      const instantEmpty = !sawResultRef.current && elapsed < INSTANT_END_MS;
      if (instantEmpty) {
        instantMissRef.current += 1;
        if (instantMissRef.current >= INSTANT_END_LIMIT) {
          wantRef.current = false;
          clearStall();
          setBlockedHelp(false);
          setState("idle");
          setError(DICTATION_SILENT_MESSAGE);
          return;
        }
      } else if (sawResultRef.current) {
        instantMissRef.current = 0;
      }
      try {
        rec.start();
      } catch (err) {
        if (isAlreadyStartedError(err)) {
          acceptResultsRef.current = true;
          setState("listening");
          return;
        }
        wantRef.current = false;
        clearStall();
        setBlockedHelp(false);
        setState("idle");
        setError(DICTATION_GENERIC_ERROR);
        return;
      }
      // A synchronous end (the Chrome continuous failure) may already have
      // given up. Do not paint Listening back on after that.
      if (!wantRef.current || recRef.current !== rec) return;
      noteArm();
      acceptResultsRef.current = true;
      setState("listening");
    };
    recRef.current = rec;
    return () => {
      liveRef.current = false;
      wantRef.current = false;
      recRef.current = null;
      clearStall();
      try { rec.abort(); } catch { /* already stopped */ }
    };
  }, [clearStall, lang, noteArm, supported]);

  const stop = useCallback(() => {
    wantRef.current = false;
    clearStall();
    try { recRef.current?.stop(); } catch { /* nothing listening */ }
    // onend commits when the browser fires it. If it does not, keep the preview.
    engineRef.current.commitSession();
    acceptResultsRef.current = false;
    setInterim("");
    setState((current) => {
      if (current === "unsupported" || current === "denied") return current;
      return "idle";
    });
  }, [clearStall]);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (isSensitiveField(event.target)) stop();
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [stop]);

  const markDenied = useCallback(() => {
    wantRef.current = false;
    clearStall();
    setInterim("");
    setState("denied");
    setError(DICTATION_DENIED_MESSAGE);
    setBlockedHelp(true);
  }, [clearStall]);

  const start = useCallback(async () => {
    if (disabled) return;
    rememberCaret();
    if (isSensitiveField(targetRef?.current ?? null) || isSensitiveField(document.activeElement)) {
      wantRef.current = false;
      setError(DICTATION_SENSITIVE_MESSAGE);
      setState("idle");
      setBlockedHelp(false);
      return;
    }
    if (!supported || !recRef.current) {
      setState("unsupported");
      setError(DICTATION_UNSUPPORTED_MESSAGE);
      setBlockedHelp(false);
      return;
    }
    setError(null);
    // Keep blockedHelp open across a failed recheck so "try again" does not
    // flash the modal closed when permission is still denied.
    wantRef.current = true;

    const permission = await queryMicrophonePermission();
    if (!liveRef.current || !wantRef.current) return;
    if (permission === "denied") {
      markDenied();
      return;
    }

    // Prompt (or unknown Permissions API): ask via getUserMedia so Chromium
    // can still show Allow, then hand off to Web Speech.
    if (permission === "prompt" || permission === "unknown") {
      const access = await requestMicrophoneAccess();
      if (!liveRef.current || !wantRef.current) return;
      if (access === "denied") {
        markDenied();
        return;
      }
    }

    if (!recRef.current) return;
    // Already-open session (start() threw because recognition is running):
    // keep its base so the phrase is not inserted a second time.
    if (!sessionRef.current || !acceptResultsRef.current) engineRef.current.beginSession();
    instantMissRef.current = 0;
    everHeardRef.current = false;
    clearStall();
    const armed = tryStartRecognizer();
    if (armed === "failed" || armed === "missing") {
      wantRef.current = false;
      acceptResultsRef.current = false;
      clearStall();
      setState("idle");
      setError(DICTATION_GENERIC_ERROR);
      setBlockedHelp(false);
      return;
    }
    // "already" did not arm a stall timer. Listening with no words still ends.
    scheduleStall();
    setState("listening");
    setBlockedHelp(false);
  }, [clearStall, disabled, markDenied, rememberCaret, scheduleStall, supported, targetRef, tryStartRecognizer]);

  const toggle = useCallback(() => {
    if (wantRef.current || state === "listening") stop();
    else void start();
  }, [start, state, stop]);

  const dismissBlockedHelp = useCallback(() => setBlockedHelp(false), []);

  return {
    supported,
    state,
    listening: state === "listening",
    interim,
    error,
    blockedHelp,
    start,
    stop,
    toggle,
    dismissBlockedHelp,
  };
}
