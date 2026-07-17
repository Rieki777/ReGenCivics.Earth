/**
 * Multiplayer Mode banner for the Quest page (Phase A). Renders nothing until
 * at least one multiplayer quest is live, so drafts stay invisible. Shows the
 * multiplayer badge and a live crew count, and points at /multiplayer.
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

import { Link } from "wouter";
import { Users } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function MultiplayerQuestsBanner() {
  const questsQuery = trpc.questCrews.quests.useQuery();
  const quests = questsQuery.data?.quests ?? [];
  if (quests.length === 0) return null;

  const aggregates = questsQuery.data?.aggregates ?? [];
  // One live line for the banner: prefer a crew mid-formation, else signup counts.
  const forming = aggregates
    .flatMap((a) => a.crews.filter((c) => c.status === "forming").map((c) => ({ ...c, bioregionName: a.bioregionName })))
    .sort((a, b) => b.memberCount - a.memberCount)[0];
  const totalSignups = aggregates.reduce((sum, a) => sum + a.openSignups, 0);
  const liveLine = forming
    ? `${forming.memberCount} of ${forming.crewSize} aboard in ${forming.bioregionName}`
    : totalSignups > 0
      ? `${totalSignups} player${totalSignups === 1 ? "" : "s"} waiting for crewmates`
      : `${quests.length} quest${quests.length === 1 ? "" : "s"} open for crews`;

  return (
    <section className="py-8 bg-[#f0ebe3]">
      <div className="container">
        <Link href="/multiplayer">
          <div className="rounded-2xl bg-[#1a472a] border border-[#7dd87d]/30 p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-[#1f5232] transition-colors">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-[#7dd87d]/20 border border-[#7dd87d]/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#7dd87d]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-white font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    Multiplayer Mode
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#d4a574]/20 border border-[#d4a574]/30 text-[#d4a574] text-xs font-medium">
                    3 to 7 players
                  </span>
                </div>
                <p className="text-white/70 text-sm mt-1">
                  Some quests take a crew. Sign up with your bioregion and get crewed. {liveLine}.
                </p>
              </div>
            </div>
            <span className="px-5 py-2 rounded-full bg-[#7dd87d] text-[#1a472a] font-bold text-sm">
              Crew up
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
