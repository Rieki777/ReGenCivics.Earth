/**
 * LinkPreviewCard - renders an Open Graph preview card for a URL
 * Shows OG image, site name, title, and description in a compact card.
 */

import { decodeEntities } from '@/utils/sanitize';

interface LinkPreviewCardProps {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
  loading?: boolean;
}

export function LinkPreviewCard({ url, title, description, image, siteName, loading }: LinkPreviewCardProps) {
  if (loading) {
    return (
      <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden animate-pulse mt-3">
        <div className="w-[120px] min-h-[80px] bg-white/10 flex-shrink-0" />
        <div className="flex-1 p-3 space-y-2">
          <div className="h-3 bg-white/10 rounded w-1/4" />
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!title) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-[#7dd87d]/30 transition-colors cursor-pointer mt-3"
    >
      {image && (
        <div className="w-[120px] min-h-[80px] flex-shrink-0 bg-white/5">
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex-1 p-3 min-w-0">
        {siteName && (
          <p className="text-xs text-gray-300 mb-0.5 truncate">{siteName}</p>
        )}
        <p className="text-sm font-bold text-[#1a472a] truncate leading-snug">
          {decodeEntities(title)}
        </p>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2 leading-snug">
            {decodeEntities(description)}
          </p>
        )}
      </div>
    </a>
  );
}
