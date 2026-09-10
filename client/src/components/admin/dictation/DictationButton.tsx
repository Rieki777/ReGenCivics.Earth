/**
 * Shared admin mic control. Drop next to any long textarea.
 *
 * Click toggles listening. Press and hold to talk; release to stop.
 * Inserts at the caret. Never attach this to a password or credential field.
 *
 * Wired today: Harvest Compose and the admin AI chatbot. Broadcast Voice and
 * Outbound email compose should import this same button rather than growing
 * their own mics.
 */
import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
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
    if (!dictation.listening) dictation.start();
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
            errorAlign === "end" ? "right-0" : "left-0",
          )}
        >
          Listening
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {listening ? (dictation.interim ? dictation.interim : "Listening") : ""}
      </span>
      {dictation.error && !listening && (
        <p
          role="status"
          data-testid="dictation-error"
          className={cn(
            "absolute bottom-full mb-1 z-10 w-max max-w-[240px] rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] leading-snug text-red-700 shadow-sm",
            errorAlign === "end" ? "right-0" : "left-0",
          )}
        >
          {dictation.error}
        </p>
      )}
    </div>
  );
}
