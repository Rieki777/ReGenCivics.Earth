import { useState } from "react";
import { Filter, X, Clock, Zap, Tag, ChevronDown } from "lucide-react";

export type QuestCategory = "all" | "healing" | "nature" | "community" | "inner-work";
export type QuestDifficulty = "all" | "beginner" | "intermediate" | "advanced";
export type QuestTime = "all" | "quick" | "medium" | "long";

interface QuestFilterProps {
  onFilterChange: (filters: {
    category: QuestCategory;
    difficulty: QuestDifficulty;
    time: QuestTime;
  }) => void;
  activeFilters: {
    category: QuestCategory;
    difficulty: QuestDifficulty;
    time: QuestTime;
  };
}

const CATEGORIES: { value: QuestCategory; label: string; color: string }[] = [
  { value: "all", label: "All Categories", color: "bg-gray-100 text-gray-700" },
  { value: "healing", label: "Healing", color: "bg-pink-100 text-pink-700" },
  { value: "nature", label: "Nature", color: "bg-green-100 text-green-700" },
  { value: "community", label: "Community", color: "bg-blue-100 text-blue-700" },
  { value: "inner-work", label: "Inner Work", color: "bg-purple-100 text-purple-700" },
];

const DIFFICULTIES: { value: QuestDifficulty; label: string; icon: string }[] = [
  { value: "all", label: "All Levels", icon: "⭐" },
  { value: "beginner", label: "Beginner", icon: "🌱" },
  { value: "intermediate", label: "Intermediate", icon: "🌿" },
  { value: "advanced", label: "Advanced", icon: "🌳" },
];

const TIME_COMMITMENTS: { value: QuestTime; label: string; description: string }[] = [
  { value: "all", label: "Any Time", description: "" },
  { value: "quick", label: "Quick", description: "< 1 hour" },
  { value: "medium", label: "Medium", description: "1-4 hours" },
  { value: "long", label: "Extended", description: "4+ hours" },
];

export function QuestFilter({ onFilterChange, activeFilters }: QuestFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState<"category" | "difficulty" | "time" | null>(null);

  const hasActiveFilters = 
    activeFilters.category !== "all" || 
    activeFilters.difficulty !== "all" || 
    activeFilters.time !== "all";

  const clearFilters = () => {
    onFilterChange({ category: "all", difficulty: "all", time: "all" });
  };

  const updateFilter = (key: "category" | "difficulty" | "time", value: string) => {
    onFilterChange({
      ...activeFilters,
      [key]: value
    });
    setShowDropdown(null);
  };

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
          hasActiveFilters
            ? "bg-[#7dd87d]/20 border-[#7dd87d] text-[#1a472a]"
            : "bg-white border-[#1a472a]/20 text-[#1a472a]/70 hover:border-[#1a472a]/40"
        }`}
      >
        <Filter className="w-4 h-4" />
        <span className="font-medium">Filter Quests</span>
        {hasActiveFilters && (
          <span className="bg-[#7dd87d] text-white text-xs px-2 py-0.5 rounded-full">
            {[activeFilters.category, activeFilters.difficulty, activeFilters.time].filter(f => f !== "all").length}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-[#1a472a] flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter Quests
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium text-[#1a472a] flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4" />
                Category
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(showDropdown === "category" ? null : "category")}
                  className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between hover:border-[#4a7c59]"
                >
                  <span className={`px-2 py-0.5 rounded text-sm ${
                    CATEGORIES.find(c => c.value === activeFilters.category)?.color || ""
                  }`}>
                    {CATEGORIES.find(c => c.value === activeFilters.category)?.label}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showDropdown === "category" && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => updateFilter("category", cat.value)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                          activeFilters.category === cat.value ? "bg-gray-50" : ""
                        }`}
                      >
                        <span className={`px-2 py-0.5 rounded text-sm ${cat.color}`}>
                          {cat.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="text-sm font-medium text-[#1a472a] flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" />
                Difficulty
              </label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map(diff => (
                  <button
                    key={diff.value}
                    onClick={() => updateFilter("difficulty", diff.value)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      activeFilters.difficulty === diff.value
                        ? "bg-[#4a7c59] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {diff.icon} {diff.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Commitment Filter */}
            <div>
              <label className="text-sm font-medium text-[#1a472a] flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" />
                Time Commitment
              </label>
              <div className="flex flex-wrap gap-2">
                {TIME_COMMITMENTS.map(time => (
                  <button
                    key={time.value}
                    onClick={() => updateFilter("time", time.value)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      activeFilters.time === time.value
                        ? "bg-[#4a7c59] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {time.label}
                    {time.description && (
                      <span className="text-xs opacity-70 ml-1">({time.description})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-gray-50 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-[#4a7c59] text-white rounded-lg text-sm font-medium hover:bg-[#3d6b4a] transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Quest metadata for filtering - add this to your quest data
export const QUEST_METADATA: Record<string, { category: QuestCategory; difficulty: QuestDifficulty; time: QuestTime; experience: string }> = {
  "quest-0": { category: "inner-work", difficulty: "beginner", time: "medium", experience: "One-time ceremony, 2-4 hours" },
  "quest-1": { category: "healing", difficulty: "beginner", time: "long", experience: "Weekend practice, 3-5 hours" },
  "quest-2": { category: "nature", difficulty: "beginner", time: "medium", experience: "Solo afternoon, 1-2 hours" },
  "quest-3": { category: "nature", difficulty: "intermediate", time: "long", experience: "Ongoing daily practice" },
  "quest-4": { category: "inner-work", difficulty: "intermediate", time: "long", experience: "Group adventure, 2-4 hours, repeatable" },
  "quest-5": { category: "community", difficulty: "advanced", time: "long", experience: "Weekend dreaming, 3-5 hours" },
  "quest-6": { category: "community", difficulty: "intermediate", time: "medium", experience: "Ceremony with your beloved" },
  "quest-7": { category: "nature", difficulty: "beginner", time: "medium", experience: "Community gathering, half day" },
  "quest-8": { category: "inner-work", difficulty: "advanced", time: "long", experience: "Solo or group walk, 2-4 hours" },
  "quest-9": { category: "nature", difficulty: "intermediate", time: "medium", experience: "Solo ceremony, full day" },
  "quest-10": { category: "community", difficulty: "beginner", time: "quick", experience: "Slow walk, 1-2 hours" },
  "quest-11": { category: "community", difficulty: "intermediate", time: "medium", experience: "30-day practice" },
  "quest-12": { category: "inner-work", difficulty: "intermediate", time: "medium", experience: "Group project, ongoing" },
  "quest-13": { category: "healing", difficulty: "beginner", time: "long", experience: "Breathwork session, 2-3 hours" },
  "food-foresting": { category: "nature", difficulty: "beginner", time: "medium", experience: "Group adventure, 2-4 hours, repeatable" },
};

// Helper function to filter quests
export function filterQuests<T extends { id?: number | string }>(
  quests: T[],
  filters: { category: QuestCategory; difficulty: QuestDifficulty; time: QuestTime },
  getQuestId: (quest: T) => string
): T[] {
  return quests.filter(quest => {
    const questId = getQuestId(quest);
    const metadata = QUEST_METADATA[questId];
    
    if (!metadata) return true; // Show quests without metadata
    
    if (filters.category !== "all" && metadata.category !== filters.category) return false;
    if (filters.difficulty !== "all" && metadata.difficulty !== filters.difficulty) return false;
    if (filters.time !== "all" && metadata.time !== filters.time) return false;
    
    return true;
  });
}
