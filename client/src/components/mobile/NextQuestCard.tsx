/**
 * NextQuestCard: shown at the top of the mobile More menu.
 * Uses useNextQuest to show a personalized next-quest recommendation.
 * Falls back to generic "start your first quest" for unauthenticated users.
 */
import { Link } from "wouter";
import { ArrowRight, Scroll } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNextQuest } from "@/hooks/useNextQuest";
import { SEASON_EMOJI } from "@/data/seasonConstants";

type Props = { onSelect?: () => void };

export function NextQuestCard({ onSelect }: Props) {
  const { isAuthenticated } = useAuth();

  // useNextQuest must be inside QuestProgressProvider; wrap in try/catch for
  // contexts where the provider may be absent (e.g. the More menu).
  let nextQuest: ReturnType<typeof useNextQuest> = null;
  try {
    nextQuest = useNextQuest();
  } catch {
    // Outside provider - fall through to generic card
  }

  // Unauthenticated or outside provider: generic card
  if (!isAuthenticated) {
    return (
      <Link
        href="/quest"
        onClick={onSelect}
        className="block bg-gradient-to-br from-[#7dd87d]/25 to-[#7dd87d]/10 border border-[#7dd87d]/40 rounded-2xl p-4 hover:from-[#7dd87d]/35 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
            <Scroll className="w-7 h-7 text-[#7dd87d]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
              Start your first quest
            </div>
            <div className="text-white/60 text-xs leading-snug mt-0.5">
              Sign in optional. Browse the quest map first if you like.
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
        </div>
      </Link>
    );
  }

  // All quests complete: show epic quests prompt
  if (nextQuest === null) {
    return (
      <Link
        href="/quest#epic-quests"
        onClick={onSelect}
        className="block bg-gradient-to-br from-[#7dd87d]/25 to-[#7dd87d]/10 border border-[#7dd87d]/40 rounded-2xl p-4 hover:from-[#7dd87d]/35 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
            <Scroll className="w-7 h-7 text-[#7dd87d]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
              Explore Epic Quests
            </div>
            <div className="text-white/60 text-xs leading-snug mt-0.5">
              All Rites complete. Ready for long-form land transformation journeys.
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
        </div>
      </Link>
    );
  }

  // Personalized next-quest card
  const seasonEmoji = nextQuest.season ? SEASON_EMOJI[nextQuest.season] : null;
  // Fire quest title already includes "Quest 0:", other rites don't
  const titleText = nextQuest.questNumber !== null && nextQuest.type !== "fire"
    ? `Quest ${nextQuest.questNumber}: ${nextQuest.title}`
    : nextQuest.title;

  return (
    <Link
      href={`/quest#${nextQuest.questId}`}
      onClick={onSelect}
      className="block bg-gradient-to-br from-[#7dd87d]/25 to-[#7dd87d]/10 border border-[#7dd87d]/40 rounded-2xl p-4 hover:from-[#7dd87d]/35 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
          <Scroll className="w-7 h-7 text-[#7dd87d]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-0.5">
            Continue Your Journey
          </div>
          <div className="text-white font-bold text-sm leading-tight truncate" style={{ fontFamily: "var(--font-display)" }}>
            {seasonEmoji && <span className="mr-1">{seasonEmoji}</span>}
            {titleText}
          </div>
          <div className="text-white/60 text-xs leading-snug mt-0.5">{nextQuest.prompt}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
      </div>
    </Link>
  );
}
