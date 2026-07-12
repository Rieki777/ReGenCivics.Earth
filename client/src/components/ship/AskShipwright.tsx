/**
 * Ask the Shipwright — the ship maintainer AI surface (SHIP_MAINTAINER_INVENTORY
 * Section 1.4). A calm question box for maintenance and operation questions.
 * Dangerous systems (propane, brakes, steering, air, burning, fire, CO) are
 * detected server-side and answered with make-safe steps only; the reply banner
 * turns to a warning and points to the Keeper.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Wrench, AlertTriangle } from "lucide-react";

const SYSTEMS = [
  { value: "general", label: "Not sure / general" },
  { value: "slides", label: "Slide-outs" },
  { value: "generator", label: "Generator" },
  { value: "plumbing", label: "Water + tanks" },
  { value: "water_filtration", label: "Water filtration" },
  { value: "electrical", label: "Electrical" },
  { value: "appliances", label: "Appliances" },
  { value: "starlink", label: "Starlink" },
  { value: "hvac", label: "Heat + air" },
  { value: "tires_brakes", label: "Tires" },
  { value: "engine", label: "Engine" },
  { value: "chassis", label: "Chassis + leveling" },
  { value: "propane", label: "Propane" },
] as const;

type Turn = { role: "user" | "assistant"; content: string; escalated?: boolean };

export function AskShipwright() {
  const ask = trpc.ship.shipwright.ask.useMutation();
  const [question, setQuestion] = useState("");
  const [system, setSystem] = useState<string>("general");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [caseId, setCaseId] = useState<number | undefined>(undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 2) return;
    setTurns((t) => [...t, { role: "user", content: q }]);
    setQuestion("");
    try {
      const res = await ask.mutateAsync({ question: q, system: system as (typeof SYSTEMS)[number]["value"], caseId });
      setCaseId(res.caseId ?? undefined);
      setTurns((t) => [...t, { role: "assistant", content: res.reply, escalated: res.escalated }]);
    } catch (err: any) {
      setTurns((t) => [...t, { role: "assistant", content: err?.message ?? "The Shipwright could not answer just now. Log it and your Keeper will look." }]);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="w-5 h-5 text-[#9c8a7c]" aria-hidden="true" />
        <h3 className="text-lg font-semibold">Ask the Shipwright</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Something acting up? Tell the Shipwright what she's doing and she'll help you sort it. For anything that feels
        unsafe, stop and call your Keeper.
      </p>

      {turns.length > 0 && (
        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "text-right" : ""}>
              <div
                className={[
                  "inline-block rounded-2xl px-3 py-2 text-sm text-left max-w-[90%]",
                  t.role === "user"
                    ? "bg-[#2f5d3a] text-white"
                    : t.escalated
                      ? "bg-red-500/10 border border-red-500/40 text-foreground"
                      : "bg-muted text-foreground",
                ].join(" ")}
              >
                {t.escalated && (
                  <span className="flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400 mb-1">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Make her safe first
                  </span>
                )}
                <span className="whitespace-pre-line">{t.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="sw-system" className="text-xs">Which system?</Label>
          <select id="sw-system" value={system} onChange={(e) => setSystem(e.target.value)} className="w-full h-11 rounded-md border bg-background px-3 text-base">
            {SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="sw-q" className="text-xs">What's she doing?</Label>
          <Textarea id="sw-q" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} maxLength={2000} placeholder="Describe what you're seeing or hearing." className="text-base" />
        </div>
        <Button type="submit" disabled={ask.isPending || question.trim().length < 2} className="min-h-11 bg-[#2f5d3a] hover:bg-[#264a2f]">
          {ask.isPending ? "Asking…" : "Ask the Shipwright"}
        </Button>
      </form>
    </div>
  );
}
