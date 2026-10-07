import { Link } from "wouter";

export type AppliedProjectPick = {
  id: number;
  name: string;
  href: string;
};

/**
 * The land-project line on the season time vote.
 * A list of applied projects fills the name and links the vote.
 * Typing a name still works. With no list, the apply button sits beside the field.
 */
export function LandProjectVoteField({
  project,
  picks,
  ready,
  onProjectChange,
  onPick,
  onBlur,
}: {
  project: string;
  picks: AppliedProjectPick[];
  ready: boolean;
  onProjectChange: (name: string) => void;
  onPick: (pick: AppliedProjectPick) => void;
  onBlur?: () => void;
}) {
  const showApply = ready && picks.length === 0;

  return (
    <div className="block sm:col-span-2">
      <span className="mb-2 block text-sm text-white/60">Your land project (needed to vote)</span>
      {picks.length > 0 && (
        <select
          aria-label="Your applied project"
          defaultValue=""
          onChange={(e) => {
            const found = picks.find((p) => String(p.id) === e.target.value);
            if (found) onPick(found);
          }}
          className="mb-2 w-full min-h-11 rounded-xl border border-white/20 bg-[#0d2818] px-4 py-2 text-base text-white focus:border-[#e3ac4f] focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-white md:text-sm"
        >
          <option value="">Pick your project</option>
          {picks.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={project}
          maxLength={120}
          onChange={(e) => onProjectChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Project name"
          aria-label="Your land project"
          className="min-h-11 w-full flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-base text-white placeholder-white/40 focus:border-[#e3ac4f] focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-white md:text-sm"
        />
        {showApply && (
          <Link
            href="/apply"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border-[3px] border-white bg-white px-4 text-center text-base font-bold text-[#1a472a] no-underline hover:bg-[#f6f3ea] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Apply with your project
          </Link>
        )}
      </div>
    </div>
  );
}
