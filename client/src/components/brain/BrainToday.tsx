/**
 * Today: the home screen of the command center (response doc section 4).
 *
 * The heartbeat comes FIRST, before any work, because of 17.9: almost nothing
 * has a due date yet, so on day one the work half of this screen is nearly
 * empty. A screen that opens empty teaches Rye to stop opening it. Leading with
 * the pipeline's honesty means the screen always says something true even when
 * it has no work to show, and the empty states below say what is actually
 * missing rather than pretending everything is handled.
 *
 * Ranking is `due`, then `priority`, then age — again 17.9, because sorting by
 * due alone would leave the whole list tied.
 */
import { useState } from "react";
import { Loader2, Sprout } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { HeartbeatStrip } from "./HeartbeatStrip";
import { BrainRow, type BrainItemView } from "./BrainList";
import { BrainItemSheet } from "./BrainItemSheet";
import { WeekOneCard } from "./WeekOneCard";
import { TriageQueue } from "./TriageQueue";

const PRIORITY_ORDER: Record<string, number> = { now: 0, soon: 1, someday: 2 };

function dueTime(v: unknown): number {
  if (!v) return Number.POSITIVE_INFINITY;
  const t = new Date(v as string).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function ageTime(item: { capturedAt?: unknown; createdAt?: unknown }): number {
  const raw = item.capturedAt ?? item.createdAt;
  if (!raw) return Number.POSITIVE_INFINITY;
  const t = new Date(raw as string).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/**
 * Due first (soonest, undated last), then priority, then oldest. Pure so the
 * order is a thing that can be argued with rather than a thing that happens.
 */
export function rankToday<T extends { due?: unknown; priority?: string; capturedAt?: unknown; createdAt?: unknown }>(
  items: T[],
): T[] {
  // Compared with < rather than subtracted: two undated items are both
  // Infinity, and Infinity - Infinity is NaN, which sorts nothing and does it
  // silently. That is exactly the day-one case (17.9), so it is the case the
  // comparator has to get right.
  return [...items].sort((a, b) => {
    const da = dueTime(a.due);
    const db = dueTime(b.due);
    if (da !== db) return da < db ? -1 : 1;
    const p = (PRIORITY_ORDER[a.priority ?? "soon"] ?? 1) - (PRIORITY_ORDER[b.priority ?? "soon"] ?? 1);
    if (p !== 0) return p;
    const aa = ageTime(a);
    const ab = ageTime(b);
    if (aa === ab) return 0;
    return aa < ab ? -1 : 1;
  });
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1a472a]">
        {title}
        {count !== undefined ? ` (${count})` : ""}
      </h2>
      {children}
    </section>
  );
}

export interface BrainTodayProps {
  /** Switch the shell to the Create tab, which is The Harvest as it exists today. */
  onGoToCreate: () => void;
}

export function BrainToday({ onGoToCreate }: BrainTodayProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const today = trpc.brain.today.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const inFlight = trpc.brain.list.useQuery(
    { states: ["in_flight", "done_claimed"], limit: 20 },
    { retry: false, refetchOnWindowFocus: false },
  );
  const rawItems = trpc.brain.list.useQuery(
    { state: "raw", limit: 200 },
    { retry: false, refetchOnWindowFocus: false },
  );
  const feed = trpc.harvest.listFeed.useQuery(
    { tier: "ideas" },
    { retry: false, refetchOnWindowFocus: false },
  );

  const due = rankToday((today.data?.due ?? []) as BrainItemView[]);
  // Oldest raw first: the capture that has been waiting longest is the one most
  // likely to have lost its context, so it is the one worth a question today.
  const shapeThree = [...((rawItems.data ?? []) as BrainItemView[])]
    .sort((a, b) => {
      const aa = ageTime(a);
      const ab = ageTime(b);
      if (aa === ab) return 0;
      return aa < ab ? -1 : 1;
    })
    .slice(0, 3);
  const ripest = feed.data?.ideas?.[0] as
    | { id: number; title: string; displayTitle: string | null; whyNow: string | null }
    | undefined;

  const counts = today.data;

  return (
    <div className="space-y-5">
      <div className="-mx-4">
        <HeartbeatStrip />
      </div>

      {/* Above the work, because it is the instruction for how to do the work,
          and dismissible, because it stops being that after a week. */}
      <WeekOneCard />

      {today.isError ? (
        <p
          data-testid="brain-today-error"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
        >
          Today could not load. {today.error.message}
        </p>
      ) : null}

      {counts ? (
        <div className="grid grid-cols-4 gap-2 text-center" data-testid="brain-today-counts">
          {[
            { label: "raw", n: counts.raw },
            { label: "ready", n: counts.ready },
            { label: "in flight", n: counts.inFlight },
            { label: "claimed", n: counts.claimed },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-[#1a472a]/25 bg-white py-2">
              <div className="text-lg font-bold text-[#1a472a]">{c.n}</div>
              <div className="text-[11px] text-[#2d5a3d]">{c.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {today.isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[#1a472a]" aria-label="Loading today" />
        </div>
      ) : null}

      {/* Before the dated work on purpose. The protocol above puts the five
          done-triage answers first in the morning, and this is the section that
          moves the 219-item number: nine of ten items in Rye's calibration
          sample were already finished. */}
      <TriageQueue onAnswered={() => void utils.brain.invalidate()} />

      <Section title="Due and now" count={due.length}>
        {due.length === 0 ? (
          <p className="text-sm text-[#2d5a3d]">
            Nothing is due and nothing is marked now. Almost no item has a date yet, so this stays
            quiet until you set one while shaping.
          </p>
        ) : (
          <div className="space-y-2">
            {due.map((item) => (
              <BrainRow key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
            ))}
          </div>
        )}
      </Section>

      <Section title="In flight" count={inFlight.data?.length ?? 0}>
        {(inFlight.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-[#2d5a3d]">
            Nothing handed to a session yet. Batches land here once the Forge exists.
          </p>
        ) : (
          <div className="space-y-2">
            {(inFlight.data ?? []).map((item) => (
              <BrainRow
                key={item.id}
                item={item as BrainItemView}
                onOpen={() => setOpenId(item.id)}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Shape three" count={shapeThree.length}>
        {shapeThree.length === 0 ? (
          <p className="text-sm text-[#2d5a3d]">No raw items waiting. Everything captured has a shape.</p>
        ) : (
          <>
            <p className="text-xs text-[#2d5a3d]">
              The three oldest raw captures. Give each an ask and a done-when, then promote.
            </p>
            <div className="space-y-2">
              {shapeThree.map((item) => (
                <BrainRow key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="Ripest to write">
        {!ripest ? (
          <p className="text-sm text-[#2d5a3d]">
            {feed.isError
              ? `The Harvest feed could not load. ${feed.error.message}`
              : "Nothing ripe right now. The bridge and the hourly worker keep this fresh."}
          </p>
        ) : (
          <button
            type="button"
            onClick={onGoToCreate}
            data-testid="brain-ripest"
            className="w-full min-h-14 rounded-xl border border-[#1a472a]/25 bg-white px-3 py-2.5 text-left"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-[#1a472a]">
              <Sprout className="h-4 w-4 text-[#2d5a3d]" aria-hidden="true" />
              {(ripest.displayTitle ?? "").trim() || ripest.title}
            </span>
            {ripest.whyNow ? (
              <span className="mt-1 block text-xs leading-relaxed text-[#2d5a3d]">
                {ripest.whyNow}
              </span>
            ) : null}
            <span className="mt-1 block text-xs font-semibold text-[#2d5a3d]">
              Open in The Harvest
            </span>
          </button>
        )}
      </Section>

      {openId !== null ? (
        <BrainItemSheet
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => void utils.brain.invalidate()}
        />
      ) : null}
    </div>
  );
}

export default BrainToday;
