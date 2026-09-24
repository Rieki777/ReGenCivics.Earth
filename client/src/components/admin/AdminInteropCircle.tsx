/**
 * Interoperability Circle controls on the Admin Events tab.
 *
 * The Circle's weekly sessions are ordinary events rows (they also appear in
 * the list above, with the same reminder, roster and edit tools). This panel
 * covers the part that is Circle-only: the live vote, which slot the sessions
 * actually follow, and a pin that overrides the vote.
 */
import { Loader2, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  INTEROP_FREEZE_HOURS,
  INTEROP_LEAD_SETTLE_HOURS,
  INTEROP_SLOT_KEYS,
  INTEROP_SLOTS,
  buildSlot,
  interopSlot,
  type InteropSlotKey,
} from "@shared/interopCircle";

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

export function AdminInteropCircle() {
  const utils = trpc.useUtils();
  const state = trpc.interopSessions.adminState.useQuery();
  const refresh = () => {
    void utils.interopSessions.adminState.invalidate();
    void utils.events.adminList.invalidate();
  };
  const pin = trpc.interopSessions.adminPin.useMutation({ onSuccess: refresh });
  const sync = trpc.interopSessions.adminSync.useMutation({ onSuccess: refresh });
  const setOffered = trpc.interopSessions.adminSetOfferedSlots.useMutation({ onSuccess: refresh });

  const data = state.data;
  const offered = data?.offered ?? INTEROP_SLOTS;
  const busy = pin.isPending || sync.isPending || setOffered.isPending;

  /** Toggle a weekday on or off the offer, keeping every other slot's hour. */
  function toggleOffered(key: InteropSlotKey) {
    const has = offered.some((o) => o.key === key);
    const next = has
      ? offered.filter((o) => o.key !== key)
      : [...offered, buildSlot(key, 12)];
    if (!next.length) return; // A vote with no slots is a page with nothing to click.
    setOffered.mutate({ slots: next.map((o) => ({ key: o.key, hourPT: o.hourPT })) });
  }

  /** Move one offered slot to another Pacific hour. */
  function setHour(key: InteropSlotKey, hourPT: number) {
    setOffered.mutate({
      slots: offered.map((o) => ({ key: o.key, hourPT: o.key === key ? hourPT : o.hourPT })),
    });
  }
  const lastResult = pin.data?.result ?? sync.data?.result;

  return (
    <Card className="bg-[#0a1f14] border-[#e3ac4f]/30 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Wrench className="w-4 h-4 text-[#e3ac4f]" />
          Interoperability Circle
        </CardTitle>
        <CardDescription className="text-white/60">
          Weekly sessions follow the time vote on /interop-sessions. A new leader applies after holding the lead
          {` ${INTEROP_LEAD_SETTLE_HOURS}h`}, and sessions inside {INTEROP_FREEZE_HOURS}h never move. When sessions move,
          everyone signed up gets an email and calendar subscribers update on their own. Editing a Circle session
          in the list above locks it in place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {state.isLoading && <Loader2 className="w-4 h-4 animate-spin text-white/60" />}
        {data && (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              {offered.map((s) => (
                <div
                  key={s.key}
                  className={`rounded-lg border p-3 ${data.slot === s.key ? "border-[#7dd87d] bg-[#7dd87d]/10" : "border-white/10"}`}
                >
                  <p className="text-white font-semibold">{s.label}</p>
                  <p className="text-white/60 tabular-nums">
                    {data.counts[s.key]} {data.counts[s.key] === 1 ? "hand" : "hands"}
                    {data.leader === s.key ? " · leading" : ""}
                    {data.slot === s.key ? " · scheduled" : ""}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white/70">Pin to</span>
              <Select
                value={data.pinned ?? "vote"}
                onValueChange={(v) => pin.mutate({ slot: v === "vote" ? null : (v as InteropSlotKey) })}
                disabled={busy}
              >
                <SelectTrigger className="w-60 bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vote">Follow the vote</SelectItem>
                  {offered.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2">Sync now</span>
              </Button>
            </div>
            {data.pinned && (
              <p className="text-amber-300">Pinned to {interopSlot(data.pinned, offered).label}. The vote keeps counting but does not move sessions.</p>
            )}
            <div className="border-t border-white/10 pt-4">
              <p className="text-white/70 mb-1">Slots on offer</p>
              <p className="text-white/40 text-xs mb-3">
                Which weekdays people can raise a hand for, and the Pacific hour each one runs at. Changing this
                rebuilds the upcoming weeks. Votes for a day you remove stop counting but are not deleted, so
                putting it back restores them.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {INTEROP_SLOT_KEYS.map((key) => {
                  const on = offered.find((o) => o.key === key);
                  return (
                    <div key={key} className={`flex items-center gap-3 rounded-lg border p-2 ${on ? "border-[#7dd87d]/50 bg-[#7dd87d]/5" : "border-white/10"}`}>
                      <label className="flex items-center gap-2 text-white/80 cursor-pointer min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={!!on}
                          disabled={busy}
                          onChange={() => toggleOffered(key)}
                          className="w-4 h-4 accent-[#7dd87d]"
                        />
                        <span className="w-24">{buildSlot(key, on?.hourPT ?? 12).label.split(",")[0]}</span>
                      </label>
                      {on && (
                        <select
                          value={on.hourPT}
                          disabled={busy}
                          onChange={(e) => setHour(key, Number(e.target.value))}
                          aria-label={`Pacific hour for ${key}`}
                          className="bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-white text-xs min-h-[44px]"
                        >
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h} className="bg-[#0a1f14]">
                              {buildSlot(key, h).label.split(", ")[1]}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
              {setOffered.isError && (
                <p className="text-red-300 mt-2">{setOffered.error.message}</p>
              )}
            </div>

            {lastResult && (
              <p className="text-white/60">
                Last sync: {lastResult.inserted} added, {lastResult.moved} moved, {lastResult.notified} move emails sent.
              </p>
            )}

            <div>
              <p className="text-white/70 mb-2">Upcoming sessions</p>
              {data.sessions.length === 0 ? (
                <p className="text-white/50">None yet. Sync now to create them.</p>
              ) : (
                <ul className="space-y-1">
                  {data.sessions.map((s) => (
                    <li key={s.id} className="flex flex-wrap gap-x-3 text-white/80 tabular-nums">
                      <span>{when(s.startTime)}</span>
                      <span className="text-white/50">{s.signups} signed up</span>
                      {s.status === "cancelled" && <span className="text-red-300">cancelled</span>}
                      {s.manualOverride && <span className="text-amber-300">edited, stays put</span>}
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
