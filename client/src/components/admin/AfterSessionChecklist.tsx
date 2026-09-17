/**
 * After-session checklist on Admin Events past cards.
 * Stone/forest admin styles; localStorage checkbox overrides v1.
 */
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Mail,
  Scissors,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { queueOutboundWriteFill } from "@shared/outboundWriteFill";
import { isLetterLayout } from "@shared/letterLayout";
import {
  type AfterSessionChecklistItem,
  type AfterSessionLetterLike,
  type AfterSessionOverrides,
  type AfterSessionRecordingLike,
  type ChecklistItemId,
  afterSessionOverrideStorageKey,
  applyChecklistOverrides,
  buildAfterSessionChecklist,
  checklistProgress,
} from "@shared/afterSessionChecklist";

type EventLike = {
  id: number;
  title?: string | null;
  status?: string | null;
  recordingId?: number | null;
  youtubeUrl?: string | null;
};

function readOverrides(eventId: number): AfterSessionOverrides {
  try {
    const raw = localStorage.getItem(afterSessionOverrideStorageKey(eventId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AfterSessionOverrides;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(eventId: number, next: AfterSessionOverrides) {
  try {
    localStorage.setItem(afterSessionOverrideStorageKey(eventId), JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

const STATUS_STYLE: Record<
  AfterSessionChecklistItem["status"],
  { chip: string; label: string }
> = {
  done: { chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", label: "Done" },
  pending: { chip: "bg-amber-500/15 text-amber-200 border-amber-500/30", label: "Needs" },
  optional: { chip: "bg-white/5 text-white/60 border-white/15", label: "Optional" },
  action: { chip: "bg-[#7dd87d]/15 text-[#9de89d] border-[#7dd87d]/35", label: "Act" },
  na: { chip: "bg-white/5 text-white/40 border-white/10", label: "N/A" },
};

function ItemIcon({ id }: { id: ChecklistItemId }) {
  const cls = "w-3.5 h-3.5 shrink-0 text-white/55";
  switch (id) {
    case "watch":
      return <Video className={cls} />;
    case "edited_cut":
      return <Scissors className={cls} />;
    case "recording_email":
      return <Mail className={cls} />;
    default:
      return <Circle className={cls} />;
  }
}

export function AfterSessionChecklist({
  event,
  recording,
  letter,
  isPast,
  onMarkedCompleted,
}: {
  event: EventLike;
  recording?: AfterSessionRecordingLike | null;
  letter?: AfterSessionLetterLike | null;
  isPast: boolean;
  onMarkedCompleted?: () => void;
}) {
  const [overrides, setOverrides] = useState<AfterSessionOverrides>(() =>
    readOverrides(event.id),
  );

  const baseItems = useMemo(
    () =>
      buildAfterSessionChecklist({
        event,
        recording: recording ?? null,
        letter: letter ?? null,
        isPast,
      }),
    [event, recording, letter, isPast],
  );

  const items = useMemo(
    () => applyChecklistOverrides(baseItems, overrides),
    [baseItems, overrides],
  );
  const progress = checklistProgress(items);

  const toggleOverride = useCallback(
    (id: ChecklistItemId) => {
      setOverrides((prev) => {
        const currentlyDone =
          applyChecklistOverrides(baseItems, prev).find((i) => i.id === id)?.status ===
          "done";
        const next: AfterSessionOverrides = {
          ...prev,
          [id]: !currentlyDone,
        };
        writeOverrides(event.id, next);
        return next;
      });
    },
    [baseItems, event.id],
  );

  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Marked completed");
      onMarkedCompleted?.();
    },
    onError: (err) => toast.error(err.message || "Could not update event"),
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
      setOverrides((prev) => {
        const next = { ...prev, post_session_letter: true };
        writeOverrides(event.id, next);
        return next;
      });
      window.location.href = res.writeHref;
    },
    onError: (err) => toast.error(err.message || "Could not create draft"),
  });

  const recId = recording?.id ?? event.recordingId ?? null;

  return (
    <div
      className="mt-3 rounded-lg border border-white/10 bg-[#0f2417]/80 p-3 space-y-2"
      data-testid="after-session-checklist"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9de89d]/90">
          After-session
        </p>
        <span className="text-[11px] text-white/55">
          {progress.done}/{progress.total} done
          {progress.pendingAction > 0 ? ` · ${progress.pendingAction} open` : ""}
        </span>
      </div>

      <ul className="space-y-1.5">
        {items.map((item) => {
          const style = STATUS_STYLE[item.status];
          const checked = item.status === "done";
          return (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-md border border-white/5 bg-black/20 px-2 py-1.5"
              data-testid={`after-session-item-${item.id}`}
            >
              <button
                type="button"
                aria-label={checked ? `Uncheck ${item.label}` : `Check ${item.label}`}
                title="Toggle local override"
                onClick={() => toggleOverride(item.id)}
                className="mt-0.5 text-white/70 hover:text-[#9de89d]"
              >
                {checked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>
              <ItemIcon id={item.id} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-white/90">{item.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${style.chip}`}
                  >
                    {style.label}
                  </span>
                  {item.href && (
                    <a
                      href={item.href}
                      className="text-[10px] text-[#9de89d]/80 hover:text-[#9de89d] inline-flex items-center gap-0.5"
                    >
                      Open <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-white/50 leading-snug">{item.detail}</p>
              </div>
              <div className="shrink-0 flex flex-col gap-1">
                {item.id === "post_session_letter" && item.canAct && recId != null && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={draftLetter.isPending}
                    onClick={() => draftLetter.mutate({ recordingId: Number(recId) })}
                    className="h-7 px-2 text-[11px] text-[#9de89d] hover:bg-[#7dd87d]/10"
                  >
                    {draftLetter.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : null}
                    Draft letter
                  </Button>
                )}
                {item.id === "mark_completed" && item.canAct && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={updateEvent.isPending}
                    onClick={() =>
                      updateEvent.mutate({ id: event.id, status: "completed" })
                    }
                    className="h-7 px-2 text-[11px] text-amber-200 hover:bg-amber-500/10"
                  >
                    {updateEvent.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : null}
                    Mark completed
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AfterSessionChecklist;
