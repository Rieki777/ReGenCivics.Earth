/**
 * QuestHowToVideoModal — modal that opens when the FAB's Play button is
 * tapped on /quest. Plays the "how to play the quests" video at
 * /videos/quest-how-to.mp4. Until the file is uploaded the video element
 * surfaces an error, which we catch and replace with a friendly
 * "Coming soon" placeholder so the modal never looks broken.
 *
 * The component listens for the `open-quest-how-to` window event that
 * WizardRadialMenu dispatches when the user taps the Play action while
 * on /quest. Closes on backdrop click, Escape, or the close button.
 */

import { useEffect, useRef, useState } from "react";
import { X, Play } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const VIDEO_SRC = "/videos/quest-how-to.mp4";

export function QuestHowToVideoModal() {
  const [open, setOpen] = useState(false);
  const [videoMissing, setVideoMissing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useBodyScrollLock(open);
  const trapRef = useFocusTrap(open);

  // Listen for the open event from WizardRadialMenu.
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setVideoMissing(false);
    };
    window.addEventListener("open-quest-how-to", onOpen);
    return () => window.removeEventListener("open-quest-how-to", onOpen);
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // When opened, probe whether the video file exists. HEAD request is
  // cheap and avoids waiting for the <video> element's slower error.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(VIDEO_SRC, { method: "HEAD" })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) setVideoMissing(true);
      })
      .catch(() => {
        if (!cancelled) setVideoMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="How to play the quests"
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-[#0d2818] border border-[#7dd87d]/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#7dd87d]/20">
          <h2 className="text-[#7dd87d] font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>
            How to play the quests
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 pointer-coarse:min-h-11 pointer-coarse:min-w-11 inline-flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close video"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative aspect-video bg-black">
          {videoMissing ? (
            // Friendly placeholder while the video file is still on Rye's
            // hard drive. Replace the source by uploading the MP4 to
            // /public/videos/quest-how-to.mp4 and the modal will play it
            // automatically next time it opens.
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
              <div className="w-16 h-16 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 flex items-center justify-center mb-3">
                <Play className="w-7 h-7 text-[#7dd87d]" />
              </div>
              <p className="text-[#7dd87d] font-semibold text-lg mb-1">Video coming soon</p>
              <p className="text-white/70 text-sm max-w-sm">
                Rye is recording a short walkthrough of how the quest system works. Once it lands, this button will play it.
              </p>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              controls
              autoPlay
              muted
              playsInline
              preload="metadata"
              className="w-full h-full"
              onError={() => setVideoMissing(true)}
            />
          )}
        </div>
        <div className="px-5 py-3 text-xs text-white/60 leading-relaxed">
          The quest path starts with the Welcome Aboard quests and opens out into the 13 Rites of Passage plus the Repeatable and Routine quests. Each quest you complete adds to your Living Tree and earns $ReGen plus voice tokens.
        </div>
      </div>
    </div>
  );
}
