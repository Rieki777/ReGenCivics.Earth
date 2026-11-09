/**
 * Pause and resume cards for Season 2 and the Open Access sessions, on the
 * Admin Events tab beside the Interoperability Circle's card, working the same
 * way (Rye, 2026-11-09). What a pause does: shared/livePause.ts.
 */
import { CalendarOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { LIVE_SERIES, LIVE_SERIES_LABEL, type LiveSeries } from "@shared/livePause";

function when(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const DESCRIPTION: Record<LiveSeries, string> = {
  season2:
    "The weekly Season 2 calls. Pausing cancels every upcoming week, turns off its reminder emails, takes the weeks off subscribers' calendars, and swaps the calendar buttons on the site for the pause notice. Resuming brings back the weeks the pause cancelled.",
  open_access:
    "The monthly new-moon Open Access calls. Pausing cancels every upcoming session, turns off its reminder emails, takes the sessions off subscribers' calendars, and swaps the calendar buttons on the site for the pause notice. Resuming brings back the sessions the pause cancelled.",
};

function SeriesCard({ series }: { series: LiveSeries }) {
  const utils = trpc.useUtils();
  const state = trpc.events.adminLivePause.useQuery({ series });
  const setPaused = trpc.events.adminSetLivePause.useMutation({
    onSuccess: () => {
      void utils.events.adminLivePause.invalidate();
      void utils.events.livePause.invalidate();
      void utils.events.adminList.invalidate();
    },
  });
  const data = state.data;
  const label = LIVE_SERIES_LABEL[series];

  return (
    <Card className="bg-[#0a1f14] border-[#e3ac4f]/30 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <CalendarOff className="w-4 h-4 text-[#e3ac4f]" />
          {label}
        </CardTitle>
        <CardDescription className="text-white/60">{DESCRIPTION[series]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {state.isLoading && <Loader2 className="w-4 h-4 animate-spin text-white/60" />}
        {data && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <p className={data.paused ? "text-amber-300" : "text-white/70"}>
                {data.paused
                  ? "Paused. Every upcoming session is cancelled and no reminder emails go out."
                  : "Running. Sessions are on the calendar and reminders send."}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent border-white/45 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setPaused.mutate({ series, paused: !data.paused })}
                disabled={setPaused.isPending}
              >
                {data.paused ? `Resume ${label}` : `Pause ${label}`}
              </Button>
            </div>
            {setPaused.data && (
              <p className="text-white/60 text-xs" role="status">
                {setPaused.data.result.paused
                  ? `Cancelled ${setPaused.data.result.cancelled} upcoming ${setPaused.data.result.cancelled === 1 ? "session" : "sessions"}.`
                  : `Reopened ${setPaused.data.result.reopened} ${setPaused.data.result.reopened === 1 ? "session" : "sessions"}.`}
              </p>
            )}
            {setPaused.error && (
              <p className="text-red-300 text-xs" role="alert">{setPaused.error.message}</p>
            )}
            <div>
              <p className="text-white/80 mb-1">Upcoming sessions</p>
              {data.sessions.length === 0 ? (
                <p className="text-white/60">None on the calendar.</p>
              ) : (
                <ul className="space-y-1">
                  {data.sessions.map((s) => (
                    <li key={s.id} className="text-white/80 tabular-nums">
                      {when(s.startTime)}
                      <span className="text-white/60"> · {s.title}</span>
                      {s.status === "cancelled" && <span className="text-red-300"> · cancelled</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminLivePause() {
  return (
    <>
      {LIVE_SERIES.map((series) => (
        <SeriesCard key={series} series={series} />
      ))}
    </>
  );
}
