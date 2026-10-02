/**
 * A Season's live schedule, with the catalog times standing in while it loads.
 *
 * Every page that prints a Season's weekly time reads this, so when the land
 * projects' vote moves the Season (ADR-64), /seasons, /season2 and
 * /season-schedule move together. Before the server answers, and if it never
 * does, each week sits on the time the Season opened on, which is exactly what
 * these pages printed before the vote existed.
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  ACTIVE_SEASON,
  SEASON_SCHEDULES,
  seasonSessionsOn,
  seasonSlot,
  type SeasonScheduleConfig,
  type SeasonSlot,
} from "@shared/seasonSchedule";

export type SeasonSessionView = {
  week: number;
  /** "Week 3: Game & Organisation Co-Creation Part 1", or null before the rows load. */
  title: string | null;
  start: Date;
  end: Date;
  status: string;
};

export function useSeasonSchedule(season: string = ACTIVE_SEASON, opts: { poll?: boolean } = {}) {
  const config: SeasonScheduleConfig = SEASON_SCHEDULES[season] ?? SEASON_SCHEDULES[ACTIVE_SEASON];
  const query = trpc.seasonSchedule.state.useQuery(
    { season: config.season },
    {
      staleTime: 30_000,
      refetchInterval: opts.poll ? 10_000 : false,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  );

  const fallback = useMemo<SeasonSessionView[]>(
    () =>
      seasonSessionsOn(config, config.opening).map((s) => ({
        week: s.week,
        title: null,
        start: s.start,
        end: s.end,
        status: "upcoming",
      })),
    [config],
  );

  const sessions = useMemo<SeasonSessionView[]>(() => {
    const rows = query.data?.sessions;
    if (!rows || rows.length === 0) return fallback;
    return rows.map((r) => {
      const start = new Date(r.startTime);
      return {
        week: r.week,
        title: r.title,
        start,
        end: r.endTime ? new Date(r.endTime) : new Date(start.getTime() + config.minutes * 60_000),
        status: r.status,
      };
    });
  }, [query.data, fallback, config.minutes]);

  const scheduled: SeasonSlot = query.data?.scheduled ?? seasonSlot(config.opening.key, config.opening.hourPT);

  // Until the vote's first decision nothing moves, so the opening time is the
  // real schedule and the fallback is safe to show. After it, only the live
  // rows know the time: pages wait for them instead of flashing the opening
  // time (on October 1 that was a Saturday the Season had left).
  const loaded = !!query.data;
  const ready = loaded || Date.now() < config.followsFrom.getTime();

  return { config, query, data: query.data, sessions, scheduled, loaded, ready };
}
