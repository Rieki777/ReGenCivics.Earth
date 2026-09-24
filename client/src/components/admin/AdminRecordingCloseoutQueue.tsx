/**
 * Recording closeout queue — ownership + due dates on Admin → Edited Cuts.
 * Status: Needs cut / In progress / Ready to publish / Done.
 * Persists via recordings.setCloseoutMeta (site_settings bag). Never emails.
 */
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  Loader2,
  Scissors,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  CLOSEOUT_STATUS_LABELS,
  RECORDING_CLOSEOUT_FILTERS,
  type RecordingCloseoutFilter,
  type RecordingCloseoutStatus,
  isRecordingCloseoutFilter,
} from "@shared/recordingCloseout";

type QueueRow = {
  id: number;
  title: string;
  sessionDate: string | Date | null;
  createdAt: string | Date;
  editedYoutubeUrl: string | null;
  youtubeVideoId: string | null;
  recordingKind: string;
  eventId: number | null;
  eventTitle: string | null;
  status: RecordingCloseoutStatus;
  assignee: string | null;
  roleSlug: string | null;
  unassigned: boolean;
  dueDate: string | null;
  overdue: boolean;
  editedHref: string;
  eventsHref: string;
};

const FILTER_LABELS: Record<RecordingCloseoutFilter, string> = {
  open: "Open",
  needs_cut: "Needs cut",
  in_progress: "In progress",
  ready_to_publish: "Ready to publish",
  done: "Done",
  unassigned: "Unassigned",
  overdue: "Overdue",
  all: "All",
};

const STATUS_CHIP: Record<RecordingCloseoutStatus, string> = {
  needs_cut: "border-amber-300 bg-amber-50 text-amber-900",
  in_progress: "border-sky-300 bg-sky-50 text-sky-900",
  ready_to_publish: "border-[#7dd87d]/50 bg-[#7dd87d]/15 text-[#1a472a]",
  done: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

function readFilterFromUrl(): RecordingCloseoutFilter {
  try {
    const f = new URLSearchParams(window.location.search).get("filter");
    if (f && isRecordingCloseoutFilter(f)) return f;
  } catch {
    /* no window */
  }
  return "open";
}

function readFocusRecordingId(): number | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("recording");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function formatSessionDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function scrollToPublishCard(recordingId: number) {
  try {
    const el = document.querySelector(`[data-edited-cut-id="${recordingId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[#1a472a]/40");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-[#1a472a]/40");
      }, 1800);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "edited-cuts");
    url.searchParams.set("recording", String(recordingId));
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* ignore */
  }
}

export function AdminRecordingCloseoutQueue() {
  const [filter, setFilter] = useState<RecordingCloseoutFilter>(() => readFilterFromUrl());
  const focusId = useMemo(() => readFocusRecordingId(), []);

  const queue = trpc.recordings.adminCloseoutQueue.useQuery(
    { filter, limit: 100 },
    { staleTime: 20_000 },
  );
  const utils = trpc.useUtils();

  const setMeta = trpc.recordings.setCloseoutMeta.useMutation({
    onSuccess: () => {
      utils.recordings.adminCloseoutQueue.invalidate();
      toast.success("Closeout updated");
    },
    onError: (err) => toast.error(err.message || "Could not save closeout"),
  });

  const rows = (queue.data?.rows ?? []) as QueueRow[];
  const counts = queue.data?.counts ?? {
    open: 0,
    needs_cut: 0,
    in_progress: 0,
    ready_to_publish: 0,
    done: 0,
    unassigned: 0,
    overdue: 0,
    all: 0,
  };
  const roleOptions = queue.data?.roleOptions ?? [];

  function selectFilter(next: RecordingCloseoutFilter) {
    setFilter(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "edited-cuts");
      url.searchParams.set("filter", next);
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* ignore */
    }
  }

  return (
    <Card data-testid="admin-recording-closeout-queue" className="border-stone-200">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-[#1a472a]">
          <Scissors className="w-5 h-5" />
          Recording closeout queue
        </CardTitle>
        <CardDescription className="text-stone-600">
          After a live session ends — assign an owner, set a due date, and track cut → publish →
          link. Does not send email. Paste the edited YouTube URL in the cards below to mark{" "}
          <span className="font-medium text-stone-800">Done</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter recording closeout queue"
        >
          {RECORDING_CLOSEOUT_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              data-testid={`closeout-filter-${f}`}
              onClick={() => selectFilter(f)}
              className={`min-h-11 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === f
                  ? "bg-[#1a472a] text-[#7dd87d]"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {FILTER_LABELS[f]}
              <span className="ml-1 opacity-75">({counts[f] ?? 0})</span>
            </button>
          ))}
          {counts.overdue > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              {counts.overdue} overdue
            </span>
          )}
        </div>

        {queue.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-stone-500 py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading closeout queue…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-stone-800">Nothing in this filter</p>
            <p className="text-sm text-stone-500 mt-1">
              Open shows anything not Done. Switch filters or publish an edited cut below.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Session</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Owner</th>
                  <th className="px-3 py-2 font-semibold">Due</th>
                  <th className="px-3 py-2 font-semibold">Links</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const highlighted = focusId === row.id;
                  return (
                    <tr
                      key={row.id}
                      data-testid={`closeout-row-${row.id}`}
                      className={`border-t border-stone-100 bg-white hover:bg-[#7dd87d]/5 ${
                        highlighted ? "bg-[#7dd87d]/10" : ""
                      } ${row.overdue ? "bg-amber-50/40" : ""}`}
                    >
                      <td className="px-3 py-2.5 align-top min-w-[12rem]">
                        <p className="font-semibold text-stone-900 leading-snug">{row.title}</p>
                        <p className="text-xs text-stone-500 mt-0.5 inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatSessionDate(row.sessionDate ?? row.createdAt)}
                        </p>
                        {row.eventTitle && (
                          <p className="text-[11px] text-stone-400 mt-0.5 truncate max-w-[16rem]">
                            Event: {row.eventTitle}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <Select
                          value={row.status}
                          disabled={setMeta.isPending || Boolean(row.editedYoutubeUrl)}
                          onValueChange={(value) => {
                            setMeta.mutate({
                              recordingId: row.id,
                              status: value as RecordingCloseoutStatus,
                            });
                          }}
                        >
                          <SelectTrigger
                            className={`h-9 w-[10.5rem] text-xs font-semibold border ${STATUS_CHIP[row.status]}`}
                            aria-label={`Status for ${row.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(CLOSEOUT_STATUS_LABELS) as RecordingCloseoutStatus[]).map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {CLOSEOUT_STATUS_LABELS[s]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        {row.editedYoutubeUrl && (
                          <p className="text-[10px] text-emerald-700 mt-1">From published cut</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top space-y-1.5 min-w-[11rem]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <Input
                            defaultValue={row.assignee ?? ""}
                            placeholder="Owner name…"
                            className="h-9 text-xs"
                            aria-label={`Assignee for ${row.title}`}
                            onBlur={(e) => {
                              const next = e.target.value.trim();
                              if (next === (row.assignee ?? "")) return;
                              setMeta.mutate({
                                recordingId: row.id,
                                assignee: next || null,
                              });
                            }}
                          />
                        </div>
                        <Select
                          value={row.roleSlug || "__none__"}
                          disabled={setMeta.isPending}
                          onValueChange={(value) => {
                            const roleSlug = value === "__none__" ? null : value;
                            const role = roleOptions.find((r) => r.roleSlug === roleSlug);
                            setMeta.mutate({
                              recordingId: row.id,
                              roleSlug,
                              // Prefill free-text from role title when empty
                              ...(role && !row.assignee
                                ? { assignee: role.roleTitle }
                                : {}),
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-[11px]" aria-label="Role holder">
                            <SelectValue placeholder="Role seat…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No role seat</SelectItem>
                            {roleOptions.map((r) => (
                              <SelectItem key={r.roleSlug} value={r.roleSlug}>
                                {r.roleTitle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {row.unassigned && row.status !== "done" && (
                          <p className="text-[10px] font-semibold text-amber-700">Unassigned</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top whitespace-nowrap">
                        <Input
                          type="date"
                          defaultValue={row.dueDate ?? ""}
                          className={`h-9 text-xs w-[9.5rem] ${
                            row.overdue ? "border-amber-400 bg-amber-50" : ""
                          }`}
                          aria-label={`Due date for ${row.title}`}
                          onBlur={(e) => {
                            const next = e.target.value || null;
                            if (next === (row.dueDate ?? null)) return;
                            setMeta.mutate({
                              recordingId: row.id,
                              dueDate: next,
                            });
                          }}
                        />
                        {row.overdue && (
                          <p className="text-[10px] font-semibold text-amber-800 mt-1 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top space-y-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="h-8 text-xs bg-[#1a472a] hover:bg-[#0f2d1a]"
                          onClick={() => scrollToPublishCard(row.id)}
                          data-testid={`closeout-open-cut-${row.id}`}
                        >
                          Open cut
                        </Button>
                        <a
                          href={row.eventsHref}
                          className="flex items-center gap-1 text-[11px] text-[#1a472a] hover:underline"
                        >
                          Events <ExternalLink className="w-3 h-3" />
                        </a>
                        {row.youtubeVideoId && (
                          <a
                            href={`https://www.youtube.com/watch?v=${encodeURIComponent(row.youtubeVideoId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-stone-500 hover:underline"
                          >
                            Raw <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminRecordingCloseoutQueue;
