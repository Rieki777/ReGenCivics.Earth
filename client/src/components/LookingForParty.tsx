/**
 * LookingForParty — toggle + party matching UI for a single quest.
 * Shown inside the expanded Tier 2 card once the player has started the quest.
 * Displays who else is looking for a party and lets the player toggle their own
 * lookingForParty flag.
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Users, Sparkles } from "lucide-react";

interface LookingForPartyProps {
  questId: string;
  /** True when the player has an active quest signal for this quest */
  isActive: boolean;
}

export function LookingForParty({ questId, isActive }: LookingForPartyProps) {
  const { isAuthenticated } = useAuth();
  const partyMembers = trpc.quest.getPartyMembers.useQuery(
    { questId },
    { staleTime: 60 * 1000 }
  );
  const myActive = trpc.quest.myActiveQuests.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const toggleMutation = trpc.quest.toggleLookingForParty.useMutation({
    onSettled: () => {
      partyMembers.refetch();
    },
  });

  const members = partyMembers.data ?? [];
  const amLooking = false; // Server returns public list — unknown local flag, rely on button state.

  if (!isActive) {
    // Before starting, just show how many are partying up.
    if (members.length === 0) return null;
    return (
      <div className="mb-3 flex items-center gap-2 text-xs text-[#4a7c59]" onClick={(e) => e.stopPropagation()}>
        <Users className="w-3.5 h-3.5" />
        <span>
          <strong>{members.length}</strong> looking for party on this quest
        </span>
      </div>
    );
  }

  return (
    <div className="mb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      {isAuthenticated && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMutation.mutate({ questId });
          }}
          disabled={toggleMutation.isPending}
          className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-amber-400 bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          {toggleMutation.isPending ? "Updating..." : "Toggle Looking for Party"}
        </button>
      )}
      {members.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-[#1a472a]/75">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <div
                key={m.userId}
                className="w-7 h-7 rounded-full border-2 border-white bg-[#4a7c59] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden"
                title={m.displayName ?? "Player"}
              >
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (m.displayName ?? "?").charAt(0).toUpperCase()
                )}
              </div>
            ))}
          </div>
          <span>
            {members.length} looking for party
          </span>
        </div>
      )}
      {members.length === 0 && amLooking && (
        <p className="text-xs italic text-[#4a7c59]/70">Waiting for other players to join up.</p>
      )}
    </div>
  );
}
