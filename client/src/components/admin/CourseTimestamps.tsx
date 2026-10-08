/**
 * Edit a week's course clips. A "Test" link opens that second on YouTube.
 * Low-confidence rows stay off the public board until they are saved with a change.
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LAST_BOARD_WEEK } from "@shared/sessionBoard";

type SpanDraft = {
  stageIndex: number;
  name: string;
  short: string;
  liveStart: string;
  liveEnd: string;
  editedStart: string;
  editedEnd: string;
  evidence: string;
  confidence: "high" | "low";
  adminEdited: boolean;
};

function seconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function field(value: number | null): string {
  return value == null ? "" : String(value);
}

function testHref(videoId: string, start: string): string | null {
  const t = seconds(start);
  if (!videoId || t == null) return null;
  return `https://youtu.be/${videoId}?t=${t}`;
}

export function CourseTimestamps() {
  const [week, setWeek] = useState(2);
  const query = trpc.sessionBoard.courseAdmin.useQuery({ week }, { retry: false });
  const save = trpc.sessionBoard.saveCourse.useMutation({
    onSuccess: () => {
      toast.success("Course times saved");
      void query.refetch();
    },
    onError: (err) => toast.error(err.message || "Could not save"),
  });
  const mapTimes = trpc.sessionBoard.mapCourseTimes.useMutation({
    onSuccess: (data) => {
      toast.success(data.updated > 0 ? "Mapped the open live times" : "Live times already mapped");
      void query.refetch();
    },
    onError: (err) => toast.error(err.message || "Could not map times"),
  });
  const [liveId, setLiveId] = useState("");
  const [editedId, setEditedId] = useState("");
  const [rows, setRows] = useState<SpanDraft[]>([]);

  useEffect(() => {
    const data = query.data;
    if (!data || data.week !== week) return;
    setLiveId(data.liveVideoId ?? "");
    setEditedId(data.editedVideoId ?? "");
    setRows(data.spans.map((span) => {
      const stage = data.stages[span.stageIndex];
      return {
        stageIndex: span.stageIndex,
        name: stage?.name ?? `Stage ${span.stageIndex + 1}`,
        short: stage?.short ?? "",
        liveStart: field(span.liveStart),
        liveEnd: field(span.liveEnd),
        editedStart: field(span.editedStart),
        editedEnd: field(span.editedEnd),
        evidence: span.evidence,
        confidence: span.confidence,
        adminEdited: span.adminEdited,
      };
    }));
  }, [query.data, week]);

  const review = rows.filter((row) => row.confidence === "low" && !row.adminEdited && (seconds(row.liveStart) != null || seconds(row.editedStart) != null)).length;

  function patch(index: number, key: keyof SpanDraft, value: string) {
    setRows((prev) => prev.map((row) => row.stageIndex === index ? { ...row, [key]: value } : row));
  }

  return (
    <section className="rounded-xl border border-[#1a472a]/20 bg-white p-4" data-testid="course-timestamps">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#1a472a]">Week course</h3>
          {review > 0 ? <p className="text-sm text-[#1a472a]">{review} to review</p> : null}
        </div>
        <label className="text-sm font-semibold text-[#1a472a]">
          Week
          <select
            className="ml-2 min-h-11 rounded-md border border-[#1a472a]/30 bg-white px-2"
            value={week}
            data-testid="course-week"
            onChange={(e) => setWeek(Number(e.target.value))}
          >
            {Array.from({ length: LAST_BOARD_WEEK - 1 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      {query.isLoading ? <p className="mt-3 text-sm text-[#1a472a]/80">Loading course times.</p> : null}
      {query.error ? <p className="mt-3 text-sm text-[#9b2c2c]">{query.error.message}</p> : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-[#1a472a]">
          Live video
          <input className="mt-1 w-full min-h-11 rounded-md border border-[#1a472a]/30 px-2 font-normal" value={liveId} onChange={(e) => setLiveId(e.target.value)} data-testid="course-live-id" />
        </label>
        <label className="text-sm font-semibold text-[#1a472a]">
          Edited video
          <input className="mt-1 w-full min-h-11 rounded-md border border-[#1a472a]/30 px-2 font-normal" value={editedId} onChange={(e) => setEditedId(e.target.value)} data-testid="course-edited-id" />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm text-[#1a472a]">
          <thead>
            <tr className="border-b border-[#1a472a]/15">
              <th className="py-2 pr-2 font-semibold">Stage</th>
              <th className="py-2 pr-2 font-semibold">Live start</th>
              <th className="py-2 pr-2 font-semibold">Live end</th>
              <th className="py-2 pr-2 font-semibold">Edited start</th>
              <th className="py-2 pr-2 font-semibold">Edited end</th>
              <th className="py-2 font-semibold">Test</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const liveHref = testHref(liveId.trim(), row.liveStart);
              const editedHref = testHref(editedId.trim(), row.editedStart);
              const needsReview = row.confidence === "low" && !row.adminEdited && (seconds(row.liveStart) != null || seconds(row.editedStart) != null);
              return (
                <tr key={row.stageIndex} className="border-b border-[#1a472a]/10 align-top">
                  <td className="py-2 pr-2">
                    <div className="font-semibold">{row.short || row.name}</div>
                    {needsReview ? <div className="text-xs font-bold text-[#9b2c2c]">Review</div> : null}
                    {row.evidence ? (
                      <details>
                        <summary className="cursor-pointer text-xs text-[#1a472a]/70">Evidence</summary>
                        <p className="max-w-[16rem] text-xs text-[#1a472a]/80">{row.evidence}</p>
                      </details>
                    ) : null}
                  </td>
                  {(["liveStart", "liveEnd", "editedStart", "editedEnd"] as const).map((key) => (
                    <td key={key} className="py-2 pr-2">
                      <input
                        className="w-20 min-h-11 rounded-md border border-[#1a472a]/30 px-2"
                        inputMode="numeric"
                        aria-label={`${row.name} ${key}`}
                        value={row[key]}
                        onChange={(e) => patch(row.stageIndex, key, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="py-2">
                    <div className="flex flex-col gap-1">
                      {liveHref ? <a className="text-[#1a472a] underline" href={liveHref} target="_blank" rel="noopener noreferrer">Test live</a> : null}
                      {editedHref ? <a className="text-[#1a472a] underline" href={editedHref} target="_blank" rel="noopener noreferrer">Test edited</a> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        className="min-h-11 rounded-md border border-[#1a472a] px-4 font-semibold text-[#1a472a] disabled:opacity-60"
        data-testid="course-map-times"
        disabled={mapTimes.isPending}
        onClick={() => mapTimes.mutate()}
      >
        {mapTimes.isPending ? "Mapping" : "Map times now"}
      </button>
      <button
        type="button"
        className="min-h-11 rounded-md bg-[#1a472a] px-4 font-semibold text-white disabled:opacity-60"
        data-testid="course-save"
        disabled={save.isPending || rows.length === 0}
        onClick={() => save.mutate({
          week,
          liveVideoId: liveId.trim() || null,
          editedVideoId: editedId.trim() || null,
          spans: rows.map((row) => ({
            stageIndex: row.stageIndex,
            liveStart: seconds(row.liveStart),
            liveEnd: seconds(row.liveEnd),
            editedStart: seconds(row.editedStart),
            editedEnd: seconds(row.editedEnd),
            evidence: row.evidence,
          })),
        })}
      >
        {save.isPending ? "Saving" : "Save course times"}
      </button>
      </div>
    </section>
  );
}
