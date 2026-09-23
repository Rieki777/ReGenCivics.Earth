/**
 * AdminEditsTab: edited-cut publishing surface (Phase 4, Movement
 * Coordination Engine).
 *
 * After a session is recorded (raw YouTube on Recordings), an editor
 * finishes a highlight cut. Admin pastes that YouTube URL here; Save
 * stores `editedYoutubeUrl` on the recording.
 */
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, Mail, Save, Scissors, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { queueOutboundWriteFill } from "@shared/outboundWriteFill";
import { isLetterLayout } from "@shared/letterLayout";
import { AdminRecordingCloseoutQueue } from "@/components/admin/AdminRecordingCloseoutQueue";

type RecordingRow = {
  id: number;
  title: string;
  sessionDate: Date | string | null;
  youtubeVideoId: string | null;
  editedYoutubeUrl: string | null;
  recordingKind: string;
  overview: string | null;
  createdAt: Date | string;
};

type StatusFilter = "needs_cut" | "published" | "all";

function hasEditedCut(row: RecordingRow): boolean {
  return Boolean((row.editedYoutubeUrl ?? "").trim());
}

function sessionTimestamp(row: RecordingRow): number {
  const raw = row.sessionDate ?? row.createdAt;
  const t = new Date(raw as string).getTime();
  return Number.isFinite(t) ? t : 0;
}

function RawLink({ videoId }: { videoId: string | null }) {
  if (!videoId) return <span className="text-xs text-stone-400">No raw video</span>;
  return (
    <a
      href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-[#1a472a] hover:text-[#0f2d1a] inline-flex items-center gap-1"
    >
      Raw session <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function RecordingCard({ row, onChanged }: { row: RecordingRow; onChanged: () => void }) {
  const [draft, setDraft] = useState(row.editedYoutubeUrl ?? "");
  const utils = trpc.useUtils();
  useEffect(() => {
    setDraft(row.editedYoutubeUrl ?? "");
  }, [row.editedYoutubeUrl]);
  const setCut = trpc.recordings.setEditedCut.useMutation({
    onSuccess: () => {
      onChanged();
      void utils.recordings.adminCloseoutQueue.invalidate();
    },
  });
  const draftLetter = trpc.recordings.draftPostSessionLetter.useMutation({
    onSuccess: (res) => {
      queueOutboundWriteFill({
        subject: res.subject,
        body: res.body,
        layout: isLetterLayout(res.layout) ? res.layout : "announcement",
      });
      toast.success(
        res.created
          ? `Draft letter #${res.id} created — opening Outbound Write`
          : `Draft letter #${res.id} ready — opening Outbound Write`,
      );
      window.location.href = res.writeHref;
    },
    onError: (err) => toast.error(err.message || "Could not create draft"),
  });
  const published = hasEditedCut(row);
  const dirty = (draft ?? "").trim() !== (row.editedYoutubeUrl ?? "").trim();
  const date = row.sessionDate
    ? new Date(row.sessionDate as string)
    : new Date(row.createdAt as string);
  const kindLabel = row.recordingKind || "raw";

  function handleClear() {
    if (!window.confirm("Remove the published edited cut URL from this recording?")) return;
    setDraft("");
    setCut.mutate({ recordingId: row.id, editedYoutubeUrl: null });
  }

  return (
    <Card className="border-stone-200" data-edited-cut-id={row.id} id={`edited-cut-${row.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-stone-900">{row.title}</p>
              {published ? (
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold"
                >
                  Published
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold"
                >
                  Needs cut
                </Badge>
              )}
            </div>
            <p className="text-xs text-stone-500">
              {date.toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {" · "}
              <span className="text-stone-400">{kindLabel}</span>
            </p>
            <div className="flex items-center gap-3 flex-wrap pt-0.5">
              <RawLink videoId={row.youtubeVideoId} />
              {row.editedYoutubeUrl && (
                <a
                  href={row.editedYoutubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                >
                  Edited cut <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`edited-url-${row.id}`} className="text-xs text-stone-600">
            Edited YouTube URL
          </Label>
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-stone-400 shrink-0" />
            <Input
              id={`edited-url-${row.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => setCut.mutate({ recordingId: row.id, editedYoutubeUrl: draft })}
              disabled={!dirty || setCut.isPending}
            >
              {setCut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1" />
              )}
              Save
            </Button>
            {published && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClear}
                disabled={setCut.isPending}
                title="Clear the edited cut (does not delete tasks)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {setCut.isSuccess && !setCut.isPending && !dirty && (
          <p className="text-xs text-emerald-700">Saved the edited highlight URL on this recording.</p>
        )}
        {setCut.error && (
          <p className="text-xs text-red-700">{setCut.error.message}</p>
        )}

        <div className="pt-1 border-t border-stone-100">
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="draft-session-letter"
            onClick={() => draftLetter.mutate({ recordingId: row.id })}
            disabled={draftLetter.isPending}
          >
            {draftLetter.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Mail className="w-3.5 h-3.5 mr-1" />
            )}
            Draft session letter
          </Button>
          <p className="text-[11px] text-stone-500 mt-1">
            Creates an Outbound Write draft (never auto-sends). Same recording reuses one draft.
          </p>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

export default function AdminEditsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("needs_cut");
  const [search, setSearch] = useState("");
  const list = trpc.recordings.adminListRecordings.useQuery({ limit: 100 });
  const rows = (list.data ?? []) as RecordingRow[];

  const counts = useMemo(() => {
    let needsCut = 0;
    let published = 0;
    for (const row of rows) {
      if (hasEditedCut(row)) published += 1;
      else needsCut += 1;
    }
    return { needsCut, published, all: rows.length };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (statusFilter === "needs_cut" && hasEditedCut(row)) return false;
      if (statusFilter === "published" && !hasEditedCut(row)) return false;
      if (q && !row.title.toLowerCase().includes(q)) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const aNeeds = hasEditedCut(a) ? 1 : 0;
      const bNeeds = hasEditedCut(b) ? 1 : 0;
      if (aNeeds !== bNeeds) return aNeeds - bNeeds; // needs cut first
      return sessionTimestamp(b) - sessionTimestamp(a); // newest first
    });
  }, [rows, statusFilter, search]);

  const filterChips: { value: StatusFilter; label: string; count: number }[] = [
    { value: "needs_cut", label: "Needs cut", count: counts.needsCut },
    { value: "published", label: "Published", count: counts.published },
    { value: "all", label: "All", count: counts.all },
  ];

  const emptyCopy = (() => {
    if (rows.length === 0) {
      return {
        title: "No recordings yet",
        body: "Record a session first — the raw YouTube file shows up on the Recordings tab. Once an editor finishes a highlight cut, paste the link here.",
      };
    }
    if (search.trim()) {
      return {
        title: "No matches",
        body: `Nothing matches “${search.trim()}” in the current filter. Try clearing search or switching to All.`,
      };
    }
    if (statusFilter === "needs_cut") {
      return {
        title: "All caught up",
        body: "Every recording in this list already has a published edited cut. Switch to Published or All to review them.",
      };
    }
    if (statusFilter === "published") {
      return {
        title: "No published cuts yet",
        body: "Paste an edited YouTube URL on a Needs cut row and Save to publish it here.",
      };
    }
    return {
      title: "Nothing to show",
      body: "Try another filter or clear search.",
    };
  })();

  return (
    <div className="space-y-6" data-testid="admin-edits-tab">
    <AdminRecordingCloseoutQueue />
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2">
          <Scissors className="w-5 h-5" />
          Edited cuts
        </CardTitle>
        <p className="text-sm text-stone-600">
          Saves the public edited highlight URL on this recording.
        </p>
        <ol className="text-sm text-stone-600 list-decimal list-inside space-y-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5">
          <li>
            <span className="font-medium text-stone-800">Raw session</span>
            {" — "}recorded video lives on the <span className="font-medium">Recordings</span> tab.
          </li>
          <li>
            <span className="font-medium text-stone-800">Editor finishes cut</span>
            {" — "}someone produces the highlight on YouTube.
          </li>
          <li>
            <span className="font-medium text-stone-800">Paste link here to publish</span>
            {" — "}Save attaches that URL to the session.
          </li>
        </ol>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter recordings by edited-cut status"
          data-testid="admin-edits-filter"
        >
          {filterChips.map(({ value, label, count }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={statusFilter === value}
              data-testid={`admin-edits-filter-${value}`}
              onClick={() => setStatusFilter(value)}
              className={`min-h-11 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                statusFilter === value
                  ? "bg-[#1a472a] text-[#7dd87d]"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="pl-9 text-sm"
            aria-label="Search recordings by title"
            data-testid="admin-edits-search"
          />
        </div>

        {list.isLoading && (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading recordings…
          </div>
        )}

        {!list.isLoading && visibleRows.length === 0 && (
          <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
            <Scissors className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            <p className="text-sm font-medium text-stone-800">{emptyCopy.title}</p>
            <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">{emptyCopy.body}</p>
            {statusFilter !== "all" && rows.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setStatusFilter("all")}
              >
                Show all
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {visibleRows.map((row) => (
            <RecordingCard key={row.id} row={row} onChanged={() => list.refetch()} />
          ))}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
