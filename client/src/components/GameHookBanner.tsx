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
        className={`w-full py-6 px-4 border-y border-[#B8860B]/30 cursor-pointer group transition-all ${className}`}
        style={{
          background: 'linear-gradient(135deg, #7A5C0F 0%, #B8860B 30%, #D4A017 50%, #B8860B 70%, #7A5C0F 100%)',
          boxShadow: 'inset 0 0 80px rgba(212, 160, 23, 0.35), 0 4px 32px rgba(212, 160, 23, 0.15)',
        }}
      >
        <div className="container max-w-4xl mx-auto text-center">
          <p
            className="text-lg md:text-xl font-bold mb-1"
            style={{ fontFamily: "var(--font-display)", color: "#FFF8E7", textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}
          >
            {content.hook}
          </p>
          <p className="text-sm flex items-center justify-center gap-1" style={{ color: "#FFF8E7", opacity: 0.9 }}>
            {content.subtext}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: "#FFF8E7" }} />
          </p>
        </div>
      </div>
    </Link>
  );
}
