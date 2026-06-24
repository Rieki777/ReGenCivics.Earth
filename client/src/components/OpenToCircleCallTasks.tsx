/**
 * OpenToCircleCallTasks: the open call-tasks the circle can pick up
 * directly from the Opportunity board. Phase 3 of the Movement
 * Coordination Engine.
 *
 * Reads trpc.callTasks.listOpenForCircle (public): any task with status
 * 'open' AND no assignee. Any signed-in member can claim from here
 * (the claim mutation is protectedProcedure, so unsigned users get
 * redirected to sign-in by the standard auth boundary).
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, Sparkles, ExternalLink } from "lucide-react";

type Row = {
  id: number;
  title: string;
  summary: string | null;
  roleSlug: string | null;
  bountyAmount: number;
  bountyTokenType: string;
  sourceVideoId: string;
  evidenceTimestampSeconds: number | null;
  sociocraticOverview: unknown;
  createdAt: Date | string;
};

function bountyLabel(amount: number, tokenType: string): string {
  if (amount <= 0) return "no bounty";
  const t = tokenType === "rcivics" ? "$RCivics" : "$ReGen";
  return `${amount} ${t}`;
}

function deepLink(videoId: string, seconds: number | null): string {
  const t = Math.max(0, Math.floor(seconds ?? 0));
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${t}s`;
}

export function OpenToCircleCallTasks() {
  const { isAuthenticated } = useAuth();
  const list = trpc.callTasks.listOpenForCircle.useQuery(undefined, { staleTime: 30_000 });
  const claim = trpc.callTasks.claim.useMutation({ onSuccess: () => list.refetch() });

  if (list.isLoading) return null;
  const rows = (list.data ?? []) as Row[];
  if (rows.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border-2 border-[#7dd87d]/40 bg-[#0d2818]/70 backdrop-blur-sm p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-[#7dd87d]" />
        <h2
          className="text-lg md:text-xl font-bold text-[#7dd87d]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Open call tasks for the circle
        </h2>
      </div>
      <p className="text-white/80 text-sm mb-4">
        Tasks named in a recorded session that no holder has been assigned to. Any signed-in member can claim one.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-white/15 bg-[#0d2818]/60 p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-bold text-white">{row.title}</p>
                <p className="text-xs text-white/65 mt-0.5">
                  Bounty: <span className="text-[#7dd87d] font-semibold">{bountyLabel(row.bountyAmount, row.bountyTokenType)}</span>
                  {row.roleSlug && <> · role: {row.roleSlug}</>}
                </p>
              </div>
              <a
                href={deepLink(row.sourceVideoId, row.evidenceTimestampSeconds)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#7dd87d] hover:text-white"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Source moment <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {row.summary && (
              <p className="text-sm text-white/85 leading-relaxed">{row.summary}</p>
            )}
            {isAuthenticated ? (
              <Button
                type="button"
                size="sm"
                onClick={() => claim.mutate({ id: row.id })}
                disabled={claim.isPending}
                className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
              >
                {claim.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                Claim it
              </Button>
            ) : (
              <p className="text-xs text-white/60">
                Sign in to claim this task.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OpenToCircleCallTasks;
