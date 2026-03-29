import { useState, useEffect, useCallback } from "react";
import { Award, Flame, Leaf, Sprout, Sun, Snowflake, Star, Heart, TreeDeciduous, Sparkles, X, RefreshCw } from "lucide-react";

// ╔════════════════════════════════════════════════════════════════════════════╗
// ║  🔌 BACKEND INTEGRATION GUIDE                                              ║
// ║                                                                            ║
// ║  To connect to Hypha/backend, implement the fetchUserBadges function:     ║
// ║                                                                            ║
// ║  1. Replace the mock data in fetchUserBadges with actual API call         ║
// ║  2. The API should return an array of badge IDs the user has earned       ║
// ║  3. Example endpoint: GET /api/users/{userId}/badges                      ║
// ║  4. Or use Hypha GraphQL: query user badges from regen-games DHO          ║
// ║                                                                            ║
// ║  Hypha Integration Example:                                                ║
// ║  const response = await fetch('https://api.hypha.earth/graphql', {        ║
// ║    method: 'POST',                                                        ║
// ║    headers: { 'Content-Type': 'application/json' },                       ║
// ║    body: JSON.stringify({                                                 ║
// ║      query: `query { member(id: "${userId}") { badges { id earnedAt } }}`║
// ║    })                                                                      ║
// ║  });                                                                       ║
// ╚════════════════════════════════════════════════════════════════════════════╝

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  earned: boolean;
  earnedDate?: string;
  questId?: string;
}

interface UserBadgeData {
  badgeId: string;
  earnedDate: string;
}

// Badge definitions - these don't change
const BADGE_DEFINITIONS = [
  {
    id: "fire-starter",
    name: "Fire Starter",
    description: "Completed Quest 0: Fire - Transformed stories that no longer serve you",
    icon: <Flame className="w-6 h-6" />,
    color: "text-orange-500",
    bgColor: "bg-orange-100",
    questId: "quest-0"
  },
  {
    id: "potion-master",
    name: "Potion Master",
    description: "Completed Quest 1: Potion Brewing - Diversified your inner soils",
    icon: <Sparkles className="w-6 h-6" />,
    color: "text-purple-500",
    bgColor: "bg-purple-100",
    questId: "quest-1"
  },
  {
    id: "seed-keeper",
    name: "Seed Keeper",
    description: "Completed Quest 2: Saving Seeds - Growing plants that know you",
    icon: <Sprout className="w-6 h-6" />,
    color: "text-green-500",
    bgColor: "bg-green-100",
    questId: "quest-2"
  },
  {
    id: "garden-healer",
    name: "Garden Healer",
    description: "Completed Quest 3: Healing Wholes - Gardened your bioregion",
    icon: <Leaf className="w-6 h-6" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-100",
    questId: "quest-3"
  },
  {
    id: "space-dreamer",
    name: "Space Dreamer",
    description: "Completed Quest 4: Dreaming Spaces of Love - Designed your ideal home",
    icon: <Heart className="w-6 h-6" />,
    color: "text-pink-500",
    bgColor: "bg-pink-100",
    questId: "quest-4"
  },
  {
    id: "love-ritualist",
    name: "Love Ritualist",
    description: "Completed Quest 5: Rites of Love - Became indigenous to your space",
    icon: <Star className="w-6 h-6" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100",
    questId: "quest-5"
  },
  {
    id: "circle-keeper",
    name: "Circle Keeper",
    description: "Completed Quest 6: Healing Circles - Gathered your community",
    icon: <Sun className="w-6 h-6" />,
    color: "text-amber-500",
    bgColor: "bg-amber-100",
    questId: "quest-6"
  },
  {
    id: "wild-forager",
    name: "Wild Forager",
    description: "Completed Quest 7: Wild Foraging - Foraged from nature's abundance",
    icon: <TreeDeciduous className="w-6 h-6" />,
    color: "text-lime-600",
    bgColor: "bg-lime-100",
    questId: "quest-7"
  },
  {
    id: "food-forester",
    name: "Food Forester",
    description: "Completed the Food Foresting Quest - Planted fruit trees for humanity",
    icon: <TreeDeciduous className="w-6 h-6" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
    questId: "food-foresting"
  },
  {
    id: "season-spring",
    name: "Spring Awakening",
    description: "Completed all Spring Season quests",
    icon: <Sprout className="w-6 h-6" />,
    color: "text-green-500",
    bgColor: "bg-gradient-to-br from-green-100 to-emerald-100"
  },
  {
    id: "season-summer",
    name: "Summer Radiance",
    description: "Completed all Summer Season quests",
    icon: <Sun className="w-6 h-6" />,
    color: "text-amber-500",
    bgColor: "bg-gradient-to-br from-amber-100 to-yellow-100"
  },
  {
    id: "season-fall",
    name: "Fall Harvest",
    description: "Completed all Season quests",
    icon: <Leaf className="w-6 h-6" />,
    color: "text-orange-500",
    bgColor: "bg-gradient-to-br from-orange-100 to-amber-100"
  },
  {
    id: "season-winter",
    name: "Winter Wisdom",
    description: "Completed all Winter Season quests",
    icon: <Snowflake className="w-6 h-6" />,
    color: "text-blue-400",
    bgColor: "bg-gradient-to-br from-blue-100 to-slate-100"
  },
  {
    id: "quest-master",
    name: "Quest Master",
    description: "Completed all 13 quests - A true regenerative champion!",
    icon: <Award className="w-6 h-6" />,
    color: "text-yellow-500",
    bgColor: "bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100"
  }
];

// ════════════════════════════════════════════════════════════════════════════
// 🔌 BACKEND INTEGRATION: Replace this function with actual API call
// ════════════════════════════════════════════════════════════════════════════
async function fetchUserBadges(_userId?: string): Promise<UserBadgeData[]> {
  // TODO: Replace with actual API call to Hypha or your backend
  // Example:
  // const response = await fetch(`/api/users/${userId}/badges`);
  // return response.json();
  
  // For now, return empty array (no badges earned)
  // When connected to backend, this will return the user's actual earned badges
  return [];
}

export function QuestBadges() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Allow CommandPanel to open badges via custom event
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open-quest-badges', handler);
    return () => window.removeEventListener('open-quest-badges', handler);
  }, []);

  // Merge badge definitions with user's earned badges
  const loadBadges = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userBadges = await fetchUserBadges();
      const userBadgeMap = new Map(userBadges.map(b => [b.badgeId, b.earnedDate]));
      
      const mergedBadges: Badge[] = BADGE_DEFINITIONS.map(def => ({
        ...def,
        earned: userBadgeMap.has(def.id),
        earnedDate: userBadgeMap.get(def.id)
      }));
      
      setBadges(mergedBadges);
    } catch (err) {
      setError("Failed to load badges. Please try again.");
      // Fall back to showing all badges as unearned
      setBadges(BADGE_DEFINITIONS.map(def => ({ ...def, earned: false })));
    } finally {
      setIsLoading(false);
    }
  };

  // Load badges on mount and when modal opens
  useEffect(() => {
    loadBadges();
  }, []);

  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;

  return (
    <>
      {/* Badges Modal (floating button removed, triggered via CommandPanel) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="presentation"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Quest Badges"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a472a] to-[#2e7d32] p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Award className="w-7 h-7" />
                    Quest Badges
                  </h2>
                  <p className="text-white/80 mt-1">
                    Earn badges by completing quests and proving your regenerative journey
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadBadges}
                    disabled={isLoading}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                    title="Refresh badges"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="bg-white/20 rounded-full px-4 py-1">
                  <span className="font-bold">{earnedCount}</span>
                  <span className="text-white/80"> / {totalCount} earned</span>
                </div>
                <div className="flex-1 bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-[#7dd87d] h-full rounded-full transition-all"
                    style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border-b border-red-100 text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {/* Badges Grid */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {isLoading && badges.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-[#4a7c59] animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {badges.map((badge) => (
                    <button
                      key={badge.id}
                      onClick={() => setSelectedBadge(badge)}
                      className={`relative p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                        badge.earned 
                          ? `${badge.bgColor} border-transparent shadow-md` 
                          : "bg-gray-100 border-gray-200 opacity-50 grayscale"
                      }`}
                    >
                      <div className={`flex flex-col items-center gap-2 ${badge.color}`}>
                        {badge.icon}
                        <span className="text-xs font-medium text-center text-gray-700 line-clamp-2">
                          {badge.name}
                        </span>
                      </div>
                      {badge.earned && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Badge Detail */}
              {selectedBadge && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${selectedBadge.bgColor} ${selectedBadge.color}`}>
                      {selectedBadge.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#1a472a]">{selectedBadge.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{selectedBadge.description}</p>
                      {selectedBadge.earned && selectedBadge.earnedDate && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ Earned on {selectedBadge.earnedDate}
                        </p>
                      )}
                      {!selectedBadge.earned && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          Complete the quest to earn this badge
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                Complete quests and submit them in the{" "}
                <a 
                  href="https://app.hypha.earth/en/dho/regen-games/agreements"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4a7c59] font-medium hover:underline"
                >
                  Game Space
                </a>
                {" "}to earn badges!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
