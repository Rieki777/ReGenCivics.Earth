/**
 * RewardAmount: renders a bounty reward as "250 $ReGen" with a small info
 * affordance. Clicking or focusing the affordance opens a popover that explains
 * that exact amount in plain language from the stored valuation breakdown, with
 * a link to the full model on the game mechanics page.
 *
 * Used everywhere a reward is shown (board cards, detail, recently-completed,
 * the Profile Call Tasks tab, the admin Tasks queue), so it works on both dark
 * forest surfaces (tone="dark") and the light admin surface (tone="light"), is
 * keyboard-accessible, and opens on tap for touch. When a bounty predates the
 * valuation engine and has no breakdown, it still shows the amount with a
 * tooltip saying the breakdown was not recorded, never an error.
 */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Coins, Info } from "lucide-react";

export interface ValuationBreakdownLike {
  amount: number;
  token?: string;
  scopeTier?: string;
  impactLevel?: string;
  base?: number;
  impact?: number;
  priority?: number;
  demand?: number;
  anchorWeight?: number;
  precedentMedian?: number | null;
  override?: { reason?: string | null; suggested?: number } | null;
}

function tokenLabel(token?: string): string {
  return token === "rcivics" ? "$RCivics" : "$ReGen";
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Compose the plain-language lines that explain an amount from its breakdown. */
function explain(b: ValuationBreakdownLike): string[] {
  const lines: string[] = [];
  if (b.base != null && b.scopeTier) {
    lines.push(`Base for a ${b.scopeTier} task: ${b.base} ${tokenLabel(b.token)}`);
  }
  if (b.impact != null && b.impactLevel && b.impact !== 1) {
    lines.push(`Impact ${b.impactLevel}: ×${round(b.impact)}`);
  }
  if (b.priority != null && b.priority !== 1) {
    lines.push(`Hard to fill: ×${round(b.priority)}`);
  }
  if (b.demand != null && b.demand !== 1) {
    lines.push(`Community demand: ×${round(b.demand)}`);
  }
  if (b.precedentMedian != null && b.anchorWeight) {
    lines.push(`Anchored ${Math.round(b.anchorWeight * 100)}% toward the ${b.precedentMedian} ${tokenLabel(b.token)} paid for similar work`);
  }
  if (b.override?.reason) {
    lines.push(`Adjusted by a maintainer: ${b.override.reason}`);
  }
  return lines;
}

interface Props {
  amount: number;
  tokenType?: string;
  breakdown?: ValuationBreakdownLike | null;
  tone?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RewardAmount({ amount, tokenType, breakdown, tone = "dark", size = "md", className = "" }: Props) {
  const label = `${amount.toLocaleString()} ${tokenLabel(tokenType ?? breakdown?.token)}`;
  const amountColor = tone === "light" ? "text-[#1a472a]" : "text-[#7dd87d]";
  const infoColor = tone === "light" ? "text-[#1a472a]/50 hover:text-[#1a472a]" : "text-white/50 hover:text-white/90";
  const sizeCls = size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm";
  const lines = breakdown ? explain(breakdown) : [];

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Coins className={`${size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} ${amountColor} shrink-0`} aria-hidden />
      <span className={`font-semibold ${amountColor} ${sizeCls}`}>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`How the ${label} reward was calculated`}
            className={`inline-flex items-center justify-center ${infoColor} transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]/50 rounded-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="w-[280px] max-w-[calc(100vw-2rem)] bg-[#1a472a] text-white border border-[#7dd87d]/30 text-xs leading-relaxed p-3 shadow-xl"
        >
          <p className="font-semibold text-[#7dd87d] mb-2">{label}</p>
          {lines.length ? (
            <ul className="space-y-1">
              {lines.map((l, i) => (
                <li key={i} className="text-white/80">{l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-white/70">This bounty predates the valuation engine, so its breakdown was not recorded.</p>
          )}
          <a
            href="/game-mechanics#how-bounties-are-valued"
            className="mt-2 inline-block text-[#7dd87d] hover:underline"
          >
            See the full model
          </a>
        </PopoverContent>
      </Popover>
    </span>
  );
}
