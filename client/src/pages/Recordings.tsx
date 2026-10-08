/**
 * Public session library. Every saved recording, with chapters from the
 * YouTube description when those exist.
 */
import { useState } from "react";
import { Link } from "wouter";
import { Video } from "lucide-react";
import { PageWrapper } from "@/components/PageWrapper";
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { trpc } from "@/lib/trpc";
import { ChapterJumpList } from "@/components/recording/ChapterJumpList";
import { formatDurationSeconds, resolveWatchUrl, truncateOneLine } from "@/lib/eventTemporal";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "season2", label: "Season 2" },
  { id: "open", label: "Open sessions" },
  { id: "seeds", label: "SEEDS" },
] as const;

type SeriesFilter = (typeof FILTERS)[number]["id"];

function formatWhen(value: Date | string | null): string {
  if (!value) return "Date coming";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date coming";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Recordings() {
  const { data = [], isLoading, isError, refetch } = trpc.recordings.library.useQuery();
  const [filter, setFilter] = useState<SeriesFilter>("all");
  const shown = data.filter((row) => filter === "all" || row.series === filter);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
        <SEO {...pageSEO.recordings} />
        <BackButton />
        <section className="px-4 pt-10 pb-6">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="text-[#7dd87d] text-sm font-semibold tracking-wide uppercase mb-3">The library</p>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Session <span className="text-[#7dd87d]">recordings</span>
            </h1>
            <p className="text-white/70 max-w-xl mx-auto">
              Season 2, open sessions, and earlier calls. Jump to a moment, or watch the whole thing.
            </p>
            <p className="mt-4">
              <Link href="/schedule" className="text-[#7dd87d] text-sm font-semibold hover:underline">
                Back to the schedule
              </Link>
            </p>
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="container mx-auto max-w-4xl">
            <div className="flex flex-wrap justify-center gap-2 mb-8" role="tablist" aria-label="Filter recordings">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    filter === item.id
                      ? "bg-[#7dd87d] text-[#1a472a]"
                      : "bg-white/10 text-white/80 hover:bg-white/15"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {isLoading && <p className="text-center text-white/60">Loading recordings…</p>}

            {isError && (
              <div className="text-center text-white/70 py-12">
                <p>The library didn't load.</p>
                <button type="button" className="mt-3 min-h-11 px-4 text-[#7dd87d] font-semibold underline" onClick={() => void refetch()}>
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !isError && shown.length === 0 && (
              <p className="text-center text-white/70 py-12">
                {data.length === 0
                  ? "Recordings land here after a session ends."
                  : "Nothing in this filter yet."}
              </p>
            )}

            <div className="space-y-5">
              {shown.map((row) => {
                const watchUrl = resolveWatchUrl({
                  editedYoutubeUrl: row.editedYoutubeUrl,
                  youtubeUrl: row.youtubeUrl,
                  riversideUrl: null,
                });
                const summary = truncateOneLine(row.overview ?? row.aiSummary ?? null, 180);
                const duration = formatDurationSeconds(row.durationSeconds);
                const thumb =
                  row.thumbnailUrl ||
                  (row.youtubeVideoId ? `https://i.ytimg.com/vi/${row.youtubeVideoId}/hqdefault.jpg` : null);
                return (
                  <article
                    key={row.id}
                    className="bg-white/5 border border-[#7dd87d]/25 rounded-2xl p-4 md:p-5"
                    data-testid="recording-card"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="w-full sm:w-44 h-28 object-cover rounded-xl border border-white/10 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-full sm:w-44 h-28 rounded-xl bg-[#1a472a] flex items-center justify-center flex-shrink-0">
                          <Video className="w-6 h-6 text-[#7dd87d]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-bold text-white">{row.title}</h2>
                        <p className="text-white/55 text-sm mt-1">
                          {formatWhen(row.sessionDate)}
                          {duration ? ` · ${duration}` : ""}
                        </p>
                        {row.event && (
                          <p className="mt-1">
                            <Link href={`/events/${row.event.id}`} className="text-[#7dd87d] text-sm hover:underline">
                              {row.event.title}
                            </Link>
                          </p>
                        )}
                        {summary && <p className="text-white/75 text-sm mt-2 leading-relaxed">{summary}</p>}
                        {watchUrl && (
                          <a
                            href={watchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm"
                          >
                            <Video className="w-4 h-4" />
                            Watch
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <ChapterJumpList
                        descriptionChapters={row.descriptionChaptersJson}
                        aiChapters={row.chaptersJson}
                        videoId={row.youtubeVideoId}
                        watchUrl={watchUrl}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
