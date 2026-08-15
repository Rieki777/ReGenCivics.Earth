/**
 * A composed Galley dish card, shown the same whether it came from the
 * deterministic Remix, the Ship's Cook, or the logged-out "try it" remixer.
 * Optional actions: publish to the shared cookbook, and add to the voyage log.
 */
import { Button } from "@/components/ui/button";
import { BookOpen, ScrollText } from "lucide-react";

export type Dish = {
  cardSlug?: string;
  name?: string;
  dishName?: string;
  base?: string[];
  fillings?: string[];
  toppings?: string[];
  sauce?: string[];
  method?: string;
  why?: string;
  matchedTokens?: string[];
};

export function GalleyDishCard({
  dish,
  onPublish,
  publishing,
  published,
  onAddToLog,
  addingToLog,
  addedToLog,
}: {
  dish: Dish;
  onPublish?: () => void;
  publishing?: boolean;
  published?: boolean;
  onAddToLog?: () => void;
  addingToLog?: boolean;
  addedToLog?: boolean;
}) {
  const name = dish.name ?? dish.dishName ?? "A galley dish";
  const rows: Array<[string, string[] | undefined]> = [
    ["Base", dish.base],
    ["Fill", dish.fillings],
    ["Top", dish.toppings],
    ["Sauce", dish.sauce],
  ];
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h4 className="font-semibold text-lg mb-2 text-[#2f5d3a] dark:text-[#9de89d]">{name}</h4>
      <div className="space-y-1 mb-3">
        {rows.map(([label, vals]) =>
          vals && vals.length ? (
            <p key={label} className="text-sm">
              <span className="uppercase tracking-wide text-[11px] font-semibold text-muted-foreground mr-2">{label}</span>
              {vals.join(", ")}
            </p>
          ) : null,
        )}
      </div>
      {dish.method && <p className="text-sm text-foreground/90 mb-2">{dish.method}</p>}
      {dish.why && <p className="text-sm italic text-[#8a5a2b] dark:text-[#e0b483]">{dish.why}</p>}
      {(onPublish || onAddToLog) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {onAddToLog && (
            <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={addingToLog || addedToLog} onClick={onAddToLog}>
              <ScrollText className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {addedToLog ? "In your log" : addingToLog ? "Adding…" : "Add to voyage log"}
            </Button>
          )}
          {onPublish && (
            <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={publishing || published} onClick={onPublish}>
              <BookOpen className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {published ? "Sent for review" : publishing ? "Sending…" : "Add to the cookbook"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
