/**
 * VideoEmbed - Multi-platform video embed component
 * Supports: YouTube, Vimeo, Dailymotion, Wistia, Loom, and direct .mp4 links
 */

import { Play, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface VideoEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

type VideoSource = {
  type: 'youtube' | 'vimeo' | 'dailymotion' | 'wistia' | 'loom' | 'mp4' | 'unknown';
  embedUrl: string | null;
  thumbnailUrl: string | null;
};

function parseVideoUrl(url: string): VideoSource {
  if (!url) return { type: 'unknown', embedUrl: null, thumbnailUrl: null };

  const trimmed = url.trim();

  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    const id = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Vimeo: vimeo.com/ID, player.vimeo.com/video/ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    const id = vimeoMatch[1];
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${id}?byline=0&portrait=0`,
      thumbnailUrl: null, // Vimeo thumbnails require API call
    };
  }

  // Dailymotion: dailymotion.com/video/ID
  const dmMatch = trimmed.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dmMatch) {
    const id = dmMatch[1];
    return {
      type: 'dailymotion',
      embedUrl: `https://www.dailymotion.com/embed/video/${id}`,
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${id}`,
    };
  }

  // Wistia: *.wistia.com/medias/ID or fast.wistia.net/embed/iframe/ID
  const wistiaMatch = trimmed.match(/wistia\.(?:com|net)\/(?:medias|embed\/iframe)\/([a-zA-Z0-9]+)/);
  if (wistiaMatch) {
    const id = wistiaMatch[1];
    return {
      type: 'wistia',
      embedUrl: `https://fast.wistia.net/embed/iframe/${id}`,
      thumbnailUrl: null,
    };
  }

  // Loom: loom.com/share/ID or loom.com/embed/ID
  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    const id = loomMatch[1];
    return {
      type: 'loom',
      embedUrl: `https://www.loom.com/embed/${id}`,
      thumbnailUrl: null,
    };
  }

  // Direct .mp4 link
  if (trimmed.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return {
      type: 'mp4',
      embedUrl: trimmed,
      thumbnailUrl: null,
    };
  }

  return { type: 'unknown', embedUrl: null, thumbnailUrl: null };
}

const platformLabels: Record<string, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  dailymotion: 'Dailymotion',
  wistia: 'Wistia',
  loom: 'Loom',
  mp4: 'Video',
  unknown: 'Video',
};

export default function VideoEmbed({ url, title, className = '' }: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const video = parseVideoUrl(url);

  // If we can't parse the URL, show a link-out button
  if (video.type === 'unknown' || !video.embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-xl overflow-hidden bg-[#1a472a] ${className}`}
      >
        <div className="flex items-center justify-center gap-3 py-12 px-6 text-white">
          <Play className="w-8 h-8 text-[#7dd87d]" />
          <span className="text-lg font-medium">Watch Video</span>
          <ExternalLink className="w-4 h-4 text-white/60" />
        </div>
      </a>
    );
  }

  // Direct video file
  if (video.type === 'mp4') {
    return (
      <div className={`rounded-xl overflow-hidden bg-black ${className}`}>
        <video
          src={video.embedUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full aspect-video"
          title={title || 'Campaign video'}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // Thumbnail with play button (lazy-load iframe on click)
  if (!isPlaying && video.thumbnailUrl) {
    return (
      <div className={`rounded-xl overflow-hidden bg-black relative ${className}`}>
        <button
          onClick={() => setIsPlaying(true)}
          className="w-full aspect-video relative group cursor-pointer"
          aria-label={`Play ${title || 'video'}`}
        >
          <img
            src={video.thumbnailUrl}
            alt={title || 'Video thumbnail'}
            className="w-full h-full object-cover"
            width="1280"
            height="720"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#7dd87d] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 md:w-10 md:h-10 text-[#1a472a] ml-1" fill="currentColor" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {platformLabels[video.type]}
          </div>
        </button>
      </div>
    );
  }

  // Iframe embed (either auto-play after thumbnail click, or direct for platforms without thumbnails)
  const autoplaySuffix = isPlaying
    ? (video.embedUrl.includes('?') ? '&autoplay=1' : '?autoplay=1')
    : '';

  return (
    <div className={`rounded-xl overflow-hidden bg-black ${className}`}>
      <iframe
        src={`${video.embedUrl}${autoplaySuffix}`}
        title={title || 'Campaign video'}
        className="w-full aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

export { parseVideoUrl, type VideoSource };
