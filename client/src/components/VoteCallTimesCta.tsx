import { Link } from "wouter";
import { Button } from "@/components/ui/button";

/**
 * Primary path to the season time vote.
 * Uses the site's filled primary button (spring on forest text) so it stays
 * visible on the schedule hero, which is the same forest green.
 * The line under it is a caption, not a second control.
 */
export function VoteCallTimesCta() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <Button
        asChild
        className="flex h-auto w-full min-h-16 whitespace-normal rounded-xl bg-[#7dd87d] px-5 py-4 text-center text-[1.5rem] font-bold leading-tight text-[#1a472a] no-underline hover:bg-[#9de89d] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-white sm:min-h-[72px] sm:text-[1.75rem]"
      >
        <Link href="/season-schedule">Vote on call times</Link>
      </Button>
      <p className="mt-3 text-center text-sm font-semibold leading-snug text-white">
        <span className="bg-[#0d2818] px-1">Add your info too.</span>
      </p>
    </div>
  );
}
