/**
 * Historical / past Schedule event recording chrome.
 * Collapsed: Watch + optional thumb/duration/overview teaser.
 * Expanded: Watch, RecordingDetail (chapters/follow-ups/transcript), forum, empty states.
 * No calendar / reminder / join / agenda CTAs (those stay on upcoming only).
 */
import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Video, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  formatDurationSeconds,
  resolveWatchUrl,
  truncateOneLine,
} from "@/lib/eventTemporal";

function fmtTs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
}

function chapterUrl(youtubeUrl: string, tSeconds: number): string {
  const sep = youtubeUrl.includes("?") ? "&" : "?";
  return `${youtubeUrl}${sep}t=${Math.max(0, Math.floor(tSeconds))}s`;
}

export type PastEventRecordingProps = {
  eventId: number;
  recordingId?: number | null;
  eventYoutubeUrl?: string | null;
  forumThreadId?: number | null;
};

function usePastRecording(props: PastEventRecordingProps) {
  const { eventId, recordingId, eventYoutubeUrl, forumThreadId } = props;
  const { data: recording, isLoading } = trpc.recordings.byEventId.useQuery(
    { eventId },
    { enabled: !!recordingId },
  );
  const watchUrl = resolveWatchUrl({
    editedYoutubeUrl: recording?.editedYoutubeUrl,
    youtubeUrl: recording?.youtubeUrl,
    riversideUrl: recording?.riversideUrl,
    eventYoutubeUrl,
  });
  const overviewLine = truncateOneLine(
    recording?.overview ?? recording?.aiSummary ?? null,
  );
  const durationLabel = formatDurationSeconds(recording?.durationSeconds ?? null);
  const forumPostId = recording?.forumPostId ?? forumThreadId ?? null;
  return {
    recording,
    isLoading: !!recordingId && isLoading,
    watchUrl,
    overviewLine,
    durationLabel,
    forumPostId,
    hasRecordingId: !!recordingId,
  };
}

const watchCompactClass =
  "inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs min-h-[36px]";

const watchPrimaryClass =
  "inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors text-sm";

/** Compact Watch for the collapsed bar — stopPropagation so expand does not toggle. */
export function PastEventCollapsedWatch(props: PastEventRecordingProps) {
  const { watchUrl } = usePastRecording(props);
  if (!watchUrl) return null;
  return (
    <a
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="past-event-watch-collapsed"
      className={watchCompactClass}
      onClick={(e) => e.stopPropagation()}
    >
      <Video className="w-3.5 h-3.5" />
      Watch
    </a>
  );
}

/** Thumbnail + duration + one-line overview for the collapsed past row. */
export function PastEventCollapsedMeta(props: PastEventRecordingProps) {
  const { hasRecordingId, recording, overviewLine, durationLabel, isLoading } =
    usePastRecording(props);

  if (!hasRecordingId) return null;
  if (isLoading && !recording) {
    return (
      <div className="flex gap-3 mt-2" data-testid="past-event-collapsed-meta">
        <div className="w-[96px] h-[54px] rounded-lg bg-white/5 flex-shrink-0 animate-pulse" />
        <p className="text-white/50 text-xs self-center">Loading recording…</p>
      </div>
    );
  }

  const thumb = recording?.thumbnailUrl ?? null;
  if (!thumb && !overviewLine && !durationLabel) return null;

  return (
    <div className="flex gap-3 mt-3 items-start" data-testid="past-event-collapsed-meta">
      {thumb ? (
        <img
          src={thumb}
          alt=""
          width={96}
          height={54}
          className="w-[96px] h-[54px] rounded-lg object-cover flex-shrink-0 border border-white/10"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-[96px] h-[54px] rounded-lg bg-[#1a472a] flex-shrink-0 flex items-center justify-center border border-white/10">
          <Video className="w-5 h-5 text-[#7dd87d]/70" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {durationLabel && (
          <p className="text-white/50 text-[11px] font-mono mb-0.5">{durationLabel}</p>
        )}
        {overviewLine ? (
          <p className="text-white/70 text-xs leading-snug line-clamp-2">
            <span className="text-[#7dd87d]/90 font-semibold">What we covered: </span>
            {overviewLine}
          </p>
        ) : (
          <p className="text-white/50 text-xs">Summary coming after processing</p>
        )}
      </div>
    </div>
  );
}

/**
 * RecordingDetail: overview, chapters (YouTube jump links), decisions,
 * follow-ups (action items), collapsible transcript. Prefers edited cut URL.
 */
export function RecordingDetail({ id }: { id: number }) {
  const { data, isLoading } = trpc.recordings.getPublic.useQuery({ id });
  const [showTranscript, setShowTranscript] = useState(false);
  if (isLoading) {
    return (
      <p className="text-white/60 text-sm px-1 py-2" data-testid="recording-detail-loading">
        Loading…
      </p>
    );
  }
  if (!data) {
    return (
      <p className="text-white/60 text-sm px-1 py-2" data-testid="recording-empty-missing">
        Recording not linked yet
      </p>
    );
  }

  const chapters =
    (data.chaptersJson as Array<{ tSeconds: number; title: string }> | null) ?? [];
  const decisions = (data.decisionsJson as string[] | null) ?? [];
  const actionItems =
    (data.actionItemsJson as Array<{ owner: string; item: string }> | null) ?? [];
  const transcript =
    (data.transcriptJson as Array<{ start: number; text: string }> | null) ?? [];
  const yt =
    resolveWatchUrl({
      editedYoutubeUrl: (data as { editedYoutubeUrl?: string | null }).editedYoutubeUrl,
      youtubeUrl: data.youtubeUrl,
      riversideUrl: data.riversideUrl,
    }) ?? null;

  const hasSummary =
    !!data.overview ||
    chapters.length > 0 ||
    decisions.length > 0 ||
    actionItems.length > 0 ||
    transcript.length > 0;

  if (!hasSummary) {
    return (
      <p
        className="text-white/60 text-sm px-1 py-2"
        data-testid="recording-empty-summary"
      >
        Summary coming after the session is processed
      </p>
    );
  }

  return (
    <div
      className="pt-3 space-y-4 text-sm border-t border-white/10"
      data-testid="recording-detail"
    >
      {data.overview && (
        <p className="text-white/80 leading-relaxed">{data.overview}</p>
      )}

      {chapters.length > 0 && (
        <div>
          <h5 className="text-[#7dd87d] font-semibold text-[11px] uppercase tracking-wide mb-2">
            Chapters
          </h5>
          <ul className="space-y-1">
            {chapters.map((c, i) => (
              <li key={i}>
                {yt ? (
                  <a
                    href={chapterUrl(yt, c.tSeconds)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-[#7dd87d] transition-colors"
                  >
                    <span className="text-[#7dd87d]/70 font-mono mr-2">
                      {fmtTs(c.tSeconds)}
                    </span>
                    {c.title}
                  </a>
                ) : (
                  <span className="text-white/80">
                    <span className="text-white/60 font-mono mr-2">
                      {fmtTs(c.tSeconds)}
                    </span>
                    {c.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {decisions.length > 0 && (
        <div>
          <h5 className="text-[#7dd87d] font-semibold text-[11px] uppercase tracking-wide mb-2">
            Decisions
          </h5>
          <ul className="list-disc list-inside space-y-1 text-white/80">
            {decisions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {actionItems.length > 0 && (
        <div>
          <h5 className="text-[#7dd87d] font-semibold text-[11px] uppercase tracking-wide mb-2">
            Follow-ups
          </h5>
          <ul className="space-y-1 text-white/80">
            {actionItems.map((a, i) => (
              <li key={i}>
                <span className="text-[#7dd87d]/80 font-medium">{a.owner}:</span>{" "}
                {a.item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {transcript.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="text-white/60 hover:text-white text-xs inline-flex items-center gap-1"
          >
            {showTranscript ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript && (
            <div className="mt-2 max-h-64 overflow-y-auto space-y-1 pr-2">
              {transcript.map((seg, i) => (
                <p key={i} className="text-white/60 leading-relaxed">
                  {yt ? (
                    <a
                      href={chapterUrl(yt, seg.start)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7dd87d]/60 font-mono mr-2 hover:text-[#7dd87d]"
                    >
                      {fmtTs(seg.start)}
                    </a>
                  ) : (
                    <span className="text-white/60 font-mono mr-2">
                      {fmtTs(seg.start)}
                    </span>
                  )}
                  {seg.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Expanded past-event body: Watch (primary), forum link, RecordingDetail or
 * distinct empty states. Intentionally omits CalendarCta / reminder / join / agenda.
 */
export function PastEventExpandedPanel(props: PastEventRecordingProps & {
  description?: string | null;
  guestSpeakerName?: string | null;
  guestSpeakerTopic?: string | null;
  guestSpeakerBio?: string | null;
}) {
  const {
    description,
    guestSpeakerName,
    guestSpeakerTopic,
    guestSpeakerBio,
    recordingId,
  } = props;
  const { watchUrl, forumPostId, hasRecordingId, isLoading } = usePastRecording(props);

  let emptyState: ReactNode = null;
  if (!hasRecordingId) {
    emptyState = (
      <p className="text-white/60 text-sm" data-testid="past-empty-no-recording">
        No recording linked yet
      </p>
    );
  } else if (!isLoading && !watchUrl) {
    emptyState = (
      <p className="text-white/60 text-sm" data-testid="past-empty-processing">
        Recording processing…
      </p>
    );
  }

  return (
    <div className="px-6 pb-6 pt-0 border-t border-white/10" data-testid="past-event-expanded">
      {description && (
        <p className="text-white/70 mb-6 mt-4 safe-prose">{description}</p>
      )}
      {guestSpeakerName && (
        <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-xl px-4 py-3 mb-4">
          <p className="text-white text-sm font-medium">
            With {guestSpeakerName}
            {guestSpeakerTopic ? ` on ${guestSpeakerTopic}` : ""}
          </p>
          {guestSpeakerBio && (
            <p className="text-white/70 text-xs mt-1">{guestSpeakerBio}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="past-event-watch-expanded"
            className={watchPrimaryClass}
          >
            <Video className="w-5 h-5" />
            Watch
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
        )}
        {forumPostId && (
          <Link
            href={`/community/post/${forumPostId}`}
            data-testid="past-event-discuss"
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-[#7dd87d] px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-[#7dd87d]/30"
          >
            Discuss on Forum
          </Link>
        )}
      </div>

      {emptyState}

      {hasRecordingId && recordingId != null && (
        <RecordingDetail id={recordingId} />
      )}
    </div>
  );
}

/**
 * Pure presentational gate used in tests: past cards must not render calendar
 * labels. Upcoming path is owned by Schedule.tsx.
 */
export function PastEventCtaGate({ isPast, children }: { isPast: boolean; children: ReactNode }) {
  if (isPast) return null;
  return <>{children}</>;
}
