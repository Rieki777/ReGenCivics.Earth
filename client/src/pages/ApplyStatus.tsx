import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { CheckCircle2, Clock, Circle, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const STATUS_STEPS = [
  { key: "draft", label: "Draft", description: "Application saved" },
  { key: "submitted", label: "Submitted", description: "Application received" },
  { key: "under_review", label: "Under Review", description: "Team is reviewing" },
  { key: "approved", label: "Approved", description: "Welcome to the alliance!" },
  { key: "active", label: "Active", description: "You're in the network!" },
];

const STATUS_MESSAGES: Record<string, string> = {
  draft: "Your application is saved as a draft. Complete and submit it to begin the review process.",
  submitted: "We've received your application! Our team reviews applications on a rolling basis and will be in touch within 1–2 weeks.",
  under_review: "Your application is being reviewed by our team. We may reach out with questions. Hang tight!",
  approved: "Congratulations! Your application has been approved. Our team will reach out to schedule your onboarding call.",
  active: "You're an active member of the ReGen Civics alliance. Welcome!",
  rejected: "Thank you for applying. Your project wasn't the right fit for this season, but we encourage you to stay connected and reapply.",
  changes_requested: "Our team has requested some changes to your application. Please review and update your submission.",
};

export default function ApplyStatus() {
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
          <Link href="/apply"><a className="text-[#4a7c59] underline">Return to Apply</a></Link>
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
                  const currentIdx = STATUS_STEPS.findIndex(s => s.key === application.status);
                  const isComplete = i < currentIdx;
                  const isCurrent = step.key === application.status || (application.status === 'rejected' && step.key === 'approved') || (application.status === 'changes_requested' && step.key === 'under_review');
                  const isPending = i > currentIdx;
                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isComplete ? 'bg-[#7dd87d] text-[#1a472a]' : isCurrent ? 'bg-[#1a472a] text-white ring-4 ring-[#7dd87d]/30' : 'bg-[#1a472a]/10 text-[#1a472a]/75'}`}>
                        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : isCurrent ? <Clock className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${isCurrent ? 'text-[#1a472a]' : isPending ? 'text-[#1a472a]/75' : 'text-[#1a472a]/70'}`}>{step.label}</p>
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
              <p className="text-white/90">{STATUS_MESSAGES[application.status] ?? "Your application is being processed."}</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
                <Link href="/community">
                  <button className="text-sm text-[#7dd87d] hover:text-white transition-colors">Join the Community &rarr;</button>
                </Link>
                <Link href="/game">
                  <button className="text-sm text-[#7dd87d] hover:text-white transition-colors">Play the Game &rarr;</button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
