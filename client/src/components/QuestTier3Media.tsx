/**
 * QuestTier3Media: renders the hero media for tier 3 quest detail.
 * Three paths: YouTube embed, direct video, or "coming soon" placeholder.
 */
import { useState } from 'react';
import { Play } from 'lucide-react';

// Reuse the existing quest image helpers
function questImageUrl(id: number, slug: string) {
  return `https://assets.regencivics.earth/quests/quest-${String(id).padStart(2, '0')}-${slug}.webp`;
}

function questImageFallback(id: number, slug: string) {
  return `/images/quests/quest-${String(id).padStart(2, '0')}-${slug}.webp`;
}

export function extractYouTubeId(url: string): string | null {
  // youtube.com/watch?v=X
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  // youtu.be/X
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];
  // youtube.com/embed/X
  const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
}

interface Props {
  questId: number;
  slug: string;
  videoUrl?: string;
  title: string;
}

export function QuestTier3Media({ questId, slug, videoUrl, title }: Props) {
  const [imgError, setImgError] = useState(false);

  if (videoUrl) {
    const ytId = extractYouTubeId(videoUrl);
    if (ytId) {
      return (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytId}`}
          title={`${title} walkthrough`}
          className="w-full aspect-video rounded-xl bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    // Direct video file
    return (
      <video
        src={videoUrl}
        controls
        preload="metadata"
        poster={imgError ? questImageFallback(questId, slug) : questImageUrl(questId, slug)}
        className="w-full aspect-video rounded-xl bg-black"
        aria-label={`${title} walkthrough video`}
      />
    );
  }

  // No video: placeholder with quest image
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1a472a]/10">
      <img
        src={imgError ? questImageFallback(questId, slug) : questImageUrl(questId, slug)}
        alt={title}
        className="w-full h-full object-cover opacity-70"
        loading="lazy"
        onError={() => setImgError(true)}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
        <Play className="w-12 h-12 text-white/70" aria-hidden="true" />
        <span className="text-white text-sm font-semibold tracking-wide">
          Video walkthrough coming soon
        </span>
      </div>
    </div>
  );
}
