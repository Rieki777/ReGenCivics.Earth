import { Link } from "wouter";

/**
 * Primary path to the season time vote. Same scale as the /join call button:
 * full width of its column, at least 64px tall, white on forest green.
 */
export function VoteCallTimesCta() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <Link
        href="/season-schedule"
        className="flex w-full min-h-16 items-center justify-center rounded-xl border-[3px] border-[#1a472a] bg-[#1a472a] px-5 py-4 text-center text-[1.5rem] font-bold leading-tight text-white no-underline hover:border-[#143d24] hover:bg-[#143d24] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#f6f3ea] sm:min-h-[72px] sm:text-[1.75rem]"
      >
        Vote on call times
      </Link>
      <p className="mt-3 rounded-lg bg-[#0d2818] px-3 py-2 text-center text-base font-semibold text-white">
        Add your info too.
      </p>
    </div>
  );
}
