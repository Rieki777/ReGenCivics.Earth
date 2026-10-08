/**
 * The full recap for a week board, built from the recordings of that week.
 * The letter uses a shorter cut of the same facts.
 */
import { courseSideFromRecording, courseWeekFromRecording } from "./sessionCourse";
import { gistBullets, insightItems, nextSteps, type RecapItem } from "./recapDigest";
import { extractYoutubeVideoId } from "./youtubeVideoId";

export type WeekRecapWatch = { label: string; href: string };

export type WeekRecap = {
  week: number;
  title: string;
  gist: string[];
  insights: RecapItem[];
  steps: RecapItem[];
  watches: WeekRecapWatch[];
};

export type WeekRecapInsight = {
  kind: string;
  content: string;
  status?: string | null;
  speaker?: string | null;
  timestampSecs?: number | null;
};

export type WeekRecapRecording = {
  id: number;
  title: string;
  aiSummary?: string | null;
  overview?: string | null;
  actionItemsJson?: unknown;
  youtubeUrl?: string | null;
  youtubeVideoId?: string | null;
  editedYoutubeUrl?: string | null;
  editedYoutubeVideoId?: string | null;
  eventTitle?: string | null;
  season?: string | null;
  episodeNumber?: number | null;
  insights?: WeekRecapInsight[];
  tasks?: Array<{ id: number; title: string; workStatus?: string | null }>;
};

/** Stage 0 becomes the recap once the session has ended. Before that, the welcome stays. */
export function showSessionRecap(view: number, sessionEnded: boolean): boolean {
  return view === 0 && sessionEnded;
}

export function recordingMatchesWeek(row: WeekRecapRecording, week: number): boolean {
  return courseWeekFromRecording({
    title: row.title,
    eventTitle: row.eventTitle,
    season: row.season,
    episodeNumber: row.episodeNumber,
  }) === week;
}

function watchId(row: WeekRecapRecording): string | null {
  return extractYoutubeVideoId(row.editedYoutubeVideoId)
    || extractYoutubeVideoId(row.editedYoutubeUrl)
    || extractYoutubeVideoId(row.youtubeVideoId)
    || extractYoutubeVideoId(row.youtubeUrl);
}

/** Edited cut first, then the live session. */
function bySide(a: WeekRecapRecording, b: WeekRecapRecording): number {
  const rank = (row: WeekRecapRecording) => (courseSideFromRecording(row) === "edited" ? 0 : 1);
  return rank(a) - rank(b) || a.id - b.id;
}

export function assembleWeekRecap(input: {
  week: number;
  title: string;
  origin: string;
  recordings: WeekRecapRecording[];
}): WeekRecap {
  const origin = input.origin.replace(/\/$/, "");
  const ranked = input.recordings.filter((row) => recordingMatchesWeek(row, input.week)).sort(bySide);
  const summary = ranked.map((row) => (row.aiSummary || row.overview || "").trim()).find(Boolean) ?? "";
  const insightSource = ranked.find((row) => (row.insights ?? []).some((item) => item.status !== "dismissed" && item.content.trim()));
  const tasks = ranked.flatMap((row) => row.tasks ?? []);
  const seenTasks = new Set<number>();
  const uniqueTasks = tasks.filter((task) => {
    if (seenTasks.has(task.id)) return false;
    seenTasks.add(task.id);
    return true;
  });
  const actionItems = ranked.flatMap((row) => (Array.isArray(row.actionItemsJson) ? row.actionItemsJson : []));
  const watches: WeekRecapWatch[] = [];
  const seenVideos = new Set<string>();
  for (const row of ranked) {
    const id = watchId(row);
    if (!id || seenVideos.has(id)) continue;
    seenVideos.add(id);
    const edited = courseSideFromRecording(row) === "edited";
    watches.push({
      label: edited ? "Watch the edited recording" : "Watch the live session",
      href: `https://youtu.be/${id}`,
    });
  }
  return {
    week: input.week,
    title: input.title,
    gist: gistBullets(summary, 5),
    insights: insightSource ? insightItems(insightSource.insights ?? [], watchId(insightSource), 3) : [],
    steps: nextSteps({
      tasks: uniqueTasks,
      actionItems,
      weekBoardHref: `${origin}/season2/week/${input.week}`,
      origin,
      limit: 5,
    }),
    watches,
  };
}
