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
  INTEROP_SLOTS,
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

  const data = state.data;
  const busy = pin.isPending || sync.isPending;
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
              {INTEROP_SLOTS.map((s) => (
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
                  {INTEROP_SLOTS.map((s) => (
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
              <p className="text-amber-300">Pinned to {interopSlot(data.pinned).label}. The vote keeps counting but does not move sessions.</p>
            )}
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
