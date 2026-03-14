/**
 * QuestGameIntro — cinematic 4-panel intro shown to first-time visitors.
 * Only renders when localStorage "regen_game_entered" !== "true".
 */

import { useState } from "react";

interface QuestGameIntroProps {
  onEnter: () => void;
}

const PANELS = [
  {
    id: 0,
    heading: "The earth is calling.",
    body: null as null | string,
    pulse: true,
    cta: false,
  },
  {
    id: 1,
    heading: "Land projects need players.",
    body: "Not spectators. People who show up, do the work, and share what they find.",
    pulse: false,
    cta: false,
  },
  {
    id: 2,
    heading: "Every quest you complete sends a signal.",
    body: "You become part of a network of regenerators. The map fills in. The movement grows.",
    pulse: false,
    cta: false,
  },
  {
    id: 3,
    heading: null as null | string,
    body: null as null | string,
    pulse: false,
    cta: true,
  },
] as const;

export function QuestGameIntro({ onEnter }: QuestGameIntroProps) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const panel = PANELS[current];

  function handleNext() {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent((c) => Math.min(c + 1, PANELS.length - 1));
      setTransitioning(false);
    }, 200);
  }

  function handleEnter() {
    localStorage.setItem("regen_game_entered", "true");
    onEnter();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-12 overflow-auto"
      style={{ backgroundColor: "#0a1f0f" }}
    >
      <style>{`
        @keyframes rgi-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes rgi-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rgi-pulse {
          animation: rgi-pulse 3s ease-in-out infinite;
        }
        .rgi-fadein {
          animation: rgi-fadein 0.5s ease forwards;
        }
        .rgi-fadeout {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
      `}</style>

      {/* Skip — top right */}
      <button
        onClick={handleEnter}
        className="absolute top-6 right-6 text-white/35 hover:text-white/60 text-sm transition-colors underline-offset-4 hover:underline"
      >
        Skip
      </button>

      {/* Progress dots */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
        {PANELS.map((p) => (
          <button
            key={p.id}
            onClick={() => setCurrent(p.id)}
            aria-label={`Go to panel ${p.id + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              p.id === current
                ? "bg-[#7dd87d] scale-125"
                : p.id < current
                ? "bg-[#7dd87d]/50"
                : "bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Panel content */}
      <div
        key={current}
        className={`max-w-2xl w-full text-center mx-auto ${transitioning ? "rgi-fadeout" : "rgi-fadein"}`}
      >
        {panel.cta ? (
          /* Final CTA panel */
          <div className="flex flex-col items-center gap-6">
            <div
              className="text-[#7dd87d]/60 text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: "var(--font-accent, sans-serif)" }}
            >
              04 / 04
            </div>
            <button
              onClick={handleEnter}
              className="px-14 py-5 rounded-full font-bold text-xl transition-colors shadow-lg shadow-[#7dd87d]/20 hover:shadow-[#7dd87d]/35"
              style={{
                backgroundColor: "#7dd87d",
                color: "#0a1f0f",
              }}
            >
              Enter the Game
            </button>
            <p className="text-white/40 text-sm">
              Everything you do from here is part of the Regenerative Renaissance.
            </p>
          </div>
        ) : (
          <>
            <div
              className="text-[#7dd87d]/60 text-xs font-bold uppercase tracking-widest mb-6"
              style={{ fontFamily: "var(--font-accent, sans-serif)" }}
            >
              {String(current + 1).padStart(2, "0")} / 04
            </div>

            {panel.heading && (
              <h2
                className={`text-3xl md:text-5xl font-bold text-white leading-tight mb-8 ${
                  panel.pulse ? "rgi-pulse" : ""
                }`}
                style={{ fontFamily: "var(--font-display, serif)" }}
              >
                {panel.heading}
              </h2>
            )}

            {panel.body && (
              <p className="text-lg md:text-xl text-white/75 leading-relaxed max-w-xl mx-auto">
                {panel.body}
              </p>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      {!panel.cta && (
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleNext}
            className="px-10 py-4 rounded-full font-bold text-lg transition-colors shadow-lg shadow-[#7dd87d]/20"
            style={{ backgroundColor: "#7dd87d", color: "#0a1f0f" }}
          >
            Next
          </button>
        </div>
      )}

      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(10,31,15,0.9) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
