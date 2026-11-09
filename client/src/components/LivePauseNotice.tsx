/**
 * The public side of the live-session pause (shared/livePause.ts).
 *
 * useLivePause says which series are paused; the calendar buttons and the
 * "next session" blocks read it and step aside, and LivePauseNotice takes
 * their place. While the answer is loading nothing is treated as paused, so a
 * slow request never hides a running series.
 */
import { Link } from "wouter";
import { PauseCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LIVE_PAUSE_NOTICE, type LivePauseStatus } from "@shared/livePause";

const RUNNING: LivePauseStatus = { season2: false, open_access: false };

export function useLivePause(): LivePauseStatus & { any: boolean } {
  // Its own request (main.tsx splitLink): batched, it waited on events.list.
  const q = trpc.events.livePause.useQuery(undefined, {
    staleTime: 5 * 60_000,
    trpc: { context: { skipBatch: true } },
  });
  const s = q.data ?? RUNNING;
  return { ...s, any: s.season2 || s.open_access };
}

export function LivePauseNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 border border-[#e3ac4f]/45 bg-[#0d2818]/85 ${className}`}
      role="note"
    >
      <div className="flex items-center gap-2 mb-2">
        <PauseCircle className="w-5 h-5 text-[#e3ac4f]" aria-hidden="true" />
        <h2 className="text-lg font-bold text-white">{LIVE_PAUSE_NOTICE.heading}</h2>
      </div>
      <p className="text-white/85 text-sm leading-relaxed mb-4">{LIVE_PAUSE_NOTICE.body}</p>
      <Link
        href={LIVE_PAUSE_NOTICE.recordingsHref}
        className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] transition-colors"
      >
        {LIVE_PAUSE_NOTICE.recordingsLabel}
      </Link>
    </div>
  );
}
