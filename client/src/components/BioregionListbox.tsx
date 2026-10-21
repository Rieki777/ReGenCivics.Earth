/**
 * BioregionListbox: the searchable list inside the bioregion pickers
 * (BioregionSelect, BioregionMultiSelect).
 *
 * It replaces a cmdk Command list. cmdk made every one of the 87 bioregions a
 * component with its own store subscription plus a Check icon, so opening a
 * picker rendered about 730 components and the tap that opened it lagged on
 * phones (STEERING.md section 13). Here each row is plain markup and only the
 * chosen rows draw a Check: opening a picker renders about 100 components,
 * nearly all of them the popover itself.
 *
 * It keeps cmdk's behaviour and look: the same match and ranking
 * (cmdk's own defaultFilter, with tied rows in the order the last keystroke
 * left them), the first match highlighted and scrolled into view after each
 * search, arrows, Home and End, Meta+arrows, Ctrl+N/J/P/K, Enter to pick,
 * hover or tap to highlight, focus sent back to the search box, aria on the
 * box and the list, and the shadcn Command classes.
 *
 * Where it differs on purpose: after a backspace or a cleared search the rows
 * are always best match first (cmdk left rows that came back wherever React
 * put them, so the highlight could land on a poor match, and a cleared search
 * kept the old order); the search box has a name and the list is called
 * "Bioregions" (cmdk: no name, "Suggestions"); and Enter in an empty list is
 * left for the multi picker's Suggest button, which cmdk swallowed.
 */
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { defaultFilter } from "cmdk";
import { Check, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BioregionOption = {
  id: number;
  name: string;
  realm?: string | null;
  subrealm?: string | null;
};

/**
 * cmdk's match and order: scored with its defaultFilter, best first. cmdk
 * re-sorted the rows already on screen at every keystroke, so rows that tie
 * keep the order the previous search gave them ("z" puts Zagros above Amazon,
 * and "zz", where the two tie, keeps it). `before` is that previous list;
 * rows it did not show come after, in list order.
 */
export function rankBioregions<T extends { id: number; name: string }>(
  items: readonly T[],
  search: string,
  before: readonly T[] = items,
): T[] {
  if (!search) return items as T[];
  const place = new Map(before.map((b, i) => [b.id, i]));
  const scored: { item: T; place: number; score: number }[] = [];
  items.forEach((item, index) => {
    const score = defaultFilter(item.name.trim(), search);
    if (score > 0) scored.push({ item, place: place.get(item.id) ?? before.length + index, score });
  });
  scored.sort((a, b) => b.score - a.score || a.place - b.place);
  return scored.map((s) => s.item);
}

// The shadcn CommandItem classes as the pickers merged them (cursor-pointer
// in place of cursor-default), so a row looks as it did, and rows are 44px
// tall on phones, as the site's Button is (pnpm ui:audit). Not tap-44: on
// phones it also makes an element inline-flex and centred, so a row stops
// fitting its popover and the name stops truncating.
const ITEM_CLASS =
  "group pointer-coarse:min-h-11 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer";

type Props<T extends BioregionOption> = {
  bioregions: readonly T[];
  isChosen: (id: number) => boolean;
  onPick: (id: number) => void;
  /** Classes for the Check on a chosen row (after "mr-2 h-4 w-4 shrink-0"). */
  chosenCheckClassName?: string;
  /** Controlled search, for a picker that keeps the text between openings. */
  search?: string;
  onSearchChange?: (search: string) => void;
  /** What shows inside the empty state; "No bioregion found." by default. */
  renderEmpty?: (search: string) => ReactNode;
};

export function BioregionListbox<T extends BioregionOption>({
  bioregions,
  isChosen,
  onPick,
  chosenCheckClassName = "opacity-100",
  search: searchProp,
  onSearchChange,
  renderEmpty,
}: Props<T>) {
  const [ownSearch, setOwnSearch] = useState("");
  const search = searchProp ?? ownSearch;
  const [active, setActive] = useState(0);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (id: number) => `${baseId}-option-${id}`;

  // Each new search ranks against the list on screen, so ties keep their order.
  const [ranked, setRanked] = useState(() => ({ bioregions, search, shown: rankBioregions(bioregions, search) }));
  let shown = ranked.shown;
  if (ranked.bioregions !== bioregions || ranked.search !== search) {
    shown = rankBioregions(bioregions, search, ranked.shown);
    setRanked({ bioregions, search, shown });
  }
  const activeIndex = shown.length ? Math.min(active, shown.length - 1) : -1;
  const activeRow = activeIndex >= 0 ? shown[activeIndex] : null;

  // Keyboard moves and new searches scroll the highlighted row into view, as
  // cmdk did; a pointer hover does not.
  const scrollPending = useRef(false);
  useLayoutEffect(() => {
    if (!scrollPending.current || !activeRow) return;
    scrollPending.current = false;
    document.getElementById(optionId(activeRow.id))?.scrollIntoView?.({ block: "nearest" });
  });

  const setSearch = (next: string) => {
    if (searchProp === undefined) setOwnSearch(next);
    onSearchChange?.(next);
    scrollPending.current = true;
    setActive(0);
  };

  // Moving the highlight while the list's frame holds focus (after a click on
  // the search icon or the padding) sends focus back to the search box, as
  // cmdk did, so the next letters land there.
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlight = (index: number) => {
    if (document.activeElement === rootRef.current) inputRef.current?.focus();
    setActive(index);
  };

  const move = (to: number) => {
    if (!shown.length) return;
    const target = Math.max(0, Math.min(shown.length - 1, to));
    // Already there (ArrowUp on the first row): nothing renders, so a scroll
    // flag set now would fire on the next hover instead.
    if (target === activeIndex) return;
    scrollPending.current = true;
    highlight(target);
  };
  const next = (e: KeyboardEvent) => {
    e.preventDefault();
    move(e.metaKey ? shown.length - 1 : activeIndex + 1);
  };
  const prev = (e: KeyboardEvent) => {
    e.preventDefault();
    move(e.metaKey ? 0 : activeIndex - 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.nativeEvent.isComposing || e.keyCode === 229) return;
    switch (e.key) {
      case "n":
      case "j":
        if (e.ctrlKey) next(e);
        break;
      case "ArrowDown":
        next(e);
        break;
      case "p":
      case "k":
        if (e.ctrlKey) prev(e);
        break;
      case "ArrowUp":
        prev(e);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(shown.length - 1);
        break;
      case "Enter":
        // Only with a row to pick: an empty list leaves Enter to whatever
        // has focus, such as the multi picker's Suggest button (cmdk
        // swallowed it there).
        if (activeRow) {
          e.preventDefault();
          onPick(activeRow.id);
        }
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      data-slot="command"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md"
    >
      {/* The line under the search box is its edge, so it takes the field-edge
          colour (3:1 on the popover); the box is 44px tall on phones. */}
      <div data-slot="command-input-wrapper" className="flex h-9 items-center gap-2 border-b border-input px-3 pointer-coarse:min-h-11">
        <SearchIcon className="size-4 shrink-0 opacity-50" />
        <input
          ref={inputRef}
          data-slot="command-input"
          type="text"
          role="combobox"
          aria-label="Search bioregions"
          aria-autocomplete="list"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={activeRow ? optionId(activeRow.id) : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Search bioregions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pointer-coarse:min-h-11 placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div
        data-slot="command-list"
        id={listId}
        role="listbox"
        aria-label="Bioregions"
        // After a click on a row the list holds focus, so it names the
        // highlighted row too, as cmdk did.
        aria-activedescendant={activeRow ? optionId(activeRow.id) : undefined}
        tabIndex={-1}
        className="max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"
      >
        {shown.length === 0 ? (
          <div data-slot="command-empty" role="presentation" className="py-6 text-center text-sm">
            {renderEmpty ? renderEmpty(search) : "No bioregion found."}
          </div>
        ) : (
          <div data-slot="command-group" role="presentation" className="text-foreground overflow-hidden p-1">
            <div role="group">
              {shown.map((b, i) => {
                const highlighted = i === activeIndex;
                return (
                  <div
                    key={b.id}
                    id={optionId(b.id)}
                    role="option"
                    aria-selected={highlighted}
                    aria-disabled={false}
                    data-selected={highlighted}
                    data-disabled={false}
                    onPointerMove={highlighted ? undefined : () => highlight(i)}
                    // A tap fires no pointermove, so the click highlights too.
                    onClick={() => {
                      highlight(i);
                      onPick(b.id);
                    }}
                    className={ITEM_CLASS}
                  >
                    {/* Only chosen rows draw the icon; the others keep its space. */}
                    {isChosen(b.id) ? (
                      <Check className={cn("mr-2 h-4 w-4 shrink-0", chosenCheckClassName)} />
                    ) : (
                      <span aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{b.name}</span>
                    {(b.realm || b.subrealm) && (
                      <span className="ml-2 text-xs text-muted-foreground group-data-[selected=true]:text-accent-foreground truncate max-w-[120px]">
                        {[b.subrealm, b.realm].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
