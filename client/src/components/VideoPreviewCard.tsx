/**
 * VideoPreviewCard
 *
 * Autoplays a short MP4 clip as a living preview/thumbnail.
 * Shows a "Watch Full Video" play-button callout overlay.
 * On click, opens the full YouTube video URL in a new tab.
 * If youtubeUrl is not yet provided, shows a "Coming Soon" badge instead.
 *
 * Performance: skips video autoplay on slow/save-data connections.
 */

import { useEffect, useRef } from "react";
import { Play, ExternalLink } from "lucide-react";

interface VideoPreviewCardProps {
  /** Path or URL to the short MP4 preview clip */
  mp4Url: string;
  /** Static poster image shown before video loads (and on slow connections) */
  posterUrl?: string;
  /** URL to the full YouTube (or other) video, opens in new tab on click */
  youtubeUrl?: string;
  /** Card title shown above the play button overlay */
  title?: string;
  /** Label shown on the play-button callout (default: "Watch Full Video") */
  playLabel?: string;
  /** If true, shows "Coming Soon" instead of the play callout */
  comingSoon?: boolean;
  /** Optional CSS class for the wrapper */
  className?: string;
}

export default function VideoPreviewCard({
  mp4Url,
  posterUrl,
  youtubeUrl,
  title,
  playLabel = "Watch Full Video",
  comingSoon = false,
  className = "",
}: VideoPreviewCardProps) {
  const isClickable = !comingSoon && !!youtubeUrl;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Skip autoplay on slow or data-saving connections
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn && (conn.saveData || conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")) {
      video.remove();
      return;
    }
    video.play().catch(() => {/* autoplay blocked, poster shows instead */});
  }, []);

  const handleClick = () => {
    if (isClickable) {
      window.open(youtubeUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-xl ${className}`} style={{ aspectRatio: "16/9" }}>
      {/* Autoplay MP4, muted, loops, no controls. preload=none saves ~4MB on slow connections. */}
      <video
        ref={videoRef}
        src={mp4Url}
        poster={posterUrl}
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />

      {/* Semi-transparent overlay so content reads clearly */}
      <div className="absolute inset-0 bg-black/25" />

      {/* Clickable overlay */}
      <button
        onClick={handleClick}
        disabled={!isClickable && !comingSoon}
        className={`absolute inset-0 flex flex-col items-center justify-center gap-4 w-full h-full ${
          isClickable ? "cursor-pointer group" : "cursor-default"
        }`}
        aria-label={isClickable ? `${playLabel}: ${title || "video"}` : title}
      >
        {/* Title */}
        {title && (
          <p
            className="text-white text-base md:text-xl font-semibold text-center px-4 drop-shadow-lg"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            {title}
          </p>
        )}

        {comingSoon ? (
          <div
            className="px-5 py-2.5 rounded-full bg-amber-500/90 text-[#1a472a] font-bold text-sm md:text-base shadow-lg"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Coming Soon
          </div>
        ) : (
          /* Play callout pill */
          <div className={`flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#7dd87d] text-[#1a472a] shadow-lg ${isClickable ? "group-hover:scale-105" : ""} transition-transform`}>
            <div className="w-8 h-8 rounded-full bg-[#1a472a]/20 flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-[#1a472a] ml-0.5" fill="#1a472a" />
            </div>
            <span className="font-bold text-sm md:text-base" style={{ fontFamily: "var(--font-accent)" }}>
              {playLabel}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-[#1a472a]/70 flex-shrink-0" />
          </div>
        )}
      </button>
    </div>
  );
}
