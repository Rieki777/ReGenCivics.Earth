/**
 * PageSkeleton. Shimmer loading placeholder for page content.
 * Used as the Suspense fallback while lazy-loaded pages are fetching.
 * Matches the approximate shape of a standard content page.
 */
import { cn } from "@/lib/utils";

interface SkeletonBlockProps {
  className?: string;
}

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-white/8 animate-pulse",
        className
      )}
    />
  );
}

interface PageSkeletonProps {
  /** Variant controls the skeleton shape (default: standard content page) */
  variant?: "default" | "list" | "profile";
  className?: string;
}

export function PageSkeleton({ variant = "default", className }: PageSkeletonProps) {
  if (variant === "list") {
    return (
      <div className={cn("min-h-screen bg-gradient-to-b from-[#0a1a0a] to-[#1a2a1a] px-4 py-8", className)}>
        <div className="max-w-3xl mx-auto space-y-4">
          <SkeletonBlock className="h-10 w-1/2 mb-6" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <SkeletonBlock className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-3/4" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className={cn("min-h-screen bg-gradient-to-b from-[#0d1a0d] to-[#1a2a1a] px-4 py-8", className)}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <SkeletonBlock className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
          </div>
          <SkeletonBlock className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        </div>
      </div>
    );
  }

  // Default: header + hero + content blocks
  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-[#0a1a0a] to-[#1a2a1a] px-4 py-8", className)}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero */}
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-2/3" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
        </div>

        {/* Content blocks */}
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
