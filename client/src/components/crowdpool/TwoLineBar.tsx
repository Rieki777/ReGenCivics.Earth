/**
 * The two-line bar: how far a campaign has come, in-kind first, then money
 * (build spec 2026-09-25, sections 4 and 8.2). Every figure and every line
 * comes from shared/campaignProgress.ts, the one reading every surface uses.
 *
 * Each bar is a progressbar whose aria-valuetext is exactly the visible
 * line. The in-kind bar shows confirmed value striped with delivered value
 * solid on top; the money bar shows gifts solid and loans striped. The text
 * says both, so colour is never the only signal. No countdown, no "days
 * left", no urgency colours, no percentage headline.
 *
 * `full` (the project page): heading, the in-kind line as a button that
 * opens the whole-ask sheet, the money line, the open line, the halves line,
 * the completion line and a light strip. `compact` (cards, steward stats,
 * the admin modal): the two short lines with thin bars and the close date.
 *
 * Tailwind utilities and inline styles only (no new CSS class, gate 2).
 */
import type { ReactNode } from "react";
import { progressBars, progressLines, type CampaignProgress, type CampaignProgressSummary } from "@shared/campaignProgress";
import { PAGE, STRIP, WHOLE_ASK_SHEET } from "@shared/crowdpoolCopy";

type AnyProgress = CampaignProgress | CampaignProgressSummary;

/** Fill colours, each at 3:1 or better against the track (WCAG 1.4.11). */
const IN_KIND_SOLID = "#1a472a";
const IN_KIND_STRIPED = "repeating-linear-gradient(135deg, #4a7c59 0 6px, #3b6b4a 6px 12px)";
const MONEY_SOLID = "#6f5518";
const MONEY_STRIPED = "repeating-linear-gradient(135deg, #8a6a1f 0 6px, #6f5518 6px 12px)";

type Segment = { key: string; left: number; width: number; background: string };

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

function Bar({ label, now, text, segments, thin }: {
  label: string;
  now: number;
  text: string;
  segments: Segment[];
  thin?: boolean;
}) {
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampPct(now)}
      aria-valuetext={text}
      className={`relative block w-full overflow-hidden rounded-full bg-[#1a472a]/10 ${thin ? "h-1.5 mt-1" : "h-2.5 mt-1.5"}`}
    >
      {segments.map((s) => (
        <span
          key={s.key}
          className="absolute inset-y-0 block rounded-full"
          style={{ left: `${clampPct(s.left)}%`, width: `${clampPct(s.width)}%`, background: s.background }}
        />
      ))}
    </span>
  );
}

export type TwoLineBarSettings = { moneyMovesHere: boolean };

export function TwoLineBar({
  progress,
  formatCurrency,
  variant = "full",
  settings,
  onOpenSheet,
  maEarthVerified = false,
}: {
  progress: AnyProgress;
  formatCurrency: (n: number) => string;
  variant?: "full" | "compact";
  /** campaigns.crowdpoolSettings. While money does not move here, the strip says so. */
  settings?: TwoLineBarSettings;
  /** Opens the whole-ask sheet from the in-kind line (full variant). */
  onOpenSheet?: () => void;
  /** A verified, non-example Ma Earth route exists. */
  maEarthVerified?: boolean;
}) {
  const lines = progressLines(progress, formatCurrency);
  const bars = progressBars(progress, formatCurrency, variant);

  const inKindSegments: Segment[] = [
    { key: "confirmed", left: 0, width: bars.inKind.confirmedPct, background: IN_KIND_STRIPED },
    { key: "delivered", left: 0, width: bars.inKind.deliveredPct, background: IN_KIND_SOLID },
  ];
  const moneySegments: Segment[] = bars.money
    ? [
        { key: "given", left: 0, width: bars.money.givenPct, background: MONEY_SOLID },
        { key: "lent", left: bars.money.givenPct, width: bars.money.lentPct, background: MONEY_STRIPED },
      ]
    : [];

  if (variant === "compact") {
    return (
      <div className="space-y-1.5 min-w-0">
        <div>
          <p className="text-xs text-[#1a472a]/85 break-words">{lines.inKindShort}</p>
          <Bar label={bars.inKind.label} now={bars.inKind.now} text={bars.inKind.text} segments={inKindSegments} thin />
        </div>
        <div>
          <p className="text-xs text-[#1a472a]/85 break-words">{lines.moneyShort}</p>
          {bars.money && (
            <Bar label={bars.money.label} now={bars.money.now} text={bars.money.text} segments={moneySegments} thin />
          )}
        </div>
        {lines.closes && <p className="text-xs text-[#1a472a]/70">{lines.closes}</p>}
      </div>
    );
  }

  const inKindBody: ReactNode = (
    <>
      <span className="block text-sm font-semibold text-[#1a472a] break-words">{lines.inKind}</span>
      <Bar label={bars.inKind.label} now={bars.inKind.now} text={bars.inKind.text} segments={inKindSegments} />
    </>
  );

  const strip: string[] = [];
  if (!settings?.moneyMovesHere) strip.push(STRIP.noMoneyHere);
  if (maEarthVerified) strip.push(STRIP.maEarthEitherWay);
  strip.push(STRIP.stewardsAnswer);

  return (
    <div className="min-w-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4a7c59] mb-2">{PAGE.pooledSoFar}</h3>

      {onOpenSheet ? (
        <button
          type="button"
          onClick={onOpenSheet}
          aria-haspopup="dialog"
          aria-label={`${lines.inKind}${WHOLE_ASK_SHEET.triggerSuffix}`}
          className="block w-full text-left rounded-xl -mx-2 px-2 py-1.5 min-h-11 pointer-coarse:min-h-11 hover:bg-[#f0f7f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4a7c59]"
        >
          {inKindBody}
          <span className="mt-1.5 block text-xs font-semibold text-[#4a7c59] underline underline-offset-2">
            {WHOLE_ASK_SHEET.hint}
          </span>
        </button>
      ) : (
        <div>{inKindBody}</div>
      )}
      {lines.inKindDelivered && <p className="text-xs text-[#1a472a]/75 mt-1">{lines.inKindDelivered}</p>}

      <div className="mt-3">
        <p className="text-sm font-semibold text-[#1a472a] break-words">{lines.money}</p>
        {bars.money && <Bar label={bars.money.label} now={bars.money.now} text={bars.money.text} segments={moneySegments} />}
      </div>

      <div className="mt-3 space-y-1 text-sm text-[#1a472a]/85">
        {lines.open && <p>{lines.open}</p>}
        {lines.halves && <p className="font-medium text-[#1a472a]">{lines.halves}</p>}
        {lines.completion && <p>{lines.completion}</p>}
      </div>

      <ul className="mt-4 rounded-xl bg-[#f0f7f0] px-3 py-2 space-y-1 text-xs text-[#1a472a]/85">
        {strip.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
