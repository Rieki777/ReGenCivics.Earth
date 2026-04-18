/**
 * Skeleton loading components that mirror the final content shape.
 * Use these instead of spinners for progressive reveal.
 */

const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent";

export function QuestCardSkeleton() {
  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 ${shimmer}`}>
      <div className="h-36 bg-white/5 rounded-t-xl" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-5/6" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-white/10 rounded-full w-20" />
          <div className="h-6 bg-white/10 rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}

export function ForumThreadSkeleton() {
  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 p-4 ${shimmer}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded w-2/3" />
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-4/5" />
          <div className="flex gap-3 mt-2">
            <div className="h-3 bg-white/5 rounded w-16" />
            <div className="h-3 bg-white/5 rounded w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 p-6 ${shimmer}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-white/10" />
        <div className="space-y-2 text-center w-full">
          <div className="h-5 bg-white/10 rounded w-1/2 mx-auto" />
          <div className="h-3 bg-white/5 rounded w-1/3 mx-auto" />
        </div>
        <div className="flex gap-4">
          <div className="h-8 bg-white/10 rounded-lg w-20" />
          <div className="h-8 bg-white/10 rounded-lg w-20" />
        </div>
      </div>
    </div>
  );
}

export function MapMarkerSkeleton() {
  return (
    <div className={`bg-white/5 rounded-lg border border-white/10 p-3 w-48 ${shimmer}`}>
      <div className="h-24 bg-white/5 rounded mb-2" />
      <div className="h-4 bg-white/10 rounded w-3/4 mb-1" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0d2818] p-4 md:p-8 space-y-6 animate-pulse">
      <div className="h-8 bg-white/5 rounded w-1/3" />
      <div className="h-48 bg-white/5 rounded-xl" />
      <div className="space-y-3">
        <div className="h-4 bg-white/5 rounded w-full" />
        <div className="h-4 bg-white/5 rounded w-5/6" />
        <div className="h-4 bg-white/5 rounded w-4/5" />
      </div>
    </div>
  );
}
