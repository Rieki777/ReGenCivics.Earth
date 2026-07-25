/**
 * LivingTreeCard — wraps LivingTree with data loading + a detail modal.
 * Pulls the player's capital scores and renders the tree. Tapping it opens
 * a modal that shows each of the 9 capital scores with labels.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { LivingTreeV2, type CapitalScores } from "@/components/LivingTreeV2";
import { TreeDeciduous, X } from "lucide-react";

const CAPITAL_KEYS: (keyof CapitalScores)[] = [
  "intellectual",
  "social",
  "material",
  "financial",
  "living",
  "cultural",
  "spiritual",
  "experiential",
  "healthVital",
];

const CAPITAL_LABELS: Record<keyof CapitalScores, string> = {
  intellectual: "Intellectual",
  social: "Social",
  material: "Material",
  financial: "Financial",
  living: "Living",
  cultural: "Cultural",
  spiritual: "Spiritual",
  experiential: "Experiential",
  healthVital: "Health & Vitality",
};

const CAPITAL_COLORS: Record<keyof CapitalScores, string> = {
  intellectual: "#8B7AB8",
  social: "#E6B566",
  material: "#A97B5F",
  financial: "#D4AF37",
  living: "#4a7c59",
  cultural: "#C9655F",
  spiritual: "#9A8DC9",
  experiential: "#7BA89A",
  healthVital: "#D85A4A",
};

const SAMPLE_SCORES: CapitalScores = {
  intellectual: 8, social: 12, material: 4, financial: 6, living: 10,
  cultural: 7, spiritual: 5, experiential: 9, healthVital: 11,
};

export function LivingTreeCard() {
  const { isAuthenticated } = useAuth();
  const scoresQuery = trpc.quest.myCapitalScores.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
  const [showDetail, setShowDetail] = useState(false);

  const scores: CapitalScores = scoresQuery.data
    ? {
        intellectual: scoresQuery.data.intellectual,
        social: scoresQuery.data.social,
        material: scoresQuery.data.material,
        financial: scoresQuery.data.financial,
        living: scoresQuery.data.living,
        cultural: scoresQuery.data.cultural,
        spiritual: scoresQuery.data.spiritual,
        experiential: scoresQuery.data.experiential,
        healthVital: scoresQuery.data.healthVital,
      }
    : SAMPLE_SCORES;
  const total = scoresQuery.data?.totalScore ?? Object.values(scores).reduce((a, b) => a + b, 0);
  const seasonsCompleted = scoresQuery.data?.seasonsCompleted ?? 0;
  const maxScore = Math.max(1, ...CAPITAL_KEYS.map((k) => scores[k]));

  return (
    <section className="py-16">
      <div className="container">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border-2 border-[#7dd87d]/30 shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-0">
            <div className="p-6 bg-gradient-to-br from-[#f0f7f0] to-[#faf6f1] flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowDetail(true)}
                className="w-full max-w-[320px] hover:scale-[1.02] transition-transform"
                aria-label="Open Living Tree detail"
              >
                <LivingTreeV2
                  capitalScores={scores}
                  seasonsCompleted={seasonsCompleted}
                  totalContributionScore={total}
                  currentSeasonActions={Math.min(total, 16)}
                />
              </button>
            </div>
            <div className="p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-[#4a7c59]">
                <TreeDeciduous className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Your Living Tree</span>
              </div>
              <h2
                className="text-2xl md:text-3xl font-bold text-[#1a472a] mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {isAuthenticated ? "Your tree is growing." : "Plant your tree."}
              </h2>
              <p className="text-[#1a472a]/80 mb-4 leading-relaxed">
                Each quest you complete feeds one or more of the nine forms of capital in your life.
                Your tree reshapes itself as you play: the roots thicken, the canopy widens, and the
                flowers bloom with every season you finish.
              </p>
              <p className="text-sm text-[#4a7c59] italic mb-5">
                Tap the tree to see your nine capitals in detail.
              </p>
              <button
                onClick={() => setShowDetail(true)}
                className="inline-flex items-center gap-2 bg-[#1a472a] hover:bg-[#0d2818] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors self-start"
              >
                Explore your roots
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDetail(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Living Tree detail"
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top X close — kept for users who instinctively reach top-right */}
            <button
              onClick={() => setShowDetail(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors z-10 shadow"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-[#1a472a]" />
            </button>
            <div className="p-6 md:p-8">
              <h3
                className="text-2xl md:text-3xl font-bold text-[#1a472a] mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The Nine Forms of Capital
              </h3>
              <p className="text-sm md:text-base text-[#1a472a]/75 mb-6">
                Every capital is a root that feeds your tree.
              </p>
              <div className="grid md:grid-cols-[1fr_1.2fr] gap-6">
                {/* Tree pane — gradient sky-to-earth backdrop with a soft sun
                    glow behind the canopy so the tree feels alive instead of
                    floating on a flat green panel. Root labels are hidden
                    here because the right-column legend already names them. */}
                <div
                  className="rounded-xl p-4 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: "linear-gradient(180deg, #c7e7ff 0%, #e9f6df 45%, #f5e6c8 78%, #b89870 100%)",
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute pointer-events-none"
                    style={{
                      top: "8%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "70%",
                      height: "55%",
                      background: "radial-gradient(ellipse at center, rgba(255, 220, 130, 0.55) 0%, rgba(255, 220, 130, 0) 70%)",
                    }}
                  />
                  <LivingTreeV2
                    capitalScores={scores}
                    seasonsCompleted={seasonsCompleted}
                    totalContributionScore={total}
                    currentSeasonActions={Math.min(total, 16)}
                    width={320}
                    height={440}
                  />
                </div>
                <div className="space-y-2">
                  {CAPITAL_KEYS.map((k) => {
                    const value = scores[k];
                    const pct = Math.round((value / maxScore) * 100);
                    return (
                      <div key={k} className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CAPITAL_COLORS[k] }}
                        />
                        <span className="text-sm font-semibold text-[#1a472a] w-32">
                          {CAPITAL_LABELS[k]}
                        </span>
                        <div className="flex-1 h-2 bg-[#1a472a]/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: CAPITAL_COLORS[k],
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-[#1a472a] w-8 text-right">
                          {value}
                        </span>
                      </div>
                    );
                  })}
                  <div className="mt-4 pt-4 border-t border-[#1a472a]/10 flex items-center justify-between">
                    <span className="text-[#1a472a]/75 font-medium">Total</span>
                    <span className="text-xl font-bold text-[#1a472a]">{total}</span>
                  </div>
                </div>
              </div>
              {/* Bottom Close button — easier to find on mobile than the
                  small X up top, and parallel to the rest of the modal
                  patterns on the site. */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setShowDetail(false)}
                  className="inline-flex items-center gap-2 bg-[#1a472a] hover:bg-[#0d2818] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
