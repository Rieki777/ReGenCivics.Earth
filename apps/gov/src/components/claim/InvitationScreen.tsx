import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";
import { Calendar, CheckCircle2 } from "lucide-react";

interface InvitationScreenProps extends ScreenProps {
  onSubmit: () => void;
  submitting: boolean;
  submitted: boolean;
}

export function InvitationScreen({ back, onSubmit, submitting, submitted }: InvitationScreenProps) {
  if (submitted) {
    return (
      <GlassCard className="p-6 md:p-12 text-center">
        <CheckCircle2 className="w-14 h-14 text-[#7dd87d] mx-auto mb-4" />
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Your claim is saved.</h2>
        <p className="text-white/70 text-sm max-w-lg mx-auto mb-6">
          We'll review it and get in touch before the first Proposal Party at the June Solstice. Add our calendar to stay in the loop.
        </p>
        <a
          href="webcal://calendar.regencivics.earth/proposal-parties.ics"
          className="inline-flex items-center gap-2 text-[#7dd87d] hover:text-[#9de89d] text-sm"
        >
          <Calendar className="w-4 h-4" /> Add Proposal Parties calendar
        </a>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">You're invited to a Proposal Party.</h2>
      <p className="text-white/70 text-sm mb-4">
        The first one is at the June Solstice. It's where we bring your claim to the circle, you share a piece of your story, and the community confirms the tier together. It's not an interrogation. It's closer to a welcome.
      </p>
      <p className="text-white/60 text-sm mb-6">
        Before then, you can come back and edit anything you want. Your claim is saved as a draft until we submit it together.
      </p>
      <div className="flex flex-col md:flex-row gap-3">
        <PillButton onClick={onSubmit} disabled={submitting}>
          {submitting ? "Saving..." : "Save my claim"}
        </PillButton>
        <a
          href="webcal://calendar.regencivics.earth/proposal-parties.ics"
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm border border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 transition-colors"
        >
          <Calendar className="w-4 h-4" /> Add calendar
        </a>
        <PillButton variant="secondary" onClick={back}>Edit something first</PillButton>
      </div>
    </GlassCard>
  );
}
