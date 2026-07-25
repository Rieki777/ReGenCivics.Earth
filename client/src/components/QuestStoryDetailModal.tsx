/**
 * QuestStoryDetailModal — opens when a Quest Stories card is clicked.
 * Shows the full artifact (video, photo, link, or reflection text) at
 * full size, plus the player's caption / reflection, plus a path to
 * their profile and a "Message {player}" button so the stories work as
 * a community-building tool, not just a passive feed.
 *
 * Renders inline play for videos, full-bleed image for photos, and
 * external link CTA for link-type artifacts. Closes on backdrop click,
 * Escape, or the close button.
 */

import { useEffect } from "react";
import { Link } from "wouter";
import { X, ExternalLink, MessageCircle, User as UserIcon } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";

interface StoryEntry {
  id?: string | number;
  userId?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  questId?: string;
  questTitle?: string;
  artifactType?: string;
  artifactUrl?: string | null;
  artifactText?: string | null;
  caption?: string | null;
  videoThumbnailUrl?: string | null;
  createdAt?: string | Date;
}

interface QuestStoryDetailModalProps {
  story: StoryEntry | null;
  onClose: () => void;
}

function formatDate(d?: string | Date): string {
  if (!d) return "";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function QuestStoryDetailModal({ story, onClose }: QuestStoryDetailModalProps) {
  // Close on Escape.
  useEffect(() => {
    if (!story) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [story, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!story) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [story]);

  if (!story) return null;

  const isVideo = story.artifactType === "video" && !!story.artifactUrl;
  const isPhoto = story.artifactType === "photo" && !!story.artifactUrl;
  const isLink = story.artifactType === "link" && !!story.artifactUrl;
  const isText = story.artifactType === "text";
  const reflection = (story.caption || story.artifactText || "").toString();
  const name = story.displayName ?? "A player";
  const initial = name.charAt(0).toUpperCase();
  const dateStr = formatDate(story.createdAt);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quest story"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          aria-label="Close story"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Artifact area */}
        <div className="relative w-full bg-[#0d2818]">
          {isVideo && (
            <video
              src={story.artifactUrl as string}
              poster={story.videoThumbnailUrl ?? undefined}
              controls
              autoPlay
              muted
              playsInline
              preload="metadata"
              className="w-full max-h-[55vh] object-contain bg-black"
            />
          )}
          {isPhoto && (
            <img
              src={story.artifactUrl as string}
              alt={story.caption ?? story.questTitle ?? "Quest artifact"}
              className="w-full max-h-[55vh] object-contain bg-black"
            />
          )}
          {isLink && (
            <a
              href={story.artifactUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-12 bg-gradient-to-br from-[#1a472a] to-[#4a7c59] text-white"
            >
              <ExternalLink className="w-6 h-6" />
              <span className="font-semibold">Open artifact in a new tab</span>
            </a>
          )}
          {isText && (
            <div className="bg-gradient-to-br from-[#1a472a] to-[#4a7c59] text-white text-center px-8 py-12">
              <p className="text-sm uppercase tracking-widest text-white/60 mb-3">Reflection</p>
              <p className="text-lg italic leading-relaxed max-w-xl mx-auto">"{reflection}"</p>
            </div>
          )}
        </div>

        {/* Meta + actions */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3">
            {story.avatarUrl ? (
              <img
                src={story.avatarUrl}
                alt=""
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-base font-bold flex-shrink-0">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[#1a472a] font-bold text-base">{name}</p>
              <p className="text-[#1a472a]/75 text-sm">
                {story.questTitle}
                {dateStr ? ` · ${dateStr}` : ""}
              </p>
            </div>
          </div>

          {/* Reflection text (when not already shown as the artifact) */}
          {!isText && reflection && (
            <div className="border-l-4 border-[#7dd87d]/60 pl-4 py-1">
              <p className="text-[#1a472a]/85 text-sm leading-relaxed whitespace-pre-wrap">{reflection}</p>
            </div>
          )}

          {/* Community actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {story.userId && (
              <>
                <Link
                  href={`/u/${story.userId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0f7f0] text-[#1a472a] text-sm font-semibold hover:bg-[#e0eee0] transition-colors"
                  onClick={onClose}
                >
                  <UserIcon className="w-4 h-4" /> View profile
                </Link>
                <Link
                  href={`/messages?userId=${story.userId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7dd87d] text-[#1a472a] text-sm font-bold hover:bg-[#9de89d] transition-colors"
                  onClick={onClose}
                >
                  <MessageCircle className="w-4 h-4" /> Message {name.split(" ")[0]}
                </Link>
              </>
            )}
            {story.questId && (
              <Link
                href={`/quest#${story.questId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#1a472a]/15 text-[#1a472a] text-sm font-semibold hover:bg-[#f8f6f1] transition-colors"
                onClick={onClose}
              >
                See the {story.questTitle} quest
              </Link>
            )}
            <ShareButton
              where="quest_story_modal"
              title={story.questTitle ? `${name}: ${story.questTitle} on ReGen Civics` : `${name} on ReGen Civics`}
              text={story.caption ?? "Share your quest with the community."}
              url={story.questId ? `/quest#${story.questId}` : "/quest"}
              variant="soft"
              label="Share"
              className="bg-white border-[#1a472a]/15 text-[#1a472a] hover:bg-[#f8f6f1]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
