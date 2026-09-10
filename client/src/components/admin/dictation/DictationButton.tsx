/**
 * Shared admin mic control. Drop next to any long textarea.
 *
 * Click toggles listening. Press and hold to talk; release to stop.
 * Inserts at the caret. Never attach this to a password or credential field.
 *
 * Wired today: Harvest Compose, the admin AI chatbot, and Broadcast Message.
 * Outbound email compose should import this same button rather than growing
 * its own mic.
 */
import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
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

  return (
    <div className="relative shrink-0">
      <Button
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
      {dictation.blockedHelp && !listening && (
        <div
          role="dialog"
          aria-labelledby="dictation-mic-help-title"
          data-testid="dictation-mic-help"
          className={cn(
            "absolute bottom-full mb-1 z-30 w-max max-w-[18rem] rounded-xl border border-[#1a472a]/25 bg-white px-3 py-2 text-[11px] leading-snug text-[#1a472a] shadow-sm",
            alignClass,
          )}
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
      )}
      {dictation.error && !listening && !dictation.blockedHelp && (
        <p
          role="status"
          data-testid="dictation-error"
          className={cn(
            "absolute bottom-full mb-1 z-10 w-max max-w-[240px] rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] leading-snug text-red-700 shadow-sm",
            alignClass,
          )}
        >
          {dictation.error}
        </p>
      )}
    </div>
  );
}
