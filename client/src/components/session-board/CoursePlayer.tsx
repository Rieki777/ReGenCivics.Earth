/**
 * One clip per board stage. The iframe stays unloaded until someone taps play.
 * Live / Edited is remembered for the week. A finished stage grows a leaf on the path.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  courseModes,
  courseStorageKey,
  defaultCourseMode,
  formatClipClock,
  publishedSpan,
  readCourseProgress,
  seedCourse,
  sideHasTimes,
  videoIdFor,
  type CourseLocalProgress,
  type CourseMap,
  type CourseMode,
} from "@shared/sessionCourse";
import { SESSION_BOARD_SEASON } from "@shared/sessionBoard";

type YtPlayer = { destroy: () => void };
type YtApi = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YtPlayer;
  PlayerState?: { ENDED: number };
};

type YtWindow = { YT?: YtApi; onYouTubeIframeAPIReady?: () => void };

function ytWindow(): YtWindow {
  return window as unknown as YtWindow;
}

let ytApi: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const host = ytWindow();
  if (host.YT?.Player) return Promise.resolve();
  if (ytApi) return ytApi;
  ytApi = new Promise((resolve) => {
    const previous = host.onYouTubeIframeAPIReady;
    host.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return ytApi;
}

function storeProgress(week: number, progress: CourseLocalProgress) {
  try {
    localStorage.setItem(courseStorageKey(SESSION_BOARD_SEASON, week), JSON.stringify(progress));
  } catch {
    /* private window: the choice lasts for this visit */
  }
}

export function useWeekCourse(week: number, stageCount: number) {
  const [progress, setProgress] = useState<CourseLocalProgress>(() => {
    if (typeof window === "undefined") return { mode: "edited", stage: 0, watched: [] };
    try {
      return readCourseProgress(localStorage.getItem(courseStorageKey(SESSION_BOARD_SEASON, week)), stageCount);
    } catch {
      return { mode: "edited", stage: 0, watched: [] };
    }
  });
  const { user } = useAuth();
  const course = trpc.sessionBoard.course.useQuery({ week }, { retry: false, staleTime: 60_000 });
  const remote = trpc.sessionBoard.courseProgress.useQuery(
    { week },
    { enabled: !!user, retry: false, staleTime: 30_000 },
  );
  const mark = trpc.sessionBoard.markCourseWatched.useMutation();
  const map = course.data ?? seedCourse(week);

  useEffect(() => {
    const incoming = remote.data?.watched;
    if (!incoming?.length) return;
    setProgress((prev) => {
      const watched = [...new Set([...prev.watched, ...incoming.filter((n) => n >= 0 && n < stageCount)])];
      if (watched.length === prev.watched.length && watched.every((n, i) => n === prev.watched[i])) return prev;
      const next = { ...prev, watched };
      storeProgress(week, next);
      return next;
    });
  }, [remote.data, stageCount, week]);

  const setMode = (mode: CourseMode) => {
    setProgress((prev) => {
      const next = { ...prev, mode };
      storeProgress(week, next);
      return next;
    });
  };

  const markWatched = (stageIndex: number) => {
    setProgress((prev) => {
      const watched = prev.watched.includes(stageIndex) ? prev.watched : [...prev.watched, stageIndex];
      const stage = Math.min(stageCount - 1, Math.max(prev.stage, stageIndex + 1));
      const next = { ...prev, watched, stage };
      storeProgress(week, next);
      return next;
    });
    if (user) mark.mutate({ week, stageIndex });
  };

  return { map, progress, setMode, markWatched };
}

function LeafMark({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 15 V7" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M8 9 C8 5 4 4.2 2.8 3.2 C6 4 8 6.2 8 9Z" fill="currentColor" />
      <path d="M8 8 C8 4.2 12 3.2 13.2 2.2 C10 3.2 8 5.4 8 8Z" fill="currentColor" />
    </svg>
  );
}

export function CourseSprout() {
  return <LeafMark className="sb-sprout-mark" />;
}

function hqThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function CourseThumb({ videoId }: { videoId: string }) {
  const [src, setSrc] = useState(() => hqThumb(videoId));
  const [shownFor, setShownFor] = useState(videoId);
  if (shownFor !== videoId) {
    setShownFor(videoId);
    setSrc(hqThumb(videoId));
  }
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 900) return;
    let cancelled = false;
    const probe = new Image();
    probe.decoding = "async";
    probe.onload = () => {
      if (!cancelled && probe.naturalWidth >= 640) setSrc(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
    };
    probe.src = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    return () => { cancelled = true; };
  }, [videoId]);
  return (
    <img
      src={src}
      alt=""
      width={1280}
      height={720}
      loading="lazy"
      decoding="async"
      onError={() => setSrc(hqThumb(videoId))}
    />
  );
}

function resumeIndex(progress: CourseLocalProgress, stageCount: number): number {
  if (progress.watched.length === 0) return progress.stage;
  const next = Math.max(...progress.watched) + 1;
  return Math.min(stageCount - 1, next);
}

export function CoursePlayer({
  week,
  stageIndex,
  stages,
  map,
  progress,
  setMode,
  markWatched,
  onGo,
}: {
  week: number;
  stageIndex: number;
  stages: { name: string; short: string }[];
  map: CourseMap | null;
  progress: CourseLocalProgress;
  setMode: (mode: CourseMode) => void;
  markWatched: (stageIndex: number) => void;
  onGo: (index: number) => void;
}) {
  const modes = map ? courseModes(map) : [];
  const mode: CourseMode = map ? defaultCourseMode(map, progress.mode) : "edited";
  const span = map?.spans.find((row) => row.stageIndex === stageIndex);
  const clip = publishedSpan(span, mode);
  const videoId = map ? videoIdFor(map, mode) : null;
  const [armed, setArmed] = useState(false);
  const [ended, setEnded] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const markRef = useRef(markWatched);
  markRef.current = markWatched;
  const stage = stages[stageIndex];
  const resume = resumeIndex(progress, stages.length);
  const showResume = (progress.watched.length > 0 || progress.stage > 0) && resume !== stageIndex && stages[resume];

  useEffect(() => {
    setArmed(false);
    setEnded(false);
  }, [stageIndex, mode, videoId, clip?.start, clip?.end]);

  useEffect(() => {
    if (!armed || !clip || !videoId) return;
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let player: YtPlayer | null = null;
    const start = clip.start;
    const end = clip.end;
    void loadYouTubeApi().then(() => {
      const api = ytWindow().YT;
      if (dead || !host.isConnected || !api?.Player) return;
      player = new api.Player(host, {
        videoId,
        playerVars: {
          start,
          ...(end != null ? { end } : {}),
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event: { data: number }) => {
            const endedState = api.PlayerState?.ENDED ?? 0;
            if (event.data === endedState) {
              setEnded(true);
              markRef.current(stageIndex);
            }
          },
        },
      });
    });
    return () => {
      dead = true;
      try { player?.destroy(); } catch { /* the node is already gone */ }
    };
  }, [armed, clip?.start, clip?.end, videoId, stageIndex]);

  if (!map || modes.length === 0 || !stage) return null;

  const range = clip
    ? (clip.end == null ? formatClipClock(clip.start) : `${formatClipClock(clip.start)}-${formatClipClock(clip.end)}`)
    : "";
  const modeLabel = mode === "live" ? "Live" : "Edited";
  const coming = map ? modes.filter((item) => !sideHasTimes(map, item)) : [];

  return (
    <div className="sb-course" data-testid="course-player">
      <div className="sb-course-bar">
        {modes.length > 1 ? (
          <div className="sb-course-toggle" role="group" aria-label="Recording">
            {modes.map((item) => {
              const ready = map ? sideHasTimes(map, item) : false;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={item === mode}
                  disabled={!ready}
                  data-testid={`course-mode-${item}`}
                  onClick={() => { if (ready) setMode(item); }}
                >
                  {item === "live" ? "Live" : "Edited"}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="sb-course-side">{modeLabel}</span>
        )}
        {coming.map((item) => (
          <span key={item} className="sb-course-coming" data-testid={`course-coming-${item}`}>
            {item === "live" ? "Live times coming" : "Edited times coming"}
          </span>
        ))}
        {range ? <span className="sb-course-range">{range}</span> : null}
        {showResume ? (
          <button type="button" className="sb-btn sb-small sb-course-resume" data-testid="course-continue" onClick={() => onGo(resume)}>
            Continue · {stages[resume].short}
          </button>
        ) : null}
      </div>

      {clip && videoId && armed ? (
        <div className="sb-course-frame" data-testid="course-frame">
          <div ref={hostRef} />
        </div>
      ) : null}

      {clip && videoId && !armed ? (
        <button type="button" className="sb-course-card" data-testid="course-play" onClick={() => setArmed(true)}>
          <CourseThumb videoId={videoId} />
          <span className="sb-course-card-glow" aria-hidden="true" />
          <span className="sb-course-leaf" aria-hidden="true">
            <LeafMark className="sb-course-leaf-mark" />
          </span>
          <span className="sb-course-card-play" aria-hidden="true">
            <span className="sb-course-play-mark" />
          </span>
          <span className="sb-course-card-caption">
            <span className="sb-course-card-name">{stage.name}</span>
            <span className="sb-course-card-time">{range}</span>
          </span>
        </button>
      ) : null}

      {ended && stageIndex < stages.length - 1 ? (
        <button type="button" className="sb-btn sb-primary sb-course-next" data-testid="course-next" onClick={() => onGo(stageIndex + 1)}>
          Next · {stages[stageIndex + 1].short}
        </button>
      ) : null}
    </div>
  );
}
