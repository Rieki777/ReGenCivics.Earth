/**
 * BannerDisplay Component
 * Displays editable banners on home pages with markdown support
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { renderInlineMarkdown } from '@/components/BlogInlineMarkdown';

interface BannerDisplayProps {
  bannerKey: string;
  className?: string;
}

export function BannerDisplay({ bannerKey, className = '' }: BannerDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: banner, isLoading } = trpc.banners.getByKey.useQuery(
    { key: bannerKey },
    { enabled: true }
  );

  if (isLoading || !banner || !banner.isActive) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-[#7dd87d] via-[#4a9f4a] to-[#7dd87d] text-[#1a472a] py-3 px-4 text-center relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNiw3MSw0MiwwLjEpIi8+PC9zdmc+')] opacity-50" />
      
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <div className="flex-1">
            <div className="text-sm sm:text-base font-semibold">
              {renderInlineMarkdown(banner.content)}
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[#1a472a] hover:text-[#0f2d1a] font-semibold transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <>
                <span className="text-xs">Hide</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="text-xs">Details</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        
        {isExpanded && banner.displayStartDate && (
          <div className="mt-3 pt-3 border-t border-[#1a472a]/20 text-xs text-[#1a472a]/70">
            <p>Active until {new Date(banner.displayEndDate || '').toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BannerDisplay;
