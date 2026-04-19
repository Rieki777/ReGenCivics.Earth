/**
 * Shape the Next Session. Agenda Suggestion Form
 *
 * Route: /shape-next-session
 * Purpose: Linked from recording-ready emails and forum posts.
 *   Three fields: name (optional), what to cover, whether attending.
 *   Submits to events.suggestAgendaItem tRPC mutation.
 *   Auto-detects the next upcoming event.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ArrowRight, Calendar, Leaf } from "lucide-react";
import { Link } from "wouter";

type Attending = "yes" | "maybe" | "no";

const attendingOptions: { value: Attending; label: string; sub: string }[] = [
  { value: "yes",   label: "Yes, I'll be there",    sub: "Wouldn't miss it" },
  { value: "maybe", label: "Maybe",                 sub: "Depends on timing" },
  { value: "no",    label: "Watching the recording", sub: "Can't make the live call" },
];

function formatEventDate(startTime: Date | string): string {
  const d = new Date(startTime);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(startTime: Date | string): string {
  const d = new Date(startTime);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function ShapeNextSession() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [attending, setAttending] = useState<Attending | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Load upcoming events, pick the first one
  const { data: events = [], isLoading: eventsLoading } = trpc.events.list.useQuery({
    includeCompleted: false,
    limit: 5,
  });

  const nextEvent = events.find(e => e.status === "upcoming" || e.status === "live") ?? events[0];

  const submitMutation = trpc.events.suggestAgendaItem.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => setError(err.message ?? "Something went wrong. Please try again."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!topic.trim()) {
      setError("Please tell us what you'd like covered.");
      return;
    }
    if (!attending) {
      setError("Please let us know if you plan to attend.");
      return;
    }
    if (!nextEvent) {
      setError("No upcoming session found. Check back soon.");
      return;
    }

    const attendingLabel = attendingOptions.find(a => a.value === attending)?.label ?? attending;
    const fullSuggestion = `ATTENDING: ${attendingLabel}\n\nTOPIC: ${topic.trim()}`;

    submitMutation.mutate({
      eventId: nextEvent.id,
      authorName: name.trim() || undefined,
      authorEmail: email.trim() || undefined,
      suggestion: fullSuggestion,
    });
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] to-[#1a472a] flex items-center justify-center p-6">
        <SEO
          title="Thanks for shaping the next session"
          description="Your input helps us build sessions worth showing up for."
        />
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#7dd87d]" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-white">Got it. Thank you.</h1>
            <p className="text-[#a8e6a8] text-base leading-relaxed">
              We read every suggestion. At the start of the next session, we'll open with what came back most often.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <Link href="/schedule">
              <Button className="w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#a8e6a8] font-semibold">
                View the full schedule
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/community">
              <Button variant="outline" className="w-full border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10">
                Go to the community
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] to-[#1a472a]">
      <SEO
        title="Shape the Next Session"
        description="Tell us what you want covered and whether you'll be there."
        url="/shape-next-session"
      />

      <div className="max-w-lg mx-auto px-6 py-16 space-y-10">

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#7dd87d]/60 text-sm">
            <Leaf className="w-4 h-4" />
            <span>ReGen Civics</span>
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight">
            Shape the next session
          </h1>
          <p className="text-[#a8e6a8] text-base leading-relaxed">
            We build each session from what you bring. Tell us what you want covered and we'll incorporate as much as we can.
          </p>
        </div>

        {/* Next event card */}
        {eventsLoading ? (
          <div className="rounded-xl border border-[#7dd87d]/20 bg-[#1a472a]/40 p-4 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-[#7dd87d] animate-spin" />
            <span className="text-[#a8e6a8] text-sm">Loading next session...</span>
          </div>
        ) : nextEvent ? (
          <div className="rounded-xl border border-[#7dd87d]/25 bg-[#1a472a]/50 p-5 space-y-1">
            <div className="flex items-center gap-2 text-[#7dd87d]/60 text-xs uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Next session</span>
            </div>
            <p className="text-white font-semibold text-base">{nextEvent.title}</p>
            <p className="text-[#a8e6a8] text-sm">
              {formatEventDate(nextEvent.startTime)} at {formatEventTime(nextEvent.startTime)}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#7dd87d]/20 bg-[#1a472a]/40 p-4">
            <p className="text-[#a8e6a8] text-sm">No upcoming session found. Check back soon or browse the schedule.</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Field 1: Name + Email (optional) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#a8e6a8] text-sm font-medium">
                Name <span className="text-[#7dd87d]/40 font-normal">(optional)</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="How you'd like to be known"
                className="bg-[#0d2a0d] border-[#7dd87d]/25 text-white placeholder:text-[#4a7c59] focus:border-[#7dd87d]/60 focus:ring-0 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#a8e6a8] text-sm font-medium">
                Email <span className="text-[#7dd87d]/40 font-normal">(optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="If you want a reply"
                className="bg-[#0d2a0d] border-[#7dd87d]/25 text-white placeholder:text-[#4a7c59] focus:border-[#7dd87d]/60 focus:ring-0 h-11"
              />
            </div>
          </div>

          {/* Field 2: Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="text-[#a8e6a8] text-sm font-medium">
              What do you want us to cover or go deeper on?
            </Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="A question, a theme, something you want to understand better, a practitioner you'd love to hear from..."
              rows={4}
              className="bg-[#0d2a0d] border-[#7dd87d]/25 text-white placeholder:text-[#4a7c59] focus:border-[#7dd87d]/60 focus:ring-0 resize-none"
            />
            <p className="text-[#4a7c59] text-xs">
              Be as specific or as open as you like. We read everything.
            </p>
          </div>

          {/* Field 3: Attending */}
          <div className="space-y-3">
            <Label className="text-[#a8e6a8] text-sm font-medium block">
              Will you be at the next session?
            </Label>
            <div className="grid gap-2">
              {attendingOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAttending(option.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    attending === option.value
                      ? "border-[#7dd87d] bg-[#7dd87d]/10"
                      : "border-[#7dd87d]/20 bg-[#1a472a]/30 hover:border-[#7dd87d]/40 hover:bg-[#7dd87d]/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${attending === option.value ? "text-[#7dd87d]" : "text-white"}`}>
                        {option.label}
                      </p>
                      <p className="text-[#4a7c59] text-xs mt-0.5">{option.sub}</p>
                    </div>
                    {attending === option.value && (
                      <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitMutation.isPending || !nextEvent}
            className="w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#a8e6a8] font-semibold h-12 text-base"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Shape the session
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>

          <p className="text-[#4a7c59] text-xs text-center leading-relaxed">
            Your input goes to Rye and the facilitation team. We only use your email to follow up if you want a reply.{" "}
            <Link href="/schedule" className="text-[#7dd87d]/60 hover:text-[#7dd87d] underline">
              View the full schedule.
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
