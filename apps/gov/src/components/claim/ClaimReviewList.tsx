"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { TierBadge } from "@/components/TierBadge";
import { fetchFromMainSite } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

const STATUSES = ["submitted", "under_review", "approved", "adjusted", "flagged", "ratified", "published"] as const;

export function ClaimReviewList() {
  const { getAccessToken } = useAuth();
  const [status, setStatus] = useState<typeof STATUSES[number] | "all">("submitted");
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const input = status === "all" ? { limit: 100 } : { status, limit: 100 };
        const rows = await fetchFromMainSite<any[]>("claims.listClaims", input, token ?? undefined);
        setClaims(rows ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, getAccessToken]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs border transition-colors capitalize",
              status === s ? "bg-[#7dd87d]/15 border-[#7dd87d]/50 text-[#7dd87d]" : "bg-white/5 border-white/10 text-white/65 hover:bg-white/10",
            )}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {loading ? (
        <GlassCard className="text-center py-8 text-white/55 text-sm">Loading...</GlassCard>
      ) : claims.length === 0 ? (
        <GlassCard className="text-center py-8 text-white/55 text-sm">No claims in this status.</GlassCard>
      ) : (
        <div className="space-y-2">
          {claims.map((c) => (
            <Link key={c.id} href={`/game/admin/review/${c.id}`}>
              <GlassCard className="cursor-pointer hover:border-[#7dd87d]/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold">{c.displayName}</div>
                    <div className="text-white/55 text-xs">
                      {c.claimType} · submitted {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.suggestedTier && <TierBadge tier={c.suggestedTier} />}
                    <span className="text-xs text-white/55 uppercase tracking-wide">{c.status.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
