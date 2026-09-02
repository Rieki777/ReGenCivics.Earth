import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { readAdminContinue } from "@/lib/adminNav";

export function AdminContinueRow({ onSelectTab }: { onSelectTab: (tab: string) => void }) {
  const [, navigate] = useLocation();
  const cont = readAdminContinue();
  if (!cont || cont.id === "overview") return null;

  const go = () => {
    if (cont.kind === "route" && cont.href) navigate(cont.href);
    else onSelectTab(cont.id);
  };

  return (
    <button
      type="button"
      onClick={go}
      className="w-full min-h-11 group flex items-center gap-3 rounded-2xl border border-[#1a472a]/15 bg-white px-4 py-3 text-left hover:border-[#7dd87d]/50 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/40"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#1a472a]/70">
          Continue
        </span>
        <span className="block text-base font-bold text-[#1a472a] truncate">{cont.label}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a472a] flex-shrink-0">
        Open
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
