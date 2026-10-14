/**
 * Every weekly session board's answers, for admins (Rye, 2026-10-13): one
 * place to read each week's human needs summary and to download everything as
 * JSON or CSV. We read these answers to shape how we build Village OS.
 *
 * Nothing loads on mount. The export reads every board in the Season, so it
 * runs only when an admin taps a button (`sessionBoard.adminExport`, 10 a
 * minute). The server never sends a guest key, and anonymous answers arrive
 * with no name, project or author.
 */
import { useState } from "react";
import { BarChart3, Download, FileJson, Loader2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  EXPORT_COPY,
  boardExportCsv,
  type BoardExport,
  type BoardExportWeek,
} from "@shared/boardEntries";
import {
  BREADTH_STOPS,
  CIRCLES,
  DECIDE_OPTIONS,
  MEET_WAYS,
  NEED_RUNGS,
  PLAYER_COUNTS,
  WHOLE_STOPS,
  type NeedsSummary,
} from "@shared/humanNeeds";
import { boardStages, promptHomes } from "@shared/sessionBoard";

/** The panel's own words, beside EXPORT_COPY. */
export const PANEL_COPY = {
  summary: "See each week's summary",
  noBoard: "No board for this week yet.",
  noNeeds: "This week's board doesn't ask the human needs questions.",
  none: "None yet",
  projects: (n: number) => `${n} ${n === 1 ? "project" : "projects"} answered the human needs questions.`,
  counts: (projects: number, rows: number, anon: number) =>
    `${projects} ${projects === 1 ? "project" : "projects"} on the board · ${rows} ${rows === 1 ? "answer or note" : "answers and notes"} · ${anon} anonymous`,
  closed: "Closed by a facilitator",
} as const;

type Option = { readonly key: string; readonly label: string };

/** "Unmet 2 · Alive 1": the options with any count, in the list's own order. */
export function tallyLine(counts: Record<string, number> | undefined, options: readonly Option[]): string {
  if (!counts) return PANEL_COPY.none;
  const parts = options.filter((o) => (counts[o.key] ?? 0) > 0).map((o) => `${o.label} ${counts[o.key]}`);
  return parts.length ? parts.join(" · ") : PANEL_COPY.none;
}

/**
 * Anonymous answers counted by question and choice: "How it was landing: Clear 4 · Too fast 1".
 * Grouped by question key, so two questions that share words (the pulse on How deep,
 * how wide and the one on Who meets each need) stay apart, each named by its stage.
 */
export function anonymousLines(anon: BoardExportWeek["anonymous"], week?: number): string[] {
  const byKey = new Map<string, { label: string; counts: Map<string, number> }>();
  for (const a of anon) {
    const g = byKey.get(a.key) ?? { label: a.label, counts: new Map<string, number>() };
    g.counts.set(a.value, (g.counts.get(a.value) ?? 0) + 1);
    byKey.set(a.key, g);
  }
  const labelUses = new Map<string, number>();
  for (const g of byKey.values()) labelUses.set(g.label, (labelUses.get(g.label) ?? 0) + 1);
  const homes = week != null ? promptHomes(week) : null;
  const stages = week != null ? boardStages(week) : [];
  return [...byKey].map(([key, g]) => {
    const home = homes?.get(key);
    const stage = home != null ? stages[home]?.name : undefined;
    const label = (labelUses.get(g.label) ?? 0) > 1 && stage ? `${g.label} (${stage})` : g.label;
    return `${label}: ${[...g.counts].map(([v, n]) => `${v} ${n}`).join(" · ")}`;
  });
}

function exportDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function download(body: string, filename: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The CSV with a byte-order mark, so a spreadsheet reads accented names as written. */
export function csvForDownload(data: BoardExport): string {
  return String.fromCharCode(0xfeff) + boardExportCsv(data);
}

function NeedsSummaryTable({ summary }: { summary: NeedsSummary }) {
  const ways = MEET_WAYS.map((w) => ({ key: w.key, label: w.label }));
  return (
    <div className="space-y-3">
      <p className="text-white/80">{PANEL_COPY.projects(summary.projects)}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="text-white/60 border-b border-white/10">
              <th className="py-1.5 pr-3 font-medium">Human need</th>
              <th className="py-1.5 pr-3 font-medium tabular-nums">Projects</th>
              <th className="py-1.5 pr-3 font-medium tabular-nums">Seeds</th>
              <th className="py-1.5 pr-3 font-medium">Today</th>
              <th className="py-1.5 pr-3 font-medium">In three years</th>
              <th className="py-1.5 pr-3 font-medium">Who it's for</th>
              <th className="py-1.5 font-medium">Who meets it</th>
            </tr>
          </thead>
          <tbody>
            {summary.needs.map((n) => (
              <tr key={n.id} className="border-b border-white/5 align-top">
                <td className="py-1.5 pr-3 text-white">{n.label}</td>
                <td className="py-1.5 pr-3 text-white/80 tabular-nums">{n.projects}</td>
                <td className="py-1.5 pr-3 text-white/80 tabular-nums">
                  {n.seeds}
                  {n.seedProjects > 0 ? ` (${n.seedProjects} top three)` : ""}
                </td>
                <td className="py-1.5 pr-3 text-white/70">{tallyLine(n.today, NEED_RUNGS)}</td>
                <td className="py-1.5 pr-3 text-white/70">{tallyLine(n.goal, NEED_RUNGS)}</td>
                <td className="py-1.5 pr-3 text-white/70">{tallyLine(n.breadth, BREADTH_STOPS)}</td>
                <td className="py-1.5 text-white/70">{tallyLine(n.meet, ways)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[max-content_1fr] text-xs">
        <dt className="text-white/60">The room leans</dt>
        <dd className="text-white/80">{tallyLine(summary.meet, ways)}</dd>
        <dt className="text-white/60">How much it means to meet</dt>
        <dd className="text-white/80">{tallyLine(summary.whole, WHOLE_STOPS)}</dd>
        <dt className="text-white/60">Decides today</dt>
        <dd className="text-white/80">{tallyLine(summary.decideNow, DECIDE_OPTIONS)}</dd>
        <dt className="text-white/60">Wants to decide</dt>
        <dd className="text-white/80">{tallyLine(summary.decideAim, DECIDE_OPTIONS)}</dd>
        <dt className="text-white/60">Circles first</dt>
        <dd className="text-white/80">{tallyLine(summary.circles, CIRCLES)}</dd>
        <dt className="text-white/60">Players to start</dt>
        <dd className="text-white/80">{tallyLine(summary.players, PLAYER_COUNTS)}</dd>
        <dt className="text-white/60">Playing now</dt>
        <dd className="text-white/80">{tallyLine(summary.playersNow, PLAYER_COUNTS)}</dd>
        <dt className="text-white/60">Human needs people added</dt>
        <dd className="text-white/80">{summary.other.length ? summary.other.join(" · ") : PANEL_COPY.none}</dd>
      </dl>
    </div>
  );
}

function WeekSummary({ week }: { week: BoardExportWeek }) {
  const shownProjects = week.projects.filter((p) => !p.hidden);
  const anon = anonymousLines(week.anonymous, week.week);
  return (
    <div className="rounded-lg border border-white/10 p-3 space-y-3" data-testid="export-week">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <a href={week.href} className="text-white font-semibold hover:underline">{week.title}</a>
        {week.status === "closed" && <span className="text-xs text-amber-300">{PANEL_COPY.closed}</span>}
      </div>
      {week.status === "none" ? (
        <p className="text-white/60 text-xs">{PANEL_COPY.noBoard}</p>
      ) : (
        <>
          <p className="text-white/60 text-xs tabular-nums">
            {PANEL_COPY.counts(shownProjects.length, week.rows.length, week.anonymous.length)}
          </p>
          {week.summary ? (
            <NeedsSummaryTable summary={week.summary} />
          ) : (
            <p className="text-white/60 text-xs">{PANEL_COPY.noNeeds}</p>
          )}
          {anon.length > 0 && (
            <ul className="text-xs text-white/70 space-y-0.5">
              {anon.map((l) => <li key={l}>{l}</li>)}
            </ul>
          )}
          {week.projectViews.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-[#7dd87d]">Each project's card ({week.projectViews.length})</summary>
              <div className="mt-2 space-y-2">
                {week.projectViews.map((v) => (
                  <div key={v.cardId ?? "room"} className="rounded-md bg-black/20 p-2">
                    <p className="text-white font-medium">{v.name}</p>
                    {v.lines.map((l, i) => <p key={i} className="text-white/70">{l}</p>)}
                  </div>
                ))}
              </div>
            </details>
          )}
          {shownProjects.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-[#7dd87d]">Projects on the board ({shownProjects.length})</summary>
              <ul className="mt-2 space-y-1">
                {shownProjects.map((p) => (
                  <li key={p.cardId} className="text-white/80">
                    {p.name}
                    {p.place ? `, ${p.place}` : ""}
                    {` · ${p.checkins} checked in`}
                    {p.applicationStatus ? ` · application ${p.applicationStatus.replace(/_/g, " ")}` : ""}
                    {p.adminPath && (
                      <>
                        {" · "}
                        <a href={p.adminPath} className="text-[#7dd87d] hover:underline">Open the application</a>
                      </>
                    )}
                    {p.projectPath && (
                      <>
                        {" · "}
                        <a href={p.projectPath} className="text-[#7dd87d] hover:underline">Project page</a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/** The panel's body from loaded data. Pure, so it renders the same in a test. */
export function SessionBoardExportView({ data }: { data: BoardExport }) {
  const weeks = [...data.weeks].sort((a, b) => b.week - a.week);
  return (
    <div className="space-y-3">
      {weeks.map((w) => <WeekSummary key={w.week} week={w} />)}
    </div>
  );
}

type Busy = null | "summary" | "json" | "csv";

export function SessionBoardExport() {
  const utils = trpc.useUtils();
  const [data, setData] = useState<BoardExport | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(what: Exclude<Busy, null>) {
    if (busy) return;
    setBusy(what);
    setError(null);
    try {
      const fresh: BoardExport = await utils.client.sessionBoard.adminExport.query();
      setData(fresh);
      const name = `regen-session-boards-${exportDate()}`;
      if (what === "json") download(JSON.stringify(fresh, null, 2), `${name}.json`, "application/json");
      if (what === "csv") download(csvForDownload(fresh), `${name}.csv`, "text/csv;charset=utf-8");
    } catch {
      setError(EXPORT_COPY.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="bg-[#0a1f14] border-[#7dd87d]/30 mt-4" data-testid="session-board-export">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Sprout className="w-4 h-4 text-[#7dd87d]" />
          {EXPORT_COPY.title}
        </CardTitle>
        <CardDescription className="text-white/60">{EXPORT_COPY.why}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="min-h-11" disabled={busy != null} onClick={() => void run("summary")}>
            {busy === "summary" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            {PANEL_COPY.summary}
          </Button>
          <Button size="sm" variant="outline" className="min-h-11" disabled={busy != null} onClick={() => void run("json")}>
            {busy === "json" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            {EXPORT_COPY.json}
          </Button>
          <Button size="sm" variant="outline" className="min-h-11" disabled={busy != null} onClick={() => void run("csv")}>
            {busy === "csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {EXPORT_COPY.csv}
          </Button>
        </div>
        {busy && <p className="text-white/60 text-xs">{EXPORT_COPY.working}</p>}
        {error && <p className="text-red-300 text-xs">{error}</p>}
        {data && <SessionBoardExportView data={data} />}
      </CardContent>
    </Card>
  );
}
