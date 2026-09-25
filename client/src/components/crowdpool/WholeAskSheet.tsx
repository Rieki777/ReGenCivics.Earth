/**
 * The whole ask, in nine forms of capital (build spec 2026-09-25, section 5).
 * Opened from the in-kind line of the two-line bar. Nine rows, always, in
 * CAPITAL_TYPES order, and their figures add up to the headline: the rows
 * come from progress.byCapital (shared/campaignProgress.ts), whose sums are
 * the in-kind ask plus the money ask.
 *
 * Built on the base DialogContent (STEERING 12): a bottom sheet on a phone,
 * focus trapped, Escape closes. A row with nothing asked says so in words,
 * so dimming is never the only signal.
 */
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CAPITAL_COLORS, CAPITAL_LABELS, CAPITAL_TYPES, type CapitalType } from "@shared/crowdpoolingTaxonomy";
import type { CampaignProgress } from "@shared/campaignProgress";
import { MONEY_BLOCK, PARTNER_NAMES, WHOLE_ASK_SHEET } from "@shared/crowdpoolCopy";

export function WholeAskSheet({
  open,
  onOpenChange,
  progress,
  formatCurrency,
  onSeeNeeds,
  onSeeMoney,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: Pick<CampaignProgress, "byCapital" | "money" | "currency">;
  formatCurrency: (n: number) => string;
  /** Close the sheet and move to the needs of one form of capital (#capital-{capital}). */
  onSeeNeeds: (capital: CapitalType) => void;
  /** Close the sheet and move to the money block (#money). */
  onSeeMoney: () => void;
}) {
  const byCapital = new Map(progress.byCapital.map((row) => [row.capital, row]));
  const rows = CAPITAL_TYPES.map((capital) => byCapital.get(capital) ?? {
    capital, asked: 0, confirmed: 0, delivered: 0, otherOffers: 0, needIds: [] as number[],
  });
  const wholeAsk = rows.reduce((sum, r) => sum + r.asked, 0);
  const wholeConfirmed = rows.reduce((sum, r) => sum + r.confirmed, 0);
  const moneyRoutesOrAsk = progress.money.ask > 0 || progress.money.hasRoutes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white text-[#1a472a] light-form-island">
        <DialogHeader>
          <DialogTitle className="text-[#1a472a] text-left leading-tight pr-12 sm:pr-0">{WHOLE_ASK_SHEET.title}</DialogTitle>
          <DialogDescription className="text-[#1a472a]/85 text-left">
            {WHOLE_ASK_SHEET.description(formatCurrency(wholeAsk), formatCurrency(wholeConfirmed))}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2" aria-label={WHOLE_ASK_SHEET.title}>
          {rows.map((row) => {
            const empty = row.asked <= 0 && row.confirmed <= 0;
            const isMoney = row.capital === "financial";
            const hasAction = isMoney ? moneyRoutesOrAsk : row.needIds.length > 0;
            const label = WHOLE_ASK_SHEET.rowLabel(CAPITAL_LABELS[row.capital].label);
            return (
              <li
                key={row.capital}
                data-capital={row.capital}
                className={`rounded-xl border border-[#1a472a]/10 p-3 ${empty ? "bg-gray-50 text-[#1a472a]/70" : "bg-[#f0f7f0]"}`}
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: CAPITAL_COLORS[row.capital], opacity: empty ? 0.5 : 1 }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{label}</p>
                    {empty ? (
                      <p className="text-sm">{WHOLE_ASK_SHEET.nothingAsked}</p>
                    ) : (
                      <p className="text-sm flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>{WHOLE_ASK_SHEET.asked(formatCurrency(row.asked))}</span>
                        <span>{WHOLE_ASK_SHEET.confirmed(formatCurrency(row.confirmed))}</span>
                        {row.delivered > 0 && <span>{WHOLE_ASK_SHEET.delivered(formatCurrency(row.delivered))}</span>}
                      </p>
                    )}
                    {row.otherOffers > 0 && (
                      <p className="text-xs mt-1">{WHOLE_ASK_SHEET.otherOffers(formatCurrency(row.otherOffers))}</p>
                    )}
                    {isMoney && progress.money.notAdded.map((n, i) => (
                      <p key={`${n.partner}-${i}`} className="text-xs mt-1">
                        {MONEY_BLOCK.notAdded(
                          Math.round(n.amount).toLocaleString("en-US"),
                          n.currency || "another currency",
                          PARTNER_NAMES[n.partner] ?? n.partner,
                        )}
                      </p>
                    ))}
                    {hasAction && (
                      <button
                        type="button"
                        onClick={() => (isMoney ? onSeeMoney() : onSeeNeeds(row.capital))}
                        className="mt-1 inline-flex items-center min-h-11 pointer-coarse:min-h-11 text-sm font-semibold text-[#4a7c59] underline underline-offset-2 hover:text-[#1a472a]"
                      >
                        {isMoney ? WHOLE_ASK_SHEET.seeMoney : WHOLE_ASK_SHEET.seeNeeds}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter className="sm:justify-start">
          <p className="text-xs text-[#1a472a]/75 text-left">{WHOLE_ASK_SHEET.footer}</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
