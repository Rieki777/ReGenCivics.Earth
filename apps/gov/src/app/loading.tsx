export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse bg-[rgba(26,71,42,0.85)] rounded-2xl p-5 border border-[rgba(125,216,125,0.1)]"
        >
          <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
