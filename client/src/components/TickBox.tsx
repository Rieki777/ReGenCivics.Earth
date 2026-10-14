/**
 * A checkbox that reads the same in every browser: an outlined box that fills
 * forest green with a white tick when chosen. The real input is screen-reader
 * only (never an invisible tap target, which gate 1b forbids), so it must sit
 * inside a <label>: tapping the label toggles it, and keyboards and screen
 * readers use it as a native checkbox. Native boxes rendered unticked as solid dark
 * squares under the theme's accent colour, which read as ticked.
 */
import { Check } from "lucide-react";

export function TickBox({
  checked,
  onChange,
  className = "",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex h-5 w-5 shrink-0 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#7dd87d] peer-focus-visible:ring-offset-1 ${
          checked ? "border-[#1a472a] bg-[#1a472a] text-white" : "border-[#1a472a]/70 bg-white"
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </span>
  );
}
