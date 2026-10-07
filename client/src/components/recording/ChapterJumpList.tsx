import { chapterStamp, chapterWatchUrl, preferredChapters } from "@shared/youtubeChapters";
import { extractYoutubeVideoId } from "@shared/youtubeVideoId";

export function ChapterJumpList({
  descriptionChapters,
  aiChapters,
  videoId,
  watchUrl,
}: {
  descriptionChapters?: unknown;
  aiChapters?: unknown;
  videoId?: string | null;
  watchUrl?: string | null;
}) {
  const chapters = preferredChapters(descriptionChapters, aiChapters);
  if (chapters.length === 0) return null;
  const id = (videoId ?? "").trim() || extractYoutubeVideoId(watchUrl);
  return (
    <div data-testid="chapter-jump-list">
      <h5 className="text-[#7dd87d] font-semibold text-[11px] uppercase tracking-wide mb-2">
        Jump to a moment
      </h5>
      <ul className="space-y-1">
        {chapters.map((chapter) => {
          const stamp = chapterStamp(chapter);
          const href = id ? chapterWatchUrl(id, chapter.tSeconds) : null;
          return (
            <li key={`${chapter.tSeconds}-${chapter.title}`}>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-[#7dd87d] transition-colors"
                >
                  <span className="text-[#7dd87d]/70 font-mono mr-2">{stamp}</span>
                  {chapter.title}
                </a>
              ) : (
                <span className="text-white/80">
                  <span className="text-white/60 font-mono mr-2">{stamp}</span>
                  {chapter.title}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
