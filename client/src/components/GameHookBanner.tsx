/**
 * GameHookBanner - "If enough of us play the Game, it's real."
 * Full-width band displayed on homepage, /play, /quest, /game, /local-food-economy.
 * 5 contextual versions. Links to /economy.
 */
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";

const HOOK_VARIANTS: Record<string, { hook: string; subtext: string }> = {
  home: {
    hook: "If enough of us play the Game, it's real.",
    subtext: "A regenerative economy built by the people who use it.",
  },
  play: {
    hook: "Every quest you complete builds a real economy.",
    subtext: "Your contributions earn tokens that create the foundation for new economic systems.",
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
        className={`w-full py-6 px-4 border-y border-[#7dd87d]/25 cursor-pointer group transition-all relative overflow-hidden ${className}`}
        style={{
          background: "linear-gradient(135deg, rgba(26,71,42,0.92) 0%, rgba(45,107,63,0.88) 50%, rgba(26,71,42,0.92) 100%)",
          backdropFilter: "blur(12px)",
          boxShadow: "inset 0 1px 0 rgba(125,216,125,0.2), inset 0 -1px 0 rgba(125,216,125,0.2)",
        }}
      >
        {/* Seed of Life watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
          <SeedOfLifeIcon className="text-[#7dd87d]" size={200} />
        </div>

        <div className="container max-w-4xl mx-auto text-center relative z-10">
          <p
            className="text-lg md:text-xl font-bold mb-1"
            style={{
              fontFamily: "var(--font-display)",
              color: "#7dd87d",
              textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            }}
          >
            {content.hook}
          </p>
          <p
            className="text-sm flex items-center justify-center gap-1"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {content.subtext}
            <ArrowRight
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              style={{ color: "#7dd87d" }}
            />
          </p>
        </div>
      </div>
    </Link>
  );
}
