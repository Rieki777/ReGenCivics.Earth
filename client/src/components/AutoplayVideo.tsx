/**
 * AutoplayVideo Component
 * Displays a custom thumbnail with play button overlay.
 * Click-to-play only (no autoplay on scroll).
 * Uses privacy-enhanced YouTube embed (youtube-nocookie.com).
 * Automatically fetches video duration via YouTube IFrame API.
 * Shows a loading skeleton while duration is being fetched.
 * Supports optional "coming soon" state.
 */

import { useState, useEffect, useRef } from "react";
import { Play, Clock } from "lucide-react";

interface AutoplayVideoProps {
  /** YouTube video ID (e.g. "_LO2sItSofo") */
  videoId: string;
  /** Title for the iframe (accessibility) */
  title: string;
  /** URL or path to the custom thumbnail image */
  thumbnailUrl: string;
  /** Alt text for the thumbnail */
  thumbnailAlt?: string;
  /** Optional CSS class for the container */
  className?: string;
  /** Optional label text shown below the duration */
  playLabel?: string;
  /** If true, shows "Video Coming Soon" overlay instead of play button */
  comingSoon?: boolean;
}

// Global cache so we only fetch each video's duration once
const durationCache: Record<string, string> = {};

// Track if YT API script is loaded
let ytApiLoaded = false;
let ytApiLoading = false;
const ytApiCallbacks: (() => void)[] = [];

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiLoaded && (window as any).YT?.Player) {
      resolve();
      return;
    }

    ytApiCallbacks.push(resolve);

    if (ytApiLoading) return;
    ytApiLoading = true;

    // Set up the global callback
    (window as any).onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      ytApiCallbacks.forEach((cb) => cb());
      ytApiCallbacks.length = 0;
    };

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
}

function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Duration skeleton shown while fetching */
function DurationSkeleton() {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-3">
      <div className="w-4 h-4 rounded-full bg-white/20 animate-pulse" />
      <div className="w-10 h-4 rounded-md bg-white/20 animate-pulse" />
    </div>
  );
}

export default function AutoplayVideo({
  videoId,
  title,
  thumbnailUrl,
  thumbnailAlt = "Video thumbnail",
  className = "",
  playLabel,
  comingSoon = false,
}: AutoplayVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<string>(durationCache[videoId] || "");
  const [durationLoading, setDurationLoading] = useState(!durationCache[videoId] && !comingSoon);
  const hiddenPlayerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (comingSoon || !videoId) {
      setDurationLoading(false);
      return;
    }

    if (durationCache[videoId]) {
      setDuration(durationCache[videoId]);
      setDurationLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDuration = async () => {
      try {
        await loadYTApi();
        if (cancelled) return;

        const YT = (window as any).YT;
        if (!YT?.Player || !hiddenPlayerRef.current) {
          setDurationLoading(false);
          return;
        }

        // Create a unique container for the hidden player
        const containerId = `yt-hidden-${videoId}-${Date.now()}`;
        const div = document.createElement("div");
        div.id = containerId;
        div.style.position = "absolute";
        div.style.width = "1px";
        div.style.height = "1px";
        div.style.overflow = "hidden";
        div.style.opacity = "0";
        div.style.pointerEvents = "none";
        hiddenPlayerRef.current.appendChild(div);

        playerInstanceRef.current = new YT.Player(containerId, {
          videoId,
          width: 1,
          height: 1,
          playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (event: any) => {
              if (cancelled) {
                event.target.destroy();
                return;
              }
              const dur = event.target.getDuration();
              if (dur && dur > 0) {
                const formatted = formatSeconds(dur);
                durationCache[videoId] = formatted;
                setDuration(formatted);
              }
              setDurationLoading(false);
              // Clean up the hidden player
              setTimeout(() => {
                try {
                  event.target.destroy();
                } catch (e) {
                  // ignore
                }
              }, 500);
            },
            onError: () => {
              if (!cancelled) setDurationLoading(false);
            },
          },
        });
      } catch (error) {
        if (!cancelled) setDurationLoading(false);
      }
    };

    // Timeout fallback: stop showing skeleton after 8s even if fetch fails
    const timeout = setTimeout(() => {
      if (!cancelled) setDurationLoading(false);
    }, 8000);

    fetchDuration();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [videoId, comingSoon]);

  const startPlaying = () => {
    if (!comingSoon && !isPlaying) {
      setIsPlaying(true);
    }
  };

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=1`;

  return (
    <div className="relative">
      {/* Hidden container for duration-fetching player */}
      <div ref={hiddenPlayerRef} className="absolute w-0 h-0 overflow-hidden" aria-hidden="true" />
      <div
        className={`relative w-full overflow-hidden rounded-xl ${className}`}
        style={{ aspectRatio: "16/9" }}
      >
        {!isPlaying ? (
          <button
            onClick={startPlaying}
            className={`relative w-full h-full group ${comingSoon ? "cursor-default" : "cursor-pointer"} block`}
            aria-label={comingSoon ? `Video coming soon: ${title}` : `Play video: ${title}`}
          >
            {/* Thumbnail */}
            <img
              src={thumbnailUrl}
              alt={thumbnailAlt}
              width="1280"
              height="720"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />

            {/* Dark overlay */}
            <div className={`absolute inset-0 ${comingSoon ? "bg-black/40" : "bg-black/20 group-hover:bg-black/30"} transition-colors`} />

            {/* Play button or Coming Soon badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {comingSoon ? (
                <div className="px-5 py-2.5 rounded-full bg-amber-500/90 text-[#1a472a] font-bold text-sm md:text-base shadow-lg"
                  style={{ fontFamily: "var(--font-accent)" }}>
                  Video Coming Soon
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#7dd87d] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 md:w-10 md:h-10 text-[#1a472a] ml-1" fill="#1a472a" />
                  </div>
                  {/* Duration: skeleton while loading, fade-in when ready */}
                  {durationLoading ? (
                    <DurationSkeleton />
                  ) : duration ? (
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-white/90 text-sm md:text-base font-semibold drop-shadow-lg animate-in fade-in duration-500">
                      <Clock className="w-4 h-4" />
                      <span style={{ fontFamily: "var(--font-accent)" }}>{duration}</span>
                    </div>
                  ) : null}
                  {playLabel && (
                    <span
                      className="mt-2 text-white text-sm md:text-base font-semibold text-shadow-strong"
                      style={{ fontFamily: "var(--font-accent)" }}
                    >
                      {playLabel}
                    </span>
                  )}
                </>
              )}
            </div>
          </button>
        ) : (
          <iframe
            src={embedUrl}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="w-full h-full border-none rounded-xl"
          />
        )}
      </div>
    </div>
  );
}
