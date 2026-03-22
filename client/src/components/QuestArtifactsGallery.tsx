/**
 * QuestArtifactsGallery - floating "From the Field" button that opens a feed
 * of recent quest completions and active quest signals.
 * Replaces QuestLeaderboard.
 */
import { useState } from "react";
import { Users, X, ExternalLink, Leaf } from "lucide-react";
import { trpc } from "@/lib/trpc";

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function Avatar({ name, url }: { name?: string | null; url?: string | null }) {
  if (url) return <img src={url} alt={name ?? "player"} className="w-8 h-8 rounded-full object-cover" width={32} height={32} />;
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  return (
    <div className="w-8 h-8 rounded-full bg-[#4a7c59] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
      {initial}
    </div>
  );
}

export function QuestArtifactsGallery() {
  const [open, setOpen] = useState(false);
  const completions = trpc.quest.recentCompletions.useQuery({ limit: 20 }, { enabled: open });
  const activeCounts = trpc.quest.activeCountPerQuest.useQuery(undefined, { enabled: open });

  const totalActive = Object.values(activeCounts.data ?? {}).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-[5.5rem] z-40 flex items-center gap-2 bg-[#1a472a] text-white rounded-full px-4 py-2.5 shadow-lg hover:bg-[#2d6a4f] transition-colors text-sm font-semibold"
        aria-label="From the field"
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">From the Field</span>
        {totalActive > 0 && (
          <span className="bg-[#7dd87d] text-[#1a472a] text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {totalActive}
          </span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md max-h-[85vh] bg-[#0f2d1a] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>
                  From the Field
                </h2>
                <p className="text-white/50 text-xs mt-0.5">What players are doing right now</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-5">
              {/* Currently in the field */}
              {totalActive > 0 && (
                <section>
                  <p className="text-[#7dd87d] text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5" />
                    Currently in the field ({totalActive})
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(activeCounts.data ?? {}).map(([questId, count]) =>
                      count > 0 ? (
                        <div key={questId} className="flex items-center justify-between bg-[#1a472a]/60 rounded-lg px-3 py-2">
                          <span className="text-white/80 text-sm capitalize">{questId.replace("quest-", "Quest ").replace("-", " ")}</span>
                          <span className="text-[#7dd87d] text-xs font-semibold">{count} {count === 1 ? "player" : "players"}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </section>
              )}

              {/* Recent completions */}
              <section>
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Recent completions</p>
                {completions.isLoading ? (
                  <p className="text-white/30 text-sm text-center py-6">Loading...</p>
                ) : completions.data?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/40 text-sm">No completions yet.</p>
                    <p className="text-white/30 text-xs mt-1">Be the first to complete a quest and share your artifact.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completions.data?.map((c: any) => (
                      <div key={c.id} className="flex gap-3">
                        <Avatar name={c.displayName} url={c.avatarUrl} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm font-semibold truncate">{c.displayName ?? "A player"}</span>
                            <span className="text-[#7dd87d] text-xs bg-[#4a7c59]/30 px-2 py-0.5 rounded-full">{c.questTitle}</span>
                          </div>
                          {(c.caption || c.artifactText) && (
                            <p className="text-white/60 text-xs mt-1 line-clamp-2">{c.caption ?? c.artifactText}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-white/30 text-xs">{timeAgo(c.completedAt)}</span>
                            {c.artifactUrl && (
                              <a
                                href={c.artifactUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#7dd87d] text-xs flex items-center gap-1 hover:underline"
                              >
                                View artifact <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
