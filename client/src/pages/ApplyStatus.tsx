/**
 * /apply/status: where a founder's application stands, and their next step.
 *
 * Build spec bundle 1, section 16.3. An accepted founder's status card links
 * every next step (the sessions, what the review checks, their project page
 * and the campaign wizard opened on their project), so the page names what
 * to do next instead of "Join the Community". Nothing here promises an
 * emailed decision: decision emails reach only the site owner today
 * (section 15, question 11). The draft, rejected and changes-requested lines
 * keep their words (section 13).
 */
import type { ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { CheckCircle2, Clock, Circle } from "lucide-react";
import { Link } from "wouter";
import { CREATOR_PATH, START_DOOR } from "@shared/crowdpoolCopy";
import { READINESS_HREF } from "@shared/crowdpoolReadiness";
import { defaultCrowdpoolOpening } from "@shared/crowdpoolCalendar";
import { formatCloseDate } from "@shared/campaignProgress";
import { projectPathForApplication } from "@shared/projectKey";
import { isAcceptedForHosting, VILLAGE_OS_OFFER, VILLAGE_OS_PATH } from "@shared/villageOsOffer";

/** Where Sign in brings the person back to. */
export const APPLY_STATUS_SIGN_IN_HREF = `/sign-in?returnTo=${encodeURIComponent("/apply/status")}`;

const STATUS_STEPS = [
  { key: "draft", label: "Draft", description: "Application saved" },
  { key: "submitted", label: "Submitted", description: "Application received" },
  { key: "under_review", label: "Under Review", description: "Team is reviewing" },
  { key: "approved", label: "Accepted", description: "Meets the minimum criteria to take part in crowdpooling" },
  { key: "active", label: "Taking part", description: "In this season's sessions and crowdpooling round" },
];

/**
 * Where an application sits on the timeline: the steps before `done` read
 * complete, and `current` (when there is one) is marked. A rejected
 * application was read but not accepted, so no step is current and Accepted
 * never wears the current ring. A paused one was accepted, so the steps up
 * to Accepted read complete and Taking part waits.
 */
export function timelinePosition(status: string): { done: number; current: string | null } {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  if (idx >= 0) return { done: idx, current: status };
  const at = (key: string) => STATUS_STEPS.findIndex((s) => s.key === key);
  switch (status) {
    case "changes_requested": return { done: at("under_review"), current: "under_review" };
    case "rejected": return { done: at("approved"), current: null };
    case "inactive": return { done: at("active"), current: null };
    default: return { done: 0, current: null };
  }
}

/** Statuses whose card links the founder's next steps. */
const ACCEPTED_STATUSES = ["approved", "active"];

type StatusApplication = { status: string; projectName: string; season?: number | null };

const statusLink = "inline-flex items-center min-h-11 text-sm text-[#7dd87d] hover:text-white underline-offset-4 hover:underline transition-colors";

/** The current status in words, for this application. */
function statusMessage(app: StatusApplication): ReactNode {
  const name = app.projectName;
  switch (app.status) {
    case "draft":
      return "Your application is saved as a draft. Complete and submit it to begin the review process.";
    case "submitted":
      return "The review team reads applications as they come in.";
    case "under_review":
      return "The team is reading your application. We may write to you with questions.";
    case "approved":
      return `${name} is accepted. Being accepted means your project meets the minimum criteria to take part in crowdpooling.`;
    case "active":
      return `${name} is taking part in ${app.season ? `Season ${app.season}` : "this season"}. Start or check your campaign from your project page.`;
    case "inactive":
      // The same line the creator front door gives a paused application.
      return (
        <>
          {START_DOOR.paused(name)}{" "}
          <Link href="/connect" className="font-semibold text-[#7dd87d] underline underline-offset-4 hover:text-white">
            {START_DOOR.pausedLink}
          </Link>{" "}
          {START_DOOR.pausedTail}
        </>
      );
    case "rejected":
      return "Thank you for applying. Your project wasn't the right fit for this season, but we encourage you to stay connected and reapply.";
    case "changes_requested":
      return "Our team has requested some changes to your application. Please review and update your submission.";
    default:
      return "Your application is being processed.";
  }
}

/** An accepted founder's next steps, on the status card. */
function CreatorPath({ app, now }: { app: StatusApplication & { id: number }; now?: Date }) {
  const opening = defaultCrowdpoolOpening(now ?? new Date());
  const hosted = isAcceptedForHosting({ status: app.status, season: app.season ?? null });
  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        <li><Link href="/season-schedule" className={statusLink}>{CREATOR_PATH.sessions} &rarr;</Link></li>
        <li><Link href={READINESS_HREF} className={statusLink}>{CREATOR_PATH.ready} &rarr;</Link></li>
        <li><Link href={projectPathForApplication(app.id, app.projectName)} className={statusLink}>{CREATOR_PATH.projectPage} &rarr;</Link></li>
        <li><Link href={`/create-campaign?application=${app.id}`} className={statusLink}>{CREATOR_PATH.start} &rarr;</Link></li>
      </ul>
      {opening.state === "upcoming" && (
        <p className="text-sm text-white/80 mt-2">{CREATOR_PATH.opensLine(formatCloseDate(opening.date))}</p>
      )}
      {hosted && (
        <div className="mt-3">
          <Link href={VILLAGE_OS_PATH} className={statusLink}>{VILLAGE_OS_OFFER.board.title} &rarr;</Link>
          <p className="text-sm text-white/80">{VILLAGE_OS_OFFER.board.hostedLine}</p>
        </div>
      )}
    </div>
  );
}

export default function ApplyStatus({ now }: { now?: Date } = {}) {
  const { user, loading } = useAuth();
  const { data: applications, isLoading } = trpc.applications.myApplications.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading || isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[#7dd87d] border-t-transparent rounded-full" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center p-4">
        <SEO title="Application Status | ReGen Civics" description="Check your land project application status." />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1a472a] mb-4">Sign in to view your application</h1>
          <div className="flex flex-col items-center gap-2">
            <a
              href={APPLY_STATUS_SIGN_IN_HREF}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#7dd87d] px-6 py-2 font-semibold text-[#1a472a] transition-colors hover:bg-[#9de89d]"
            >
              Sign in
            </a>
            <Link href="/apply" className="inline-flex min-h-11 items-center text-[#4a7c59] underline">Return to Apply</Link>
          </div>
        </div>
      </div>
    );
  }

  const application = applications?.[0];

  return (
    <div className="min-h-screen bg-[#f0ebe3] py-12 px-4">
      <SEO title="Application Status | ReGen Civics" description="Track your land project application through the review process." url="/apply/status" />
      <div className="max-w-2xl mx-auto">
        <Link href="/apply" className="text-sm text-[#4a7c59] hover:underline flex items-center gap-1 mb-6">
          &larr; Back to Apply
        </Link>

        <h1 className="text-3xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Application Status
        </h1>

        {!application ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#1a472a]/10">
            <Circle className="w-12 h-12 text-[#7dd87d]/75 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#1a472a] mb-2">No application yet</h2>
            <p className="text-[#1a472a]/80 mb-6">Start your application to join the ReGen Civics alliance.</p>
            <Link href="/apply">
              <button className="bg-[#7dd87d] text-[#1a472a] px-6 py-2 rounded-full font-semibold hover:bg-[#9de89d] transition-colors">
                Begin Application
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#1a472a]/10">
              <h2 className="font-bold text-[#1a472a] text-xl mb-1">{application.projectName}</h2>
              <p className="text-sm text-[#1a472a]/80">{application.location}</p>
              {application.submittedAt && (
                <p className="text-xs text-[#1a472a]/80 mt-1">Submitted {new Date(application.submittedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              )}
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-2xl p-6 border border-[#1a472a]/10">
              <h3 className="font-semibold text-[#1a472a] mb-6">Review Progress</h3>
              <div className="space-y-4">
                {STATUS_STEPS.map((step, i) => {
                  const position = timelinePosition(application.status);
                  const isComplete = i < position.done;
                  const isCurrent = step.key === position.current;
                  const isPending = !isComplete && !isCurrent;
                  return (
                    <div
                      key={step.key}
                      className="flex items-start gap-4"
                      data-step-state={isComplete ? "complete" : isCurrent ? "current" : "pending"}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isComplete ? 'bg-[#7dd87d] text-[#1a472a]' : isCurrent ? 'bg-[#1a472a] text-white ring-4 ring-[#7dd87d]/30' : 'bg-[#1a472a]/10 text-[#1a472a]/75'}`}>
                        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : isCurrent ? <Clock className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${isCurrent ? 'text-[#1a472a]' : isPending ? 'text-[#1a472a]/75' : 'text-[#1a472a]/75'}`}>{step.label}</p>
                        <p className={`text-xs mt-0.5 ${isPending ? 'text-[#1a472a]/75' : 'text-[#1a472a]/80'}`}>{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current status message */}
            <div className="bg-[#1a472a] text-white rounded-2xl p-6">
              <p className="text-[#7dd87d] text-xs font-semibold uppercase tracking-widest mb-2">Current Status</p>
              <p className="text-white/90">{statusMessage(application)}</p>
              {ACCEPTED_STATUSES.includes(application.status) ? (
                <CreatorPath app={application} now={now} />
              ) : (
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-1">
                  <Link href="/community" className={statusLink}>Join the Community &rarr;</Link>
                  <Link href="/game" className={statusLink}>Play the Game &rarr;</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
