/**
 * RegenIntroGate
 * First-visit overlay that gives newcomers a path into the site:
 * watch a short intro to regeneration, or skip if they already know.
 * Gated by localStorage so it shows once per browser.
 */

import { useEffect, useState } from "react";
import { Sprout, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "regen-intro-seen";
const VIDEO_ID = "GMLyhJw4Bps";

export function RegenIntroGate() {
  const [open, setOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      // localStorage blocked, show once per session instead of failing closed
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    setOpen(false);
    setShowVideo(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0a1a0a]/95 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to ReGen Civics"
    >
      <div className="relative w-full max-w-2xl bg-[#1a472a] border border-[#7dd87d]/30 rounded-2xl shadow-2xl overflow-hidden">
        <button
          onClick={dismiss}
          aria-label="Close intro"
          className="absolute top-3 right-3 z-10 text-white/55 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {showVideo ? (
          <div className="p-4 md:p-6">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black mb-4">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
                title="What is Regeneration?"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={dismiss}
                className="bg-[#7dd87d] text-[#0d2818] hover:bg-[#6bc86b] font-bold"
              >
                Enter the site
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-10 text-center">
            <Sprout className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" />
            <h2
              className="text-2xl md:text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display, system-ui)" }}
            >
              Welcome to ReGen Civics
            </h2>
            <p className="text-white/75 text-sm md:text-base max-w-md mx-auto mb-2">
              We're a fund and a game for healing land and community.
            </p>
            <p className="text-white/55 text-sm max-w-md mx-auto mb-8">
              First time hearing the word regeneration? We have a short video. Already in the movement? Come on in.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setShowVideo(true)}
                className="bg-[#7dd87d] text-[#0d2818] hover:bg-[#6bc86b] font-bold"
              >
                <Play className="w-4 h-4 mr-2" />
                What is Regeneration?
              </Button>
              <Button
                onClick={dismiss}
                variant="outline"
                className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 hover:text-[#7dd87d]"
              >
                Skip, I'm ready
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
