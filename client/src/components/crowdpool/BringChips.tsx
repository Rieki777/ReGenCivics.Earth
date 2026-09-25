/**
 * "What can you bring?" (build spec 2026-09-25, section 8.3). A chip shows
 * only when at least one open need falls under it. Chips toggle (aria-pressed)
 * and combine with OR; the needs list below filters to them. Money is never a
 * need: its chip only moves to the money block, and filters nothing.
 */
import type { NeedProgress } from "@shared/campaignProgress";
import { BRING } from "@shared/crowdpoolCopy";
import { NEED_CHIP_LABELS, isMoneyKind, kindForItem, needChip, type NeedChip, type NeedLike } from "@shared/crowdpoolNeedAction";

const CHIP_ORDER: NeedChip[] = ["things", "time", "role", "knowhow"];

/** The chips with at least one open need under them, in the order they show. */
export function availableChips(items: Array<NeedLike & { id: number }>, byNeed?: Record<number, NeedProgress>): NeedChip[] {
  const found = new Set<NeedChip>();
  for (const item of items) {
    const kind = kindForItem(item);
    if (isMoneyKind(kind)) continue;
    if (byNeed?.[item.id]?.filled) continue;
    const chip = needChip(kind);
    if (chip) found.add(chip);
  }
  return CHIP_ORDER.filter((c) => found.has(c));
}

/** Does this need show under the selected chips? No chip selected shows every need. */
export function needMatchesChips(item: NeedLike, selected: readonly NeedChip[]): boolean {
  if (selected.length === 0) return true;
  const chip = needChip(kindForItem(item));
  return !!chip && selected.includes(chip);
}

const chipClass = (pressed: boolean) =>
  `inline-flex items-center min-h-11 pointer-coarse:min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
    pressed
      ? "bg-[#1a472a] border-[#1a472a] text-white"
      : "bg-white border-[#4a7c59]/50 text-[#1a472a] hover:border-[#4a7c59]"
  }`;

export function BringChips({
  items,
  byNeed,
  selected,
  onChange,
  showMoney,
  onMoney,
  shownCount,
  totalCount,
}: {
  items: Array<NeedLike & { id: number }>;
  byNeed?: Record<number, NeedProgress>;
  selected: NeedChip[];
  onChange: (next: NeedChip[]) => void;
  /** The money chip shows when the project asks for money or holds a route. */
  showMoney: boolean;
  /** Move to the money block. */
  onMoney: () => void;
  /** How many needs the list shows, and how many there are, for the filter line. */
  shownCount: number;
  totalCount: number;
}) {
  const chips = availableChips(items, byNeed);
  if (chips.length === 0 && !showMoney) return null;

  const toggle = (chip: NeedChip) => {
    onChange(selected.includes(chip) ? selected.filter((c) => c !== chip) : [...selected, chip]);
  };

  return (
    <section id="bring" aria-labelledby="bring-heading" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 mb-6 shadow-xl scroll-mt-24">
      <h2 id="bring-heading" className="text-lg font-bold text-[#1a472a] mb-3" style={{ fontFamily: "var(--font-display)" }}>
        {BRING.heading}
      </h2>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const pressed = selected.includes(chip);
          return (
            <button key={chip} type="button" aria-pressed={pressed} onClick={() => toggle(chip)} className={chipClass(pressed)}>
              {NEED_CHIP_LABELS[chip]}
            </button>
          );
        })}
        {showMoney && (
          // Not a filter, so no aria-pressed: it moves to the money block.
          <button type="button" onClick={onMoney} className={chipClass(false)}>
            {BRING.money}
          </button>
        )}
      </div>
      {selected.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-[#1a472a]/85">
          <span role="status">{BRING.showing(shownCount, totalCount)}</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="inline-flex items-center min-h-11 pointer-coarse:min-h-11 font-semibold text-[#4a7c59] underline underline-offset-2 hover:text-[#1a472a]"
          >
            {BRING.showAll}
          </button>
        </p>
      )}
    </section>
  );
}
