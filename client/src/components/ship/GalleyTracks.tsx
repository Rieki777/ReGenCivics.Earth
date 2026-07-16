/**
 * The two dietary tracks for the Galley (spec section 2), as two warm cards.
 * Shared by the /ship/galley page (informational) and the remixer (selectable).
 *
 * Health-adjacent copy stays careful and invitational, abundance not restriction
 * (spec section 0). No cure claims, no medical claims. The Deeper Reset carries
 * the health note.
 */
import { cn } from "@/lib/utils";
import { Leaf, Sun } from "lucide-react";

export type TrackId = "table" | "reset";

export const HEALTH_NOTE =
  "This is food, not medical advice. If you are pregnant, nursing, on medication, or managing a health condition, check with a professional before you change how you eat.";

const TRACKS: Array<{
  id: TrackId;
  name: string;
  tagline: string;
  points: string[];
  icon: typeof Leaf;
  note?: string;
}> = [
  {
    id: "table",
    name: "The Ship's Table",
    tagline: "The aboard standard, what every crew is invited to try.",
    icon: Sun,
    points: [
      "Organic, plant-based, as local as the road allows.",
      "About 80% raw, so living enzymes and microbes stay in the food, feed a diverse compost, and keep the water clean for the healing hole.",
      "Up to about 20% cooked is welcome. A warm tortilla, a pot of something at night.",
      "The ship's cultural diet, not a rulebook. Eat to fullness. The table is abundant.",
    ],
  },
  {
    id: "reset",
    name: "The Deeper Reset",
    tagline: "Optional, for crew who want to go further this week.",
    icon: Leaf,
    points: [
      "Closer to 100% raw for the week.",
      "Roughly 80/10/10: about 80% of calories from fruit and tender vegetables, about 10% protein, about 10% fat.",
      "A one-week experiment. Try it and notice your energy, your sleep, your digestion, how you feel.",
      "What people commonly report: lighter digestion, steadier energy, clearer mornings. Reported, not promised.",
    ],
    note: HEALTH_NOTE,
  },
];

export function GalleyTrackCards({
  value,
  onChange,
  compact = false,
}: {
  value?: TrackId;
  onChange?: (t: TrackId) => void;
  compact?: boolean;
}) {
  const selectable = Boolean(onChange);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {TRACKS.map((t) => {
        const active = value === t.id;
        const Comp = selectable ? "button" : "div";
        return (
          <Comp
            key={t.id}
            {...(selectable ? { type: "button" as const, onClick: () => onChange!(t.id), "aria-pressed": active } : {})}
            className={cn(
              "text-left rounded-2xl border p-5 transition-colors",
              selectable && "min-h-11 hover:border-[#4a7c59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]",
              active ? "border-[#4a7c59] ring-2 ring-[#4a7c59]/40 bg-[#4a7c59]/5" : "bg-card",
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <t.icon className="w-5 h-5 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" />
              <h3 className="font-semibold text-lg">{t.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{t.tagline}</p>
            {!compact && (
              <ul className="space-y-1.5 text-sm text-foreground/85 list-disc pl-5">
                {t.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
            {!compact && t.note && (
              <p className="text-xs text-muted-foreground mt-3 border-t pt-3">{t.note}</p>
            )}
          </Comp>
        );
      })}
    </div>
  );
}
