/**
 * CustomGameWaitlistForm. Waitlist inquiry form for /custom-games.
 * Collects project details and submits to the customGameInquiries tRPC router.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Sprout, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analytics } from "@/lib/analytics";

interface FormState {
  fullName: string;
  email: string;
  projectName: string;
  websiteOrSocial: string;
  landStatus: string;
  communityStage: string;
  primaryGoal: string;
  timeline: string;
  budgetConfirmed: boolean;
  referralSource: string;
  additionalNotes: string;
}

const EMPTY: FormState = {
  fullName: "",
  email: "",
  projectName: "",
  websiteOrSocial: "",
  landStatus: "",
  communityStage: "",
  primaryGoal: "",
  timeline: "",
  budgetConfirmed: false,
  referralSource: "",
  additionalNotes: "",
};

const LAND_STATUS_OPTIONS = [
  "Land is already purchased",
  "In contract / closing soon",
  "Still searching",
];

const COMMUNITY_STAGE_OPTIONS = [
  "Just us founders",
  "We have a core team forming",
  "We have 10+ people involved",
  "100+ people / already active community",
];

const TIMELINE_OPTIONS = [
  "ASAP",
  "Within 3 months",
  "3–6 months",
  "6+ months / flexible",
];

export function CustomGameWaitlistForm({ onClose }: { onClose?: () => void }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.customGameInquiries.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      analytics.customGameWaitlistJoined();
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.budgetConfirmed) {
      toast.error("Please confirm the investment amount to continue.");
      return;
    }
    submitMutation.mutate({
      fullName: form.fullName,
      email: form.email,
      projectName: form.projectName,
      websiteOrSocial: form.websiteOrSocial || undefined,
      landStatus: form.landStatus,
      communityStage: form.communityStage,
      primaryGoal: form.primaryGoal,
      timeline: form.timeline,
      budgetConfirmed: form.budgetConfirmed,
      referralSource: form.referralSource || undefined,
      additionalNotes: form.additionalNotes || undefined,
    });
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-[#7dd87d]" />
        </div>
        <h3 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          You're on the waitlist!
        </h3>
        <p className="text-white/70 text-sm max-w-sm mx-auto">
          We'll reach out within 5 business days to schedule an intro conversation. Looking forward to learning about your project.
        </p>
        {onClose && (
          <Button
            onClick={onClose}
            variant="outline"
            className="mt-4 border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10"
          >
            Close
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cgi-name" className="text-white/80 text-sm">Full Name *</Label>
          <Input
            id="cgi-name"
            required
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Your name"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cgi-email" className="text-white/80 text-sm">Email *</Label>
          <Input
            id="cgi-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]/50"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cgi-project" className="text-white/80 text-sm">Land Project Name *</Label>
        <Input
          id="cgi-project"
          required
          value={form.projectName}
          onChange={(e) => set("projectName", e.target.value)}
          placeholder="The name of your land project or community"
          className="bg-white/5 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]/50"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cgi-website" className="text-white/80 text-sm">Website or Social Link</Label>
        <Input
          id="cgi-website"
          value={form.websiteOrSocial}
          onChange={(e) => set("websiteOrSocial", e.target.value)}
          placeholder="https://..."
          className="bg-white/5 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]/50"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-white/80 text-sm font-medium">Land Status *</legend>
        {LAND_STATUS_OPTIONS.map((opt) => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name="landStatus"
              value={opt}
              checked={form.landStatus === opt}
              onChange={() => set("landStatus", opt)}
              required
              className="accent-[#7dd87d]"
            />
            <span className="text-white/70 text-sm group-hover:text-white/90 transition-colors">{opt}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-white/80 text-sm font-medium">Community Stage *</legend>
        {COMMUNITY_STAGE_OPTIONS.map((opt) => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name="communityStage"
              value={opt}
              checked={form.communityStage === opt}
              onChange={() => set("communityStage", opt)}
              required
              className="accent-[#7dd87d]"
            />
            <span className="text-white/70 text-sm group-hover:text-white/90 transition-colors">{opt}</span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="cgi-goal" className="text-white/80 text-sm">Primary Goal for the Game *</Label>
        <textarea
          id="cgi-goal"
          required
          value={form.primaryGoal}
          onChange={(e) => set("primaryGoal", e.target.value)}
          rows={3}
          placeholder="What do you most want this Game to do for your community?"
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/70 focus:border-[#7dd87d]/50 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cgi-timeline" className="text-white/80 text-sm">Timeline *</Label>
        <select
          id="cgi-timeline"
          required
          value={form.timeline}
          onChange={(e) => set("timeline", e.target.value)}
          className="w-full bg-[#0d2818] border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-[#7dd87d]/50 focus:outline-none"
        >
          <option value="">Select timeline...</option>
          {TIMELINE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={form.budgetConfirmed}
          onChange={(e) => set("budgetConfirmed", e.target.checked)}
          className="mt-1 accent-[#7dd87d] flex-shrink-0"
        />
        <span className="text-white/70 text-sm leading-relaxed group-hover:text-white/90 transition-colors">
          I understand the Custom Land Game investment is $20,000 USD, and I'm ready to have a conversation about it. *
        </span>
      </label>

      <div className="space-y-1.5">
        <Label htmlFor="cgi-referral" className="text-white/80 text-sm">How did you hear about ReGen Civics?</Label>
        <Input
          id="cgi-referral"
          value={form.referralSource}
          onChange={(e) => set("referralSource", e.target.value)}
          placeholder="Word of mouth, social media, event..."
          className="bg-white/5 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]/50"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cgi-notes" className="text-white/80 text-sm">Anything else to share?</Label>
        <textarea
          id="cgi-notes"
          value={form.additionalNotes}
          onChange={(e) => set("additionalNotes", e.target.value)}
          rows={2}
          placeholder="Any context that would help us understand your project..."
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/70 focus:border-[#7dd87d]/50 focus:outline-none resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={submitMutation.isPending}
        className="w-full bg-gradient-to-r from-[#7dd87d] to-[#4a7c59] text-white font-bold hover:shadow-[0_0_20px_rgba(125,216,125,0.4)] transition-all"
      >
        {submitMutation.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
        ) : (
          <><Sprout className="w-4 h-4 mr-2" /> Join the Waitlist</>
        )}
      </Button>
    </form>
  );
}
