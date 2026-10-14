/**
 * /apply/alliance/status: where an Alliance Partner application stands, and
 * the next steps once it is approved (ADR-72): vote for the Interoperability
 * Circle's weekly call time, subscribe to its calendar, and come to the calls.
 */
import type { ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { ALLIANCE_APPLY_PATH, ALLIANCE_STATUS_PATH } from "@shared/allianceApplication";
import { CircleVoteNudge } from "@/components/CallTimeVoteNudge";

export const ALLIANCE_STATUS_SIGN_IN_HREF = `/sign-in?returnTo=${encodeURIComponent(ALLIANCE_STATUS_PATH)}`;

const STEPS = [
  { key: "draft", label: "Draft", description: "Application saved" },
  { key: "submitted", label: "Sent", description: "Application received" },
  { key: "under_review", label: "Under review", description: "The team is reading it" },
  { key: "approved", label: "Alliance Partner", description: "Welcome to the Alliance and the Interoperability Circle" },
];

/** Where the application sits on the steps; rejected and paused mark no step current. */
export function alliancePosition(status: string): { done: number; current: string | null } {
  const at = (key: string) => STEPS.findIndex((s) => s.key === key);
  switch (status) {
    case "draft": return { done: 0, current: "draft" };
    case "submitted": return { done: at("submitted"), current: "submitted" };
    case "under_review": return { done: at("under_review"), current: "under_review" };
    case "changes_requested": return { done: at("under_review"), current: "under_review" };
    case "approved":
    case "active": return { done: at("approved"), current: "approved" };
    case "inactive": return { done: at("approved") + 1, current: null };
    case "rejected": return { done: at("approved"), current: null };
    default: return { done: 0, current: null };
  }
}

const link = "inline-flex items-center min-h-11 text-sm text-[#7dd87d] hover:text-white underline-offset-4 hover:underline transition-colors";

function message(status: string, org: string): ReactNode {
  switch (status) {
    case "draft": return "Your application is saved as a draft. Finish it and send it when you are ready.";
    case "submitted": return "The review team reads applications as they come in. You can still change anything in it.";
    case "under_review": return "The team is reading your application and may write to you with questions.";
    case "changes_requested": return "The review team asked for a few changes. Their note is below.";
    case "approved":
    case "active": return `${org} is an Alliance Partner. You are signed up for every Interoperability Circle week, and the Circle picks its weekly time together.`;
    case "inactive": return `${org}'s partnership is paused. Write to us from the Connect page to pick it up again.`;
    case "rejected": return "Thank you for applying. The partnership isn't the right fit right now. You are welcome to update your application and send it again.";
    default: return "Your application is being processed.";
  }
}

export default function AllianceApplyStatus() {
  const { user, loading } = useAuth();
  const mine = trpc.allianceApplications.mine.useQuery(undefined, { enabled: !!user });

  if (loading || (user && mine.isLoading)) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]"><div className="animate-spin w-8 h-8 border-4 border-[#7dd87d] border-t-transparent rounded-full" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center p-4">
        <SEO title="Alliance Partner application | ReGen Civics" description="Check your Alliance Partner application." url={ALLIANCE_STATUS_PATH} />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1a472a] mb-4">Sign in to see your application</h1>
          <a href={ALLIANCE_STATUS_SIGN_IN_HREF} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#7dd87d] px-6 py-2 font-semibold text-[#1a472a] hover:bg-[#9de89d]">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  const app = mine.data?.[0];
  const approved = app && (app.status === "approved" || app.status === "active");
  const editable = app && !["approved", "active", "inactive"].includes(app.status);

  return (
    <div className="min-h-screen bg-[#f0ebe3] py-12 px-4">
      <SEO title="Alliance Partner application | ReGen Civics" description="Track your Alliance Partner application." url={ALLIANCE_STATUS_PATH} />
      <div className="max-w-2xl mx-auto">
        <Link href="/ally" className="text-sm text-[#4a7c59] hover:underline">&larr; About the Alliance</Link>
        <h1 className="text-3xl font-bold text-[#1a472a] mt-4 mb-6" style={{ fontFamily: "var(--font-display)" }}>
          Alliance Partner application
        </h1>

        {!app ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#1a472a]/10">
            <Circle className="w-12 h-12 text-[#7dd87d]/75 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-[#1a472a] mb-2">No application yet</h2>
            <p className="text-[#1a472a]/80 mb-6">Apply to join the Alliance and the Interoperability Circle.</p>
            <Link href={ALLIANCE_APPLY_PATH} className="inline-flex min-h-11 items-center rounded-full bg-[#7dd87d] px-6 py-2 font-semibold text-[#1a472a] hover:bg-[#9de89d]">
              Start your application
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#1a472a]/10">
              <h2 className="font-bold text-[#1a472a] text-xl mb-1">{app.organizationName || "Your organization"}</h2>
              {app.submittedAt && (
                <p className="text-xs text-[#1a472a]/80">Sent {new Date(app.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              )}
              {editable && (
                <Link href={ALLIANCE_APPLY_PATH} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#1a472a] underline">
                  {app.status === "draft" ? "Continue your application" : "Edit your application"}
                </Link>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#1a472a]/10">
              <h3 className="font-semibold text-[#1a472a] mb-6">Review progress</h3>
              <ol className="space-y-4">
                {STEPS.map((step, i) => {
                  const pos = alliancePosition(app.status);
                  const complete = i < pos.done;
                  const current = step.key === pos.current;
                  return (
                    <li key={step.key} className="flex items-start gap-4" aria-current={current ? "step" : undefined} data-step-state={complete ? "complete" : current ? "current" : "pending"}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${complete ? "bg-[#7dd87d] text-[#1a472a]" : current ? "bg-[#1a472a] text-white ring-4 ring-[#7dd87d]/30" : "bg-[#1a472a]/10 text-[#1a472a]/75"}`}>
                        {complete ? <CheckCircle2 className="w-5 h-5" /> : current ? <Clock className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#1a472a]">{step.label}</p>
                        <p className="text-xs mt-0.5 text-[#1a472a]/80">{step.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="bg-[#1a472a] text-white rounded-2xl p-6">
              <p className="text-[#7dd87d] text-xs font-semibold uppercase tracking-widest mb-2">Current status</p>
              <p className="text-white/90">{message(app.status, app.organizationName || "Your organization")}</p>
              {app.reviewNote && (app.status === "changes_requested" || app.status === "rejected") && (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white/10 p-3 text-sm text-white/90">{app.reviewNote}</p>
              )}
              {approved ? (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <CircleVoteNudge />
                  <ul className="flex flex-wrap gap-x-5 gap-y-1">
                    <li><Link href="/interop-sessions" className={link}>The Circle page and time vote &rarr;</Link></li>
                    <li><a href="/calendar/interop-circle.ics" className={link}>Subscribe to the Circle calendar &rarr;</a></li>
                    <li><Link href="/interop-sessions#directory" className={link}>Meet the other partners' tools &rarr;</Link></li>
                  </ul>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-1">
                  <Link href="/interop-sessions" className={link}>See the Interoperability Circle &rarr;</Link>
                  <Link href="/community" className={link}>Join the Community &rarr;</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
