/**
 * Recently-completed strip: who did what, what it earned, and how many people
 * acknowledged it. Each row carries a GratitudeButton tagged to that bounty.
 *
 * 2026-07-28: was the seasonal GratitudeDrawer, which spent down a per-season
 * balance and minted a flat 5 $ReGen per send. That model is retired. An
 * acknowledgment is now free and weightless at send time; what it earns the
 * recipient is settled once per lunar cycle from a capped pool.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Leaf } from "lucide-react";
import { GratitudeButton } from "@/components/GratitudeButton";
import { RewardAmount } from "./RewardAmount";
import type { ValuationBreakdownLike } from "./RewardAmount";

interface CompletedRow {
  bounty: {
    id: number;
    title: string;
    tokenType: string;
    valuationBreakdown: ValuationBreakdownLike | null;
  } | null;
  role: string;
  amount: number;
  doer: { userId: number; name: string | null; handle: string | null; displayName: string | null; avatarUrl: string | null } | null;
  gratitude: { total: number; count: number };
}

export function RecentlyCompleted() {
  const { isAuthenticated } = useAuth();
  const { data = [] } = trpc.bounties.recentCompleted.useQuery({ limit: 8 }, { staleTime: 30_000 });

  const rows = data as unknown as CompletedRow[];
  if (rows.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Recently completed</h2>
        <span className="text-xs text-white/60">One acknowledgment per person per cycle</span>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => {
          const doerName = row.doer?.displayName || row.doer?.name || (row.doer?.handle ? `@${row.doer.handle}` : "A contributor");
          return (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d2818]/60 px-4 py-3">
              {row.doer?.avatarUrl ? (
                <img src={row.doer.avatarUrl} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 text-[#7dd87d] grid place-items-center text-xs font-bold shrink-0">
                  {doerName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/85 truncate">
                  <span className="font-semibold">{doerName}</span>{" "}
                  {row.bounty ? (
                    <Link href={`/bounties/${row.bounty.id}`} className="hover:text-[#7dd87d]">{row.bounty.title}</Link>
                  ) : "a bounty"}
                </p>
                <div className="mt-0.5 flex items-center gap-3">
                  {row.bounty ? (
                    <RewardAmount amount={row.amount} tokenType={row.bounty.tokenType} breakdown={row.bounty.valuationBreakdown} size="sm" />
                  ) : null}
                  {row.gratitude.count > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[#9de89d]">
                      <Leaf className="w-3 h-3" /> {row.gratitude.count} gratitude
                    </span>
                  ) : null}
                </div>
              </div>
              {isAuthenticated && row.doer?.handle && row.bounty ? (
                <div className="shrink-0">
                  <GratitudeButton
                    recipientHandle={row.doer.handle}
                    sourceType="bounty"
                    sourceId={row.bounty.id}
                    compact
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
