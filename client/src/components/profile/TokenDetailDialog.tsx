/**
 * TokenDetailDialog: opens from TokenBox when the user taps the box.
 *
 * Shows the exact total and the public/private breakdown, plus a short
 * ledger history of private-ledger credits (SEEDS claims, gratitude
 * received, etc) so players can see where their tokens came from. The
 * "Claim on Hypha" button deep-links to Hypha so players can move
 * their private balance on-chain.
 *
 * Pair semantics: on Hypha, RGVoice + $ReGen are claimed together (Game
 * pair) and RCVoice + $RCivics are claimed together (Fund pair). The
 * claim button in this dialog is therefore enabled on PAIR eligibility,
 * not just this token's individual balance, and its label names both
 * tokens in the pair so players know what they're claiming.
 */
import { useState } from "react";
import { ExternalLink, Sparkles, Lock, Loader2, Hourglass, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { formatExactNumber } from "@/lib/utils";
import type { TokenKey } from "./TokenBox";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenKey: TokenKey;
  label: string;
  publicBalance: number;
  privateBalance: number;
};

const HYPHA_BASE = "https://app.hypha.earth";

const SOURCE_LABEL: Record<string, string> = {
  seeds_claim: "SEEDS historical claim",
  gratitude_received: "Gratitude received",
  quest_completion: "Quest completion",
  harvest: "Gratitude harvest",
  grant: "Governance grant",
  expense: "Expense",
  adjustment: "Adjustment",
  claimed_to_base: "Claimed on Hypha",
  migrated_from_gratitude: "Migrated (gratitude)",
  migrated_from_harvest: "Migrated (harvest)",
  migrated_from_grant: "Migrated (grant)",
  migrated_from_expense: "Migrated (expense)",
  migrated_from_adjustment: "Migrated (adjustment)",
  migrated_from_claim: "Migrated (claim)",
  manual: "Manual adjustment",
};

// Which pair does each token belong to?
const PAIR_OF: Record<TokenKey, "game" | "fund"> = {
  rgvoice: "game",
  regen: "game",
  rcvoice: "fund",
  rcivics: "fund",
};

const PAIR_PARTNER: Record<TokenKey, TokenKey> = {
  rgvoice: "regen",
  regen: "rgvoice",
  rcvoice: "rcivics",
  rcivics: "rcvoice",
};

const TOKEN_LABEL: Record<TokenKey, string> = {
  rgvoice: "RGVoice",
  regen: "$ReGen",
  rcvoice: "RCVoice",
  rcivics: "$RCivics",
};

const PAIR_LABEL: Record<"game" | "fund", string> = {
  game: "RGVoice + $ReGen",
  fund: "RCVoice + $RCivics",
};

export function TokenDetailDialog({
  open,
  onOpenChange,
  tokenKey,
  label,
  publicBalance,
  privateBalance,
}: Props) {
  // Fetch ledger + claim eligibility + pending claims. All scoped to
  // the signed-in user. Eligibility tells us whether this token's pair
  // partner is also above threshold (Hypha claims RGVoice+$ReGen
  // together, RCVoice+$RCivics together).
  const utils = trpc.useUtils();
  const ledger = trpc.playerProfiles.myTokenLedger.useQuery({ limit: 100 }, { enabled: open });
  const claim = trpc.governance.getClaimEligibility.useQuery(undefined, { enabled: open });
  const pending = trpc.playerProfiles.myPendingClaims.useQuery(undefined, {
    enabled: open,
    refetchInterval: 15_000, // poll while open so the indicator clears once the chain confirms
  });
  const requestClaim = trpc.playerProfiles.requestClaim.useMutation();
  const cancelClaim = trpc.playerProfiles.cancelClaim.useMutation();
  const [claimError, setClaimError] = useState<string | null>(null);

  const rows = (ledger.data ?? []).filter((e: any) => e.tokenType === tokenKey);
  const total = publicBalance + privateBalance;

  const pair = PAIR_OF[tokenKey];
  const partner = PAIR_PARTNER[tokenKey];
  const myThreshold = claim.data?.byToken?.[tokenKey]?.threshold ?? 0;
  const myBalance = claim.data?.byToken?.[tokenKey]?.balance ?? privateBalance;
  const myEligible = claim.data?.byToken?.[tokenKey]?.eligible ?? (myBalance >= myThreshold);
  const partnerBalance = claim.data?.byToken?.[partner]?.balance ?? 0;
  // Pair-claim option only makes sense when the pair partner has
  // tokens to claim too. If partner is at 0, skip the offer; the user
  // would just be doing a single-token claim either way.
  const partnerHasBalance = partnerBalance > 0;
  const amountBelow = Math.max(0, myThreshold - myBalance);

  // In-flight claims for THIS token. Each pending bridge represents
  // one token leg that's been requested but not yet confirmed on-chain.
  const inFlightForThisToken = (pending.data ?? []).filter((p: any) => p.tokenType === tokenKey);
  const inFlightAmount = inFlightForThisToken.reduce((s: number, p: any) => s + (p.requestedAmount ?? 0), 0);
  const hasInFlight = inFlightForThisToken.length > 0;

  const runClaim = async (tokens: TokenKey[]) => {
    setClaimError(null);
    // Open a placeholder tab synchronously on the gesture so iOS Safari does
    // not treat the eventual window.open as unsolicited. We set its location
    // once the mutation returns the Hypha URL. If the request fails, close it.
    const w = window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      const res = await requestClaim.mutateAsync({ tokens });
      if (res.hyphaUrl && w) {
        w.location.href = res.hyphaUrl;
      } else if (w) {
        w.close();
      }
      utils.playerProfiles.myPendingClaims.invalidate();
      utils.playerProfiles.getMyTokens.invalidate();
      utils.playerProfiles.myTokenLedger.invalidate();
    } catch (err: any) {
      if (w) w.close();
      setClaimError(err?.message ?? "Could not start the claim. Try again.");
    }
  };

  // Default claim: just this token. Drag-along claim: this token + its
  // pair partner (saves gas vs two separate claims when both have
  // positive balance).
  const onClaimSingle = () => runClaim([tokenKey]);
  const onClaimPair = () => runClaim([tokenKey, partner]);

  const onCancel = async (bridgeKey: string) => {
    setClaimError(null);
    try {
      await cancelClaim.mutateAsync({ bridgeKey });
      utils.playerProfiles.myPendingClaims.invalidate();
      utils.playerProfiles.getMyTokens.invalidate();
      utils.playerProfiles.myTokenLedger.invalidate();
    } catch (err: any) {
      setClaimError(err?.message ?? "Could not cancel the claim.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0d2818] border border-[#7dd87d]/30 rounded-2xl text-white p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-white text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {label}
          </DialogTitle>
          <DialogDescription className="text-white/60 text-xs">
            Exact balance and where it came from.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/70 mb-1">Total</p>
              <p className="text-xl font-bold text-[#7dd87d]">{formatExactNumber(total)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/70 mb-1">On Base</p>
              <p className="text-xl font-bold text-white">{formatExactNumber(publicBalance)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/70 mb-1">On the Cloud</p>
              <p className="text-xl font-bold text-white">{formatExactNumber(privateBalance)}</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 text-xs text-amber-100/90 leading-relaxed flex gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
            <span>
              Tokens held in the cloud are earned through the game. You claim them on Hypha to move them to the public Base blockchain. {PAIR_LABEL[pair]} live in the same Hypha space, so you can claim them separately or bundle them in one transaction.
            </span>
          </div>

          {hasInFlight && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 text-xs text-blue-100/95 leading-relaxed">
              <div className="flex gap-2">
                <Hourglass className="w-3.5 h-3.5 text-blue-300 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <p>
                    <strong>{formatExactNumber(inFlightAmount)} {label}</strong> claiming on Hypha. Already debited from your private balance; will be confirmed once the transfer lands on Base.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {inFlightForThisToken.map((p: any) => (
                      <button
                        key={p.bridgeKey}
                        type="button"
                        onClick={() => onCancel(p.bridgeKey)}
                        disabled={cancelClaim.isPending}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-blue-100/80 hover:text-white text-[11px] disabled:opacity-50"
                        title="Cancel this claim and refund your private balance."
                      >
                        <X className="w-3 h-3" />
                        Cancel claim of {formatExactNumber(p.requestedAmount)} (refund)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {myEligible ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={onClaimSingle}
                disabled={requestClaim.isPending}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] disabled:opacity-60 disabled:cursor-wait text-[#1a472a] font-bold text-sm transition-colors"
              >
                {requestClaim.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening Hypha…</>
                ) : (
                  <>Claim {label} on Hypha <ExternalLink className="w-3.5 h-3.5" /></>
                )}
              </button>
              {partnerHasBalance && (
                <button
                  type="button"
                  onClick={onClaimPair}
                  disabled={requestClaim.isPending}
                  className="inline-flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium disabled:opacity-50 transition-colors"
                  title="Bundle this claim with your pair partner in one transaction. Saves gas vs two separate claims."
                >
                  Claim {label} + {TOKEN_LABEL[partner]} together (one tx, saves gas)
                </button>
              )}
            </div>
          ) : (
            <div
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-sm cursor-not-allowed"
              aria-disabled="true"
              title={`Earn ${formatExactNumber(amountBelow)} more ${label} to reach the ${formatExactNumber(myThreshold)} claim threshold.`}
            >
              <Lock className="w-3.5 h-3.5" />
              {formatExactNumber(amountBelow)} more {label} to unlock
            </div>
          )}
          {claimError && (
            <p className="text-red-300/90 text-xs">{claimError}</p>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/70 mb-2">Private ledger history</p>
            {ledger.isLoading ? (
              <p className="text-white/70 text-xs">Loading ledger…</p>
            ) : rows.length === 0 ? (
              <p className="text-white/70 text-xs">No private-ledger entries yet for this token. Earn some by receiving gratitude or submitting a SEEDS claim.</p>
            ) : (
              <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                {rows.map((e: any) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/80 font-semibold">
                        {SOURCE_LABEL[e.source] ?? e.source}
                      </p>
                      {e.description && (
                        <p className="text-[11px] text-white/70 truncate">{e.description}</p>
                      )}
                      <p className="text-[10px] text-white/60 mt-0.5">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className={`text-sm font-bold ${e.amount >= 0 ? "text-[#7dd87d]" : "text-amber-300"}`}>
                      {e.amount >= 0 ? "+" : ""}{formatExactNumber(e.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
