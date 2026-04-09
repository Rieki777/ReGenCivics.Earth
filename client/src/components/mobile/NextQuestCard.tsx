/**
 * NextQuestCard: shown at the top of the mobile More menu.
 * Pulls the user's next quest if signed in, otherwise shows a generic
 * "start your first quest" prompt that links to /quest.
 *
 * Falls back gracefully if there's no quest data wired up yet.
 */
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { WizardsFamilyIcon } from "@/components/icons/WizardsFamilyIcon";

type Props = { onSelect?: () => void };

export function NextQuestCard({ onSelect }: Props) {
  const { isAuthenticated } = useAuth();

  // Use the existing player profile to find quests already completed.
  // Until a dedicated nextForUser endpoint exists, we link to /quest and
  // show a context-appropriate prompt.
  const profileQuery = trpc.playerProfiles.me.useQuery(undefined, { enabled: isAuthenticated });

  const completedCount = (() => {
    if (!profileQuery.data) return 0;
    try { return (JSON.parse(profileQuery.data.questsCompleted ?? "[]") as string[]).length; }
    catch { return 0; }
  })();

  const title = !isAuthenticated
    ? "Start your first quest"
    : completedCount === 0
      ? "Pick your first quest"
      : `Keep going (${completedCount} done)`;

  const sub = !isAuthenticated
    ? "Sign in optional. Browse the quest map first if you like."
    : completedCount === 0
      ? "The Welcome Aboard quests are the easiest entry."
      : "Tap to see what's next on your path.";

  return (
    <Link
      href="/quest"
      onClick={onSelect}
      className="block bg-gradient-to-br from-[#7dd87d]/25 to-[#7dd87d]/10 border border-[#7dd87d]/40 rounded-2xl p-4 hover:from-[#7dd87d]/35 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
          <WizardsFamilyIcon size={28} className="text-[#7dd87d]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </div>
          <div className="text-white/60 text-[11px] leading-snug mt-0.5">{sub}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
      </div>
    </Link>
  );
}
