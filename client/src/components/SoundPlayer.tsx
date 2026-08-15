/**
 * SoundPlayer — shared audio UI used by the desktop CommandPanel Sound tab
 * and the mobile playlist panel. Includes current-track display, playlist
 * toggle, progress bar, transport controls, and volume slider.
 *
 * Two variants:
 *   - "desktop": w-56 album region, 5px controls. CopyLink button in the
 *     action row.
 *   - "mobile": w-40 album region, larger hit targets, no CopyLink (share
 *     happens in the command panel).
 */

import { useState, useMemo } from "react";
import { useAudio } from "@/contexts/AudioContext";
import { isIos } from "@/lib/platform";
import {
  SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, Music, ListMusic, Plus, Download, Share2, Loader2,
} from "lucide-react";

interface SoundPlayerProps {
  variant?: "desktop" | "mobile";
  /** Called when the user navigates to a link inside the player. Used by
   *  MobilePlaylistPanel to dismiss the sheet. */
  onNavigate?: () => void;
}

function formatTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function SoundPlayer({ variant = "desktop", onNavigate }: SoundPlayerProps) {
  const {
    isPlaying, isBuffering, togglePlay, nextSong, prevSong,
    currentSong, currentIndex, playlist, playSong,
    duration, currentTime, seek, volume, setVolume, muted, toggleMute,
  } = useAudio();

  const [showTrackList, setShowTrackList] = useState(variant === "mobile");
  const isMobile = variant === "mobile";
  const iOS = useMemo(isIos, []);

  const playBtnSize = isMobile ? "w-12 h-12" : "w-10 h-10";
  const playIcon = isMobile ? "w-6 h-6" : "w-5 h-5";
  const skipSize = isMobile ? "w-6 h-6" : "w-5 h-5";
  const touchHit = isMobile ? "min-h-[48px] min-w-[48px]" : "p-2";

  /**
   * Share the current track. Uses the native share sheet when available
   * (mobile and most modern browsers) and falls back to copying a deep link
   * to the song's hymn book section so the player can paste it anywhere.
   * 2026-04-27: Rye wants Share to be the primary affordance over Download,
   * so this lives in the same action row with prominent styling.
   */
  const [shareCopied, setShareCopied] = useState(false);
  const shareCurrent = async () => {
    if (!currentSong) return;
    const slug = currentSong.slug || currentSong.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/hymn-book?song=${encodeURIComponent(slug)}`
      : `https://regencivics.earth/hymn-book?song=${encodeURIComponent(slug)}`;
    const text = `${currentSong.title} | Hymns of the ReGeneration`;
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: text, text, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 1800);
      }
    } catch {
      // User dismissed the native share sheet, or clipboard failed silently.
    }
  };

  return (
    <div className="space-y-3">
      {/* Title + artist */}
      <div className="text-center">
        <p className="text-[#7dd87d] text-sm font-medium truncate">
          {currentSong?.title ?? "No song loaded"}
        </p>
        {currentSong?.artist && (
          <p className="text-white/60 text-[11px]">{currentSong.artist}</p>
        )}
      </div>

      {/* Action buttons row.
          Primary actions (Playlist, Add song, Share song) take the wide cells;
          Download is icon-only since sharing is the preferred affordance. */}
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-3 items-stretch">
        <button
          type="button"
          onClick={() => setShowTrackList((s) => !s)}
          className={`flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg py-2 text-white text-xs font-semibold transition-colors ${
            isMobile ? "min-h-[44px]" : ""
          }`}
          aria-expanded={showTrackList}
        >
          <ListMusic className="w-3.5 h-3.5 text-[#7dd87d]" />
          {showTrackList ? "Hide" : "Playlist"}
        </button>
        <a
          href="/hymn-book#add-your-voice"
          onClick={onNavigate}
          className={`flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg py-2 text-white text-xs font-semibold transition-colors ${
            isMobile ? "min-h-[44px]" : ""
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-[#7dd87d]" />
          Add song
        </a>
        {currentSong && (
          <button
            type="button"
            onClick={shareCurrent}
            className={`flex items-center justify-center gap-1.5 bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] rounded-lg py-2 text-xs font-bold transition-colors ${
              isMobile ? "min-h-[44px]" : ""
            }`}
            aria-label={`Share ${currentSong.title}`}
          >
            <Share2 className="w-3.5 h-3.5" />
            {shareCopied ? "Copied!" : "Share song"}
          </button>
        )}
        {currentSong && (
          <a
            href={currentSong.src}
            download={`${currentSong.title} - Hymns of the ReGeneration.mp3`}
            className={`flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-white transition-colors ${
              isMobile ? "min-w-[44px] min-h-[44px]" : "w-9"
            }`}
            aria-label={`Download ${currentSong.title}`}
            title="Download"
          >
            <Download className="w-4 h-4 text-[#7dd87d]" />
          </a>
        )}
      </div>

      {/* Playlist */}
      {showTrackList && (
        <div
          className={`rounded-lg border border-white/10 bg-black/20 overflow-y-auto ${
            isMobile ? "max-h-80" : "max-h-56"
          }`}
        >
          <ul className="divide-y divide-white/5">
            {playlist.map((track, i) => {
              const isCurrent = i === currentIndex;
              return (
                <li key={track.src}>
                  <button
                    type="button"
                    onClick={() => playSong(i)}
                    className={`w-full flex items-center gap-2 px-3 ${
                      isMobile ? "py-3 min-h-[48px]" : "py-2"
                    } text-left transition-colors ${
                      isCurrent
                        ? "bg-[#7dd87d]/15 text-[#7dd87d]"
                        : "text-white/75 hover:bg-white/5 hover:text-white"
                    }`}
                    aria-current={isCurrent ? "true" : undefined}
                  >
                    <span className="w-5 flex-shrink-0 flex items-center justify-center">
                      {isCurrent && isPlaying ? (
                        <Music className="w-3 h-3 text-[#7dd87d] animate-pulse" />
                      ) : (
                        <span className="text-[10px] text-white/60 tabular-nums">
                          {(i + 1).toString().padStart(2, "0")}
                        </span>
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium truncate">{track.title}</span>
                      {track.artist && (
                        <span className="block text-[10px] text-white/70 truncate">{track.artist}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Progress */}
      <div>
        <input
          type="range"
          aria-label="Song progress"
          min={0}
          max={duration || 1}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-[#7dd87d] h-1"
        />
        <div className="flex justify-between text-white/60 text-xs mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Transport controls */}
      <div className={`flex items-center justify-center ${isMobile ? "gap-10" : "gap-6"}`}>
        <button
          onClick={prevSong}
          className={`text-white/60 hover:text-white transition-colors flex items-center justify-center ${touchHit}`}
          aria-label="Previous song"
        >
          <SkipBack className={skipSize} />
        </button>
        <button
          onClick={togglePlay}
          className={`${playBtnSize} bg-[#7dd87d] rounded-full flex items-center justify-center text-[#1a472a] hover:bg-[#9de89d] transition-colors`}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isBuffering && isPlaying ? (
            <Loader2 className={`${playIcon} animate-spin`} />
          ) : isPlaying ? (
            <Pause className={playIcon} />
          ) : (
            <Play className={`${playIcon} ml-0.5`} />
          )}
        </button>
        <button
          onClick={nextSong}
          className={`text-white/60 hover:text-white transition-colors flex items-center justify-center ${touchHit}`}
          aria-label="Next song"
        >
          <SkipForward className={skipSize} />
        </button>
      </div>

      {/* Volume — iOS controls playback volume at the system level and
          ignores programmatic changes, so instead of a dead slider it gets a
          working mute toggle (muted IS settable on iOS) plus a hint. */}
      {iOS ? (
        <div className="flex items-center justify-center gap-2 text-xs text-white/70">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -my-3 text-white/70 hover:text-white transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <span>{muted ? "Muted" : "Use your device volume buttons"}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            className="text-white/60 hover:text-white transition-colors p-2 -m-2"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            onInput={(e) => setVolume(Number((e.target as HTMLInputElement).value))}
            className="flex-1 accent-[#7dd87d] h-1"
            style={{ touchAction: "manipulation" }}
          />
        </div>
      )}

      {!isMobile && (
        <div className="flex items-center justify-center text-xs">
          <div className="flex items-center gap-1.5 text-white/60">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span>Online</span>
          </div>
        </div>
      )}
    </div>
  );
}
