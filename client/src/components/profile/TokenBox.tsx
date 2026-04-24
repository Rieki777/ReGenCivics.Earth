/**
 * TokenBox: one of the four token boxes on the profile page.
 *
 * Shows the total (public + private) as the big number, compacted to K/M
 * when large. Under the total, an inline breakdown shows "X on Base ·
 * Y on our servers" so players see where their tokens live at a glance.
 * An info (i) icon opens a tooltip explaining the claim-to-move flow.
 * Clicking anywhere on the box opens TokenDetailDialog with the exact
 * numbers and the ledger history.
 */
import { useState } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCompactNumber, formatExactNumber } from "@/lib/utils";
import { TokenDetailDialog } from "./TokenDetailDialog";

export type TokenKey = "rgvoice" | "regen" | "rcvoice" | "rcivics";

export type TokenBoxProps = {
  tokenKey: TokenKey;
  label: string;
  publicBalance: number;
  privateBalance: number;
};

export function TokenBox({ tokenKey, label, publicBalance, privateBalance }: TokenBoxProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const total = publicBalance + privateBalance;
  const compact = formatCompactNumber(total);
  const isAbbreviated = compact !== String(total);

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="group relative bg-[#f0ebe3] rounded-lg p-4 text-center w-full text-left hover:bg-[#ebe3d7] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]"
        aria-label={`${label}: ${formatExactNumber(total)} total. Tap for details.`}
      >
        {/* Info tooltip anchor sits top-right and does not fire the parent
            click, so users can read the explanation without opening the
            dialog. */}
        <span
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 text-[#1a472a]/40 hover:text-[#1a472a]/80"
        >
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5" aria-label="What are private tokens?" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs leading-snug">
                You claim your tokens on Hypha to move from our private ledger to the public Base blockchain.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>

        <p
          className="text-2xl font-bold text-[#7dd87d] leading-none"
          title={isAbbreviated ? formatExactNumber(total) : undefined}
        >
          {compact}
        </p>
        <p className="text-sm text-[#1a472a]/60 mt-1">{label}</p>
        <p className="text-[11px] text-[#1a472a]/55 mt-1.5 leading-tight">
          <span className="whitespace-nowrap">{formatCompactNumber(publicBalance)} on Base</span>
          <span className="mx-1">·</span>
          <span className="whitespace-nowrap">{formatCompactNumber(privateBalance)} on our servers</span>
        </p>
      </button>

      <TokenDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tokenKey={tokenKey}
        label={label}
        publicBalance={publicBalance}
        privateBalance={privateBalance}
      />
    </>
  );
}
