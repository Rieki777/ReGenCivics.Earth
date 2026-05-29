/**
 * QuestCompletionFeed — social feed of public quest completions.
 * Shows photo / text / video artifacts submitted by players. Mixed or filtered
 * by questId. Renders as a horizontal carousel so it fits the quest page
 * aesthetic but can be dropped anywhere.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { QuestCarousel } from "@/components/QuestCarousel";
import { QuestStoryDetailModal } from "@/components/QuestStoryDetailModal";
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

/**
 * Map a completion's questId / questTitle to the matching hero image in
 * /public/images/quests/. Used when a player submitted a quest but didn't
 * attach a photo or video, so the card has visual weight instead of an
 * empty gradient. Falls back to the generic quest-hero.webp.
 */
function questFallbackImage(questId?: string, questTitle?: string): string {
  const base = "/images/quests/";
  const tag = `${questId || ""} ${questTitle || ""}`.toLowerCase();
  if (tag.includes("food forest") || tag.includes("food-forest")) return base + "quest-food-foresting-hero.webp";
  if (tag.includes("fire")) return base + "quest-00-fire.webp";
  if (tag.includes("potion")) return base + "quest-01-potion-brewing.webp";
  if (tag.includes("seed") && tag.includes("sav")) return base + "quest-02-saving-seeds.webp";
  if (tag.includes("healing whole")) return base + "quest-03-healing-wholes.webp";
  if (tag.includes("dreaming space")) return base + "quest-04-dreaming-spaces-of-love.webp";
  if (tag.includes("rites of love")) return base + "quest-05-rites-of-love.webp";
  if (tag.includes("healing circle")) return base + "quest-06-healing-circles.webp";
  if (tag.includes("foraging")) return base + "quest-07-wild-foraging.webp";
  if (tag.includes("medicine")) return base + "quest-08-medicine-journey.webp";
  if (tag.includes("tree talk")) return base + "quest-09-tree-talk.webp";
  if (tag.includes("communication") || tag.includes("nvc")) return base + "quest-10-communication-patterns.webp";
  if (tag.includes("coordination")) return base + "quest-11-coordination-patterns.webp";
  if (tag.includes("breathplay") || tag.includes("future dreaming")) return base + "quest-12-breathplay-future-dreaming.webp";
  if (tag.includes("love to heal") || tag.includes("body")) return base + "quest-14-love-to-heal-your-body.webp";
  return base + "quest-hero.webp";
}

/**
 * Avatar circle that gracefully degrades from image -> initial when an
 * avatarUrl is set but fails to load (deleted from R2, expired CDN, etc.).
 */
function Avatar({ avatarUrl, initial, displayName }: { avatarUrl?: string | null; initial: string; displayName?: string }) {
  const [errored, setErrored] = useState(false);
  const showImage = avatarUrl && !errored;
  return (
    <div className="w-7 h-7 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden">
      {showImage ? (
        <img
          src={avatarUrl}
          alt={displayName ? `${displayName} avatar` : "Player avatar"}
          width={28}
          height={28}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}

function FeedCard({ entry, onOpen }: { entry: any; onOpen: (entry: any) => void }) {
  const isVideo = entry.artifactType === "video" && !!entry.artifactUrl;
  const isPhoto = entry.artifactType === "photo" && !!entry.artifactUrl;
  const isLink = entry.artifactType === "link" && !!entry.artifactUrl;
  const isText = entry.artifactType === "text";
  const textPreview = (entry.caption || entry.artifactText || "").toString().slice(0, 200);
  const hasTextContent = isText && textPreview.length > 0;
  // Show the quest's hero image as a soft visual anchor whenever the card
  // doesn't have its own image/video/text artifact to display.
  const showFallbackImage =
    (isText && !hasTextContent) ||
    (entry.artifactType !== "photo" && entry.artifactType !== "video" && entry.artifactType !== "text" && !entry.artifactUrl);
  const fallbackImage = questFallbackImage(entry.questId, entry.questTitle);
  const name = entry.displayName ?? "A player";
  const initial = name.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="group relative bg-white rounded-xl border-2 border-[#4a7c59]/20 shadow-md overflow-hidden text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]/60 hover:shadow-lg hover:border-[#4a7c59]/40 transition-all"
      aria-label={`Open ${name}'s story for ${entry.questTitle ?? "this quest"}`}
    >
      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-[#1a472a]/40 via-[#2d5a3d]/30 to-[#4a7c59]/20 overflow-hidden">
        {isVideo && (
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
            {/* Play overlay - the actual playback happens in the detail modal. */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-black/55 border border-white/40 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
                <Play className="w-6 h-6 text-white translate-x-0.5" />
              </div>
            </div>
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
        {isText && hasTextContent && (
          <div className="absolute inset-0 p-5 flex items-center justify-center text-center bg-gradient-to-br from-[#1a472a]/80 to-[#4a7c59]/60">
            <div className="text-white">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-sm italic line-clamp-4">"{textPreview}"</p>
            </div>
          </div>
        )}
        {showFallbackImage && (
          <>
            <img
              src={fallbackImage}
              alt={entry.questTitle || ""}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a472a]/55 via-transparent to-transparent pointer-events-none" />
          </>
        )}
        {isLink && !isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a472a]/80 to-[#4a7c59]/60 text-white pointer-events-none">
            <div className="text-center px-4">
              <ExternalLink className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold">Open artifact</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Avatar avatarUrl={entry.avatarUrl} initial={initial} displayName={entry.displayName ?? undefined} />

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
    </button>
  );
}

export function QuestCompletionFeed({
  questId,
  videoOnly = false,
  title = "Quest Stories",
  subtitle = "What players have been up to: photos, reflections, and video dispatches from the field.",
}: QuestCompletionFeedProps) {
  const [activeStory, setActiveStory] = useState<any | null>(null);
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
            <FeedCard key={entry.id} entry={entry} onOpen={setActiveStory} />
          ))}
        </QuestCarousel>
      </div>
      <QuestStoryDetailModal story={activeStory} onClose={() => setActiveStory(null)} />
    </section>
  );
}
