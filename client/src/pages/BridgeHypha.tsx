/**
 * Hypha Bridge formalization page.
 * Route: /bridge/hypha/:bridgeKey
 *
 * Renders the payload as a read-only card and offers one button to continue
 * to Hypha. The user sees exactly what we are bringing across before they
 * click. Editing is supported via the small "Something looks wrong" link.
 *
 * The page is the only React surface that displays a Hypha-bound URL, and
 * the URL itself is built server-side via hyphaBridge.buildRedirectUrl so the
 * client never has to assemble it.
 */
import { useParams, Link } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { ArrowRight, ExternalLink, AlertCircle, ArrowLeft, Sparkles, FileText, Wallet, Coins, Zap } from "lucide-react";

export default function BridgeHypha() {
  const params = useParams<{ bridgeKey: string }>();
  const bridgeKey = params.bridgeKey ?? "";
  const [redirecting, setRedirecting] = useState(false);

  const bridgeQuery = trpc.hyphaBridge.get.useQuery({ bridgeKey }, { enabled: bridgeKey.length >= 6 });
  const redirectQuery = trpc.hyphaBridge.buildRedirectUrl.useQuery(
    { bridgeKey },
    { enabled: bridgeKey.length >= 6 },
  );
  const markSent = trpc.hyphaBridge.markHandoffSent.useMutation();
  const claimQuery = trpc.governance.getClaimEligibility.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  if (bridgeQuery.isLoading || redirectQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center text-white/65">
        Loading bridge...
      </div>
    );
  }

  if (bridgeQuery.isError || !bridgeQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex flex-col items-center justify-center text-center px-4">
        <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
        <h1 className="text-2xl font-bold text-white mb-2">Bridge not found</h1>
        <p className="text-white/65 mb-6 max-w-md">
          We couldn't find a bridge with that key. It may have expired or been cancelled.
        </p>
        <Link href="/community" className="text-[#7dd87d] hover:underline">Back to community</Link>
      </div>
    );
  }

  const bridge = bridgeQuery.data;
  const intent = (bridge as any)?.intent as string | undefined;
  const claimData = claimQuery.data;
  const payload = (bridge as any).payload as
    | {
        title: string;
        description: string;
        recipient?: string;
        payouts?: Array<{ amount: string; token: string }>;
        attachments?: Array<{ url: string; filename: string }>;
        leadImageUrl?: string;
        targetDhoSlug: string;
      }
    | null;

  const handleContinue = () => {
    const url = redirectQuery.data?.url;
    if (!url) return;
    // Open Hypha synchronously on the user gesture so iOS Safari does not
    // treat the popup as unsolicited. The URL is already available from the
    // query; markSent is fire-and-forget.
    window.open(url, "_blank", "noopener,noreferrer");
    setRedirecting(true);
    markSent.mutate({ bridgeKey });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title="Continue to Hypha | ReGen Civics" description="Bridge page that carries your context across to Hypha." />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16">
        <Link href="/community" className="inline-flex items-center gap-2 text-white/65 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="bg-white/5 border border-[#7dd87d]/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#7dd87d]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                You're heading to Hypha
              </h1>
              <p className="text-white/60 text-sm">Here's what we're bringing with you.</p>
            </div>
          </div>

          {payload ? (
            <>
              {/* Title + Description card */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="w-4 h-4 text-[#7dd87d] mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-[#7dd87d]/80 font-bold">Title</p>
                    <h2 className="text-white font-semibold text-base">{payload.title}</h2>
                  </div>
                </div>
                <div className="ml-6">
                  <p className="text-[10px] uppercase tracking-wider text-[#7dd87d]/80 font-bold mt-3">Description</p>
                  <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{payload.description}</p>
                </div>
              </div>

              {/* Recipient + Payouts */}
              {(payload.recipient || (payload.payouts && payload.payouts.length > 0)) && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
                  {payload.recipient && (
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-[#d4a574]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-[#d4a574]/80 font-bold">Recipient (Base wallet)</p>
                        <code className="text-white/80 text-xs break-all">{payload.recipient}</code>
                      </div>
                    </div>
                  )}
                  {payload.payouts && payload.payouts.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold">Payouts</p>
                        <ul className="text-white/80 text-sm space-y-0.5">
                          {payload.payouts.map((p, i) => (
                            <li key={i}>
                              <span className="font-mono">{p.amount}</span> <code className="text-xs text-white/70">{p.token}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Target DHO */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Target Hypha space</p>
                <p className="text-white/85 text-sm font-mono">/dho/{payload.targetDhoSlug}</p>
              </div>
            </>
          ) : (
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 mb-6">
              <p className="text-amber-200 text-sm">This bridge has no payload. It may have been corrupted in transit.</p>
            </div>
          )}

          {/* Claim eligibility banner for redeem-internal-tokens intent */}
          {intent === "redeem-internal-tokens" && claimData && (
            <div className={`border rounded-xl p-4 mb-4 flex items-start gap-3 ${claimData.eligible ? "bg-[#7dd87d]/10 border-[#7dd87d]/40" : "bg-white/5 border-white/15"}`}>
              <Zap className={`w-5 h-5 shrink-0 mt-0.5 ${claimData.eligible ? "text-[#7dd87d]" : "text-white/60"}`} />
              <div>
                <p className="text-sm font-semibold text-white">
                  Governance token balance: {claimData.balance.toLocaleString()} / {claimData.threshold.toLocaleString()}
                </p>
                {claimData.eligible ? (
                  <p className="text-[#7dd87d] text-xs mt-0.5">
                    You have reached the claim threshold. Continuing will let you bring these tokens on-chain via Hypha.
                  </p>
                ) : (
                  <p className="text-white/70 text-xs mt-0.5">
                    You need {(claimData.threshold - claimData.balance).toLocaleString()} more tokens to reach the claim threshold.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Small governance token indicator for non-redeem intents */}
          {intent !== "redeem-internal-tokens" && claimData && claimData.balance > 0 && (
            <div className="mb-4 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <Zap className={`w-3.5 h-3.5 shrink-0 ${claimData.eligible ? "text-[#7dd87d]" : "text-white/60"}`} />
              <p className="text-white/60 text-xs">
                Governance balance: <span className={claimData.eligible ? "text-[#7dd87d] font-semibold" : "text-white/80"}>{claimData.balance.toLocaleString()}</span>
                {claimData.eligible && <span className="text-[#7dd87d] ml-1">(claimable)</span>}
              </p>
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={redirecting || !redirectQuery.data?.url}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {redirecting ? "Redirecting..." : "Continue to Hypha"}
            <ArrowRight className="w-4 h-4" />
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>

          <p className="text-white/70 text-[11px] text-center mt-3">
            Bridge key <code className="font-mono">{bridgeKey}</code> · Source <code className="font-mono">{(bridge as any).source}</code>
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/60 text-xs">
            This bridge carries your context across to Hypha so you do not have to retype anything.
            See <Link href="/governance" className="text-[#7dd87d]/80 hover:text-[#7dd87d] underline">how governance works</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
