import { Link } from "wouter";

export type AppliedProjectPick = {
  id: number;
  name: string;
  href: string;
};

/**
 * The land-project line on the season time vote.
 * A list of applied projects fills the name and links the vote.
 * Typing a name still works. The apply link stays up even when the list has rows.
 */
export function LandProjectVoteField({
  project,
  picks,
  onProjectChange,
  onPick,
  onBlur,
}: {
  project: string;
  picks: AppliedProjectPick[];
  onProjectChange: (name: string) => void;
  onPick: (pick: AppliedProjectPick) => void;
  onBlur?: () => void;
}) {
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
      <input
        type="text"
        value={project}
        maxLength={120}
        onChange={(e) => onProjectChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Project name"
        aria-label="Your land project"
        className="min-h-11 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-base text-white placeholder-white/40 focus:border-[#e3ac4f] focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-white md:text-sm"
      />
      <Link
        href="/apply"
        className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-[#7dd87d] bg-[#0d2818] px-3 text-sm font-bold text-[#7dd87d] no-underline hover:bg-[#143d24] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Not listed? Apply with your project
      </Link>
    </div>
  );
}
