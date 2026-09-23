/**
 * Admin Call Tasks / Role Holders board.
 * Filters: Stuck+Unassigned (default) / Open / Overdue / Unassigned / Done.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, Loader2, ScrollText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  CALL_TASK_BOARD_DEFAULT_FILTER,
  CALL_TASK_BOARD_FILTERS,
  emptyCallTaskBoardCounts,
  type CallTaskBoardFilter,
} from "@shared/callTaskBoard";

type BoardRow = {
  id: number;
  title: string;
  workStatus: string;
  roleSlug: string | null;
  expiresAt: string | Date | null;
  ownerUserId: number | null;
  ownerSource: "doer" | "role_holder" | null;
  ownerName: string | null;
  recordingId: number | null;
  recordingTitle: string | null;
  eventId: number | null;
  eventTitle: string | null;
  stuck: boolean;
};

const FILTER_LABELS: Record<CallTaskBoardFilter, string> = {
  needs_people: "Stuck + Unassigned",
  open: "Open",
  overdue: "Overdue",
  unassigned: "Unassigned",
  done: "Done",
};

function formatDue(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function readFilterFromUrl(): CallTaskBoardFilter {
  try {
    const f = new URLSearchParams(window.location.search).get("filter");
    if (f && (CALL_TASK_BOARD_FILTERS as string[]).includes(f)) {
      return f as CallTaskBoardFilter;
    }
  } catch {
    /* no window */
  }
  return CALL_TASK_BOARD_DEFAULT_FILTER;
}

export function AdminCallTaskBoard() {
  const [filter, setFilter] = useState<CallTaskBoardFilter>(() => readFilterFromUrl());

  const board = trpc.bounties.adminCallTaskBoard.useQuery(
    { filter, limit: 100 },
    { staleTime: 30_000 },
  );

  const rows = (board.data?.rows ?? []) as BoardRow[];
  const counts = board.data?.counts ?? emptyCallTaskBoardCounts();

  const stuckCount = useMemo(
    () => rows.filter((r) => r.stuck).length,
    [rows],
  );

  function selectFilter(next: CallTaskBoardFilter) {
    setFilter(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "call-tasks");
      url.searchParams.set("filter", next);
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* ignore */
    }
  }

  return (
    <Card data-testid="admin-call-task-board">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1a472a]">
          <ScrollText className="w-4 h-4" /> Call Tasks board
        </CardTitle>
        <CardDescription>
          Morning default is Stuck + Unassigned (work that needs people). Overdue uses expiresAt;
          stuck flags overdue, stale unassigned (&gt;3d), or stale in review (&gt;7d). Existing filters unchanged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {CALL_TASK_BOARD_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => selectFilter(f)}
              data-testid={`call-task-filter-${f}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-[#1a472a] text-white"
                  : "bg-[#1a472a]/10 text-[#1a472a] hover:bg-[#1a472a]/20"
              }`}
            >
              {FILTER_LABELS[f]}
              <span className="ml-1 opacity-70">({counts[f]})</span>
            </button>
          ))}
          <span className="ml-auto text-xs text-[#1a472a]/70 inline-flex items-center gap-1">
            {counts.stuck > 0 && (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {counts.stuck} stuck overall
              </>
            )}
            {board.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          </span>
        </div>

        {board.isLoading ? (
          <div className="text-sm text-[#1a472a]/70 inline-flex items-center gap-2 py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> loading board
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#1a472a]/70 py-6 text-center">
            No call tasks in this filter.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#1a472a]/15">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#1a472a]/5 text-[11px] uppercase tracking-wider text-[#1a472a]/70">
                <tr>
                  <th className="px-3 py-2 font-semibold">Title</th>
                  <th className="px-3 py-2 font-semibold">Owner</th>
                  <th className="px-3 py-2 font-semibold">Event / Recording</th>
                  <th className="px-3 py-2 font-semibold">Due</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Stuck</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[#1a472a]/10 bg-white hover:bg-[#7dd87d]/5"
                    data-testid={`call-task-row-${row.id}`}
                  >
                    <td className="px-3 py-2 align-top">
                      <p className="font-semibold text-[#1a472a] leading-snug">{row.title}</p>
                      {row.roleSlug && (
                        <p className="text-[11px] text-[#1a472a]/60 mt-0.5">{row.roleSlug}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-[#1a472a]/85">
                      {row.ownerName ? (
                        <span>
                          {row.ownerName}
                          {row.ownerSource === "role_holder" && (
                            <span className="text-[10px] text-[#1a472a]/55 ml-1">(role)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-[#1a472a]/80">
                      {row.eventTitle || row.recordingTitle ? (
                        <div className="space-y-0.5">
                          {row.eventTitle && (
                            <Link
                              href={`/admin?tab=events&filter=past`}
                              className="block hover:underline text-[#1a472a]"
                            >
                              {row.eventTitle}
                            </Link>
                          )}
                          {row.recordingTitle && (
                            <Link
                              href={`/admin?tab=recordings`}
                              className="block text-[11px] text-[#1a472a]/65 hover:underline"
                            >
                              Rec: {row.recordingTitle}
                            </Link>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#1a472a]/45">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap text-[#1a472a]/80">
                      {formatDue(row.expiresAt)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#1a472a]/10 text-[#1a472a] capitalize">
                        {row.workStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {row.stuck ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="text-[#1a472a]/40 text-xs">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stuckCount > 0 && filter !== "done" && (
              <p className="text-[11px] text-amber-800/80 px-3 py-2 bg-amber-50 border-t border-amber-100">
                {stuckCount} row{stuckCount === 1 ? "" : "s"} in this view flagged stuck.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminCallTaskBoard;
