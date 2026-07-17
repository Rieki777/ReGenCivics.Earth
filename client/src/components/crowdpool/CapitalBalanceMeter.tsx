/**
 * CapitalBalanceMeter: a compact, always-visible read of how many of the nine
 * forms of capital a campaign draft covers. Nine small segments, one per
 * capital in CAPITAL_TYPES order:
 *   solid  -> filled (two or more needs on that capital)
 *   thin   -> half / outline (one need)
 *   none   -> muted (no needs yet)
 *
 * It lives in the sticky total tracker, so it updates live as needs are added
 * across every step. Coverage is computed by the shared deterministic coach,
 * so this number always matches the design companion and the server.
 */

import { analyzeCoverage, type CoachNeedInput } from '@shared/crowdpoolCoach';
import { CAPITAL_COLORS } from '@shared/crowdpoolingTaxonomy';

export function CapitalBalanceMeter({ needs }: { needs: CoachNeedInput[] }) {
  const coverage = analyzeCoverage(needs);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-[#1a472a]/80">Capital balance</span>
        <span
          className="text-xs font-semibold text-[#4a7c59]"
          title={`Roundedness ${coverage.roundednessScore} of 100`}
        >
          {coverage.coveredCount} of 9 forms covered
        </span>
      </div>
      <div
        className="flex items-stretch gap-1"
        role="group"
        aria-label={`Capital coverage: ${coverage.coveredCount} of 9 forms covered`}
      >
        {coverage.entries.map((entry) => {
          const color = CAPITAL_COLORS[entry.capital];
          // Each capital keeps its own color; strength sets the fill weight so
          // solid reads bold, thin reads soft, and empty reads as a faint outline.
          const style =
            entry.strength === 'solid'
              ? { backgroundColor: color, borderColor: color }
              : entry.strength === 'thin'
                ? { backgroundColor: `${color}40`, borderColor: `${color}80` }
                : { backgroundColor: '#1a472a0d', borderColor: '#1a472a26' };
          const stateWord =
            entry.strength === 'solid'
              ? `solid, ${entry.needCount} needs`
              : entry.strength === 'thin'
                ? 'thin, one need'
                : 'not covered yet';
          return (
            <div
              key={entry.capital}
              className="h-6 flex-1 rounded-sm border transition-colors"
              style={style}
              title={`${entry.label} capital. ${entry.blurb} (${stateWord})`}
              aria-label={`${entry.label} capital, ${stateWord}`}
            />
          );
        })}
      </div>
    </div>
  );
}
