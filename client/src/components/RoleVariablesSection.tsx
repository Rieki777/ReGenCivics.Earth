/**
 * RoleVariablesSection - Seed/Harvest explanation + role award bands table + tracking summary.
 * Placed after role cards grid on Team page.
 *
 * Token amounts only. Until 2026-09-27 this table carried a USD column and the
 * line "$ReGen is currently valued at $0.01 each", which priced the token on a
 * public page. Tokens make no claim about financial value (COOP.tokensNote),
 * so no surface converts a token amount into dollars.
 */
import { useState } from "react";
import { COOP } from "@shared/fund";
import { gameRoles } from "@/data/gameRoles";
import { characterLabel } from "@shared/regenYear";

// max = base plus the 30% Seed + Harvest bonus, in $ReGen.
const bands = [
  { band: 7, base: "900,000", max: "1,170,000", roles: "Grand Builder, and the four Season Organizers (Design, Resource, Build, Rest)" },
  { band: 6, base: "800,000", max: "1,040,000", roles: "Game Designer, Security Reviewer" },
  { band: 5, base: "700,000", max: "910,000", roles: "Skills Builder, Season Facilitator" },
  { band: 4, base: "600,000", max: "780,000", roles: "Alliance Weaver, Treasury Steward" },
  { band: 3, base: "500,000", max: "650,000", roles: "Storyteller, Incubator Guide, Tool Curator" },
  { band: 2, base: "400,000", max: "520,000", roles: "Quest Steward, Outreach Writer, Assembly Steward" },
  { band: 1, base: "300,000", max: "390,000", roles: "Forum Gardener" },
];

export function RoleVariablesSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-[#7dd87d]/30">
            <span className="text-lg">🌱</span>
            <span className="text-[#7dd87d] font-medium text-sm uppercase tracking-wide">Role Variables</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Seed & <span className="text-[#d4a574]">Harvest</span>
          </h2>
          <p className="text-lg text-white/70 max-w-3xl mx-auto">
            Every role has a planting commitment and an ecosystem impact metric. At the end of each season, the community reviews what got planted and what grew.
          </p>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🌱</div>
            <h3 className="text-white font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>Plant Your Seeds</h3>
            <p className="text-white/60 text-sm">Each role has specific deliverables you commit to. Ship the work, and your seeds are planted.</p>
          </div>
          <div className="bg-[#d4a574]/10 border border-[#d4a574]/20 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🌾</div>
            <h3 className="text-white font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>Watch the Harvest</h3>
            <p className="text-white/60 text-sm">Did other people benefit from your work? New contributors, completed quests, projects on track. The ecosystem tells us.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🎊</div>
            <h3 className="text-white font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>Season Festival Review</h3>
            <p className="text-white/60 text-sm">At each season transition, the community gathers to review outcomes. Seeds planted + harvest in = +30% bonus. One of the two = +15%.</p>
          </div>
        </div>

        {/* Collapsible: Compensation bands + What We Track */}
        <div className="text-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm group"
          >
            <span>{expanded ? "Hide details" : "See role award bands and what we track"}</span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${expanded ? "max-h-[2000px] opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"}`}
        >
          {/* Role award bands */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>Role Award Bands</h3>
            <p className="text-white/70 text-sm mb-2">7 bands. 3:1 ratio from top to bottom. Role awards are paid in $ReGen tokens, which record contributions. All role holders know exactly where they stand.</p>
            <p className="text-white/60 text-xs mb-4">{COOP.tokensNote}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/65 text-xs uppercase tracking-wider border-b border-white/10">
                    <th className="text-left py-3 px-2">Band</th>
                    <th className="text-left py-3 px-2">$ReGen/Season</th>
                    <th className="text-left py-3 px-2">Max w/ Bonus ($ReGen)</th>
                    <th className="text-left py-3 px-2 hidden md:table-cell">Roles</th>
                  </tr>
                </thead>
                <tbody className="text-white/70">
                  {bands.map((row) => (
                    <tr key={row.band} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2"><span className="bg-[#7dd87d]/20 text-[#7dd87d] text-xs font-bold px-2 py-0.5 rounded-full">{row.band}</span></td>
                      <td className="py-3 px-2 font-mono text-[#7dd87d]">{row.base}</td>
                      <td className="py-3 px-2 font-mono text-[#d4a574]">{row.max}</td>
                      <td className="py-3 px-2 text-white/70 hidden md:table-cell">{row.roles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* What We Track */}
          <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>What We Track</h3>
            <div className="space-y-3">
              {gameRoles.map((role) => (
                <div key={role.title} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2 md:w-48 flex-shrink-0">
                    <span>{role.emoji}</span>
                    <span className="text-white font-semibold text-sm">{characterLabel(role.title, role.characterName)}</span>
                  </div>
                  <div className="flex-1 grid md:grid-cols-2 gap-2">
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-[#7dd87d] mt-0.5">🌱</span>
                      <span className="text-white/60">{role.seed}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-[#d4a574] mt-0.5">🌾</span>
                      <span className="text-white/60">{role.harvest}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
