/**
 * /bounties/:id — a shareable bounty detail. A facilitator can drop the link
 * in the forum or a chat to recruit. Shows the sociocratic overview, the
 * evidence and source session, the transparent valuation, the claim action,
 * and a clear next-steps panel. OpenGraph meta is set from the bounty so a
 * shared link previews well.
 */
import { useParams, Link } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Sparkles, GitPullRequest, Loader2, ArrowRight, ExternalLink, Quote, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaoSpinner } from "@/components/TaoSpinner";
import { RewardAmount } from "@/components/bounty/RewardAmount";
import { TIER_EFFORT, provenanceLink } from "@/components/bounty/types";

interface Overview {
  purpose?: string;
  whyThisRole?: string;
  steps?: string[];
  definitionOfDone?: string;
  consentCircle?: string;
}

export default function BountyDetail() {
  const params = useParams();
  const id = parseInt(params.id ?? "", 10);
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: bounty, isLoading } = trpc.bounties.get.useQuery({ bountyId: id }, { enabled: Number.isFinite(id) });

  const claim = trpc.bounties.claimRole.useMutation({
    onSuccess: () => { toast.success("Claimed. Find it under your Profile, Tasks."); utils.bounties.get.invalidate({ bountyId: id }); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="min-h-screen bg-[#0d2818] grid place-items-center"><TaoSpinner size={56} /></div>;
  }
  if (!bounty) {
    return (
      <div className="min-h-screen bg-[#0d2818] grid place-items-center text-center px-4">
        <div>
          <p className="text-white/70 text-lg mb-3">This bounty could not be found.</p>
          <Link href="/bounties" className="text-[#7dd87d] hover:underline">Back to the board</Link>
        </div>
      </div>
    );
  }

  const b = bounty as any;
  const overview: Overview | null = b.sociocraticOverview ?? null;
  const amount = b.valuationBreakdown?.amount ?? b.roles?.find((r: any) => r.role === "doer")?.amount ?? 0;
  const openRoles = (b.roles ?? []).filter((r: any) => r.payStatus === "unfilled");
  const provenance = provenanceLink(b.recordingVideoId ?? null, b.evidenceTs ?? null);
  const circleColor = b.roleColor ?? "#7dd87d";
  const summary = overview?.purpose || b.body || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title={`${b.title} | Bounty`}
        description={summary.slice(0, 180)}
        url={`/bounties/${id}`}
        type="article"
      />
      <BackButton />

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-24">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {b.roleName ? (
            <Badge className="border text-xs" style={{ backgroundColor: `${circleColor}22`, color: circleColor, borderColor: `${circleColor}55` }}>
              {b.roleName}{b.roleCircle ? ` · ${b.roleCircle}` : ""}
            </Badge>
          ) : null}
          {b.tier ? <Badge className="bg-white/8 text-white/60 border-white/15 text-xs capitalize">{TIER_EFFORT[b.tier] ?? b.tier}</Badge> : null}
          <Badge className="bg-white/8 text-white/50 border-white/15 text-xs capitalize">{b.workStatus}</Badge>
        </div>
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>{b.title}</h1>
        <div className="mb-6"><RewardAmount amount={amount} tokenType={b.tokenType} breakdown={b.valuationBreakdown} size="lg" /></div>

        {/* Evidence + source */}
        {b.evidenceQuote ? (
          <div className="mb-6 rounded-xl border border-white/10 bg-[#0d2818]/60 p-4">
            <p className="flex gap-2 text-sm italic text-white/70">
              <Quote className="w-4 h-4 shrink-0 mt-0.5 text-white/40" aria-hidden /> {b.evidenceQuote}
            </p>
            {b.recordingTitle ? (
              <p className="mt-2 text-xs text-white/50">
                From:{" "}
                {provenance ? (
                  <a href={provenance} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#7dd87d]/90 hover:underline">
                    {b.recordingTitle} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : b.recordingTitle}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Sociocratic overview */}
        {overview ? (
          <div className="mb-6 space-y-4">
            {overview.purpose ? <Section title="Purpose">{overview.purpose}</Section> : null}
            {overview.whyThisRole ? <Section title="Why this role">{overview.whyThisRole}</Section> : null}
            {Array.isArray(overview.steps) && overview.steps.length ? (
              <div>
                <h2 className="text-sm font-semibold text-[#7dd87d] mb-1">Steps</h2>
                <ul className="list-disc list-inside space-y-1 text-white/75 text-sm">
                  {overview.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            ) : null}
            {overview.definitionOfDone ? <Section title="Definition of done">{overview.definitionOfDone}</Section> : null}
            {overview.consentCircle ? <Section title="Consent circle">{overview.consentCircle}</Section> : null}
          </div>
        ) : (
          <p className="mb-6 text-white/75 whitespace-pre-wrap">{b.body}</p>
        )}

        {/* Claim */}
        <div className="rounded-xl border border-[#7dd87d]/25 bg-[#7dd87d]/[0.05] p-5 mb-6">
          {openRoles.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white/80 text-sm">Ready to take this on?</span>
              {openRoles.map((role: any) => (
                isAuthenticated ? (
                  <Button key={role.id} onClick={() => claim.mutate({ roleId: role.id })} disabled={claim.isPending}
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
                    {claim.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : b.sourceType === "contribution" ? <GitPullRequest className="w-4 h-4 mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    Claim {role.role}
                  </Button>
                ) : (
                  <a key={role.id} href={getLoginUrl()} className="text-[#7dd87d] hover:underline text-sm">Sign in to claim</a>
                )
              ))}
            </div>
          ) : (
            <p className="text-white/70 text-sm">This bounty has no open roles right now.</p>
          )}
        </div>

        {/* Next steps */}
        <div className="rounded-xl border border-white/10 bg-[#0d2818]/60 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">How it works</h2>
          <ol className="space-y-2 text-sm text-white/70">
            {["Claim the role that fits you", "Do the work", "Submit an artifact as proof", "The circle consents, and you get paid in $ReGen"].map((step, i) => (
              <li key={i} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#7dd87d] shrink-0 mt-0.5" /> {step}</li>
            ))}
          </ol>
          <Link href="/profile?tab=tasks" className="mt-4 inline-flex items-center gap-1 text-[#7dd87d] hover:underline text-sm">
            Track your work in Profile, Tasks <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[#7dd87d] mb-1">{title}</h2>
      <p className="text-white/75 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
