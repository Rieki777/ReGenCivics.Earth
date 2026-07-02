/**
 * A single bounty on the board: provenance, evidence, the transparent reward,
 * role/circle badge, effort, freshness, and a claim action per open role.
 *
 * Integrity note: claiming is gated server-side (claim limits, consent before
 * payout, the flywheel releases stale claims). This card only surfaces open
 * work; it bypasses no gate.
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitPullRequest, Loader2, Sparkles, Clock, Quote } from "lucide-react";
import { RewardAmount } from "./RewardAmount";
import { type BoardBounty, TIER_EFFORT, freshness, closesIn, provenanceLink } from "./types";

interface Props {
  bounty: BoardBounty;
  isAuthenticated: boolean;
  mine: boolean; // viewer holds this bounty's role
  claimingRoleId: number | null;
  onClaim: (roleId: number) => void;
}

export function BountyCard({ bounty, isAuthenticated, mine, claimingRoleId, onClaim }: Props) {
  const headlineAmount = bounty.valuationBreakdown?.amount ?? bounty.openRoles[0]?.amount ?? 0;
  const closing = closesIn(bounty.expiresAt);
  const provenance = provenanceLink(bounty.recordingVideoId, bounty.evidenceTs);
  const circleColor = bounty.roleColor ?? "#7dd87d";

  return (
    <div className="group flex flex-col rounded-xl border border-white/12 bg-[#0d2818]/70 p-4 transition-all hover:border-[#7dd87d]/40 hover:shadow-[0_0_24px_-6px_rgba(125,216,125,0.35)]">
      {/* Provenance */}
      {bounty.recordingTitle ? (
        <div className="mb-2 text-xs text-white/55">
          {provenance ? (
            <a href={provenance} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#7dd87d]/90 hover:text-[#7dd87d] hover:underline" onClick={(e) => e.stopPropagation()}>
              From: {bounty.recordingTitle} <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span>From: {bounty.recordingTitle}</span>
          )}
        </div>
      ) : null}

      {/* Title + reward */}
      <div className="flex items-start justify-between gap-3">
        <Link href={`/bounties/${bounty.id}`} className="min-w-0">
          <h3 className="font-bold text-white leading-snug hover:text-[#7dd87d] transition-colors line-clamp-2">{bounty.title}</h3>
        </Link>
      </div>
      <div className="mt-2">
        <RewardAmount amount={headlineAmount} tokenType={bounty.tokenType} breakdown={bounty.valuationBreakdown} />
      </div>

      {/* Evidence quote */}
      {bounty.evidenceQuote ? (
        <p className="mt-2 flex gap-1.5 text-xs italic text-white/60 line-clamp-2">
          <Quote className="w-3 h-3 shrink-0 mt-0.5 text-white/40" aria-hidden />
          {bounty.evidenceQuote}
        </p>
      ) : (
        <p className="mt-2 text-sm text-white/65 line-clamp-2">{bounty.body}</p>
      )}

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {bounty.roleName ? (
          <Badge
            className="border text-xs"
            style={{ backgroundColor: `${circleColor}22`, color: circleColor, borderColor: `${circleColor}55` }}
          >
            {bounty.roleName}{bounty.roleCircle ? ` · ${bounty.roleCircle}` : ""}
          </Badge>
        ) : null}
        {bounty.tier ? (
          <Badge className="bg-white/8 text-white/60 border-white/15 text-xs capitalize">{TIER_EFFORT[bounty.tier] ?? bounty.tier}</Badge>
        ) : null}
        {mine ? (
          <Badge className="bg-[#7dd87d]/20 text-[#7dd87d] border-[#7dd87d]/40 text-xs">For your role</Badge>
        ) : null}
      </div>

      {/* Footer: freshness + claim */}
      <div className="mt-4 flex items-end justify-between gap-3 pt-3 border-t border-white/8">
        <div className="text-[11px] text-white/45 space-y-0.5">
          <div>{freshness(bounty.createdAt)}</div>
          {closing ? <div className="inline-flex items-center gap-1 text-amber-300/80"><Clock className="w-3 h-3" />{closing}</div> : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {bounty.openRoles.map((role) => (
            <div key={role.id} className="inline-flex items-center gap-2">
              <span className="text-[11px] text-white/60 capitalize">{role.role}</span>
              {isAuthenticated ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onClaim(role.id)}
                  disabled={claimingRoleId === role.id}
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] h-7 text-xs px-2.5"
                >
                  {claimingRoleId === role.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : bounty.sourceType === "contribution" ? (
                    <GitPullRequest className="w-3 h-3 mr-1" />
                  ) : (
                    <Sparkles className="w-3 h-3 mr-1" />
                  )}
                  Claim
                </Button>
              ) : (
                <span className="text-[11px] text-white/40">sign in to claim</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
