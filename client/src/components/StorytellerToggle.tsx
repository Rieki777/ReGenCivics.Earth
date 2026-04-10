/**
 * StorytellerToggle - lets a player opt in or out of being picked as a
 * storyteller for ratified governance decisions.
 *
 * Shown in the Notifications section of PlayerProfile.
 */
import { useState } from "react";
import { PenLine } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function StorytellerToggle() {
  const utils = trpc.useUtils();

  const { data: profile } = trpc.playerProfiles.me.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  const available = !!(profile as any)?.availableAsStoryteller;
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const mutation = trpc.playerProfiles.setStoryteller.useMutation({
    onSuccess: () => {
      utils.playerProfiles.me.invalidate();
      toast.success(
        optimistic
          ? "You are now available as a storyteller."
          : "Storyteller availability turned off."
      );
    },
    onError: (err) => {
      setOptimistic(null);
      toast.error("Could not save preference", { description: err.message });
    },
  });

  const current = optimistic !== null ? optimistic : available;

  function toggle() {
    const next = !current;
    setOptimistic(next);
    mutation.mutate({ available: next });
  }

  return (
    <div className="glass-panel p-5 rounded-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <PenLine className="w-4 h-4 text-[#7dd87d] mt-0.5 shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">Available as storyteller</p>
            <p className="text-white/50 text-xs mt-0.5">
              When a governance decision is ratified with high stakes, you may be picked to write the
              narrative that goes into the weekly roundup.
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={mutation.isPending}
          aria-pressed={current}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d] ${
            current ? "bg-[#7dd87d]" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              current ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
