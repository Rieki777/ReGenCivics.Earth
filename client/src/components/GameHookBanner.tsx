/**
 * GameHookBanner - "If enough of us play the Game, it's real."
 * Full-width band displayed on homepage, /play, /quest, /game, /local-food-economy.
 * 5 contextual versions. Links to /economy.
 */
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

const HOOK_VARIANTS: Record<string, { hook: string; subtext: string }> = {
  home: {
    hook: "If enough of us play the Game, it's real.",
    subtext: "A regenerative economy built by the people who use it.",
  },
  play: {
    hook: "Every quest you complete builds a real economy.",
    subtext: "Your contributions earn tokens that flow back to land projects.",
  },
  quest: {
    hook: "This quest is part of something bigger.",
    subtext: "Completing quests builds your contribution score and grows the regenerative economy.",
  },
  game: {
    hook: "The Game is the economy. The economy is the Game.",
    subtext: "Contribution scores, gratitude tokens, seasonal harvests. All real.",
  },
  food: {
    hook: "Local food systems start with local action.",
    subtext: "Rate producers, support regenerative farms, build food sovereignty in your bioregion.",
  },
};

interface Props {
  variant?: keyof typeof HOOK_VARIANTS;
  className?: string;
}

export function GameHookBanner({ variant = "home", className = "" }: Props) {
  const content = HOOK_VARIANTS[variant] ?? HOOK_VARIANTS.home;

  return (
    <Link href="/economy">
      <div
        className={`w-full py-6 px-4 bg-gradient-to-r from-[#1a472a] via-[#2d5a3f] to-[#1a472a] border-y border-[#7dd87d]/20 cursor-pointer group hover:from-[#1f5230] hover:via-[#347046] hover:to-[#1f5230] transition-all ${className}`}
      >
        <div className="container max-w-4xl mx-auto text-center">
          <p
            className="text-white text-lg md:text-xl font-bold mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {content.hook}
          </p>
          <p className="text-white/60 text-sm flex items-center justify-center gap-1">
            {content.subtext}
            <ArrowRight className="w-4 h-4 text-[#7dd87d] group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </div>
    </Link>
  );
}
