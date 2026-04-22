/**
 * QuestCompletionFeed — social feed of public quest completions.
 * Shows photo / text / video artifacts submitted by players. Mixed or filtered
 * by questId. Renders as a horizontal carousel so it fits the quest page
 * aesthetic but can be dropped anywhere.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { QuestCarousel } from "@/components/QuestCarousel";
import { Play, ExternalLink, FileText, ImageIcon, Video as VideoIcon } from "lucide-react";

interface QuestCompletionFeedProps {
  questId?: string;
  /** When true, only show video completions */
  videoOnly?: boolean;
  /** Heading text */
  title?: string;
  /** Subheading text */
  subtitle?: string;
}

function FeedCard({ entry }: { entry: any }) {
  const [playing, setPlaying] = useState(false);
  const isVideo = entry.artifactType === "video" && !!entry.artifactUrl;
  const isPhoto = entry.artifactType === "photo" && !!entry.artifactUrl;
  const isLink = entry.artifactType === "link" && !!entry.artifactUrl;
  const isText = entry.artifactType === "text";
  const textPreview = (entry.caption || entry.artifactText || "").toString().slice(0, 200);
  const name = entry.displayName ?? "A player";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="group relative bg-white rounded-xl border-2 border-[#4a7c59]/20 shadow-md overflow-hidden">
      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-[#1a472a]/40 via-[#2d5a3d]/30 to-[#4a7c59]/20 overflow-hidden">
        {isVideo && (
          <>
            {playing ? (
              <video
                src={entry.artifactUrl}
                controls
                muted
                preload="metadata"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                {entry.videoThumbnailUrl ? (
                  <img
                    src={entry.videoThumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/40">
                    <VideoIcon className="w-12 h-12" />
                  </div>
                )}
                <button
                  onClick={() => setPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center"
                  aria-label="Play video"
                >
                  <div className="w-14 h-14 rounded-full bg-black/55 border border-white/40 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
                    <Play className="w-6 h-6 text-white translate-x-0.5" />
                  </div>
                </button>
              </>
            )}
          </>
        )}
        {isPhoto && (
          <img
            src={entry.artifactUrl}
            alt={entry.caption ?? ""}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        {isText && (
          <div className="absolute inset-0 p-5 flex items-center justify-center text-center bg-gradient-to-br from-[#1a472a]/80 to-[#4a7c59]/60">
            <div className="text-white">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-sm italic line-clamp-4">"{textPreview}"</p>
            </div>
          </div>
        )}
        {isLink && !isVideo && (
          <a
            href={entry.artifactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a472a]/80 to-[#4a7c59]/60 text-white"
          >
            <div className="text-center px-4">
              <ExternalLink className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold">Open Artifact</p>
            </div>
          </a>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden">
            {entry.avatarUrl ? (
              <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#1a472a] font-semibold text-sm truncate">{name}</p>
            <p className="text-[#1a472a]/60 text-xs truncate">{entry.questTitle}</p>
          </div>
          {isPhoto && <ImageIcon className="w-4 h-4 text-[#4a7c59]/60 flex-shrink-0" />}
          {isVideo && <VideoIcon className="w-4 h-4 text-[#4a7c59]/60 flex-shrink-0" />}
        </div>
        {(entry.caption || (isText && entry.artifactText)) && !isText && (
          <p className="text-[#1a472a]/70 text-xs leading-relaxed line-clamp-3">
            {entry.caption ?? entry.artifactText}
          </p>
        )}
      </div>
    </div>
  );
}

export function QuestCompletionFeed({
  questId,
  videoOnly = false,
  title = "Quest Stories",
  subtitle = "Watch, read, and see what other players have been up to.",
}: QuestCompletionFeedProps) {
  const feedQuery = trpc.quest.getCompletionFeed.useQuery(
    {
      questId,
      artifactType: videoOnly ? "video" : undefined,
      limit: 20,
      offset: 0,
    },
    { staleTime: 5 * 60 * 1000 }
  );

  const entries = feedQuery.data ?? [];
  if (feedQuery.isLoading || entries.length === 0) return null;

  return (
    <section className="py-16 bg-[#f0ebe3]">
      <div className="container">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
          <p className="text-[#1a472a]/70">{subtitle}</p>
        </div>
        <QuestCarousel totalCount={entries.length}>
          {entries.map((entry) => (
            <FeedCard key={entry.id} entry={entry} />
          ))}
        </QuestCarousel>
      </div>
    </section>
  );
}
