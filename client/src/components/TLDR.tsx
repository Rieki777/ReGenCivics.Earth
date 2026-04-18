import { useState } from "react";
import { ChevronDown } from "lucide-react";
export function TLDR({ points }: { points: string[] }) {
  const [open, setOpen] = useState(false);
  if (points.length === 0) return null;
  return (
    <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-xl p-4 mb-8">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-[#7dd87d] font-semibold text-sm w-full">
        TL;DR
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-3 space-y-2 text-white/80 text-sm safe-prose">
          {points.map((p, i) => <li key={i} className="flex gap-2"><span className="text-[#7dd87d] flex-shrink-0">+</span> {p}</li>)}
        </ul>
      )}
    </div>
  );
}
