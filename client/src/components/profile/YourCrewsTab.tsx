/**
 * Your Crews: the player dashboard view of multiplayer quest crews (Phase A).
 * Read surface only; joining, activating, leaving, and completing all live on
 * /multiplayer. Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

import { Link } from "wouter";
import { CheckCircle2, MessageSquare, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";

const STATUS_LABELS: Record<string, string> = {
  forming: "Forming",
  ready: "Ready to start",
  active: "Underway",
  complete: "Complete",
  disbanded: "Disbanded",
};

export function YourCrewsTab() {
  const myCrewsQuery = trpc.questCrews.myCrews.useQuery();
  const questsQuery = trpc.questCrews.quests.useQuery();
  const questTitles = new Map((questsQuery.data?.quests ?? []).map((q) => [q.questId, q.title]));

  if (myCrewsQuery.isLoading) {
    return <div className="text-white/60 text-sm">Loading your crews…</div>;
  }

  const crews = myCrewsQuery.data ?? [];
  if (crews.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
        <Users className="w-7 h-7 text-[#7dd87d] mx-auto mb-2" />
        <p className="text-white/80 font-medium mb-1">No crews yet.</p>
        <p className="text-white/60 text-sm mb-4">
          Some quests take 3 to 7 players. Sign up and a crew forms around you in your bioregion.
        </p>
        <Link href="/multiplayer" className="inline-block px-5 py-2 rounded-full bg-[#7dd87d] text-[#1a472a] font-bold text-sm hover:bg-[#9de89d]">
          See multiplayer quests
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {crews.map((crew) => (
        <div key={crew.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-white font-bold text-sm">
                {questTitles.get(crew.questId) ?? crew.questId}
              </div>
              <div className="text-white/60 text-xs mt-0.5">
                {crew.bioregionName} · {crew.members.length} of {crew.crewSize} aboard ·{" "}
                {STATUS_LABELS[crew.status] ?? crew.status}
                {crew.myStatus === "completed" && (
                  <span className="inline-flex items-center gap-1 ml-2 text-[#7dd87d]">
                    <CheckCircle2 className="w-3 h-3" /> You completed it
                  </span>
                )}
              </div>
            </div>
            {crew.forumThreadId && (
              <Link
                href={`/community/post/${crew.forumThreadId}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs hover:bg-white/20"
              >
                <MessageSquare className="w-3 h-3" /> Crew chat
              </Link>
            )}
          </div>
          <div className="text-white/60 text-xs mt-2">
            Crew: {crew.members.map((m) => m.name).join(", ")}
          </div>
        </div>
      ))}
      <div className="pt-1">
        <Link href="/multiplayer" className="text-[#7dd87d] text-sm hover:text-[#9de89d]">
          Manage your crews on the multiplayer page
        </Link>
      </div>
    </div>
  );
}
