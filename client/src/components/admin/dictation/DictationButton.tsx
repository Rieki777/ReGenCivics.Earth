/**
 * Shared admin mic control. Drop next to any long textarea.
 *
 * Click toggles listening. Press and hold to talk; release to stop.
 * Inserts at the caret. Never attach this to a password or credential field.
 *
 * Wired today: Harvest Compose, the admin AI chatbot, Broadcast Message,
 * the Write with me email partner, and EmailMarkdownComposer (Outbound Write
 * + Applications letter bodies). Prefer this button over a second mic stack.
 *
 * Blocked-mic and error bubbles portal to document.body so they are not
 * clipped by the admin sidebar / overflow stacking contexts.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DICTATION_BLOCKED_LEAD,
  DICTATION_BLOCKED_STEPS,
  DICTATION_BLOCKED_TITLE,
  DICTATION_UNSUPPORTED_MESSAGE,
  useDictation,
} from "./useDictation";

const HOLD_MS = 300;
const POPOVER_Z = 9999;
const POPOVER_MAX_W = 288; // max-w-[18rem]

type PopoverPos = {
  top: number;
  left: number;
  width: number;
  showAbove: boolean;
  alignEnd: boolean;
};

function placePopover(
  rect: DOMRect,
  alignEnd: boolean,
  estimatedHeight: number,
): PopoverPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 8;
  const gap = 8;
  const width = Math.min(POPOVER_MAX_W, vw - pad * 2);
  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;
  const showAbove = spaceAbove > estimatedHeight || spaceAbove > spaceBelow;
  let top = showAbove ? rect.top - gap : rect.bottom + gap;
  if (!showAbove) {
    top = Math.min(top, vh - estimatedHeight - pad);
  } else {
    top = Math.max(top, estimatedHeight + pad);
  }
  const preferredLeft = alignEnd ? rect.right - width : rect.left;
  const left = Math.min(Math.max(pad, preferredLeft), vw - width - pad);
  return { top, left, width, showAbove, alignEnd };
}

export type DictationButtonProps = {
  value: string;
  onChange: (next: string) => void;
  targetRef?: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  className?: string;
  disabled?: boolean;
  /** Shown in the accessible name while idle. */
  label?: string;
  /** Where the error bubble grows from the button. Use "end" when the mic sits on the right of a tight panel. */
  errorAlign?: "start" | "end";
};

export function DictationButton({
  value,
  onChange,
  targetRef,
  className,
  disabled = false,
  label = "Dictate",
  errorAlign = "start",
}: DictationButtonProps) {
  const dictation = useDictation({ value, onChange, targetRef, disabled });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasListening = useRef(false);
  const holdEngaged = useRef(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [helpPos, setHelpPos] = useState<PopoverPos | null>(null);
  const [errorPos, setErrorPos] = useState<PopoverPos | null>(null);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const clearHoldTimer = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* jsdom / old browsers */ }
    wasListening.current = dictation.listening;
    holdEngaged.current = false;
    clearHoldTimer();
    holdTimer.current = setTimeout(() => {
      holdEngaged.current = true;
    }, HOLD_MS);
    if (!dictation.listening) void dictation.start();
  };

  const onPointerUp = () => {
    const held = holdEngaged.current;
    holdEngaged.current = false;
    clearHoldTimer();
    if (wasListening.current || held) dictation.stop();
  };

  const onPointerCancel = () => {
    holdEngaged.current = false;
    clearHoldTimer();
    dictation.stop();
  };

  const showHelp = dictation.blockedHelp && !dictation.listening;
  const showError = Boolean(dictation.error && !dictation.listening && !dictation.blockedHelp);
  const alignEnd = errorAlign === "end";

  useLayoutEffect(() => {
    if (!showHelp) {
      setHelpPos(null);
      return;
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setHelpPos(placePopover(rect, alignEnd, 220));
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [showHelp, alignEnd]);

  useLayoutEffect(() => {
    if (!showError) {
      setErrorPos(null);
      return;
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setErrorPos(placePopover(rect, alignEnd, 72));
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [showError, alignEnd, dictation.error]);

  useEffect(() => {
    if (!showHelp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dictation.dismissBlockedHelp();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHelp, dictation]);

  const listening = dictation.listening;
  const blocked = dictation.state === "unsupported" || dictation.state === "denied";
  const title = listening
    ? "Listening. Click or release to stop."
    : dictation.state === "unsupported"
      ? DICTATION_UNSUPPORTED_MESSAGE
      : dictation.error
        ? dictation.error
        : "Click to listen. Hold the mic to talk.";
  const ariaLabel = listening ? "Stop dictation" : label;
  const alignClass = errorAlign === "end" ? "right-0" : "left-0";
  const canPortal = typeof document !== "undefined";

  const helpPopover = showHelp && helpPos && canPortal
    ? createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: POPOVER_Z - 1 }}
            onClick={dictation.dismissBlockedHelp}
            aria-hidden="true"
            data-testid="dictation-mic-help-backdrop"
          />
          <div
            role="dialog"
            aria-labelledby="dictation-mic-help-title"
            data-testid="dictation-mic-help"
            className="fixed w-max max-w-[18rem] rounded-xl border border-[#1a472a]/25 bg-white px-3 py-2 text-[11px] leading-snug text-[#1a472a] shadow-lg"
            style={{
              zIndex: POPOVER_Z,
              top: helpPos.top,
              left: helpPos.left,
              width: helpPos.width,
              maxWidth: "calc(100vw - 16px)",
              transform: helpPos.showAbove ? "translateY(-100%)" : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p id="dictation-mic-help-title" className="font-semibold text-[#1a472a]">
              {DICTATION_BLOCKED_TITLE}
            </p>
            <p className="mt-1 text-[#1a472a]/80">{DICTATION_BLOCKED_LEAD}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[#1a472a]">
              {DICTATION_BLOCKED_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="h-7 rounded-lg bg-[#1a472a] px-2.5 text-[11px] font-medium text-[#7dd87d] hover:bg-[#2d5a3d] pointer-coarse:min-h-11"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>
              <button
                type="button"
                className="h-7 rounded-lg border border-[#1a472a]/30 px-2.5 text-[11px] font-medium text-[#1a472a] hover:bg-[#1a472a]/5 pointer-coarse:min-h-11"
                onClick={dictation.dismissBlockedHelp}
              >
                Close
              </button>
            </div>
          </div>
        </>,
        document.body,
      )
    : null;

  const errorPopover = showError && errorPos && canPortal
    ? createPortal(
        <p
          role="status"
          data-testid="dictation-error"
          className="fixed w-max max-w-[240px] rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] leading-snug text-red-700 shadow-lg"
          style={{
            zIndex: POPOVER_Z,
            top: errorPos.top,
            left: errorPos.left,
            maxWidth: "min(240px, calc(100vw - 16px))",
            transform: errorPos.showAbove ? "translateY(-100%)" : undefined,
          }}
        >
          {dictation.error}
        </p>,
        document.body,
      )
    : null;

  return (
    <div className="relative shrink-0">
      <Button
        ref={buttonRef}
        type="button"
        size="icon"
        variant={listening ? "default" : "outline"}
        disabled={disabled}
        data-testid="dictation-button"
        aria-label={ariaLabel}
        aria-pressed={listening}
        aria-expanded={dictation.blockedHelp}
        aria-haspopup="dialog"
        title={title}
        data-listening={listening ? "true" : "false"}
        style={{ touchAction: "manipulation" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          // Keyboard activation (Space/Enter) fires click with detail 0.
          // Pointer already handled mouse and touch on pointerup.
          if (disabled || event.detail !== 0) return;
          dictation.toggle();
        }}
        className={cn(
          "h-9 w-9 rounded-xl border-[#1a472a]/30 text-[#1a472a]",
          listening && "bg-[#1a472a] text-[#7dd87d] hover:bg-[#2d5a3d] border-[#1a472a] ring-2 ring-[#7dd87d]/70",
          blocked && !listening && "text-[#1a472a]/60",
          className,
        )}
      >
        {blocked && !listening
          ? <MicOff className="w-4 h-4" aria-hidden="true" />
          : <Mic className={cn("w-4 h-4", listening && "animate-pulse")} aria-hidden="true" />}
      </Button>
      {listening && (
        <p
          data-testid="dictation-listening"
          className={cn(
            "absolute bottom-full mb-1 z-10 whitespace-nowrap text-[11px] font-medium text-[#1a472a]",
            alignClass,
          )}
        >
          Listening
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {listening ? (dictation.interim ? dictation.interim : "Listening") : ""}
      </span>
      {helpPopover}
      {errorPopover}
    </div>
  );
}
