/**
 * CampaignStartDoor: the creator front door on /create-campaign (build spec
 * 2026-10-01, section 16.1). Every "Start a campaign" button opens this page,
 * so it shows the whole path in every state, from signed out to accepted, and
 * carries the public Ready to crowdpool list at #ready.
 *
 * Exactly one element carries id="ready" in every state, so ScrollToTop lands
 * on it: the framed list itself, or in the accepted state the <details> fold
 * around it (the list inside then carries no id). The list keeps the
 * storageKey the gift map used ("page"), so ticks already made in this browser
 * carry over.
 *
 * Copy lives in shared/crowdpoolCopy.ts (START_DOOR). Nothing here promises an
 * emailed decision (section 15, question 11).
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "wouter";
import { ChevronDown, Sparkles } from "lucide-react";
import SEO, { pageSEO } from "@/components/SEO";
import { CrowdpoolReadiness } from "@/components/CrowdpoolReadiness";
import { START_DOOR } from "@shared/crowdpoolCopy";
import { APPLY_BUTTON_LABEL } from "@shared/applicationWindow";
import { defaultCrowdpoolOpening } from "@shared/crowdpoolCalendar";
import { formatCloseDate } from "@shared/campaignProgress";

export type StartDoorState =
  | "loading"
  | "signed-out"
  | "no-application"
  | "changes-requested"
  | "draft"
  | "in-review"
  | "paused"
  | "accepted";

/** Where Sign in brings the person back to. */
export const START_DOOR_SIGN_IN_HREF = `/sign-in?returnTo=${encodeURIComponent("/create-campaign")}`;

const primaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#4a7c59] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a472a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a472a]/60";
const secondaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#4a7c59]/50 bg-white px-5 py-2.5 text-sm font-semibold text-[#1a472a] transition-colors hover:bg-[#f0f7f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a472a]/60";
const textLink =
  "inline-flex min-h-11 items-center font-semibold text-[#1a472a] underline underline-offset-4 hover:text-[#4a7c59]";

/** "Hill Farm", "Hill Farm and Oak Hollow", "A, B and C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

type Props = {
  state: StartDoorState;
  /** Project names of the person's applications in review, for the in-review line. */
  inReviewNames?: string[];
  /** Project names of the person's paused (inactive) applications, for the paused line. */
  pausedNames?: string[];
  /** True when the page was opened at #ready: the accepted state's fold starts open. */
  openReady: boolean;
  /** The project picker, shown in the accepted state. */
  children?: ReactNode;
  /** For tests: the moment the default opening day is worked out from. */
  now?: Date;
};

export function CampaignStartDoor({ state, inReviewNames = [], pausedNames = [], openReady, children, now }: Props) {
  const opening = defaultCrowdpoolOpening(now ?? new Date());
  const sendBody = START_DOOR.sendBody(formatCloseDate(opening.date), opening.state === "open");
  const accepted = state === "accepted";
  // Step 1's apply link stays away from a person whose application is
  // accepted or paused: /apply reopens that application, and saving the form
  // there would overwrite it.
  const showApplyStep = state !== "accepted" && state !== "paused";
  // A #ready link followed while this page is already open changes only the
  // hash, so nothing re-renders: open the fold then too.
  const fold = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#ready" && fold.current) fold.current.open = true;
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  // Opened at #ready, ScrollToTop scrolls once to the open list the loading
  // state shows. When the accepted state then puts the picker above and moves
  // #ready to the fold, nothing scrolls again: bring the fold into view once.
  const scrolledToFold = useRef(false);
  useEffect(() => {
    if (!accepted || !openReady || scrolledToFold.current) return;
    scrolledToFold.current = true;
    fold.current?.scrollIntoView?.({ block: "start" });
  }, [accepted, openReady]);

  return (
    <>
      <SEO {...pageSEO.createCampaign} />
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg border border-[#7dd87d]/30 text-[#1a472a]">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7dd87d]/20 mb-4">
            <Sparkles className="w-8 h-8 text-[#4a7c59]" aria-hidden="true" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1a472a] break-words" style={{ fontFamily: "var(--font-display)" }}>
            {START_DOOR.heading}
          </h1>
          <p className="text-[#1a472a]/80 mt-2 max-w-md mx-auto">{START_DOOR.lede}</p>
        </div>

        <ol className="space-y-4 mb-6" aria-label="How a campaign starts">
          {START_DOOR.steps.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3">
              <span
                className="w-8 h-8 rounded-full bg-[#7dd87d]/25 border border-[#4a7c59]/40 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#1a472a]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2 className="font-bold text-[#1a472a]">{step.title}</h2>
                <p className="text-sm text-[#1a472a]/85 mt-0.5 safe-prose">{i === 3 ? sendBody : step.body}</p>
                {i === 0 && showApplyStep && (
                  <Link href="/apply" className={`${textLink} text-sm`}>
                    {APPLY_BUTTON_LABEL}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>

        {state === "signed-out" && (
          <div className="rounded-xl bg-[#f0f7f0] border border-[#7dd87d]/40 p-4">
            <p className="text-sm text-[#1a472a] mb-3">{START_DOOR.signedOut}</p>
            <div className="flex flex-wrap gap-3">
              <a href={START_DOOR_SIGN_IN_HREF} className={primaryLink}>
                {START_DOOR.signIn}
              </a>
              <Link href="/apply" className={secondaryLink}>
                {APPLY_BUTTON_LABEL}
              </Link>
            </div>
          </div>
        )}

        {state === "no-application" && (
          <div className="rounded-xl bg-[#f0f7f0] border border-[#7dd87d]/40 p-4">
            <p className="text-sm text-[#1a472a] mb-3">{START_DOOR.noApplication}</p>
            <Link href="/apply" className={primaryLink}>
              {APPLY_BUTTON_LABEL}
            </Link>
          </div>
        )}

        {state === "changes-requested" && (
          <div className="rounded-xl bg-[#f0f7f0] border border-[#7dd87d]/40 p-4">
            <p className="text-sm text-[#1a472a] mb-3">{START_DOOR.changesRequested}</p>
            <Link href="/apply/status" className={primaryLink}>
              {START_DOOR.changesLink}
            </Link>
          </div>
        )}

        {state === "draft" && (
          <div className="rounded-xl bg-[#f0f7f0] border border-[#7dd87d]/40 p-4">
            <Link href="/apply" className={textLink}>
              {START_DOOR.draft}
            </Link>
          </div>
        )}

        {state === "in-review" && (
          <div className="rounded-xl bg-[#f0f7f0] border border-[#7dd87d]/40 p-4 text-sm text-[#1a472a]">
            {START_DOOR.inReview(joinNames(inReviewNames), inReviewNames.length)}
          </div>
        )}

        {state === "paused" && (
          <div className="rounded-xl bg-[#f0f7f0] border border-[#7dd87d]/40 p-4 text-sm text-[#1a472a]">
            {START_DOOR.paused(joinNames(pausedNames), pausedNames.length)}{" "}
            <Link href="/connect" className={textLink}>
              {START_DOOR.pausedLink}
            </Link>{" "}
            {START_DOOR.pausedTail}
          </div>
        )}

        {accepted && (
          <div>
            <p className="text-sm text-[#1a472a] mb-4">{START_DOOR.pick}</p>
            {children}
          </div>
        )}
      </div>

      {accepted ? (
        <details
          ref={fold}
          id="ready"
          open={openReady}
          className="group scroll-mt-24 mt-6 rounded-2xl border border-[#7dd87d]/40 bg-white/70 px-4 md:px-6"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 font-bold text-[#1a472a] [&::-webkit-details-marker]:hidden">
            {START_DOOR.readyFold}
            <ChevronDown className="ml-auto h-5 w-5 shrink-0 text-[#4a7c59] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="pb-5 pt-2">
            <CrowdpoolReadiness storageKey="page" framed />
          </div>
        </details>
      ) : (
        <div className="mt-8">
          <CrowdpoolReadiness id="ready" storageKey="page" framed />
        </div>
      )}
    </>
  );
}

export default CampaignStartDoor;
