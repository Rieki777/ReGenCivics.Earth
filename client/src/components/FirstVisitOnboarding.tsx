/**
 * FirstVisitOnboarding - "Choose Your Adventure" overlay for first-time visitors.
 * Shows once per browser, routes visitors to their relevant path.
 * Skippable. Stores dismissed state in localStorage.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, TrendingUp, Sprout, Handshake, Gamepad2, ArrowRight } from "lucide-react";

const STORAGE_KEY = "regen_first_visit_done";

const PATHS = [
  {
    id: "investor",
    icon: TrendingUp,
    label: "Impact Investor",
    description: "I want to invest in the regenerative renaissance",
    href: "/fund",
    color: "#d4a574",
    bg: "from-[#d4a574]/15 to-[#d4a574]/5",
    border: "border-[#d4a574]/30 hover:border-[#d4a574]/60",
  },
  {
    id: "land",
    icon: Sprout,
    label: "Land Project",
    description: "We're building a regenerative community or eco-village",
    href: "/land",
    color: "#7dd87d",
    bg: "from-[#7dd87d]/15 to-[#7dd87d]/5",
    border: "border-[#7dd87d]/30 hover:border-[#7dd87d]/60",
  },
  {
    id: "alliance",
    icon: Handshake,
    label: "Alliance Partner",
    description: "My organisation supports the regenerative movement",
    href: "/ally",
    color: "#4a9f9f",
    bg: "from-[#4a9f9f]/15 to-[#4a9f9f]/5",
    border: "border-[#4a9f9f]/30 hover:border-[#4a9f9f]/60",
  },
  {
    id: "player",
    icon: Gamepad2,
    label: "ReGen Player",
    description: "I want to play quests and earn tokens",
    href: "/play",
    color: "#a78bfa",
    bg: "from-[#a78bfa]/15 to-[#a78bfa]/5",
    border: "border-[#a78bfa]/30 hover:border-[#a78bfa]/60",
  },
] as const;

export function FirstVisitOnboarding() {
  const [visible, setVisible] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Small delay so the page loads first
    const timer = setTimeout(() => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function choose(href: string) {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    navigate(href);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose your path"
        className="fixed inset-0 z-[61] flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-xl bg-[#0f2d1a] border border-[#7dd87d]/20 rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Skip  -  browse freely"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-full px-4 py-1.5 mb-4">
              <span className="text-[#7dd87d] text-xs font-semibold tracking-wide uppercase">Welcome to ReGen Civics</span>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Choose Your Path
            </h2>
            <p className="text-white/50 text-sm mt-2">
              ReGen Civics is an infinite game for the regenerative renaissance. Where do you fit in?
            </p>
          </div>

          {/* Path cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {PATHS.map((path) => {
              const Icon = path.icon;
              return (
                <button
                  key={path.id}
                  onClick={() => choose(path.href)}
                  className={`group flex items-start gap-3 p-4 rounded-2xl border bg-gradient-to-br ${path.bg} ${path.border} transition-all text-left hover:shadow-lg hover:-translate-y-0.5`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${path.color}20`, border: `1px solid ${path.color}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: path.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-white font-semibold text-sm">{path.label}</p>
                      <ArrowRight
                        className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: path.color }}
                      />
                    </div>
                    <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{path.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Skip */}
          <div className="text-center">
            <button
              onClick={dismiss}
              className="text-white/30 hover:text-white/60 text-sm transition-colors"
            >
              I'll explore on my own
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
