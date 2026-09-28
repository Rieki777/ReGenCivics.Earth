/**
 * Season Schedule controls on the Admin Events tab (ADR-64).
 *
 * A Season's episode sessions are ordinary events rows (they appear in the list
 * above with the same reminder, roster and edit tools). This panel covers the
 * part that belongs to the vote on /season-schedule: the tally, when voting
 * closes, which time the sessions follow, a pin that overrides the vote, and
 * which times are on offer.
 */
import { useEffect, useState } from "react";
import { CalendarClock, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { SESSION_TIME_ZONE, wallTimeInZoneToUtc } from "@shared/sessionClock";
import {
  ACTIVE_SEASON,
  SEASON_FREEZE_HOURS,
  SEASON_LEAD_SETTLE_HOURS,
  SEASON_SLOT_KEYS,
  seasonSlot,
  type SeasonSlotKey,
} from "@shared/seasonSchedule";

function when(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    timeZone: SESSION_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** A Date as the value of a datetime-local input, read as Pacific wall time. */
function toPacificInput(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SESSION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** A datetime-local value typed as Pacific wall time, as an instant. */
function fromPacificInput(value: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return wallTimeInZoneToUtc(m[1], Number(m[2]), Number(m[3]), SESSION_TIME_ZONE);
}

/**
 * What the cohort sent from the page's "Help shape the next session" form,
 * grouped by the week each note was written ahead of. Newest week first.
 */
function SeasonNotes({ season }: { season: string }) {
  const utils = trpc.useUtils();
  const notes = trpc.seasonSchedule.adminFeedback.useQuery({ season }, { refetchInterval: 60_000 });
  const hideNote = trpc.seasonSchedule.adminHideNote.useMutation({
    onSuccess: () => {
      void utils.seasonSchedule.adminFeedback.invalidate();
      void utils.seasonSchedule.state.invalidate();
    },
  });
  const byWeek = new Map<string, NonNullable<typeof notes.data>>();
  for (const n of notes.data ?? []) {
    const key = n.week == null ? "After the Season" : `Before Week ${n.week}`;
    byWeek.set(key, [...(byWeek.get(key) ?? []), n]);
  }
  return (
    <div className="border-t border-white/10 pt-4">
      <p className="text-white/70 mb-1 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-[#e3ac4f]" />
        Notes from the cohort ({notes.data?.length ?? 0})
      </p>
      <p className="text-white/40 text-xs mb-3">
        Topics they want next and feedback on the facilitation, from /season-schedule#notes. Each writer chose
        whether to share their note on the page; take a shared one down if it should not be there. Unsigned notes are
        anonymous by design: nothing ties them to a vote.
      </p>
      {notes.isLoading && <Loader2 className="w-4 h-4 animate-spin text-white/60" />}
      {notes.data && notes.data.length === 0 && <p className="text-white/50">No notes yet.</p>}
      <div className="space-y-4">
        {[...byWeek.entries()].map(([label, list]) => (
          <div key={label}>
            <p className="text-white font-semibold mb-2">{label}</p>
            <ul className="space-y-2">
              {list.map((n) => (
                <li key={n.id} className="rounded-lg border border-white/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <p className="text-white/45 text-xs">
                      {[n.projectName, n.displayName].filter(Boolean).join(", ") || "Anonymous"} · {when(n.createdAt)} ·{" "}
                      <span className={n.isPublic ? "text-[#7dd87d]" : "text-white/45"}>
                        {n.isPublic ? "shared on the page" : "organizers only"}
                      </span>
                    </p>
                    {n.isPublic && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 text-white/60"
                        disabled={hideNote.isPending}
                        onClick={() => hideNote.mutate({ season, id: n.id })}
                      >
                        Take off the page
                      </Button>
                    )}
                  </div>
                  {n.topic && (
                    <p className="text-white/85 whitespace-pre-wrap">
                      <span className="text-[#7dd87d] font-semibold">Talk about: </span>
                      {n.topic}
                    </p>
                  )}
                  {n.facilitation && (
                    <p className="text-white/85 whitespace-pre-wrap mt-1">
                      <span className="text-[#e3ac4f] font-semibold">Facilitation: </span>
                      {n.facilitation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSeasonSchedule({ season = ACTIVE_SEASON }: { season?: string }) {
  const utils = trpc.useUtils();
  const state = trpc.seasonSchedule.adminState.useQuery({ season });
  const refresh = () => {
    void utils.seasonSchedule.adminState.invalidate();
    void utils.seasonSchedule.state.invalidate();
    void utils.events.adminList.invalidate();
  };
  const pin = trpc.seasonSchedule.adminPin.useMutation({ onSuccess: refresh });
  const sync = trpc.seasonSchedule.adminSync.useMutation({ onSuccess: refresh });
  const setOffered = trpc.seasonSchedule.adminSetOffered.useMutation({ onSuccess: refresh });
  const setStart = trpc.seasonSchedule.adminSetFollowsFrom.useMutation({ onSuccess: refresh });
  const setVideos = trpc.seasonSchedule.adminSetSelectionVideos.useMutation({ onSuccess: refresh });

  const data = state.data;
  const offered = data?.offered ?? [];
  const busy = pin.isPending || sync.isPending || setOffered.isPending || setStart.isPending;
  const lastResult = pin.data?.result ?? sync.data?.result ?? setOffered.data?.result ?? setStart.data?.result;

  const [startInput, setStartInput] = useState("");
  useEffect(() => {
    if (data) setStartInput(toPacificInput(new Date(data.followsFrom)));
  }, [data?.followsFrom]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Toggle a weekday on or off the offer, keeping every other time's hour. */
  function toggleOffered(key: SeasonSlotKey) {
    const has = offered.some((o) => o.key === key);
    const next = has ? offered.filter((o) => o.key !== key) : [...offered, seasonSlot(key, 12)];
    if (!next.length) return; // A vote with no times is a page with nothing to tap.
    setOffered.mutate({ season, slots: next.map((o) => ({ key: o.key, hourPT: o.hourPT })) });
  }

  function setHour(key: SeasonSlotKey, hourPT: number) {
    setOffered.mutate({
      season,
      slots: offered.map((o) => ({ key: o.key, hourPT: o.key === key ? hourPT : o.hourPT })),
    });
  }

  function saveStart() {
    const at = fromPacificInput(startInput);
    if (at) setStart.mutate({ season, followsFrom: at.toISOString() });
  }

  return (
    <Card className="bg-[#0a1f14] border-[#7dd87d]/30 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <CalendarClock className="w-4 h-4 text-[#7dd87d]" />
          Season Schedule: {data?.name ?? season}
        </CardTitle>
        <CardDescription className="text-white/60">
          The land projects vote on /season-schedule, and the Season follows the vote like the Circle does. Until
          the start time below, sessions stay where they are. After it, a time that takes the lead and holds it for
          {` ${SEASON_LEAD_SETTLE_HOURS}h`} moves every session more than {SEASON_FREEZE_HOURS}h out, and everyone the
          sessions remind gets one email with the new time. A tie that includes the current time keeps it, and a pin
          overrides the vote. Reminders already overdue at a moved session's new time are skipped, so nobody gets
          "In 7 days" five days out. Editing a session in the list above locks it in place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {state.isLoading && <Loader2 className="w-4 h-4 animate-spin text-white/60" />}
        {state.isError && <p className="text-red-300">{state.error.message}</p>}
        {data && (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {data.tally.slots.map((t) => {
                const slot = offered.find((o) => o.key === t.key);
                return (
                  <div
                    key={t.key}
                    className={`rounded-lg border p-3 ${data.scheduled.key === t.key ? "border-[#7dd87d] bg-[#7dd87d]/10" : "border-white/10"}`}
                  >
                    <p className="text-white font-semibold">{slot?.label ?? t.key}</p>
                    <p className="text-white/60 tabular-nums">
                      {t.hands} {t.hands === 1 ? "hand" : "hands"} · {t.projects} {t.projects === 1 ? "project" : "projects"}
                      {data.leader === t.key ? " · leading" : ""}
                      {data.scheduled.key === t.key ? " · scheduled" : ""}
                    </p>
                    {t.names.length > 0 && <p className="text-white/45 text-xs mt-1">{t.names.join(", ")}</p>}
                  </div>
                );
              })}
            </div>

            <p className="text-white/80">
              {data.following ? "Following the vote since" : "Starts following the vote"} {when(data.followsFrom)}.{" "}
              {data.tally.voters} {data.tally.voters === 1 ? "person has" : "people have"} voted. Sessions follow{" "}
              <span className="text-white font-semibold">{data.scheduled.label}</span>
              {data.pinned ? " (pinned)" : ""}.
              {data.following && data.leader && data.leader !== data.scheduled.key && !data.pinned && data.leaderSince
                ? ` ${offered.find((o) => o.key === data.leader)?.label ?? data.leader} leads since ${when(new Date(data.leaderSince))} and takes over after a day in front.`
                : ""}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-white/70" htmlFor="season-start-input">The vote steers from (Pacific)</label>
              <input
                id="season-start-input"
                type="datetime-local"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                disabled={busy}
                className="bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-white text-base md:text-sm min-h-11"
              />
              <Button size="sm" variant="outline" className="min-h-11" onClick={saveStart} disabled={busy || !startInput}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={() => setStart.mutate({ season, followsFrom: new Date().toISOString() })}
                disabled={busy || data.following}
              >
                Start following now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11 text-white/70"
                onClick={() => setStart.mutate({ season, followsFrom: null })}
                disabled={busy}
              >
                Reset to {when(data.defaultFollowsFrom)}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white/70">Pin to</span>
              <Select
                value={data.pinned ?? "vote"}
                onValueChange={(v) => pin.mutate({ season, slot: v === "vote" ? null : (v as SeasonSlotKey) })}
                disabled={busy}
              >
                <SelectTrigger className="w-64 bg-white/5 border-white/20 text-white min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vote">Follow the vote</SelectItem>
                  {offered.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="min-h-11" onClick={() => sync.mutate({ season })} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2">Sync now</span>
              </Button>
            </div>

            <label className="flex items-center gap-3 text-white/80 min-h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={data.selectionVideos}
                disabled={setVideos.isPending}
                onChange={(e) => setVideos.mutate({ season, open: e.target.checked })}
                className="w-4 h-4 accent-[#7dd87d]"
              />
              Ask projects who missed Selection Day for their video (a note on the page). Turn off once the session
              is public.
            </label>

            {lastResult && (
              <p className="text-white/60">
                Last sync: {lastResult.moved} {lastResult.moved === 1 ? "session" : "sessions"} moved, {lastResult.notified}{" "}
                move {lastResult.notified === 1 ? "email" : "emails"} sent, {lastResult.claimedReminders} overdue{" "}
                {lastResult.claimedReminders === 1 ? "reminder" : "reminders"} skipped.
              </p>
            )}
            {(setStart.isError || pin.isError || setOffered.isError || sync.isError) && (
              <p className="text-red-300">
                {(setStart.error ?? pin.error ?? setOffered.error ?? sync.error)?.message}
              </p>
            )}

            <div className="border-t border-white/10 pt-4">
              <p className="text-white/70 mb-1">Times on offer</p>
              <p className="text-white/40 text-xs mb-3">
                Which weekdays the projects can raise a hand for, and the Pacific hour each runs at. Votes for a day
                you remove stop counting but are kept, so putting it back restores them. Season opened on{" "}
                {seasonSlot(data.opening.key, data.opening.hourPT).label}.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SEASON_SLOT_KEYS.map((key) => {
                  const on = offered.find((o) => o.key === key);
                  return (
                    <div key={key} className={`flex items-center gap-3 rounded-lg border p-2 ${on ? "border-[#7dd87d]/50 bg-[#7dd87d]/5" : "border-white/10"}`}>
                      <label className="flex items-center gap-2 text-white/80 cursor-pointer min-h-11">
                        <input
                          type="checkbox"
                          checked={!!on}
                          disabled={busy}
                          onChange={() => toggleOffered(key)}
                          className="w-4 h-4 accent-[#7dd87d]"
                        />
                        <span className="w-24">{seasonSlot(key, 12).days}</span>
                      </label>
                      {on && (
                        <select
                          value={on.hourPT}
                          disabled={busy}
                          onChange={(e) => setHour(key, Number(e.target.value))}
                          aria-label={`Pacific hour for ${seasonSlot(key, 12).days}`}
                          className="bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-white text-base md:text-xs min-h-11"
                        >
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h} className="bg-[#0a1f14]">
                              {seasonSlot(key, h).hour} Pacific
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <SeasonNotes season={season} />

            <div>
              <p className="text-white/70 mb-2">Sessions</p>
              <ul className="space-y-1">
                {data.sessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap gap-x-3 text-white/80 tabular-nums">
                    <span className="w-16 text-white/50">Week {s.week}</span>
                    <span>{when(s.startTime)}</span>
                    {s.status !== "upcoming" && <span className="text-white/50">{s.status}</span>}
                    {s.manualOverride && <span className="text-amber-300">edited, stays put</span>}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
