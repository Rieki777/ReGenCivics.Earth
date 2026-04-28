/**
 * SeasonScorecardSection - Current season progress and role status.
 * Shows at the bottom of the Team page before the final CTA.
 */
import { gameRoles, seasons } from "@/data/gameRoles";

export function SeasonScorecardSection() {
  const currentSeason = seasons.find((s) => s.current);

  return (
    <section className="py-16 px-4 bg-[#0d2818]">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#d4a574]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-[#d4a574]/30">
            <span className="text-lg">📊</span>
            <span className="text-[#d4a574] font-medium text-sm uppercase tracking-wide">Season Scorecard</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Season 1: <span className="text-[#7dd87d]">The First Build</span>
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            Winter 2025-2026. Building the tools, writing the code, designing the game. Here's where each role stands.
          </p>
        </div>

        {/* Role progress cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameRoles.map((role) => {
            const isActive = currentSeason?.activeRoles.includes(role.title);
            return (
              <div
                key={role.title}
                className={`rounded-xl p-4 border ${isActive ? "bg-white/5 border-[#7dd87d]/20" : "bg-white/[0.02] border-white/5 opacity-50"}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{role.emoji}</span>
                  <div>
                    <span className="text-white font-semibold text-sm">{role.characterName}</span>
                    <span className="text-white/65 text-xs ml-2">{role.title}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    role.assignment === "Open" ? "bg-[#d4a574]/20 text-[#d4a574]" :
                    role.assignment === "Golden opportunity" ? "bg-[#d4a574]/30 text-[#d4a574] font-semibold" :
                    "bg-[#7dd87d]/20 text-[#7dd87d]"
                  }`}>
                    {role.assignment}
                  </span>
                  <span className="text-white/70 text-xs">Band {role.band}</span>
                </div>
                {isActive && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🌱</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#7dd87d]/40 rounded-full" style={{ width: "0%" }} />
                      </div>
                      <span className="text-white/70 text-[10px]">Seed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🌾</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#d4a574]/40 rounded-full" style={{ width: "0%" }} />
                      </div>
                      <span className="text-white/70 text-[10px]">Harvest</span>
                    </div>
                  </div>
                )}
                {!isActive && (
                  <p className="text-white/70 text-xs mt-2">Resting this season</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Season summary stats */}
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-[#7dd87d]">13</div>
            <div className="text-white/70 text-xs uppercase tracking-wide mt-1">Total Roles</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-[#d4a574]">9</div>
            <div className="text-white/70 text-xs uppercase tracking-wide mt-1">Open Roles</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-white">7.4M</div>
            <div className="text-white/70 text-xs uppercase tracking-wide mt-1">$ReGen Base Budget</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-[#d4a574]">9.6M</div>
            <div className="text-white/70 text-xs uppercase tracking-wide mt-1">$ReGen Max Budget</div>
          </div>
        </div>

        {/* Past seasons placeholder */}
        <div className="mt-8 bg-white/5 rounded-xl p-6 border border-white/10 text-center">
          <p className="text-white/65 text-sm">Past season archives will appear here after the first Season Festival.</p>
        </div>
      </div>
    </section>
  );
}
