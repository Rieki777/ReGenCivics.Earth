import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RewardAmount } from "@/components/bounty/RewardAmount";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  GitPullRequest,
  Loader2,
  Lock,
  RotateCcw,
  Unlock,
  Upload,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  doer: "task completer",
  proposer: "proposer",
  shipper: "shipper",
  reviewer: "reviewer",
  booster: "booster",
};

function tokenLabel(type: string | null | undefined, amount: number): string {
  if (amount <= 0) return "0 tokens";
  const t = type === "rcivics" ? "$RCivics" : "$ReGen";
  return `${amount} ${t}`;
}

function HoldCountdown({ claimableAt }: { claimableAt: Date | string | null }) {
  if (!claimableAt) return null;
  const ms = new Date(claimableAt).getTime() - Date.now();
  if (ms <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#7dd87d]">
        <Unlock className="w-3 h-3" /> Hold released — claimable to Base
      </span>
    );
  }
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-300">
      <Lock className="w-3 h-3" /> {days}d {hours}h settlement hold
    </span>
  );
}

type Role = {
  id: number;
  bountyId: number;
  role: string;
  userId: number | null;
  amount: number;
  payStatus: string;
  claimableAt: Date | string | null;
  paidAt: Date | string | null;
  createdAt: Date | string;
  bounty: {
    id: number;
    title: string;
    sourceType: string;
    tokenType: string;
    workStatus: string;
    githubRepo: string | null;
    mergedPrNumbers: unknown;
  } | null;
};

function RoleCard({ role, onChanged }: { role: Role; onChanged: () => void }) {
  const [prNumber, setPrNumber] = useState("");
  const releaseRole = trpc.bounties.releaseRole.useMutation({ onSuccess: onChanged });
  const linkPr = trpc.bounties.linkPr.useMutation({ onSuccess: () => { setPrNumber(""); onChanged(); } });
  const [workUrl, setWorkUrl] = useState("");
  const [workNote, setWorkNote] = useState("");
  const submitArtifact = trpc.bounties.submitArtifact.useMutation({
    onSuccess: () => { setWorkUrl(""); setWorkNote(""); onChanged(); },
  });
  const bounty = role.bounty;
  const isContribution = bounty?.sourceType === "contribution";
  const isCallTask = bounty?.sourceType === "call_task";
  const mergedPrs = Array.isArray(bounty?.mergedPrNumbers) ? bounty.mergedPrNumbers as number[] : [];

  return (
    <article className="rounded-xl border border-white/15 bg-[#0d2818]/60 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h4 className="font-bold text-white text-sm leading-snug">{bounty?.title ?? `Bounty #${role.bountyId}`}</h4>
          <p className="text-xs text-white/65 mt-0.5">
            <span className="text-white/85 font-semibold">{ROLE_LABELS[role.role] ?? role.role}</span>
            {" · "}
            {role.amount > 0 ? (
              <RewardAmount amount={role.amount} tokenType={bounty?.tokenType} breakdown={(bounty as any)?.valuationBreakdown ?? null} size="sm" />
            ) : (
              <span className="text-white/50">see tier</span>
            )}
          </p>
        </div>
        <span className="text-xs text-white/50 capitalize">{role.payStatus}</span>
      </div>

      {role.payStatus === "paid" && <HoldCountdown claimableAt={role.claimableAt} />}

      {role.payStatus === "held" && (
        <p className="text-xs text-amber-300 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> Payout on hold — a maintainer will review and release it.
        </p>
      )}

      {role.payStatus === "reversed" && (
        <p className="text-xs text-red-400 inline-flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Payout reversed.
        </p>
      )}

      {role.payStatus === "filled" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {isContribution && role.role === "shipper" && (
            <div className="flex items-center gap-2">
              <Input
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                placeholder="PR # (e.g. 42)"
                className="w-32 h-8 text-xs text-white bg-white/5 border-white/20"
                type="number"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => linkPr.mutate({ bountyId: role.bountyId, prNumber: parseInt(prNumber, 10) })}
                disabled={linkPr.isPending || !prNumber}
                className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] h-8 text-xs"
              >
                {linkPr.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <GitPullRequest className="w-3 h-3 mr-1" />}
                Link PR
              </Button>
            </div>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => releaseRole.mutate({ roleId: role.id })}
            disabled={releaseRole.isPending}
            className="border-white/20 text-white/70 hover:text-white h-8 text-xs"
          >
            {releaseRole.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
            Release role
          </Button>
        </div>
      )}

      {role.payStatus === "filled" && isCallTask && role.role === "doer" && (
        <div className="space-y-2 pt-1 w-full">
          {bounty?.workStatus === "in_review" && (
            <p className="text-xs text-[#7dd87d] inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Work submitted. A maintainer will review and release the reward.
            </p>
          )}
          <Input
            value={workUrl}
            onChange={(e) => setWorkUrl(e.target.value)}
            placeholder="Link to your work (doc, image, repo, video)"
            className="h-8 text-xs text-white bg-white/5 border-white/20"
          />
          <textarea
            value={workNote}
            onChange={(e) => setWorkNote(e.target.value)}
            placeholder="A short note on what you did"
            rows={2}
            className="w-full rounded-md text-xs text-white bg-white/5 border border-white/20 px-2 py-1.5 placeholder:text-white/40"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => submitArtifact.mutate({
              bountyId: role.bountyId,
              artifactType: workUrl ? "link" : "text",
              artifactUrl: workUrl || undefined,
              artifactText: workNote || undefined,
            })}
            disabled={submitArtifact.isPending || (!workUrl && !workNote)}
            className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] h-8 text-xs"
          >
            {submitArtifact.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
            {bounty?.workStatus === "in_review" ? "Update submission" : "Submit work"}
          </Button>
        </div>
      )}

      {isContribution && bounty?.githubRepo && (
        <p className="text-xs text-white/50">
          Repo:{" "}
          <a
            href={`https://github.com/${bounty.githubRepo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7dd87d] hover:underline inline-flex items-center gap-0.5"
          >
            {bounty.githubRepo} <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {mergedPrs.length > 0 && ` · merged: #${mergedPrs.join(", #")}`}
        </p>
      )}

      {role.payStatus === "paid" && role.paidAt && (
        <p className="text-xs text-[#7dd87d] inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Paid on {new Date(role.paidAt as string).toLocaleDateString()}
        </p>
      )}
    </article>
  );
}

export function ProfileCallTasksTab() {
  const query = trpc.bounties.listMine.useQuery({ limit: 100 }, { staleTime: 30_000 });
  const githubQuery = trpc.playerProfiles.getMyGithub.useQuery(undefined, { staleTime: 60_000 });
  const unlinkGithub = trpc.playerProfiles.unlinkGithub.useMutation({ onSuccess: () => githubQuery.refetch() });

  const roles = (query.data ?? []) as Role[];

  const grouped = useMemo(() => {
    const buckets: Record<string, Role[]> = { active: [], pending: [], paid: [], historical: [] };
    for (const r of roles) {
      if (r.payStatus === "filled") buckets.active.push(r);
      else if (r.payStatus === "payable" || r.payStatus === "held") buckets.pending.push(r);
      else if (r.payStatus === "paid") buckets.paid.push(r);
      else buckets.historical.push(r);
    }
    return buckets;
  }, [roles]);

  const gh = githubQuery.data;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-white/15 bg-[#0d2818]/60 p-4 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">GitHub identity</h3>
        {githubQuery.isLoading ? (
          <p className="text-white/50 text-xs inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> loading
          </p>
        ) : gh?.linked ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-white">
              Linked as <span className="text-[#7dd87d] font-semibold">@{(gh as { linked: true; githubHandle: string | null }).githubHandle}</span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => unlinkGithub.mutate()}
              disabled={unlinkGithub.isPending}
              className="border-white/20 text-white/70 hover:text-white text-xs h-8"
            >
              {unlinkGithub.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Unlink
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-white/70">
              Link your GitHub to receive code contribution rewards automatically when your PR merges.
            </p>
            <a
              href="/api/oauth/github/link"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7dd87d] text-[#1a472a] text-xs font-semibold hover:bg-[#9de89d]"
            >
              <GitPullRequest className="w-3.5 h-3.5" /> Link GitHub
            </a>
          </div>
        )}
      </section>

      {query.isLoading && (
        <p className="text-white/70 text-sm inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> loading
        </p>
      )}

      {!query.isLoading && roles.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-white/70 text-sm">
          No bounty roles yet. Claim an open role from the Opportunity board, or propose a bounty to get started.
        </div>
      )}

      {[
        { key: "active", label: "Active" },
        { key: "pending", label: "Pending payment" },
        { key: "paid", label: "Paid (settlement hold)" },
        { key: "historical", label: "Historical" },
      ].map(({ key, label }) => {
        const list = grouped[key];
        if (!list?.length) return null;
        return (
          <section key={key} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
              {label} <span className="ml-2 text-white/50 font-medium normal-case">({list.length})</span>
            </h3>
            <div className="space-y-3">
              {list.map((r) => <RoleCard key={r.id} role={r} onChanged={() => query.refetch()} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default ProfileCallTasksTab;
