/**
 * Item 13: crew pooling for the Free Passage Quest.
 *
 * A qualified player (150+ points) can pool with others into a crew, raise their
 * shared odds, and voyage together if drawn. Each player marks the voyage weeks
 * that will not work; matching only pools people whose still-open weeks overlap.
 * Open weeks come from the live voyage grid, so a week that books up drops off.
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Anchor, Sparkles } from "lucide-react";
import { ShipEyebrow } from "@/pages/ship/shipShared";
import { useAuth } from "@/_core/hooks/useAuth";

function fmtWeek(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CrewPooling() {
  const { isAuthenticated } = useAuth();
  const status = trpc.ship.pool.status.useQuery(undefined, { enabled: isAuthenticated });
  const openCrews = trpc.ship.pool.openCrews.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const setAvail = trpc.ship.pool.setAvailability.useMutation();
  const createCrew = trpc.ship.pool.create.useMutation();
  const joinCrew = trpc.ship.pool.join.useMutation();
  const leaveCrew = trpc.ship.pool.leave.useMutation();
  const matchMe = trpc.ship.pool.matchMe.useMutation();

  const [blocked, setBlocked] = useState<string[]>([]);
  const [seeking, setSeeking] = useState(false);
  const [crewName, setCrewName] = useState("");
  const [isFamily, setIsFamily] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const s = status.data;
  useEffect(() => {
    if (s && !hydrated) {
      setBlocked(s.blockedWeeks);
      setSeeking(s.seekingCrew);
      setHydrated(true);
    }
  }, [s, hydrated]);

  if (!isAuthenticated || !s) return null;

  function refresh() {
    void utils.ship.pool.status.invalidate();
    void utils.ship.pool.openCrews.invalidate();
  }

  if (!s.eligible) {
    return (
      <div className="rounded-2xl border bg-card p-5 max-w-3xl">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" />
          <h3 className="text-lg font-bold">Pool with a crew</h3>
        </div>
        <p className="text-sm text-foreground/80">
          Reach {s.threshold} points and you can pool with a crew: sail together and raise your shared odds. You have {s.points} so far.
        </p>
      </div>
    );
  }

  function toggleWeek(w: string) {
    setBlocked((b) => (b.includes(w) ? b.filter((x) => x !== w) : [...b, w]));
  }
  async function saveAvailability() {
    try {
      await setAvail.mutateAsync({ blockedWeeks: blocked, seekingCrew: seeking });
      toast.success("Availability saved.");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Could not save."); }
  }
  async function doMatch() {
    try {
      const r = await matchMe.mutateAsync();
      toast.success(r.matched ? "Matched into a crew. Fair winds." : "You are in the matching pool. We will crew you up as mates with overlapping weeks join.");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Could not match you."); }
  }
  async function doCreate() {
    if (crewName.trim().length < 1) return toast.error("Name your crew first.");
    try {
      await createCrew.mutateAsync({ name: crewName.trim(), isFamily });
      setCrewName("");
      toast.success("Crew created. Invite your mates or let others join.");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Could not create the crew."); }
  }
  async function doJoin(crewId: number) {
    try { await joinCrew.mutateAsync({ crewId }); toast.success("Aboard. You are pooled."); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Could not join."); }
  }
  async function doLeave() {
    try { await leaveCrew.mutateAsync(); toast.success("You left the crew."); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Could not leave."); }
  }

  return (
    <div className="max-w-3xl">
      <ShipEyebrow>Pool with a crew</ShipEyebrow>
      <h2 className="text-2xl font-bold mb-2">Sail together, raise your odds</h2>
      <p className="text-foreground/80 mb-5">
        You are qualified. Pool your points with up to three more mates (a family of five may sail together) and if your
        crew is drawn, you all voyage together. Pooled points still count toward the crew's 5,000-point line.
      </p>

      {/* Availability: the weeks that work for you. */}
      <div className="rounded-2xl border bg-card p-5 mb-4">
        <h3 className="font-semibold mb-1">Your open weeks</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Uncheck any week that will not work for you. Matching only pools you with crews whose open weeks overlap yours,
          and weeks that have booked up are already off the list.
        </p>
        {s.openWeeks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open weeks right now. Check back as the season opens.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {s.openWeeks.map((w) => (
              <label key={w} className="flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer">
                <Checkbox checked={!blocked.includes(w)} onCheckedChange={() => toggleWeek(w)} />
                <span>{fmtWeek(w)}</span>
              </label>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
          <Checkbox checked={seeking} onCheckedChange={(v) => setSeeking(Boolean(v))} />
          <span>Match me into a crew automatically</span>
        </label>
        <Button size="sm" onClick={saveAvailability} disabled={setAvail.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">Save availability</Button>
      </div>

      {s.crew ? (
        <div className="rounded-2xl border border-[#4a7c59] bg-[#4a7c59]/8 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Anchor className="w-5 h-5 text-[#2f5d3a] dark:text-[#7dd87d]" aria-hidden="true" />
            <h3 className="font-bold text-lg">{s.crew.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{s.crew.members.length} of {s.crew.cap} aboard · {s.crew.pooledPoints} points pooled</p>
          <ul className="space-y-1 mb-3">
            {s.crew.members.map((m) => (
              <li key={m.userId} className="text-sm flex justify-between gap-3">
                <span>{m.handle ? `@${m.handle}` : m.name}</span>
                <span className="text-[#2f5d3a] dark:text-[#9de89d] font-semibold">{m.points} pts</span>
              </li>
            ))}
          </ul>
          <p className="text-sm mb-3">
            <span className="font-medium">Weeks open to the whole crew:</span>{" "}
            {s.crew.sharedOpenWeeks.length ? s.crew.sharedOpenWeeks.map(fmtWeek).join(", ") : "none in common yet, adjust your availability"}
          </p>
          <Button size="sm" variant="outline" onClick={doLeave} disabled={leaveCrew.isPending}>Leave crew</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-[#b8860b] dark:text-[#ffd700]" aria-hidden="true" />
              <h3 className="font-semibold">Find me a crew</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Solo and want company? We will match you into a crew of four with mates whose open weeks overlap yours.</p>
            <Button size="sm" onClick={doMatch} disabled={matchMe.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">Match me into a crew</Button>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h3 className="font-semibold mb-2">Or start your own crew</h3>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <Input value={crewName} onChange={(e) => setCrewName(e.target.value)} placeholder="Crew name" maxLength={120} className="text-sm" />
              <Button size="sm" onClick={doCreate} disabled={createCrew.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f] shrink-0">Create crew</Button>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={isFamily} onCheckedChange={(v) => setIsFamily(Boolean(v))} />
              <span>We are a family of five (raises the cap to 5)</span>
            </label>
          </div>

          {(openCrews.data?.length ?? 0) > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold mb-2">Crews looking for mates</h3>
              <div className="space-y-2">
                {openCrews.data!.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{c.name} <span className="text-muted-foreground">({c.size}/{c.cap})</span></p>
                      {c.sharedOpenWeeks.length > 0 && <p className="text-xs text-muted-foreground">Open: {c.sharedOpenWeeks.slice(0, 6).map(fmtWeek).join(", ")}</p>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => doJoin(c.id)} disabled={joinCrew.isPending}>Join</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
