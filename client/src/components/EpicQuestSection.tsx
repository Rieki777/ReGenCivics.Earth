/**
 * EpicQuestSection — full-width dark section showing Epic (collective) quests.
 * Data from epicQuestsData.ts. Placed at the bottom of the Quest page.
 */

import { epicQuestsData, EpicQuest } from "@/data/epicQuestsData";
import { Link } from "wouter";

const TIER_CONFIG = {
  easy: {
    label: "Easy Mode",
    accent: "#7dd87d",
    accentBg: "rgba(125,216,125,0.12)",
    badgeBg: "rgba(125,216,125,0.2)",
    badgeText: "#7dd87d",
  },
  hard: {
    label: "Hard Mode",
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.10)",
    badgeBg: "rgba(245,158,11,0.2)",
    badgeText: "#f59e0b",
  },
  expert: {
    label: "Expert Mode",
    accent: "#ef4444",
    accentBg: "rgba(239,68,68,0.10)",
    badgeBg: "rgba(239,68,68,0.2)",
    badgeText: "#ef4444",
  },
};

function EpicCard({ quest }: { quest: EpicQuest }) {
  const cfg = TIER_CONFIG[quest.tier];

  return (
    <div
      className="relative flex flex-col sm:flex-row gap-0 rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-colors"
      style={{ backgroundColor: cfg.accentBg }}
    >
      {/* Left accent border */}
      <div
        className="w-full sm:w-1 flex-shrink-0 h-1 sm:h-auto"
        style={{ backgroundColor: cfg.accent }}
      />

      {/* Card body */}
      <div className="flex-1 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4
            className="text-white font-bold text-base leading-snug"
            style={{ fontFamily: "var(--font-display, serif)" }}
          >
            {quest.title}
          </h4>
          {/* Epic Quest badge */}
          <span
            className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border"
            style={{
              color: cfg.badgeText,
              borderColor: cfg.accent,
              backgroundColor: cfg.badgeBg,
              boxShadow: `0 0 8px ${cfg.accent}33`,
            }}
          >
            Epic Quest
          </span>
        </div>

        <p className="text-white/70 text-sm leading-relaxed mb-3">{quest.description}</p>

        <p className="text-white/40 text-xs">
          <strong className="text-white/60">Deliverable:</strong> {quest.deliverable}
        </p>
      </div>
    </div>
  );
}

function TierRow({ tier }: { tier: "easy" | "hard" | "expert" }) {
  const cfg = TIER_CONFIG[tier];
  const quests = epicQuestsData.filter((q) => q.tier === tier);

  if (quests.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-2 h-6 rounded-full flex-shrink-0"
          style={{ backgroundColor: cfg.accent }}
        />
        <h3
          className="text-lg font-bold"
          style={{ color: cfg.accent, fontFamily: "var(--font-accent, sans-serif)" }}
        >
          {cfg.label}
        </h3>
        <div className="flex-1 h-px" style={{ backgroundColor: `${cfg.accent}22` }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quests.map((quest) => (
          <EpicCard key={quest.id} quest={quest} />
        ))}
      </div>
    </div>
  );
}

export function EpicQuestSection() {
  return (
    <section
      className="py-20 px-4"
      style={{ backgroundColor: "#0f2d1a" }}
    >
      <div className="container max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-[#7dd87d]/30 text-[#7dd87d]/70 mb-5"
          >
            Collective Acts
          </div>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-display, serif)" }}
          >
            These quests change landscapes.
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            For those ready to go further.
          </p>
        </div>

        {/* Tier rows */}
        <TierRow tier="easy" />
        <TierRow tier="hard" />
        <TierRow tier="expert" />

        {/* CTA */}
        <div className="text-center mt-8">
          <Link href="/community">
            <span className="inline-block px-8 py-3 rounded-full bg-[#7dd87d] text-[#0f2d1a] font-bold text-base hover:bg-[#6bc86b] transition-colors cursor-pointer shadow-lg shadow-[#7dd87d]/10">
              Join the Quest
            </span>
          </Link>
          <p className="mt-4 text-white/40 text-sm">
            Connect with others working on these in the community forum.
          </p>
        </div>
      </div>
    </section>
  );
}
