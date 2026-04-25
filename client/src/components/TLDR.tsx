import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * TLDR — a small "expand to read the summary" card. Originally used a very
 * translucent green tint (bg-[#7dd87d]/10) which on the Fund page sat over
 * a yellow cloud and blended green-on-yellow into illegibility. Switched to
 * a solid dark forest backing so the card reads cleanly on any backdrop.
 */
export function TLDR({ points }: { points: string[] }) {
  const [open, setOpen] = useState(false);
  if (points.length === 0) return null;
  return (
    <div className="bg-[#0d2818]/95 border border-[#7dd87d]/40 rounded-xl p-4 mb-8 shadow-lg shadow-black/20 backdrop-blur-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[#7dd87d] font-semibold text-sm w-full"
        aria-expanded={open}
      >
        TL;DR
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-3 space-y-2 text-white/90 text-sm safe-prose">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#7dd87d] flex-shrink-0">+</span> {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
