/**
 * The reusable bounty board: filters + sort + a responsive card grid.
 * Refactored out of the old OpenToCircleCallTasks so it can headline the
 * /bounties page. Claiming, loading, and the empty state are handled here;
 * the page supplies the surrounding hero/stats/strips.
 */
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { BountyCard } from "./BountyCard";
import type { BoardBounty } from "./types";

type SortKey = "newest" | "reward" | "closing";

interface Props {
  emptyState?: React.ReactNode;
  onCounts?: (counts: { count: number; totalReward: number; circles: number }) => void;
}

export function BountyBoard({ emptyState, onCounts }: Props) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [sourceType, setSourceType] = useState<"" | "call_task" | "contribution">("");
  const [tier, setTier] = useState<"" | "trivial" | "small" | "medium" | "large">("");
  const [circle, setCircle] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [claimingRoleId, setClaimingRoleId] = useState<number | null>(null);

  const query = trpc.bounties.listBoard.useQuery(
    {
      sort,
      limit: 100,
      ...(sourceType ? { sourceType } : {}),
      ...(tier ? { tier } : {}),
      ...(circle ? { circle } : {}),
    },
    { staleTime: 30_000 },
  );
  const myRoles = trpc.bounties.myRoles.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  const mySlugs = useMemo(() => new Set(myRoles.data ?? []), [myRoles.data]);

  const claim = trpc.bounties.claimRole.useMutation({
    onMutate: (vars) => setClaimingRoleId(vars.roleId),
    onSuccess: () => {
      toast.success("Claimed. Find it under your Profile, Tasks.");
      utils.bounties.listBoard.invalidate();
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setClaimingRoleId(null),
  });

  const rows = (query.data ?? []) as unknown as BoardBounty[];

  // Circle options from the current rows, for the circle filter.
  const circleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of rows) if (b.roleCircle) set.add(b.roleCircle);
    return [...set].sort();
  }, [rows]);

  // Surface live counts to the page's stats strip.
  useEffect(() => {
    if (!onCounts) return;
    const totalReward = rows.reduce((sum, b) => sum + (b.valuationBreakdown?.amount ?? b.openRoles[0]?.amount ?? 0), 0);
    onCounts({ count: rows.length, totalReward, circles: new Set(rows.map((b) => b.roleCircle).filter(Boolean)).size });
  }, [rows, onCounts]);

  const selectCls =
    "rounded-md bg-[#0f2417] border border-white/15 text-white text-sm px-2 py-1.5 focus:outline-none focus:border-[#7dd87d]/50";

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select aria-label="Type" value={sourceType} onChange={(e) => setSourceType(e.target.value as typeof sourceType)} className={selectCls}>
          <option value="">All types</option>
          <option value="call_task">Session task</option>
          <option value="contribution">Code contribution</option>
        </select>
        <select aria-label="Size" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)} className={selectCls}>
          <option value="">All sizes</option>
          <option value="trivial">Trivial</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
        {circleOptions.length > 0 && (
          <select aria-label="Circle" value={circle} onChange={(e) => setCircle(e.target.value)} className={selectCls}>
            <option value="">All circles</option>
            {circleOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${selectCls} ml-auto`}>
          <option value="newest">Newest</option>
          <option value="reward">Highest reward</option>
          <option value="closing">Closing soon</option>
        </select>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-20"><TaoSpinner size={48} /></div>
      ) : rows.length === 0 ? (
        (emptyState ?? (
          <div className="text-center py-16 border border-white/8 rounded-2xl bg-white/[0.02]">
            <Sparkles className="w-10 h-10 text-[#7dd87d] mx-auto mb-3" />
            <p className="text-white/70 text-lg mb-1">No open bounties right now</p>
            <p className="text-white/50 text-sm">New bounties are born from community sessions. Check back soon.</p>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((b) => (
            <BountyCard
              key={b.id}
              bounty={b}
              isAuthenticated={isAuthenticated}
              mine={b.roleSlug ? mySlugs.has(b.roleSlug) : false}
              claimingRoleId={claimingRoleId}
              onClaim={(roleId) => claim.mutate({ roleId })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
