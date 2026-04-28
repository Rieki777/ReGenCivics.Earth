/**
 * SharePanel - Card-flip share panel for quest cards.
 * Flips the card to reveal share options with a 3D CSS transform.
 */
import { useState } from "react";
import { X, Copy, Check, Share2 } from "lucide-react";
import {
  XShareButton,
  LinkedinShareButton,
  FacebookShareButton,
  BlueskyShareButton,
} from "react-share";

interface SharePanelProps {
  questTitle: string;
  questTagline: string;
  forumUrl: string;
}

export function SharePanel({ questTitle, questTagline, forumUrl }: SharePanelProps) {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const shareUrl = forumUrl.startsWith("http")
    ? forumUrl
    : `https://regencivics.earth${forumUrl}`;

  const shareText = `${questTagline} Doing the "${questTitle}" quest at @ReGenCivics 🌿`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyInstagram = () => {
    navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  return (
    <div className="relative" style={{ perspective: "1000px" }}>
      {/* Share trigger button */}
      <button
        onClick={() => setFlipped(true)}
        className="flex items-center gap-1 text-white/70 hover:text-[#7dd87d] transition-colors text-xs"
        aria-label="Share this quest"
        title="Share"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>

      {/* Flip overlay */}
      {flipped && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setFlipped(false); }}
        >
          <div
            className="relative bg-gradient-to-br from-[#1a472a] to-[#0a2314] border border-[#7dd87d]/25 rounded-2xl shadow-2xl w-full max-w-sm p-5"
            style={{
              animation: "shareFlipIn 0.3s ease forwards",
            }}
          >
            <button
              onClick={() => setFlipped(false)}
              className="absolute top-3 right-3 text-white/60 hover:text-white/80 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="text-[#7dd87d] text-xs font-semibold uppercase tracking-wide mb-1">Share this quest</p>
            <h3 className="text-white font-bold text-sm mb-1 pr-6" style={{ fontFamily: "var(--font-display)" }}>
              {questTitle}
            </h3>
            <p className="text-white/70 text-xs mb-4 italic">{questTagline}</p>

            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-4">
              <p className="text-white/70 text-xs leading-relaxed">{shareText}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* X/Twitter */}
              <XShareButton url={shareUrl} title={shareText} className="!flex !items-center !justify-center">
                <div className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3 transition-all w-full">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="text-white/60 text-[10px]">X</span>
                </div>
              </XShareButton>

              {/* LinkedIn */}
              <LinkedinShareButton url={shareUrl} className="!flex !items-center !justify-center">
                <div className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3 transition-all w-full">
                  <svg className="w-4 h-4 text-[#0a66c2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="text-white/60 text-[10px]">LinkedIn</span>
                </div>
              </LinkedinShareButton>

              {/* Facebook */}
              <FacebookShareButton url={shareUrl} className="!flex !items-center !justify-center">
                <div className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3 transition-all w-full">
                  <svg className="w-4 h-4 text-[#1da1f2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-white/60 text-[10px]">Facebook</span>
                </div>
              </FacebookShareButton>

              {/* Farcaster */}
              <a
                href={`https://warpcast.com/~/compose?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3 transition-all"
              >
                <svg className="w-4 h-4 text-[#7dd87d]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.707 0h.586L24 6.545v.91l-1.6.727V4.364H1.6v3.818L0 7.455v-.91L11.707 0zM1.6 19.636V9.091H0v-.909h24v.91h-1.6v10.544l1.6.727v.91H0v-.91l1.6-.727zM8 15.273h8v1.818H8v-1.818zm0-3.637h8v1.819H8v-1.819z"/>
                </svg>
                <span className="text-white/60 text-[10px]">Farcaster</span>
              </a>

              {/* Bluesky */}
              <BlueskyShareButton url={shareUrl} title={shareText} className="!flex !items-center !justify-center">
                <div className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3 transition-all w-full">
                  <svg className="w-4 h-4 text-[#0085ff]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/>
                  </svg>
                  <span className="text-white/60 text-[10px]">Bluesky</span>
                </div>
              </BlueskyShareButton>

              {/* Instagram (copy) */}
              <button
                onClick={handleCopyInstagram}
                className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3 transition-all"
              >
                <svg className="w-4 h-4 text-[#e1306c]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="text-white/60 text-[10px]">
                  {copiedText ? "Copied!" : "Instagram"}
                </span>
              </button>
            </div>

            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl py-2.5 transition-all text-xs text-white/60 hover:text-white/80"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#7dd87d]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Link copied!" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shareFlipIn {
          from { opacity: 0; transform: scale(0.95) rotateY(-12deg); }
          to   { opacity: 1; transform: scale(1)    rotateY(0deg);   }
        }
      `}</style>
    </div>
  );
}
