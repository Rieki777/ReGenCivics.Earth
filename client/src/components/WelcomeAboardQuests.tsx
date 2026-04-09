import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, Circle, ExternalLink, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { WELCOME_ABOARD_QUESTS } from "@/data/welcomeAboardQuests";
import { SharePanel } from "@/components/SharePanel";
import { analytics } from "@/lib/analytics";

interface WelcomeAboardQuestsProps {
  profile: any;
  onUpdate: () => void;
}

function QuestCard({
  quest,
  completed,
  onToggle,
  isPending,
}: {
  quest: (typeof WELCOME_ABOARD_QUESTS)[0];
  completed: boolean;
  onToggle: () => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const completedStyle: React.CSSProperties = {
    boxShadow: "0 0 0 1px rgba(125,216,125,0.30), 0 4px 20px rgba(125,216,125,0.12)",
    borderColor: "rgba(125,216,125,0.30)",
  };

  const incompleteStyle: React.CSSProperties = {
    boxShadow: "0 0 0 1px rgba(212,165,116,0.15), 0 4px 20px rgba(212,165,116,0.08), 0 1px 4px rgba(0,0,0,0.4)",
    borderColor: "rgba(212,165,116,0.20)",
  };

  const hoverStyle: React.CSSProperties = {
    boxShadow: "0 0 0 1px rgba(212,165,116,0.35), 0 8px 32px rgba(212,165,116,0.18), 0 2px 8px rgba(0,0,0,0.5)",
    borderColor: "rgba(212,165,116,0.40)",
  };

  const [isHovered, setIsHovered] = useState(false);

  const cardStyle = completed
    ? completedStyle
    : isHovered
    ? hoverStyle
    : incompleteStyle;

  return (
    <div
      className="rounded-xl border transition-all duration-200 overflow-hidden group"
      style={{
        ...cardStyle,
        background: completed ? "rgba(125,216,125,0.05)" : "rgba(255,255,255,0.03)",
        transform: !completed && isHovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Always-visible header zone */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Quest number badge */}
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-200 ${
              completed
                ? "bg-[#7dd87d]/20 border-[#7dd87d]/40 text-[#7dd87d]"
                : isHovered
                ? "bg-[#d4a574]/20 border-[#d4a574]/40 text-[#d4a574]"
                : "bg-white/8 border-white/20 text-white/60"
            }`}
          >
            Q{quest.number}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-white text-sm leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                  {quest.title}
                </h3>
                <p className="text-white/50 text-xs mt-0.5">{quest.tagline}</p>
              </div>

              {/* Mark complete toggle */}
              <button
                onClick={onToggle}
                disabled={isPending}
                className="flex-shrink-0 mt-0.5 disabled:opacity-50"
                title={completed ? "Mark incomplete" : "Mark complete"}
              >
                {completed ? (
                  <CheckCircle className="w-5 h-5 text-[#7dd87d]" />
                ) : (
                  <Circle className="w-5 h-5 text-white/55 hover:text-white transition-colors" />
                )}
              </button>
            </div>

            {/* Reward + forum link + share row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-[#d4a574]/15 text-[#d4a574] text-xs px-2 py-0.5 rounded-full border border-[#d4a574]/20">
                <Star className="w-3 h-3" />
                {quest.reward}
              </span>
              {quest.forumUrl && (
                <a
                  href={quest.forumUrl}
                  target={quest.forumUrl.startsWith("http") ? "_blank" : undefined}
                  rel={quest.forumUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1 text-[#7dd87d] text-xs hover:underline"
                >
                  Join the discussion
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {quest.proposalUrl && (
                <a
                  href={quest.proposalUrl}
                  className="inline-flex items-center gap-1 text-[#d4a574] text-xs hover:underline"
                >
                  Propose it
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {quest.forumUrl && (
                <SharePanel
                  questTitle={quest.title}
                  questTagline={quest.tagline}
                  forumUrl={quest.forumUrl}
                />
              )}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-white/60 text-xs hover:text-white/70 transition-colors ml-12"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          About this quest
        </button>
      </div>

      {/* Collapsible body, max-h transition instead of abrupt show/hide */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? "600px" : "0" }}
      >
        <div className="px-4 pb-4 ml-12 space-y-3 border-t border-white/5 pt-3">
          <p className="text-white/60 text-xs leading-relaxed">{quest.about}</p>

          <div className="space-y-1.5">
            {quest.steps.map((step, i) => (
              <div key={i} className="flex gap-2 text-xs text-white/55">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>

          {quest.bonus && (
            <div className="flex items-start gap-1.5 bg-[#d4a574]/10 border border-[#d4a574]/20 rounded-lg px-3 py-2">
              <Star className="w-3.5 h-3.5 text-[#d4a574] flex-shrink-0 mt-0.5" />
              <p className="text-[#d4a574] text-xs">{quest.bonus}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WelcomeAboardQuests({ profile, onUpdate }: WelcomeAboardQuestsProps) {
  const utils = trpc.useUtils();

  const completed: string[] = (() => {
    try { return JSON.parse(profile?.questsCompleted || "[]"); } catch { return []; }
  })();

  const updateMut = trpc.playerProfiles.update.useMutation({
    onSuccess: () => {
      utils.playerProfiles.me.invalidate();
      onUpdate();
    },
    onError: () => {
      // Quest toggle failed silently, user can retry
    },
  });

  const toggleQuest = (questId: string) => {
    const isCompleted = completed.includes(questId);
    const next = isCompleted
      ? completed.filter((id) => id !== questId)
      : [...completed, questId];
    if (!isCompleted) {
      const quest = WELCOME_ABOARD_QUESTS.find((q) => q.id === questId);
      analytics.questCompleted(questId, quest?.title ?? questId);
    }
    updateMut.mutate({ questsCompleted: JSON.stringify(next) });
  };

  const completedCount = WELCOME_ABOARD_QUESTS.filter((q) => completed.includes(q.id)).length;
  const pct = (completedCount / 10) * 100;
  const allDone = completedCount === 10;

  return (
    <div className="space-y-4">
      {/* Series header */}
      <div className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] rounded-xl p-4 border border-[#7dd87d]/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white text-base" style={{ fontFamily: "var(--font-display)" }}>
            Welcome Aboard Quests
          </h3>
          <span className={`text-sm font-semibold ${allDone ? "text-[#7dd87d]" : "text-[#d4a574]"}`}>
            {completedCount}/10
          </span>
        </div>
        <p className="text-white/60 text-xs mb-3">Ten ways to root yourself in the Regenerative Renaissance.</p>

        {/* Progress bar, golden gradient until complete, then green */}
        <div className="w-full bg-white/10 rounded-full h-1.5 mb-3 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${allDone ? "bg-[#7dd87d]" : ""}`}
            style={{
              width: `${pct}%`,
              background: allDone
                ? undefined
                : "linear-gradient(to right, #d4a574, #f0c070)",
            }}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white/50 text-xs">33 $ReGen + 0.1 RGVoice per quest</span>
          <span className="text-[#d4a574] text-xs font-medium">Complete all 10: 330 $ReGen + 1 RGVoice total</span>
        </div>

        {allDone && (
          <div className="mt-3 bg-[#7dd87d]/15 border border-[#7dd87d]/30 rounded-lg px-3 py-2 text-[#7dd87d] text-xs font-medium">
            All 10 quests complete. You can now make your first Claim in the ReGen Game.
          </div>
        )}

        {!allDone && (
          <p className="mt-2 text-white/60 text-xs">
            Complete all 10 quests to earn 330 $ReGen + 1 RGVoice and place your first Claim.
          </p>
        )}
      </div>

      {/* Quest cards */}
      <div className="space-y-2">
        {WELCOME_ABOARD_QUESTS.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            completed={completed.includes(quest.id)}
            onToggle={() => toggleQuest(quest.id)}
            isPending={updateMut.isPending}
          />
        ))}
      </div>
    </div>
  );
}
