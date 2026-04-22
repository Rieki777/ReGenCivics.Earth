/**
 * CapitalSnapshot — side-by-side Living Tree + Contribution Compass for a player.
 * Reads live capital scores from trpc.playerProfiles.capitalScores and falls
 * back to zeros when the data hasn't finished loading.
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { LivingTree } from "@/components/game/LivingTree";
import { ContributionCompass } from "@/components/game/ContributionCompass";
import { CAPITAL_TYPES } from "@shared/capitals";

interface CapitalSnapshotProps {
  userId?: number;
  /** Seasons completed drives the LivingTree palette rotation. */
  seasonCount?: number;
}

export function CapitalSnapshot({ userId, seasonCount = 0 }: CapitalSnapshotProps) {
  const enabled = typeof userId === "number";
  const scoresQuery = trpc.playerProfiles.capitalScores.useQuery(
    { userId: userId as number },
    { enabled, staleTime: 60 * 1000 },
  );

  const values = useMemo(() => {
    const defaults = Object.fromEntries(CAPITAL_TYPES.map((c) => [c, 0])) as Record<string, number>;
    return { ...defaults, ...(scoresQuery.data ?? {}) };
  }, [scoresQuery.data]);

  const totalScore = useMemo(() => {
    return CAPITAL_TYPES.reduce((sum, c) => sum + (values[c] ?? 0), 0);
  }, [values]);

  return (
    <div className="grid gap-6 md:grid-cols-2 items-center bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex flex-col items-center">
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Your Living Tree</p>
        <LivingTree
          capitalValues={values}
          totalScore={totalScore}
          seasonCount={seasonCount}
          size={240}
        />
      </div>
      <div className="flex flex-col items-center">
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Contribution Compass</p>
        <ContributionCompass values={values} size={260} />
      </div>
    </div>
  );
}
