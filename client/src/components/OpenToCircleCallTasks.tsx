import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ExternalLink, GitPullRequest, Loader2, Sparkles } from "lucide-react";

const TIER_REWARD: Record<string, string> = {
  trivial: "25 $ReGen",
  small: "75 $ReGen",
  medium: "250 $ReGen",
  large: "750 $ReGen",
};

type OpenRole = {
  id: number;
  role: string;
  amount: number;
  payStatus: string;
};

type BountyRow = {
  id: number;
  title: string;
  body: string;
  sourceType: string;
  tier: string | null;
  tokenType: string;
  githubRepo: string | null;
  githubIssueNumber: number | null;
  kind: string | null;
  workStatus: string;
  openRoles: OpenRole[];
};

function tokenLabel(type: string, amount: number): string {
  if (amount <= 0) return "see tier";
  const t = type === "rcivics" ? "$RCivics" : "$ReGen";
  return `${amount} ${t}`;
}

export function OpenToCircleCallTasks() {
  const { isAuthenticated } = useAuth();
  const list = trpc.bounties.listBoard.useQuery({}, { staleTime: 30_000 });
  const claimRole = trpc.bounties.claimRole.useMutation({ onSuccess: () => list.refetch() });

  if (list.isLoading) return null;
  const rows = (list.data ?? []) as BountyRow[];
  if (rows.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border-2 border-[#7dd87d]/40 bg-[#0d2818]/70 backdrop-blur-sm p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-[#7dd87d]" />
        <h2
          className="text-lg md:text-xl font-bold text-[#7dd87d]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Open bounties
        </h2>
      </div>
      <p className="text-white/80 text-sm mb-4">
        Work that earns $ReGen. Claim a role, do the work, earn the bounty when it lands.
      </p>
      <div className="space-y-4">
        {rows.map((bounty) => (
          <div
            key={bounty.id}
            className="rounded-xl border border-white/15 bg-[#0d2818]/60 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-bold text-white">{bounty.title}</p>
                <p className="text-xs text-white/65 mt-0.5 capitalize">
                  {bounty.sourceType === "contribution" ? `code ${bounty.kind ?? "contribution"}` : "task"}
                  {bounty.tier && <> · {bounty.tier} tier ({TIER_REWARD[bounty.tier] ?? ""})</>}
                  {bounty.githubRepo && (
                    <>
                      {" · "}
                      <a
                        href={`https://github.com/${bounty.githubRepo}${bounty.githubIssueNumber ? `/issues/${bounty.githubIssueNumber}` : ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7dd87d] hover:underline inline-flex items-center gap-0.5"
                      >
                        {bounty.githubRepo}{bounty.githubIssueNumber ? ` #${bounty.githubIssueNumber}` : ""}
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    </>
                  )}
                </p>
              </div>
              <span className="text-xs text-white/50 capitalize">{bounty.workStatus}</span>
            </div>

            <p className="text-sm text-white/80 leading-relaxed line-clamp-2">{bounty.body}</p>

            {bounty.openRoles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bounty.openRoles.map((role) => (
                  <div key={role.id} className="inline-flex items-center gap-2">
                    <span className="text-xs text-white/70 capitalize">
                      {role.role} · {tokenLabel(bounty.tokenType, role.amount)}
                    </span>
                    {isAuthenticated ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => claimRole.mutate({ roleId: role.id })}
                        disabled={claimRole.isPending}
                        className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] h-7 text-xs px-2"
                      >
                        {claimRole.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : bounty.sourceType === "contribution" ? (
                          <GitPullRequest className="w-3 h-3 mr-1" />
                        ) : (
                          <Sparkles className="w-3 h-3 mr-1" />
                        )}
                        Claim
                      </Button>
                    ) : (
                      <span className="text-xs text-white/40">sign in to claim</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OpenToCircleCallTasks;
