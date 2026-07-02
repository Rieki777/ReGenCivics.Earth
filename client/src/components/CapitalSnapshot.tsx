/**
 * CapitalSnapshot — side-by-side Living Tree + Contribution Compass for a player.
 * Reads live capital scores from trpc.playerProfiles.capitalScores and falls
 * back to zeros when the data hasn't finished loading.
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { LivingTreeV2, type CapitalScores } from "@/components/LivingTreeV2";
import { ContributionCompass } from "@/components/game/ContributionCompass";
import { CAPITAL_TYPES } from "@shared/capitals";

interface CapitalSnapshotProps {
  userId?: number;
  /** Seasons completed drives the Living Tree life stage + palette. */
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

  // Map the shared capital keys (health) to the LivingTreeV2 shape (healthVital)
  // so the profile tree renders identically to the one on the Quest page.
  const capitalScores: CapitalScores = useMemo(() => ({
    intellectual: values.intellectual ?? 0,
    social: values.social ?? 0,
    material: values.material ?? 0,
    financial: values.financial ?? 0,
    living: values.living ?? 0,
    cultural: values.cultural ?? 0,
    spiritual: values.spiritual ?? 0,
    experiential: values.experiential ?? 0,
    healthVital: values.health ?? 0,
  }), [values]);

  return (
    <div className="grid gap-6 md:grid-cols-2 items-center bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex flex-col items-center">
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Your Living Tree</p>
        <div className="w-full max-w-[300px]">
          <LivingTreeV2
            capitalScores={capitalScores}
            seasonsCompleted={seasonCount}
            totalContributionScore={totalScore}
            currentSeasonActions={Math.min(totalScore, 16)}
          />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Contribution Compass</p>
        <ContributionCompass values={values} size={260} />
      </div>
    </div>
  );
}
