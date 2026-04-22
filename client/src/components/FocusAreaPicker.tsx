/**
 * FocusAreaPicker — chip-style multi-select for a player's focus areas.
 * Persists to playerProfiles.questInterests (JSON-stringified string array)
 * via trpc.playerProfiles.updateFocusAreas.
 *
 * Mounted inside the profile Settings > Profile panel so the
 * "Focus areas selected" link from the Profile Strength widget lands here.
 */

import { useEffect, useState } from "react";
import { Check, Compass, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export const FOCUS_AREAS = [
  { slug: "regenerative-agriculture", label: "Regenerative Agriculture" },
  { slug: "water-systems", label: "Water Systems" },
  { slug: "local-food-economy", label: "Local Food Economy" },
  { slug: "bioregional-governance", label: "Bioregional Governance" },
  { slug: "community-health", label: "Community Health" },
  { slug: "education", label: "Education" },
  { slug: "storytelling-media", label: "Storytelling & Media" },
  { slug: "technology-tools", label: "Technology & Tools" },
  { slug: "finance-capital", label: "Finance & Capital" },
  { slug: "legal-structures", label: "Legal Structures" },
  { slug: "land-access", label: "Land Access" },
  { slug: "indigenous-stewardship", label: "Indigenous Stewardship" },
] as const;

export function FocusAreaPicker() {
  const utils = trpc.useUtils();
  const loaded = trpc.playerProfiles.getFocusAreas.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && loaded.data) {
      setSelected(loaded.data);
      setInitialized(true);
    }
  }, [loaded.data, initialized]);

  const saveMutation = trpc.playerProfiles.updateFocusAreas.useMutation({
    onSuccess: () => {
      utils.playerProfiles.getFocusAreas.invalidate();
      toast.success("Focus areas saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const dirty =
    initialized &&
    (selected.length !== (loaded.data?.length ?? 0) ||
      selected.some((s) => !(loaded.data ?? []).includes(s)));

  function toggle(slug: string) {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  return (
    <section id="focus-areas" className="glass-panel p-6 rounded-xl scroll-mt-24">
      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
        <Compass className="w-5 h-5 text-[#7dd87d]" />
        Focus Areas
      </h2>
      <p className="text-sm text-white/60 mb-5">
        Pick the areas you care about most. Used to route relevant quests,
        opportunities, and collaborators your way.
      </p>

      {loaded.isLoading ? (
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your picks…
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {FOCUS_AREAS.map((area) => {
              const active = selected.includes(area.slug);
              return (
                <button
                  key={area.slug}
                  onClick={() => toggle(area.slug)}
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    active
                      ? "bg-[#7dd87d]/20 border-[#7dd87d]/60 text-[#7dd87d]"
                      : "bg-white/5 border-white/15 text-white/75 hover:border-white/35"
                  }`}
                  aria-pressed={active}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                  {area.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">
              {selected.length} selected
            </span>
            <button
              onClick={() => saveMutation.mutate({ focusAreas: selected })}
              disabled={!dirty || saveMutation.isPending}
              className="px-4 py-2 rounded-md bg-[#7dd87d] text-[#0d2818] text-sm font-semibold hover:bg-[#9de89d] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? "Saving…" : "Save focus areas"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
