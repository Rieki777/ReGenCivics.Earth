/**
 * Recently-completed strip: who did what, what it earned, and a running
 * gratitude tally. Each row has a "Send gratitude" button that opens the
 * budget-aware GratitudeDrawer pre-filled with that doer and the bounty
 * reference, so an excited community can add on to what a task earned.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Heart, Leaf } from "lucide-react";
import { GratitudeDrawer } from "@/components/game";
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
  const { data: budget } = trpc.game.myGratitudeBudget.useQuery(undefined, { enabled: isAuthenticated });
  const [target, setTarget] = useState<{ id: number; name: string; bountyId: number } | null>(null);

  const rows = data as unknown as CompletedRow[];
  if (rows.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Recently completed</h2>
        {isAuthenticated && budget ? (
          <span className="text-xs text-white/60">{budget.remaining} of {budget.total} gratitude left this season</span>
        ) : null}
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
              {isAuthenticated && row.doer && row.bounty ? (
                <button
                  type="button"
                  onClick={() => setTarget({ id: row.doer!.userId, name: doerName, bountyId: row.bounty!.id })}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#7dd87d]/30 text-[#7dd87d] text-xs px-2.5 py-1.5 hover:bg-[#7dd87d]/10 transition-colors shrink-0"
                >
                  <Heart className="w-3 h-3" /> Thank
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {target && target.id > 0 ? (
        <GratitudeDrawer recipientId={target.id} recipientName={target.name} bountyId={target.bountyId} onClose={() => setTarget(null)} />
      ) : null}
    </div>
  );
}
