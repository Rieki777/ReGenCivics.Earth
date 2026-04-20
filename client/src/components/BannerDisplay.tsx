/**
 * BannerDisplay Component
 * Displays editable banners on home pages with markdown support
 */

import { trpc } from '@/lib/trpc';
import { renderInlineMarkdown } from '@/components/BlogInlineMarkdown';

interface BannerDisplayProps {
  bannerKey: string;
  className?: string;
}

export function BannerDisplay({ bannerKey, className = '' }: BannerDisplayProps) {
  const { data: banner, isLoading } = trpc.banners.getByKey.useQuery(
    { key: bannerKey },
    { enabled: true }
  );

  if (isLoading || !banner || !banner.isActive) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-[#7dd87d] via-[#4a7c59] to-[#7dd87d] text-[#1a472a] py-3 px-4 text-center relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNiw3MSw0MiwwLjEpIi8+PC9zdmc+')] opacity-50" />

      <div className="relative z-10">
        <div className="text-sm sm:text-base font-semibold">
          {renderInlineMarkdown(banner.content)}
        </div>
      </div>
    </div>
  );
}

export default BannerDisplay;
