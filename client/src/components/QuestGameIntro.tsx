/**
 * QuestGameIntro — cinematic 4-panel intro shown to first-time visitors.
 * Only renders when localStorage "regen_game_entered" !== "true".
 */

import { useState } from "react";

interface QuestGameIntroProps {
  onEnter: () => void;
}

const panels = [
  {
    id: 0,
    label: "01",
    heading: "Welcome to the Infinite Game",
    body: (
      <>
        <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-xl mx-auto">
          We're co-creating a new economic and financial system built on the question: What if healing ourselves and our Earth is actually a fun and Infinite Game?
        </p>
        <p className="mt-4 text-white/60 max-w-lg mx-auto">
          These quests aren't tasks on a list. They're real acts, lived in the world, shared with your community, and woven into a growing movement.
        </p>
      </>
    ),
  },
  {
    id: 1,
    label: "02",
    heading: "The Arc",
    body: (
      <>
        <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-xl mx-auto">
          These first quests focus on personal health and vitality. We begin with Fire. Then we add life to our bodies. Then we plant.
        </p>
        <p className="mt-4 text-white/60 max-w-lg mx-auto">
          From there, the quests move outward into relationship, communication, and community. Each one builds on the last. None of them require permission to begin.
        </p>
        {/* Simple visual sequence */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          {["Fire", "Potions", "Seeds", "Healing", "Home", "Community"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-[#7dd87d]/40 text-white/80">
                {step}
              </span>
              {i < arr.length - 1 && (
                <span className="text-[#7dd87d]/50 text-xs">→</span>
              )}
            </div>
          ))}
          <span className="text-[#7dd87d]/50 text-xs">→</span>
          <span className="px-3 py-1.5 rounded-full border border-[#7dd87d]/40 text-[#7dd87d] text-sm font-semibold">
            ...
          </span>
        </div>
      </>
    ),
  },
  {
    id: 2,
    label: "03",
    heading: "Your Journey Begins",
    body: (
      <>
        <div className="mx-auto max-w-lg border border-[#7dd87d]/40 rounded-2xl p-6 bg-[#7dd87d]/10">
          <div className="text-[#7dd87d] text-xs font-bold uppercase tracking-widest mb-2">
            Start Here
          </div>
          <h3 className="text-xl font-bold text-white mb-3">
            Quest 0: Fire
          </h3>
          <p className="text-white/80 leading-relaxed">
            Letting burn what no longer serves. A ceremony. A clearing. The first step in every great journey.
          </p>
        </div>
        <p className="mt-6 text-white/60 max-w-lg mx-auto">
          You can start any quest that calls to you. But if you want a thread to follow, Quest 0 is the door.
        </p>
      </>
    ),
  },
  {
    id: 3,
    label: "04",
    heading: "Ready?",
    body: (
      <>
        <p className="text-lg md:text-xl text-white/85 max-w-xl mx-auto">
          The game has started.
        </p>
        <p className="mt-4 text-white/60 max-w-lg mx-auto">
          Everything you do from here contributes to the Regenerative Renaissance. Welcome.
        </p>
      </>
    ),
    isLast: true,
  },
];

export function QuestGameIntro({ onEnter }: QuestGameIntroProps) {
  const [current, setCurrent] = useState(0);
  const panel = panels[current];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-12 overflow-auto"
      style={{ backgroundColor: "#0f2d1a" }}
    >
      {/* Progress dots */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
        {panels.map((p) => (
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
      <div className="max-w-2xl w-full text-center mx-auto mt-8">
        <div
          className="text-[#7dd87d]/60 text-xs font-bold uppercase tracking-widest mb-4"
          style={{ fontFamily: "var(--font-accent, sans-serif)" }}
        >
          {panel.label} / 04
        </div>

        <h2
          className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight"
          style={{ fontFamily: "var(--font-display, serif)" }}
        >
          {panel.heading}
        </h2>

        <div className="text-center">{panel.body}</div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          {panel.isLast ? (
            <button
              onClick={onEnter}
              className="px-10 py-4 rounded-full bg-[#7dd87d] text-[#0f2d1a] font-bold text-lg hover:bg-[#6bc86b] transition-colors shadow-lg shadow-[#7dd87d]/20"
            >
              Enter the Game
            </button>
          ) : (
            <button
              onClick={() => setCurrent((c) => Math.min(c + 1, panels.length - 1))}
              className="px-10 py-4 rounded-full bg-[#7dd87d] text-[#0f2d1a] font-bold text-lg hover:bg-[#6bc86b] transition-colors shadow-lg shadow-[#7dd87d]/20"
            >
              Next
            </button>
          )}

          {/* Skip always available */}
          <button
            onClick={onEnter}
            className="text-white/40 hover:text-white/70 text-sm transition-colors underline-offset-4 hover:underline"
          >
            Skip intro
          </button>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(15,45,26,0.8) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
