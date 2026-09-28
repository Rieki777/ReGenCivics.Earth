/**
 * WhoHoldsVoteChart
 *
 * Shows how the cooperative in design is meant to vote: one member, one vote.
 *
 * Until 2026-09-27 this chart showed the earlier fund design's weighted voice
 * split (a council at 40%, investors, land projects and alliance partners at
 * 20% each), read from governanceSlices and drawn over an image with those
 * labels baked in. The fund is now the ReGen Network Cooperative, in design,
 * and its design principle is one member, one vote (COOP.designPrinciples), so
 * there are no slices to draw and no investor seat. Every seat is the same size.
 *
 * It describes a design, never a live vote. COOP.hasLegalEntity is false, so
 * the words come from COOP and the note that introduces the principles comes
 * first.
 */
import { Sprout, User } from "lucide-react";
import { COOP } from "@shared/fund";

type Seat = "land" | "person";

// Twelve equal seats, land projects and people alternating.
const SEATS: Seat[] = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? "land" : "person"));

const SEAT_STYLE: Record<Seat, { color: string; label: string }> = {
  land: { color: "#7dd87d", label: "Land projects" },
  person: { color: "#d4a574", label: "People" },
};

export function WhoHoldsVoteChart() {
  const owned = COOP.designPrinciples[0];
  return (
    <figure className="bg-[#1a472a]/40 border border-[#7dd87d]/20 rounded-2xl p-4 md:p-6">
      <div
        role="img"
        aria-label="Twelve seats of the same size, land projects and people alternating. In the cooperative's design each member holds one vote."
        className="grid grid-cols-6 gap-2 sm:gap-3 max-w-md mx-auto"
      >
        {SEATS.map((seat, i) => {
          const { color } = SEAT_STYLE[seat];
          const Icon = seat === "land" ? Sprout : User;
          return (
            <span
              key={i}
              aria-hidden="true"
              className="aspect-square rounded-full flex items-center justify-center border-2"
              style={{ background: `${color}22`, borderColor: `${color}99` }}
            >
              <Icon className="w-1/2 h-1/2" style={{ color }} />
            </span>
          );
        })}
      </div>
      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-white/80">
        {(Object.keys(SEAT_STYLE) as Seat[]).map((seat) => (
          <li key={seat} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ background: SEAT_STYLE[seat].color }}
              aria-hidden="true"
            />
            <span className="flex-1">{SEAT_STYLE[seat].label}</span>
            <span className="font-mono text-[#7dd87d]">1 vote each</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-4 space-y-2 text-xs text-white/70">
        <p>{COOP.designPrinciplesNote}</p>
        <p>
          <strong className="text-white/85">{owned.title}.</strong> {owned.body}
        </p>
        <p>
          Game governance (RGVoice) follows its own structure on the Game side of the bridge.
        </p>
      </figcaption>
    </figure>
  );
}
