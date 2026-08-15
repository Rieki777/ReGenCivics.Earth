"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Sprout } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { ContributorCard } from "@/components/ContributorCard";
import { fetchFromMainSite } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function ContributorsPage() {
  const [contributors, setContributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "individual" | "organization">("all");
  const [filterTier, setFilterTier] = useState<string>("all");

  useEffect(() => {
    fetchFromMainSite<any[]>("claims.listContributors", { limit: 200 })
      .then((rows) => setContributors(rows ?? []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return contributors.filter((c) => {
      if (filterType !== "all" && c.claimType !== filterType) return false;
      if (filterTier !== "all" && (c.finalTier ?? c.suggestedTier) !== filterTier) return false;
      return true;
    });
  }, [contributors, filterType, filterTier]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-7 h-7 text-[#7dd87d]" />
        <h1 className="text-3xl font-bold text-white">Contributors</h1>
      </div>
      <p className="text-white/65 text-sm max-w-2xl">
        The people and organizations holding the regen movement. Each one brought their story to a Proposal Party, and the community recognized their work together.
      </p>

      <div className="flex flex-wrap gap-2">
        {(["all", "individual", "organization"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs border transition-colors capitalize",
              filterType === t ? "bg-[#7dd87d]/15 border-[#7dd87d]/50 text-[#7dd87d]" : "bg-white/5 border-white/10 text-white/65 hover:bg-white/10",
            )}
          >
            {t === "all" ? "All" : t + "s"}
          </button>
        ))}
      </div>

      {loading ? (
        <GlassCard className="text-center py-12 text-white/55 text-sm">Loading...</GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Sprout className="w-10 h-10 text-[#7dd87d]/40 mx-auto mb-3" />
          <p className="text-white/75 text-sm mb-2">The first Proposal Parties start at the June Solstice.</p>
          <p className="text-white/60 text-xs">Contributors will appear here after they present and are recognized.</p>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <ContributorCard key={c.id} contributor={c} />
          ))}
        </div>
      )}
    </div>
  );
}
