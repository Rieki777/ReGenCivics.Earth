/**
 * The gear manifest (SHIP_V5_FLYWHEEL §1). She counts her treasures before and
 * after every sail. A photo-light boarding/return check over the high-value gear
 * (e-bike, SUP, Starlink, staff, chest, tools). Ten minutes per voyage.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PackageCheck } from "lucide-react";

type Condition = "good" | "worn" | "damaged" | "missing";
const CONDITIONS: Condition[] = ["good", "worn", "damaged", "missing"];

export function GearManifest() {
  const manifest = trpc.ship.voyage.gearManifest.useQuery();
  const submit = trpc.ship.voyage.submitGearCheck.useMutation();
  const [phase, setPhase] = useState<"boarding" | "return">("boarding");
  const [rows, setRows] = useState<Record<number, { present: boolean; condition: Condition }>>({});

  const gear = manifest.data?.gear ?? [];
  const checks = manifest.data?.checks ?? [];
  const row = (id: number) => rows[id] ?? { present: true, condition: "good" as Condition };
  const allAnswered = gear.every((g) => rows[g.id] !== undefined);

  async function send() {
    if (!allAnswered) return toast.error("Answer every item before you finish the check.");
    try {
      const items = gear.map((g) => ({ itemId: g.id, present: row(g.id).present, condition: row(g.id).condition }));
      const res = await submit.mutateAsync({ phase, items });
      toast.success(phase === "return" && res.discrepancies ? `Logged. ${res.discrepancies} thing(s) flagged for the Keeper.` : "Gear check logged. She counts her treasures.");
      setRows({});
      manifest.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not log the gear check.");
    }
  }

  if (manifest.isLoading) return <p className="text-sm text-muted-foreground">Counting her treasures…</p>;
  if (gear.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <PackageCheck className="w-5 h-5 text-[#9c8a7c]" aria-hidden="true" />
        <h3 className="text-lg font-semibold">The gear manifest</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">She counts her treasures before and after every sail. Walk it with your Keeper at boarding, and run it again at return.</p>

      <div className="inline-flex rounded-lg border overflow-hidden mb-4" role="group" aria-label="Check phase">
        {(["boarding", "return"] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPhase(p)} aria-pressed={phase === p} className={`px-4 py-1.5 text-sm capitalize min-h-9 ${phase === p ? "bg-[#2f5d3a] text-white" : "bg-background text-foreground/70"}`}>{p}</button>
        ))}
      </div>

      <div className="space-y-2">
        {gear.map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-3 rounded-xl border p-2.5">
            <label className="flex items-center gap-2 min-w-0">
              <Checkbox checked={row(g.id).present} onCheckedChange={(v) => setRows((s) => ({ ...s, [g.id]: { ...row(g.id), present: Boolean(v) } }))} />
              <span className="text-sm truncate">{g.name}</span>
            </label>
            <select
              value={row(g.id).condition}
              onChange={(e) => setRows((s) => ({ ...s, [g.id]: { present: row(g.id).present, condition: e.target.value as Condition } }))}
              className="h-9 rounded-md border bg-background px-2 text-sm shrink-0"
              aria-label={`Condition of ${g.name}`}
            >
              {CONDITIONS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      <Button onClick={send} disabled={submit.isPending || !allAnswered} className="mt-4 min-h-11 bg-[#2f5d3a] hover:bg-[#264a2f]">
        {submit.isPending ? "Logging…" : `Log the ${phase} check`}
      </Button>

      {checks.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">{checks.length} gear {checks.length === 1 ? "check" : "checks"} logged this voyage.</p>
      )}
    </div>
  );
}
