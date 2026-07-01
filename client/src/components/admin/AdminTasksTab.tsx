import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCheck,
  Loader2,
  ShieldCheck,
  ShieldX,
  Unlock,
} from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  trivial: "Trivial",
  small: "Small",
  medium: "Medium",
  large: "Large",
};

type Bounty = {
  id: number;
  title: string;
  body: string;
  sourceType: string;
  tier: string | null;
  tokenType: string;
  workStatus: string;
  githubRepo: string | null;
  githubIssueNumber: number | null;
  kind: string | null;
  createdAt: Date | string;
};

type HeldRole = {
  id: number;
  bountyId: number;
  role: string;
  amount: number;
  payStatus: string;
  bounty: Bounty | null;
};

type Artifact = {
  id: number;
  artifactType: string;
  artifactUrl: string | null;
  artifactText: string | null;
  caption: string | null;
  createdAt: Date | string;
};

type ReviewBounty = Bounty & {
  doer: { id: number; userId: number | null } | null;
  artifacts: Artifact[];
};

function ProposalCard({ bounty, onChanged }: { bounty: Bounty; onChanged: () => void }) {
  const [tier, setTier] = useState(bounty.tier ?? "small");
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  const accept = trpc.bounties.accept.useMutation({ onSuccess: onChanged });
  const decline = trpc.bounties.decline.useMutation({
    onSuccess: () => { setDeclining(false); setDeclineReason(""); onChanged(); },
  });

  return (
    <div className="rounded-xl border border-[#1a472a]/15 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-bold text-[#1a472a]">{bounty.title}</p>
          <p className="text-xs text-[#1a472a]/60 mt-0.5">
            <span className="capitalize">{bounty.sourceType === "contribution" ? `code ${bounty.kind ?? "contribution"}` : "call task"}</span>
            {bounty.githubRepo && <> · {bounty.githubRepo}{bounty.githubIssueNumber ? ` #${bounty.githubIssueNumber}` : ""}</>}
          </p>
        </div>
        <span className="text-xs text-[#1a472a]/50">
          {new Date(bounty.createdAt as string).toLocaleDateString()}
        </span>
      </div>

      <p className="text-sm text-[#1a472a]/80 leading-relaxed line-clamp-3">{bounty.body}</p>

      {!declining ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="inline-flex items-center gap-1.5 text-xs text-[#1a472a]/85">
            Tier
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="rounded border border-[#1a472a]/20 text-[#1a472a] text-xs px-2 py-1"
            >
              {["trivial", "small", "medium", "large"].map((t) => (
                <option key={t} value={t}>{TIER_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            size="sm"
            disabled={accept.isPending}
            onClick={() => accept.mutate({ bountyId: bounty.id, tier: tier as "trivial" | "small" | "medium" | "large" })}
            className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
          >
            {accept.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
            Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDeclining(true)}
          >
            <ShieldX className="w-3.5 h-3.5 mr-1" /> Decline
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason for declining (required)"
            className="text-[#1a472a] text-sm min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={decline.isPending || !declineReason.trim()}
              onClick={() => decline.mutate({ bountyId: bounty.id, reason: declineReason })}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {decline.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirm decline
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDeclining(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function HeldPayoutCard({ role, onChanged }: { role: HeldRole; onChanged: () => void }) {
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  const consent = trpc.bounties.consentAndPay.useMutation({ onSuccess: onChanged });
  const reverse = trpc.bounties.reverse.useMutation({
    onSuccess: () => { setReversing(false); onChanged(); },
  });

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-bold text-[#1a472a] text-sm">{role.bounty?.title ?? `Bounty #${role.bountyId}`}</p>
          <p className="text-xs text-[#1a472a]/60 mt-0.5 capitalize">
            {role.role} role · {role.amount} {role.bounty?.tokenType === "rcivics" ? "$RCivics" : "$ReGen"} held
          </p>
        </div>
        <span className="text-xs text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">held</span>
      </div>

      {!reversing ? (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={consent.isPending}
            onClick={() => consent.mutate({ roleId: role.id })}
            className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
          >
            {consent.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Unlock className="w-3.5 h-3.5 mr-1" />}
            Release payout
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setReversing(true)}>
            <ShieldX className="w-3.5 h-3.5 mr-1" /> Reverse
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            placeholder="Reason for reversal (required)"
            className="text-[#1a472a] text-sm min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={reverse.isPending || !reverseReason.trim()}
              onClick={() => reverse.mutate({ roleId: role.id, reason: reverseReason })}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {reverse.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirm reverse
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setReversing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewCard({ bounty, onChanged }: { bounty: ReviewBounty; onChanged: () => void }) {
  const complete = trpc.bounties.complete.useMutation({ onSuccess: onChanged });
  const doerUserId = bounty.doer?.userId ?? undefined;
  return (
    <div className="rounded-xl border border-[#1a472a]/15 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-bold text-[#1a472a]">{bounty.title}</p>
          <p className="text-xs text-[#1a472a]/60 mt-0.5">call task · awaiting review</p>
        </div>
        <span className="text-xs text-[#1a472a]/50">{new Date(bounty.createdAt as string).toLocaleDateString()}</span>
      </div>

      {bounty.artifacts.length === 0 ? (
        <p className="text-sm text-[#1a472a]/60">No work artifact submitted yet.</p>
      ) : (
        <div className="space-y-2">
          {bounty.artifacts.map((a) => (
            <div key={a.id} className="rounded-lg border border-[#1a472a]/10 bg-[#1a472a]/[0.03] p-3 text-sm">
              {a.artifactUrl && (
                <a href={a.artifactUrl} target="_blank" rel="noopener noreferrer" className="text-[#1a472a] font-semibold hover:underline break-all">
                  {a.artifactUrl}
                </a>
              )}
              {a.artifactText && <p className="text-[#1a472a]/80 mt-1 whitespace-pre-wrap">{a.artifactText}</p>}
              <p className="text-[10px] text-[#1a472a]/40 mt-1">{new Date(a.createdAt as string).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          disabled={complete.isPending}
          onClick={() => complete.mutate({ bountyId: bounty.id, doerUserId })}
          className="bg-[#1a472a] text-white hover:bg-[#2d5a3d]"
        >
          {complete.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCheck className="w-3.5 h-3.5 mr-1" />}
          Approve + pay reward
        </Button>
      </div>
    </div>
  );
}

export function AdminTasksTab() {
  const [filter, setFilter] = useState<"proposals" | "held_payouts" | "review" | "all">("proposals");

  const queue = trpc.bounties.adminQueue.useQuery({ filter, limit: 50 }, { staleTime: 30_000 });
  const data = queue.data ?? { bounties: [], heldRoles: [], reviewBounties: [] };
  const { bounties: proposals, heldRoles, reviewBounties } = data as {
    bounties: Bounty[];
    heldRoles: HeldRole[];
    reviewBounties: ReviewBounty[];
  };
  const refetch = () => { void queue.refetch(); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCheck className="w-4 h-4" /> Bounty Queue
        </CardTitle>
        <CardDescription>
          Review proposed bounties and release held payouts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "proposals", label: "Proposals" },
            { value: "review", label: "Awaiting Review" },
            { value: "held_payouts", label: "Held Payouts" },
            { value: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === tab.value
                  ? "bg-[#1a472a] text-white"
                  : "bg-[#1a472a]/10 text-[#1a472a] hover:bg-[#1a472a]/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-[#1a472a]/70">
            {queue.isLoading ? "loading…" : `${proposals.length} proposals · ${reviewBounties.length} in review · ${heldRoles.length} held`}
          </span>
        </div>

        {queue.isLoading ? (
          <div className="text-sm text-[#1a472a]/70 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> loading
          </div>
        ) : (
          <>
            {(filter === "proposals" || filter === "all") && proposals.length > 0 && (
              <section className="space-y-3">
                {filter === "all" && (
                  <h4 className="text-xs font-bold text-[#1a472a]/70 uppercase tracking-wider">Proposals</h4>
                )}
                {proposals.map((b) => <ProposalCard key={b.id} bounty={b} onChanged={refetch} />)}
              </section>
            )}
            {(filter === "review" || filter === "all") && reviewBounties.length > 0 && (
              <section className="space-y-3 mt-4">
                {filter === "all" && (
                  <h4 className="text-xs font-bold text-[#1a472a]/70 uppercase tracking-wider">Awaiting Review</h4>
                )}
                {reviewBounties.map((b) => <ReviewCard key={b.id} bounty={b} onChanged={refetch} />)}
              </section>
            )}
            {(filter === "held_payouts" || filter === "all") && heldRoles.length > 0 && (
              <section className="space-y-3 mt-4">
                {filter === "all" && (
                  <h4 className="text-xs font-bold text-[#1a472a]/70 uppercase tracking-wider">Held Payouts</h4>
                )}
                {heldRoles.map((r) => <HeldPayoutCard key={r.id} role={r} onChanged={refetch} />)}
              </section>
            )}
            {proposals.length === 0 && heldRoles.length === 0 && reviewBounties.length === 0 && (
              <p className="text-sm text-[#1a472a]/70 py-6 text-center">
                Nothing in the queue. Proposed bounties from players appear here for review.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminTasksTab;
