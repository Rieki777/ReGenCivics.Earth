/**
 * The Needs tab on /campaigns?tab=needs (build spec 2026-09-25, section 9.2):
 * every open need across live campaigns, least covered first. The order is
 * the server's (campaigns.listOpenNeeds, ranked by shared/openNeeds.ts); this
 * component filters and never re-sorts.
 *
 * Chips: Things, Time, A role, Know-how combine with OR. On the land and
 * Remote narrow the list (a need done either way counts for both), and with
 * one on, needs that don't say where they happen are left out, which a line
 * says. Money is never a need: its chip swaps the list for the ways to put
 * money in, each leading to a project's money block.
 *
 * Example needs sit in their own row below the real ones, labelled. Rows carry
 * counts and a status, never anyone's name (the server pins the row shape).
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import type { OpenNeedRow, OpenNeedsResult, OpenRouteRow } from "@shared/openNeeds";
import type { NeedChip } from "@shared/crowdpoolNeedAction";
import { NEEDS_TAB } from "@shared/crowdpoolCopy";
import { decodeBasicEntities } from "@shared/htmlText";

export type PlaceChip = "land" | "remote";

export type NeedsFilter = {
  kinds: NeedChip[];
  places: PlaceChip[];
  query: string;
};

export const EMPTY_FILTER: NeedsFilter = { kinds: [], places: [], query: "" };

const KIND_CHIPS: Array<{ key: NeedChip; label: string }> = [
  { key: "things", label: NEEDS_TAB.chips.things },
  { key: "time", label: NEEDS_TAB.chips.time },
  { key: "role", label: NEEDS_TAB.chips.role },
  { key: "knowhow", label: NEEDS_TAB.chips.knowhow },
];

const PLACE_CHIPS: Array<{ key: PlaceChip; label: string }> = [
  { key: "land", label: NEEDS_TAB.chips.land },
  { key: "remote", label: NEEDS_TAB.chips.remote },
];

function normalize(s: string | null | undefined): string {
  return decodeBasicEntities(String(s ?? "")).toLowerCase();
}

/** Does this need match the place chips? None on matches all; on, a need that doesn't say where is left out. */
export function matchesPlace(place: OpenNeedRow["place"], places: readonly PlaceChip[]): boolean {
  if (places.length === 0) return true;
  if (!place) return false;
  if (place === "either") return true;
  return places.includes(place === "land" ? "land" : "remote");
}

/** The needs that match the filter, in the order given (the server's ranking). */
export function filterOpenNeeds(rows: readonly OpenNeedRow[], f: NeedsFilter): OpenNeedRow[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (f.kinds.length > 0 && !f.kinds.includes(row.chip)) return false;
    if (!matchesPlace(row.place, f.places)) return false;
    if (q) {
      const hay = [row.title, row.projectName, row.detail].map(normalize).join(" \n ");
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Routes matching the search (project name and label), in the order given. */
export function filterRoutes(rows: readonly OpenRouteRow[], query: string): OpenRouteRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) => `${normalize(r.projectName)} \n ${normalize(r.label)}`.includes(q));
}

/** The line under a need's title: project, place and where it happens. */
export function needPlaceLine(row: Pick<OpenNeedRow, "projectName" | "location" | "place">): string {
  const parts = [decodeBasicEntities(row.projectName)];
  if (row.location && row.place !== "remote") parts.push(decodeBasicEntities(row.location));
  if (row.place === "remote") parts.push(NEEDS_TAB.placeRemote);
  else if (row.place === "either") parts.push(NEEDS_TAB.placeEither);
  return parts.filter(Boolean).join(" · ");
}

const chipClass = (pressed: boolean) =>
  `inline-flex items-center min-h-11 pointer-coarse:min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
    pressed
      ? "bg-[#1a472a] border-[#1a472a] text-white"
      : "bg-white border-[#4a7c59]/50 text-[#1a472a] hover:border-[#4a7c59]"
  }`;

const linkButton =
  "inline-flex items-center justify-center min-h-11 pointer-coarse:min-h-11 rounded-full bg-[#1a472a] px-5 text-sm font-semibold text-white hover:bg-[#2d5a3d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a7c59] shrink-0";

const textLink =
  "inline-flex items-center min-h-11 pointer-coarse:min-h-11 font-semibold text-[#1a472a] underline underline-offset-2 hover:text-[#4a7c59]";

function NeedRow({ row }: { row: OpenNeedRow }) {
  const title = decodeBasicEntities(row.title);
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-[#1a472a]/10 bg-[#f7faf7] p-4 sm:flex-row sm:items-center min-w-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {row.noOffersYet ? (
            <span className="inline-flex items-center rounded-full border border-[#1a472a] bg-white px-2.5 py-0.5 text-xs font-bold text-[#1a472a]">
              {NEEDS_TAB.noOffersYet}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-[#4a7c59]/40 bg-[#f0f7f0] px-2.5 py-0.5 text-xs font-medium text-[#1a472a]/85">
              {row.status.text}
            </span>
          )}
          {row.isDemo && (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              {NEEDS_TAB.exampleTag}
            </span>
          )}
        </div>
        <h3 className="font-bold text-[#1a472a] break-words">{title}</h3>
        <p className="text-sm text-[#1a472a]/80 break-words">{needPlaceLine(row)}</p>
        {row.detail && <p className="text-sm text-[#1a472a]/80 break-words">{decodeBasicEntities(row.detail)}</p>}
      </div>
      <Link href={row.path} aria-label={NEEDS_TAB.verbLabel(row.verb, title)} className={linkButton}>
        {row.verb}
      </Link>
    </li>
  );
}

function RouteRow({ row }: { row: OpenRouteRow }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#1a472a]/10 bg-[#f7faf7] p-3 min-w-0">
      <Link href={row.path} className={`${textLink} break-words min-w-0`}>
        {NEEDS_TAB.routeRow(decodeBasicEntities(row.projectName), row.label)}
      </Link>
      {row.isDemo && (
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
          {NEEDS_TAB.exampleRoute}
        </span>
      )}
    </li>
  );
}

export function NeedsTab({
  data,
  isLoading = false,
  notifyForm,
}: {
  /** campaigns.listOpenNeeds. */
  data: OpenNeedsResult | undefined;
  isLoading?: boolean;
  /** The season waitlist form, shown when no real campaign is open yet. */
  notifyForm?: ReactNode;
}) {
  const [filter, setFilter] = useState<NeedsFilter>(EMPTY_FILTER);
  const [money, setMoney] = useState(false);

  const needs = data?.needs ?? [];
  const examples = data?.examples ?? [];
  const routes = data?.routes ?? [];
  const exampleRoutes = data?.exampleRoutes ?? [];
  const realCampaignCount = data?.realCampaignCount ?? 0;

  const shownNeeds = useMemo(() => filterOpenNeeds(needs, filter), [needs, filter]);
  const shownExamples = useMemo(() => filterOpenNeeds(examples, filter), [examples, filter]);
  const shownRoutes = useMemo(
    () => [...filterRoutes(routes, filter.query), ...filterRoutes(exampleRoutes, filter.query)],
    [routes, exampleRoutes, filter.query],
  );

  const hasFilter = filter.kinds.length > 0 || filter.places.length > 0 || filter.query.trim() !== "";
  const nothingAtAll = !!data && needs.length === 0 && examples.length === 0 && realCampaignCount === 0;
  const onlyExamples = !!data && needs.length === 0 && realCampaignCount === 0 && examples.length > 0;
  const allFilled = !!data && needs.length === 0 && realCampaignCount > 0;

  const toggleKind = (key: NeedChip) => {
    setMoney(false);
    setFilter((f) => ({ ...f, kinds: f.kinds.includes(key) ? f.kinds.filter((k) => k !== key) : [...f.kinds, key] }));
  };
  const togglePlace = (key: PlaceChip) => {
    setFilter((f) => ({ ...f, places: f.places.includes(key) ? f.places.filter((k) => k !== key) : [...f.places, key] }));
  };
  const toggleMoney = () => {
    const next = !money;
    setMoney(next);
    if (next) setFilter((f) => ({ ...f, kinds: [] }));
  };
  const clearFilters = () => {
    setFilter(EMPTY_FILTER);
    setMoney(false);
  };

  const emptyFiltered = (
    <div className="rounded-2xl border border-dashed border-[#4a7c59]/50 bg-white p-5 text-center">
      <p className="text-[#1a472a]">{NEEDS_TAB.emptyFiltered}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5">
        <button type="button" onClick={clearFilters} className={textLink}>
          {NEEDS_TAB.clearFilters}
        </button>
        <Link href="/crowd-pooling" className={textLink}>
          {NEEDS_TAB.openTool}
        </Link>
      </div>
    </div>
  );

  let body: ReactNode;
  if (!data) {
    body = isLoading ? (
      <div className="space-y-3" aria-busy="true">
        <p className="text-sm text-[#1a472a]/80">{NEEDS_TAB.loading}</p>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#1a472a]/10" />
        ))}
      </div>
    ) : (
      <div className="space-y-4">
        <p className="text-[#1a472a]">{NEEDS_TAB.nothingAtAll}</p>
        {notifyForm}
      </div>
    );
  } else if (nothingAtAll) {
    body = (
      <div className="space-y-4">
        <p className="text-[#1a472a]">{NEEDS_TAB.nothingAtAll}</p>
        {notifyForm}
      </div>
    );
  } else if (money) {
    body = (
      <section aria-labelledby="needs-money-heading">
        <h3 id="needs-money-heading" className="text-lg font-bold text-[#1a472a] mb-3" style={{ fontFamily: "var(--font-display)" }}>
          {NEEDS_TAB.moneyHeading}
        </h3>
        {shownRoutes.length === 0 ? (
          <p className="text-[#1a472a]/85">{NEEDS_TAB.noRoutes}</p>
        ) : (
          <ul className="space-y-2">
            {shownRoutes.map((r) => (
              <RouteRow key={`${r.campaignId}-${r.partner}-${r.label}`} row={r} />
            ))}
          </ul>
        )}
      </section>
    );
  } else if (hasFilter && shownNeeds.length === 0 && shownExamples.length === 0) {
    body = emptyFiltered;
  } else {
    body = (
      <div className="space-y-6">
        {onlyExamples && (
          <div className="space-y-4">
            <p className="text-[#1a472a]">{NEEDS_TAB.onlyExamples}</p>
            {notifyForm}
            <Link href="/crowd-pooling" className={textLink}>
              {NEEDS_TAB.addUp}
            </Link>
          </div>
        )}
        {allFilled && <p className="text-[#1a472a]">{NEEDS_TAB.allFilled}</p>}
        {shownNeeds.length > 0 && (
          <ul className="space-y-3" aria-label={NEEDS_TAB.heading}>
            {shownNeeds.map((row) => (
              <NeedRow key={row.needId} row={row} />
            ))}
          </ul>
        )}
        {shownExamples.length > 0 && (
          <section aria-labelledby="example-needs-heading">
            <h3 id="example-needs-heading" className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
              {NEEDS_TAB.examplesHeading}
            </h3>
            <p className="text-sm text-[#1a472a]/80 mb-3">{NEEDS_TAB.examplesCaption}</p>
            <ul className="space-y-3">
              {shownExamples.map((row) => (
                <NeedRow key={row.needId} row={row} />
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <section
      id="needs-tab"
      aria-labelledby="needs-tab-heading"
      className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl mb-8 min-w-0"
    >
      <h2 id="needs-tab-heading" className="text-2xl font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
        {NEEDS_TAB.heading}
      </h2>
      <p className="mt-1 text-[#1a472a]/85">{NEEDS_TAB.intro}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {KIND_CHIPS.map(({ key, label }) => {
          const pressed = !money && filter.kinds.includes(key);
          return (
            <button key={key} type="button" aria-pressed={pressed} onClick={() => toggleKind(key)} className={chipClass(pressed)}>
              {label}
            </button>
          );
        })}
        <button type="button" aria-pressed={money} onClick={toggleMoney} className={chipClass(money)}>
          {NEEDS_TAB.chips.money}
        </button>
        {PLACE_CHIPS.map(({ key, label }) => {
          const pressed = filter.places.includes(key);
          return (
            <button key={key} type="button" aria-pressed={pressed} onClick={() => togglePlace(key)} className={chipClass(pressed)}>
              {label}
            </button>
          );
        })}
      </div>
      {!money && filter.places.length > 0 && (
        <p className="mt-2 text-sm text-[#1a472a]/85">{NEEDS_TAB.placeCaption}</p>
      )}

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1a472a]/60" aria-hidden="true" />
        <input
          type="search"
          value={filter.query}
          onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
          aria-label={NEEDS_TAB.searchLabel}
          placeholder={NEEDS_TAB.searchPlaceholder}
          className="w-full min-h-11 rounded-full border border-[#4a7c59]/50 bg-white pl-9 pr-4 text-base md:text-sm text-[#14331f] focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
        />
      </div>

      <div className="mt-5">{body}</div>
    </section>
  );
}
