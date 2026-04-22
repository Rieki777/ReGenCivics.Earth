/**
 * WhoHoldsVoteChart
 *
 * Shows the breakdown of who holds voice over ReGen Civics Fund decisions.
 * Uses the designed "Who Holds the Vote" diagram image as the primary visual,
 * with the source-of-truth percentages from governanceSlices rendered below
 * as a legend so the page stays accurate as the numbers evolve each season.
 */
import { governanceSlices } from "@/lib/design-tokens";

type Slice = { label: string; share: number; color: string };

const slices: Slice[] = governanceSlices.map((s) => ({
  label: s.label,
  share: s.share,
  color: s.color,
}));

export function WhoHoldsVoteChart() {
  return (
    <figure className="bg-[#1a472a]/40 border border-[#7dd87d]/20 rounded-2xl p-4 md:p-6">
      <img
        src="/images/governance/who-holds-vote.png"
        alt="Who Holds the Vote: Fund governance weight across Stewardship Council, Investors, Land Projects, and Alliance Partners."
        className="w-full max-w-md mx-auto h-auto rounded-xl"
        loading="lazy"
      />
      <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-white/80">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            <span className="flex-1">{s.label}</span>
            <span className="font-mono text-[#7dd87d]">{s.share}%</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 text-xs text-white/50">
        These four actor classes together hold voice over Fund decisions: capital deployment, partner acceptance, and stewardship policy. Game governance (RGVoice) follows a separate structure on the ReGen Games side of the bridge. Percentages evolve with each season.
      </figcaption>
    </figure>
  );
}
