import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";

export function WelcomeScreen({ next }: ScreenProps) {
  return (
    <GlassCard className="text-center p-8 md:p-12">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display, system-ui)" }}>
        Show us what you've got.
      </h1>
      <p className="text-white/75 text-base md:text-lg max-w-xl mx-auto mb-3">
        You've been doing this work. Maybe for months. Maybe for decades.
      </p>
      <p className="text-white/65 text-sm md:text-base max-w-xl mx-auto mb-8">
        This is where we start to count it. Answer some questions, tell us a bit of your story, and we'll find the shape of your contribution. There are no wrong answers. The worst that happens is we learn something about each other.
      </p>
      <PillButton onClick={next} className="text-base">Let's go</PillButton>
    </GlassCard>
  );
}
