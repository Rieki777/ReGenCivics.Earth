/**
 * State of the Ship — the public trust dashboard (SHIP_V5_FLYWHEEL Section 3).
 * The collective-ownership story, live and provable. Public, cached 5 minutes.
 * "She belongs to the movement, and here is the proof, live."
 */
import { trpc } from "@/lib/trpc";
import { Sprout, Anchor, Users, Ticket } from "lucide-react";

function Tile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 text-center">
      <div className="flex justify-center mb-2 text-[#2f5d3a] dark:text-[#7dd87d]" aria-hidden="true">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export function StateOfShip() {
  const { data, isLoading } = trpc.ship.stateOfShip.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Reading her charts…</p>;
  }
  return (
    <div>
      {/* Percent booked as a rising tide */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-1 text-sm">
          <span className="font-semibold">Year-one voyage weeks booked</span>
          <span className="text-muted-foreground">{data.percentBooked}% of {data.target}</span>
        </div>
        <div className="h-4 rounded-full bg-[#0d1f16]/10 dark:bg-[#0d1f16]/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2b7fb8] to-[#4a9c7c] transition-[width] duration-700"
            style={{ width: `${Math.max(2, data.percentBooked)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Every booked week rises the tide and unlocks the next free voyage. {data.freeVoyagesUnlocked} of {data.freeVoyagesTotal} unlocked.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile icon={<Sprout className="w-6 h-6" />} value={data.seedsPlanted.toLocaleString()} label="Seeds planted, verified" />
        <Tile icon={<Anchor className="w-6 h-6" />} value={data.voyagesSailed.toLocaleString()} label="Voyages sailed" />
        <Tile icon={<Ticket className="w-6 h-6" />} value={data.freeVoyagesUnlocked.toLocaleString()} label="Free voyages unlocked" />
        <Tile icon={<Users className="w-6 h-6" />} value={data.poolSize.toLocaleString()} label="Crews in the draw" />
      </div>
    </div>
  );
}
