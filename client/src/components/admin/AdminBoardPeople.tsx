/**
 * Week board people: one row per person who typed on a Season 2 week board.
 * Raw browser keys never arrive here. Guests without an email show as Guest plus
 * six hex characters.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { LAST_BOARD_WEEK } from "@shared/sessionBoard";
import { exportToCSV } from "@/lib/adminInquiry";
import type { AppRouter } from "../../../../server/routers";

type People = inferRouterOutputs<AppRouter>["sessionBoard"]["adminPeople"];
type Person = People["people"][number];

const FILTERS = ["All", "Has email", "No email yet", "Raised a hand", "Brought a project"] as const;
type Filter = (typeof FILTERS)[number];

function formatPt(value: string | Date | number | null | undefined): string {
  if (value == null || value === "") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function timingLabel(timing: string): string {
  if (timing === "before") return "Before the session";
  if (timing === "after") return "After the session";
  return "During the session";
}

function Chip({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-11 px-3 rounded-full border text-sm font-semibold ${
        on ? "bg-[#1a472a] text-white border-[#1a472a]" : "bg-white text-[#1a472a] border-[#1a472a]/30"
      }`}
    >
      {children}
    </button>
  );
}

function personKey(person: Person): string {
  return person.email ?? person.guestId ?? person.name;
}

function matches(person: Person, filter: Filter, query: string): boolean {
  if (filter === "Has email" && !person.email) return false;
  if (filter === "No email yet" && person.email) return false;
  if (filter === "Raised a hand" && person.offers.length === 0 && !person.badges.some((b) => b === "Coach" || b === "Builder")) return false;
  if (filter === "Brought a project" && person.projects.length === 0 && !person.schedule && !person.application) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    person.name,
    person.email ?? "",
    ...person.projects,
    person.schedule?.project ?? "",
    person.application?.projectName ?? "",
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function Badges({ person }: { person: Person }) {
  const bits = [
    person.signedIn ? "Signed in" : null,
    ...person.badges,
  ].filter(Boolean) as string[];
  if (!bits.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {bits.map((bit) => (
        <span key={bit} className="inline-flex rounded-full bg-[#7dd87d]/25 border border-[#1a472a]/20 px-2 py-0.5 text-xs font-semibold text-[#1a472a]">
          {bit}
        </span>
      ))}
    </span>
  );
}

function PersonDetail({ person }: { person: Person }) {
  return (
    <div className="space-y-2 text-sm text-[#1a472a]">
      {person.inputs.length === 0 ? <p>No board lines stored for this person.</p> : (
        <ul className="space-y-2">
          {person.inputs.map((input, i) => (
            <li key={`${input.at}-${i}`} className="rounded-xl bg-[#1a472a]/5 px-3 py-2">
              <p className="font-semibold">{input.stage}{input.project ? ` · ${input.project}` : ""}</p>
              <p>{input.text}</p>
              <p className="text-xs text-[#1a472a]/75">{timingLabel(input.timing)} · {formatPt(input.at)}</p>
            </li>
          ))}
        </ul>
      )}
      {person.elsewhere.length ? (
        <div>
          <p className="font-semibold">Elsewhere on the site</p>
          <ul>
            {person.elsewhere.map((row) => (
              <li key={row.id}>
                <a className="underline" href={`/admin?tab=inquiries&open=${row.id}`}>{row.label}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function AdminBoardPeople({
  week,
  onWeekChange,
  result,
  loading,
}: {
  week: number;
  onWeekChange: (week: number) => void;
  result: People | undefined;
  loading: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const weeks = useMemo(() => Array.from({ length: LAST_BOARD_WEEK - 1 }, (_, i) => i + 2), []);
  const people = result?.people ?? [];
  const shown = people.filter((person) => matches(person, filter, query));
  const totals = result?.totals;

  const download = () => {
    exportToCSV(people.map((person) => ({
      name: person.name,
      email: person.email ?? "",
      userId: person.userId ?? "",
      guestId: person.guestId ?? "",
      projects: person.projects.join("; "),
      arrivalWords: person.arrivalWords.join("; "),
      closingWords: person.closingWords.join("; "),
      notesCount: person.notesCount,
      votes: person.votes,
      weekHands: person.weekHands.join("; "),
      offers: person.offers.join("; "),
      scheduleProject: person.schedule?.project ?? "",
      scheduleLink: person.schedule?.url ?? "",
      application: person.application ? `${person.application.projectName} (#${person.application.id})` : "",
      firstSeen: formatPt(person.firstSeen),
      lastSeen: formatPt(person.lastSeen),
    })), `board_people_week_${week}`);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Week">
        {weeks.map((n) => (
          <Chip key={n} on={week === n} onClick={() => onWeekChange(n)}>Week {n}</Chip>
        ))}
      </div>
      {totals ? (
        <p className="text-sm text-[#1a472a]">
          {totals.people} {totals.people === 1 ? "person" : "people"}
          {" · "}{totals.withEmail} with email
          {" · "}{totals.signedIn} signed in
          {" · "}{totals.guestsWithoutEmail} guests without email
          {" · "}{totals.before} before, {totals.live} live, {totals.after} after
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="sr-only" htmlFor="board-people-search">Search people</label>
        <input
          id="board-people-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or project"
          className="min-h-11 flex-1 min-w-[12rem] rounded-xl border border-[#1a472a]/30 px-3 text-base text-[#1a472a]"
        />
        <button type="button" className="min-h-11 px-4 rounded-xl bg-[#1a472a] text-white font-semibold" onClick={download}>
          Download CSV
        </button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter people">
        {FILTERS.map((name) => (
          <Chip key={name} on={filter === name} onClick={() => setFilter(name)}>{name}</Chip>
        ))}
      </div>
      {loading ? <p className="text-sm text-[#1a472a]">Opening the week's people...</p> : null}
      {!loading && shown.length === 0 ? (
        <p className="text-sm text-[#1a472a] px-1 py-2">No one matches that filter on week {week}.</p>
      ) : null}
      {shown.length > 0 ? (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm text-left text-[#1a472a]">
              <thead>
                <tr className="border-b border-[#1a472a]/15">
                  {["Name", "Email", "On the board", ""].map((heading) => (
                    <th key={heading || "open"} scope="col" className="px-2 py-2 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((person) => {
                  const key = personKey(person);
                  const open = openKey === key;
                  return (
                    <tr key={key} className="border-b border-[#1a472a]/10 align-top">
                      <td className="px-2 py-3">
                        <p className="font-semibold">{person.name}</p>
                        <Badges person={person} />
                      </td>
                      <td className="px-2 py-3">
                        {person.email ? (
                          <a className="underline break-all" href={`mailto:${person.email}`}>{person.email}</a>
                        ) : "No email yet"}
                      </td>
                      <td className="px-2 py-3">
                        {[
                          person.projects.length ? `${person.projects.length} projects` : "",
                          person.votes ? `${person.votes} votes` : "",
                          person.weekHands.length ? `${person.weekHands.length} week hands` : "",
                          person.offers.length ? person.offers.join(", ") : "",
                        ].filter(Boolean).join(" · ") || "A line on the board"}
                      </td>
                      <td className="px-2 py-3">
                        <button type="button" className="min-h-11 px-3 rounded-xl border border-[#1a472a]/30 font-semibold" aria-expanded={open} onClick={() => setOpenKey(open ? null : key)}>
                          {open ? "Hide" : "Open"}
                        </button>
                        {open ? <div className="mt-2"><PersonDetail person={person} /></div> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="sm:hidden space-y-3">
            {shown.map((person) => {
              const key = personKey(person);
              const open = openKey === key;
              return (
                <li key={key} className="rounded-2xl border border-[#1a472a]/15 p-3 space-y-2 text-sm text-[#1a472a]">
                  <p className="font-semibold">{person.name}</p>
                  <Badges person={person} />
                  <p>
                    {person.email ? (
                      <a className="underline break-all" href={`mailto:${person.email}`}>{person.email}</a>
                    ) : "No email yet"}
                  </p>
                  <p>
                    {[
                      person.projects.length ? `${person.projects.length} projects` : "",
                      person.notesCount ? `${person.notesCount} notes` : "",
                      person.votes ? `${person.votes} votes` : "",
                    ].filter(Boolean).join(" · ")}
                  </p>
                  <button type="button" className="min-h-11 px-3 rounded-xl border border-[#1a472a]/30 font-semibold" aria-expanded={open} onClick={() => setOpenKey(open ? null : key)}>
                    {open ? "Hide" : "Open"}
                  </button>
                  {open ? <PersonDetail person={person} /> : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
