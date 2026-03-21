import { useState, useEffect, createContext, useContext } from "react";
import { Footprints, Coins, Vote, CheckCircle2, Circle, Sparkles, X, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface QuestProgress {
  completedQuests: string[];
  totalRegen: number;
  totalRVoice: number;
  completionCount: Record<string, number>;
  completionDates: Record<string, string>;
}

const STORAGE_KEY = "regen-civics-quest-progress";

// Default rewards per quest (simplified)
const QUEST_REWARDS: Record<string, { regen: number; rvoice: number }> = {
  "quest-0": { regen: 111, rvoice: 1 },
  "quest-1": { regen: 111, rvoice: 1 },
  "quest-2": { regen: 22, rvoice: 1 },
  "quest-3": { regen: 111, rvoice: 1 },
  "quest-4": { regen: 111, rvoice: 1 },
  "quest-5": { regen: 111, rvoice: 1 },
  "quest-6": { regen: 111, rvoice: 1 },
  "quest-7": { regen: 111, rvoice: 1 },
  "quest-8": { regen: 111, rvoice: 1 },
  "quest-9": { regen: 111, rvoice: 1 },
  "quest-10": { regen: 111, rvoice: 1 },
  "quest-11": { regen: 111, rvoice: 1 },
  "quest-12": { regen: 111, rvoice: 1 },
  "quest-13": { regen: 111, rvoice: 1 },
  "food-foresting": { regen: 33, rvoice: 1 },
};

const ALL_QUESTS = Object.keys(QUEST_REWARDS);

// Max completions per quest (3 for most, infinite for some)
const QUEST_MAX_COMPLETIONS: Record<string, number> = {
  "quest-0": 3,
  "quest-1": 3,
  "quest-2": 3,
  "quest-3": 3,
  "quest-4": 3,
  "quest-5": 3,
  "quest-6": 3,
  "quest-7": 3,
  "quest-8": 3,
  "quest-9": 3,
  "quest-10": 3,
  "quest-11": 3,
  "quest-12": 3,
  "quest-13": 999, // Fasting - can do many times
  "food-foresting": 999, // Infinite - can do unlimited times
};

export const getMaxCompletions = (questId: string) => QUEST_MAX_COMPLETIONS[questId] || 3;

// Context for sharing quest progress across components
interface QuestProgressContextType {
  progress: QuestProgress;
  isQuestCompleted: (questId: string) => boolean;
  getCompletionCount: (questId: string) => number;
  toggleQuest: (questId: string) => void;
  markComplete: (questId: string) => void;
}

const QuestProgressContext = createContext<QuestProgressContextType | null>(null);

export function useQuestProgressContext() {
  const context = useContext(QuestProgressContext);
  if (!context) {
    throw new Error("useQuestProgressContext must be used within QuestProgressProvider");
  }
  return context;
}

export function QuestProgressProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const completeMutation = trpc.quests.complete.useMutation();

  const [progress, setProgress] = useState<QuestProgress>({
    completedQuests: [],
    totalRegen: 0,
    totalRVoice: 0,
    completionCount: {},
    completionDates: {},
  });

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProgress({
          completedQuests: parsed.completedQuests || [],
          totalRegen: parsed.totalRegen || 0,
          totalRVoice: parsed.totalRVoice || 0,
          completionCount: parsed.completionCount || {},
          completionDates: parsed.completionDates || {},
        });
      } catch {
        // Invalid data, use defaults
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = (newProgress: QuestProgress) => {
    setProgress(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
  };

  const isQuestCompleted = (questId: string) => progress.completedQuests.includes(questId);
  
  const getCompletionCount = (questId: string) => progress.completionCount[questId] || 0;

  const markComplete = (questId: string) => {
    const currentCount = progress.completionCount[questId] || 0;
    const rewards = QUEST_REWARDS[questId] || { regen: 0, rvoice: 0 };
    const maxCompletions = getMaxCompletions(questId);

    if (currentCount >= maxCompletions) return; // Already at max completions

    const newCount = currentCount + 1;
    const isFirstCompletion = !progress.completedQuests.includes(questId);

    saveProgress({
      completedQuests: isFirstCompletion
        ? [...progress.completedQuests, questId]
        : progress.completedQuests,
      totalRegen: progress.totalRegen + rewards.regen,
      totalRVoice: progress.totalRVoice + rewards.rvoice,
      completionCount: {
        ...progress.completionCount,
        [questId]: newCount,
      },
      completionDates: {
        ...progress.completionDates,
        [questId]: new Date().toISOString(),
      },
    });

    // Persist first completion to the server so it appears on the player profile
    if (isFirstCompletion && isAuthenticated) {
      const title = questId
        .replace(/-/g, " ")
        .replace(/\bquest\b/gi, "Quest")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      completeMutation.mutate({ questId, questTitle: title });
    }
  };

  const toggleQuest = (questId: string) => {
    const isCompleted = progress.completedQuests.includes(questId);
    const rewards = QUEST_REWARDS[questId] || { regen: 0, rvoice: 0 };
    const currentCount = progress.completionCount[questId] || 0;
    
    if (isCompleted) {
      // Remove quest completely
      const countToRemove = currentCount || 1;
      saveProgress({
        completedQuests: progress.completedQuests.filter(q => q !== questId),
        totalRegen: progress.totalRegen - (rewards.regen * countToRemove),
        totalRVoice: progress.totalRVoice - (rewards.rvoice * countToRemove),
        completionCount: {
          ...progress.completionCount,
          [questId]: 0,
        },
        completionDates: Object.fromEntries(
          Object.entries(progress.completionDates).filter(([id]) => id !== questId)
        ),
      });
    } else {
      // Add quest
      markComplete(questId);
    }
  };

  return (
    <QuestProgressContext.Provider value={{ progress, isQuestCompleted, getCompletionCount, toggleQuest, markComplete }}>
      {children}
    </QuestProgressContext.Provider>
  );
}

// Completion badge to show on quest cards
export function QuestCompletionBadge({ questId, className = "" }: { questId: string; className?: string }) {
  const { isQuestCompleted, getCompletionCount } = useQuestProgressContext();
  const isCompleted = isQuestCompleted(questId);
  const count = getCompletionCount(questId);
  
  if (!isCompleted) return null;
  
  return (
    <div className={`absolute top-3 right-3 flex items-center gap-1 bg-[#7dd87d] text-[#1a472a] px-2 py-1 rounded-full text-xs font-bold shadow-md ${className}`}>
      <CheckCircle2 className="w-3.5 h-3.5" />
      <span>{count}x</span>
    </div>
  );
}

// Mark complete button for quest cards
export function MarkCompleteButton({ questId, size = "sm" }: { questId: string; size?: "sm" | "md" }) {
  const { isQuestCompleted, getCompletionCount, markComplete, toggleQuest } = useQuestProgressContext();
  const isCompleted = isQuestCompleted(questId);
  const count = getCompletionCount(questId);
  const maxCompletions = getMaxCompletions(questId);
  const canCompleteAgain = count < maxCompletions;
  const displayMax = maxCompletions >= 999 ? "∞" : maxCompletions;
  
  const sizeClasses = size === "sm" 
    ? "px-3 py-1.5 text-xs gap-1.5" 
    : "px-4 py-2 text-sm gap-2";
  
  if (isCompleted && !canCompleteAgain) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleQuest(questId);
        }}
        className={`flex items-center ${sizeClasses} bg-[#7dd87d]/20 text-[#4a7c59] rounded-full font-semibold border-2 border-[#7dd87d] hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors group`}
      >
        <CheckCircle2 className="w-4 h-4 group-hover:hidden" />
        <X className="w-4 h-4 hidden group-hover:block" />
        <span className="group-hover:hidden">Completed ({count}x)</span>
        <span className="hidden group-hover:block">Reset</span>
      </button>
    );
  }
  
  if (isCompleted && canCompleteAgain) {
    const experiencedLabel = count === 1 ? "Experienced 1" : count === 2 ? "Experienced 2" : `Experienced ${count}`;
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            markComplete(questId);
          }}
          className={`flex items-center ${sizeClasses} bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold hover:bg-[#6bc86b] transition-colors`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>{experiencedLabel}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleQuest(questId);
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          title="Reset progress"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        markComplete(questId);
      }}
      className={`flex items-center ${sizeClasses} bg-[#1a472a] text-white rounded-full font-semibold hover:bg-[#2d5a3d] transition-colors`}
    >
      <Check className="w-4 h-4" />
      <span>I've done this</span>
    </button>
  );
}

export function QuestProgressTracker() {
  const [isOpen, setIsOpen] = useState(false);
  const { progress, toggleQuest, markComplete } = useQuestProgressContext();

  const completionPercentage = Math.round((progress.completedQuests.length / ALL_QUESTS.length) * 100);

  return (
    <>
      {/* Floating Progress Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Your quest journey"
        title="Your quest journey"
        className="fixed bottom-4 right-4 z-40 bg-gradient-to-r from-[#4a7c59] to-[#2e7d32] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
      >
        <Footprints className="w-5 h-5" />
        <span className="font-semibold">{progress.completedQuests.length}/{ALL_QUESTS.length}</span>
        <div className="w-16 h-2 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#7dd87d] transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </button>

      {/* Progress Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a472a] to-[#2e7d32] p-6 text-white relative">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Footprints className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Quest Progress</h2>
                  <p className="text-white/80 text-sm">Track your journey</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>{progress.completedQuests.length} of {ALL_QUESTS.length} quests</span>
                  <span>{completionPercentage}%</span>
                </div>
                <div className="h-3 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#7dd87d] transition-all duration-500 rounded-full"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                  <Coins className="w-4 h-4 text-[#7dd87d]" />
                  <span className="font-semibold">+{progress.totalRegen} $Regen</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                  <Vote className="w-4 h-4 text-[#7dd87d]" />
                  <span className="font-semibold">+{progress.totalRVoice} RVoice</span>
                </div>
              </div>
            </div>

            {/* Quest List */}
            <div className="p-4 max-h-[40vh] overflow-y-auto">
              <div className="space-y-2">
                {ALL_QUESTS.map((questId) => {
                  const isCompleted = progress.completedQuests.includes(questId);
                  const rewards = QUEST_REWARDS[questId];
                  const count = progress.completionCount[questId] || 0;
                  const maxComp = getMaxCompletions(questId);
                  const displayMax = maxComp >= 999 ? "∞" : maxComp;
                  const canCompleteMore = count < maxComp;
                  const questName = questId === "food-foresting" 
                    ? `Food Foresting (${displayMax})` 
                    : `Quest ${questId.replace("quest-", "")} (${displayMax}x max)`;
                  
                  return (
                    <button
                      key={questId}
                      onClick={() => {
                        if (isCompleted && canCompleteMore) {
                          // If completed but can do more, add another completion
                          markComplete(questId);
                        } else {
                          // Otherwise toggle (add first or remove all)
                          toggleQuest(questId);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                        isCompleted 
                          ? "bg-[#7dd87d]/20 border-2 border-[#7dd87d]" 
                          : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-[#4a7c59]" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )}
                        <span className={`font-medium ${isCompleted ? "text-[#1a472a]" : "text-gray-600"}`}>
                          {questName}
                        </span>
                        {count > 0 && (
                          <span className="text-xs bg-[#7dd87d] text-[#1a472a] px-1.5 py-0.5 rounded-full font-bold">
                            {count}/{displayMax}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#4a7c59]">+{rewards.regen}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-[#2e7d32]">+{rewards.rvoice}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Progress saved locally in your browser
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Sparkles className="w-4 h-4 text-[#7dd87d]" />
                <span>Click to toggle</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
