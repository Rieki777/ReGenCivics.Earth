/**
 * The list behind three of the shell's five tabs (response doc section 3).
 *
 * A `kind` is data; a section is a filter over it. Build is kind `build`,
 * To-do is `todo` + `decide`, Explore is `material` + `ask`. Re-cutting the
 * sections later is a prop change here, not a migration.
 *
 * The list is deliberately honest about what it is not showing: the server
 * caps at `limit` rows ordered by last touch, so when the result fills the cap
 * the footer says so rather than letting Rye believe he is looking at all 749.
 *
 * Item titles and bodies are UNTRUSTED TEXT (transcripts, forwarded messages,
 * fork payloads). They are rendered as text, never as markup, and nothing here
 * acts on their content.
 */
import { useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { Loader2, Paperclip, Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type BrainItemView = RouterOutputs["brain"]["get"];

export const BRAIN_KIND_KEYS = [
  "unsorted",
  "create",
  "build",
  "todo",
  "ask",
  "decide",
  "material",
] as const;
export type BrainKindKey = (typeof BRAIN_KIND_KEYS)[number];

export const BRAIN_STATE_KEYS = [
  "raw",
  "shaped",
  "ready",
  "in_flight",
  "done_claimed",
  "done",
  "parked",
] as const;
export type BrainStateKey = (typeof BRAIN_STATE_KEYS)[number];

/** Words Rye reads. The database's `done_claimed` is "claimed done" to a human. */
export const STATE_LABEL: Record<string, string> = {
  raw: "raw",
  shaped: "shaped",
  ready: "ready",
  in_flight: "in flight",
  done_claimed: "claimed done",
  done: "done",
  parked: "parked",
};

export const KIND_LABEL: Record<string, string> = {
  unsorted: "unsorted",
  create: "create",
  build: "build",
  todo: "to-do",
  ask: "ask",
  decide: "decide",
  material: "material",
};

/** The chips above the list. `null` states means "no state filter". */
const STATE_CHIPS: Array<{ key: string; label: string; states: BrainStateKey[] | null }> = [
  { key: "all", label: "All", states: null },
  { key: "raw", label: "Raw", states: ["raw"] },
  { key: "shaped", label: "Shaped", states: ["shaped"] },
  { key: "ready", label: "Ready", states: ["ready"] },
  { key: "in_flight", label: "In flight", states: ["in_flight", "done_claimed"] },
  { key: "done", label: "Done", states: ["done"] },
  { key: "parked", label: "Parked", states: ["parked"] },
];

/** Local calendar date, not UTC: a due date is a day in Rye's life, not an instant. */
export function dueLabel(due: Date | string | null | undefined, now = new Date()): string | null {
  if (!due) return null;
  const d = due instanceof Date ? due : new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(now)) / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days}d`;
}

function Chip({ children, tone = "quiet" }: { children: React.ReactNode; tone?: "quiet" | "loud" | "warn" }) {
  const skin =
    tone === "loud"
      ? "border-[#1a472a]/40 bg-[#f0ebe3] text-[#1a472a]"
      : tone === "warn"
        ? "border-amber-400 bg-amber-50 text-amber-900"
        : "border-[#1a472a]/25 text-[#2d5a3d]";
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] leading-4 ${skin}`}>
      {children}
    </span>
  );
}

/** One row. At least 56px tall, a real button, so a thumb reaches it. */
export function BrainRow({ item, onOpen }: { item: BrainItemView; onOpen: () => void }) {
  const shots = (item.attachments as string[] | null)?.length ?? 0;
  const due = dueLabel(item.due as Date | null);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`brain-row-${item.id}`}
      className="w-full min-h-14 rounded-xl border border-[#1a472a]/25 bg-white px-3 py-2.5 text-left transition-colors hover:border-[#1a472a]/35"
    >
      <span className="block text-sm font-medium leading-snug text-[#1a472a]">{item.title}</span>
      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Chip tone="loud">{KIND_LABEL[item.kind] ?? item.kind}</Chip>
        <Chip>{STATE_LABEL[item.state] ?? item.state}</Chip>
        {item.blockedOn ? <Chip tone="warn">blocked: {item.blockedOn}</Chip> : null}
        {item.repo ? <Chip>{item.repo}</Chip> : null}
        {due ? <Chip tone={due.includes("overdue") ? "warn" : "quiet"}>{due}</Chip> : null}
        {item.trust === "external" ? <Chip tone="warn">external</Chip> : null}
        {shots > 0 ? (
          <Chip>
            <Paperclip className="mr-0.5 inline h-3 w-3" aria-hidden="true" />
            {shots}
          </Chip>
        ) : null}
      </span>
    </button>
  );
}

export interface BrainListProps {
  /** The tab's kind filter. Empty or omitted means every kind. */
  kinds?: BrainKindKey[];
  /** Shown above the chips so the tab says what it is looking at. */
  heading: string;
  /** What an empty result means for THIS tab, in Rye's words. */
  emptyHint: string;
  limit?: number;
  /**
   * Opening an item is the caller's business. The list does NOT import
   * `BrainItemSheet`: the sheet needs this file's kind and state labels, so
   * importing it back would make the two modules a cycle, and a cycle that
   * survives typecheck is the kind that surfaces as an undefined component
   * after a chunking change.
   */
  onOpenItem: (id: number) => void;
}

export function BrainList({ kinds, heading, emptyHint, limit = 200, onOpenItem }: BrainListProps) {
  const [chip, setChip] = useState<string>("all");
  const [typed, setTyped] = useState("");
  const [q, setQ] = useState("");

  // Debounce so a phone keyboard does not fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQ(typed.trim()), 300);
    return () => clearTimeout(t);
  }, [typed]);

  const states = useMemo(() => STATE_CHIPS.find((c) => c.key === chip)?.states ?? undefined, [chip]);

  const input = useMemo(
    () => ({
      ...(kinds && kinds.length ? { kinds } : {}),
      ...(states ? { states } : {}),
      ...(q ? { q } : {}),
      limit,
    }),
    [kinds, states, q, limit],
  );

  const list = trpc.brain.list.useQuery(input, { retry: false, refetchOnWindowFocus: false });

  const rows = list.data ?? [];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1a472a]">{heading}</h2>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a7c59]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Search titles, asks, bodies"
          aria-label="Search items"
          data-testid="brain-search"
          className="min-h-11 w-full rounded-xl border border-[#1a472a]/25 bg-white pl-9 pr-9 text-sm text-[#1a472a] placeholder:text-[#4a7c59]"
        />
        {typed ? (
          <button
            type="button"
            onClick={() => setTyped("")}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-[#2d5a3d]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by state">
        {STATE_CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={chip === c.key}
            data-testid={`brain-chip-${c.key}`}
            onClick={() => setChip(c.key)}
            className={`min-h-11 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors ${
              chip === c.key
                ? "border-[#1a472a] bg-[#1a472a] text-white"
                : "border-[#1a472a]/25 bg-white text-[#1a472a]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-10" data-testid="brain-list-loading">
          <Loader2 className="h-5 w-5 animate-spin text-[#1a472a]" aria-label="Loading items" />
        </div>
      ) : null}

      {list.isError ? (
        <p
          data-testid="brain-list-error"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
        >
          The list could not load. {list.error.message}
        </p>
      ) : null}

      {!list.isLoading && !list.isError && rows.length === 0 ? (
        <p data-testid="brain-list-empty" className="py-6 text-sm text-[#2d5a3d]">
          {emptyHint}
        </p>
      ) : null}

      <div className="space-y-2">
        {rows.map((item) => (
          <BrainRow
            key={item.id}
            item={item as BrainItemView}
            onOpen={() => onOpenItem(item.id)}
          />
        ))}
      </div>

      {rows.length >= limit ? (
        <p className="pt-1 text-xs text-[#2d5a3d]" data-testid="brain-list-capped">
          Showing the {limit} most recently touched. Search or filter to narrow.
        </p>
      ) : null}
    </div>
  );
}

export default BrainList;
