/**
 * ApplicationsNotice: says where land project applications stand, the same way
 * on every page. The words and the switch live in shared/applicationWindow.ts;
 * when review for the next Season starts (APPLICATIONS.reviewing), this renders
 * nothing and the pages go back to their ordinary apply buttons.
 */
import { Link } from "wouter";
import { ArrowRight, CalendarClock } from "lucide-react";
import {
  APPLICATIONS,
  APPLICATIONS_CLOSED_LINE,
  APPLY_ANYTIME_LINE,
  APPLY_BUTTON_LABEL,
} from "@shared/applicationWindow";

type Props = {
  /** "dark" for the forest pages, "light" for parchment ones like /apply. */
  tone?: "dark" | "light";
  /** Show the apply link. Off on /apply itself, where the form is right there. */
  showLink?: boolean;
  className?: string;
};

export function ApplicationsNotice({ tone = "dark", showLink = true, className = "" }: Props) {
  if (APPLICATIONS.reviewing) return null;
  const dark = tone === "dark";
  return (
    <div
      role="note"
      className={`rounded-2xl border p-5 flex items-start gap-4 text-left ${
        dark ? "border-[#7dd87d]/35 bg-[#7dd87d]/10" : "border-[#4a7c59]/35 bg-[#f0f7f0]"
      } ${className}`}
    >
      <CalendarClock
        className={`h-6 w-6 shrink-0 mt-0.5 ${dark ? "text-[#7dd87d]" : "text-[#1a472a]"}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className={`font-bold mb-1 ${dark ? "text-white" : "text-[#1a472a]"}`}>{APPLICATIONS_CLOSED_LINE}</p>
        <p className={`text-sm md:text-base leading-relaxed safe-prose ${dark ? "text-white/80" : "text-[#1a472a]/85"}`}>
          {APPLY_ANYTIME_LINE}
        </p>
        {showLink && (
          <Link
            href="/apply"
            className={`mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 rounded ${
              dark ? "text-[#7dd87d] focus-visible:ring-white/80" : "text-[#1a472a] focus-visible:ring-[#1a472a]/60"
            }`}
          >
            {APPLY_BUTTON_LABEL}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default ApplicationsNotice;
