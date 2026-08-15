/**
 * Join the crew list — capture demand on non-open weeks (SHIP_V5_FLYWHEEL §4).
 * Email + interest tags. Double opt-in: a confirmation email follows.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INTERESTS = [
  { key: "any_week" as const, label: "Any week that opens" },
  { key: "this_season" as const, label: "This season" },
  { key: "winter" as const, label: "Winter voyages" },
  { key: "year_2" as const, label: "Year two" },
  { key: "price_change" as const, label: "When prices change" },
];
type Interest = (typeof INTERESTS)[number]["key"];

export function CrewListJoin({ source = "week_card" }: { source?: string }) {
  const join = trpc.ship.crewList.join.useMutation();
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<Interest[]>(["any_week"]);
  const [done, setDone] = useState(false);

  function toggle(k: Interest) {
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email)) return toast.error("Add a real email so we can reach you.");
    try {
      await join.mutateAsync({ email: email.trim(), interests: picked, source });
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not join the crew list.");
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[#4a7c59]/40 bg-[#4a7c59]/8 p-5">
        <p className="font-semibold">Check your email.</p>
        <p className="text-sm text-foreground/80 mt-1">Confirm your spot and we'll send word the moment a matching week opens.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold text-lg mb-1">Weeks filling up? Join the crew list</h3>
      <p className="text-sm text-muted-foreground mb-3">We'll send word when a week opens for you. One short note at a time, in the ship's voice.</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {INTERESTS.map((i) => (
          <button
            key={i.key}
            type="button"
            onClick={() => toggle(i.key)}
            aria-pressed={picked.includes(i.key)}
            className={`rounded-full px-3 py-1 text-sm border transition-colors min-h-9 ${picked.includes(i.key) ? "bg-[#2f5d3a] text-white border-[#2f5d3a]" : "bg-background text-foreground/70 hover:border-[#2f5d3a]"}`}
          >
            {i.label}
          </button>
        ))}
      </div>
      <Label htmlFor="crewlist-email" className="text-xs">Your email</Label>
      <div className="flex flex-col sm:flex-row gap-2 mt-1">
        <Input id="crewlist-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="text-base" inputMode="email" />
        <Button type="submit" disabled={join.isPending} className="min-h-11 bg-[#2f5d3a] hover:bg-[#264a2f] shrink-0">{join.isPending ? "Joining…" : "Join the crew list"}</Button>
      </div>
    </form>
  );
}
