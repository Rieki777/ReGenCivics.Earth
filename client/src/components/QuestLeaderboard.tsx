import { useState } from "react";
import { Trophy, Medal, Crown, Star, TrendingUp, Users, X, Sparkles } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  questsCompleted: number;
  regenTokens: number;
  rvoice: number;
  badges: number;
  streak: number;
  featured?: boolean;
}

// Sample leaderboard data - in production this would come from backend
const leaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    name: "Luna Earthkeeper",
    avatar: "🌙",
    questsCompleted: 13,
    regenTokens: 1443,
    rvoice: 13,
    badges: 14,
    streak: 52,
    featured: true
  },
  {
    rank: 2,
    name: "River Wildwood",
    avatar: "🌊",
    questsCompleted: 12,
    regenTokens: 1332,
    rvoice: 12,
    badges: 12,
    streak: 38
  },
  {
    rank: 3,
    name: "Sage Forestwalker",
    avatar: "🌿",
    questsCompleted: 11,
    regenTokens: 1221,
    rvoice: 11,
    badges: 11,
    streak: 29
  },
  {
    rank: 4,
    name: "Phoenix Sunfire",
    avatar: "🔥",
    questsCompleted: 10,
    regenTokens: 1110,
    rvoice: 10,
    badges: 10,
    streak: 24
  },
  {
    rank: 5,
    name: "Willow Moonbeam",
    avatar: "🌸",
    questsCompleted: 9,
    regenTokens: 999,
    rvoice: 9,
    badges: 9,
    streak: 21
  },
  {
    rank: 6,
    name: "Oak Strongroot",
    avatar: "🌳",
    questsCompleted: 8,
    regenTokens: 888,
    rvoice: 8,
    badges: 8,
    streak: 18
  },
  {
    rank: 7,
    name: "Fern Dewdrop",
    avatar: "🌱",
    questsCompleted: 7,
    regenTokens: 777,
    rvoice: 7,
    badges: 7,
    streak: 14
  },
  {
    rank: 8,
    name: "Storm Cloudrunner",
    avatar: "⛈️",
    questsCompleted: 6,
    regenTokens: 666,
    rvoice: 6,
    badges: 6,
    streak: 11
  },
  {
    rank: 9,
    name: "Moss Quietstream",
    avatar: "🍀",
    questsCompleted: 5,
    regenTokens: 555,
    rvoice: 5,
    badges: 5,
    streak: 8
  },
  {
    rank: 10,
    name: "Ember Brightflame",
    avatar: "✨",
    questsCompleted: 4,
    regenTokens: 444,
    rvoice: 4,
    badges: 4,
    streak: 5
  }
];

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
  }
}

function getRankBg(rank: number) {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200";
    case 2:
      return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200";
    case 3:
      return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200";
    default:
      return "bg-white border-gray-100";
  }
}

export function QuestLeaderboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"all" | "month" | "week">("all");

  return (
    <>
      {/* Floating Leaderboard Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-40 right-6 z-40 bg-gradient-to-r from-amber-500 to-yellow-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
        title="View Leaderboard"
      >
        <Trophy className="w-6 h-6" />
      </button>

      {/* Leaderboard Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-2 left-10 text-4xl">🏆</div>
                <div className="absolute bottom-2 right-10 text-4xl">⭐</div>
                <div className="absolute top-4 right-20 text-2xl">✨</div>
              </div>
              <div className="relative flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="w-7 h-7" />
                    Quest Champions
                  </h2>
                  <p className="text-white/90 mt-1">
                    Top regenerators making a difference in the world
                  </p>
                  <div className="mt-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg inline-block">
                    <p className="text-xs text-white/90 font-medium">
                      📊 Sample data - will show real data after our game starts!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Timeframe Tabs */}
              <div className="mt-4 flex gap-2">
                {(["all", "month", "week"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      timeframe === t
                        ? "bg-white text-amber-600"
                        : "bg-white/20 hover:bg-white/30"
                    }`}
                  >
                    {t === "all" ? "All Time" : t === "month" ? "This Month" : "This Week"}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="bg-amber-50 border-b border-amber-100 p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  <Users className="w-4 h-4" />
                  <span className="font-bold">247</span>
                </div>
                <p className="text-xs text-gray-600">Active Questers</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-bold">1,892</span>
                </div>
                <p className="text-xs text-gray-600">Quests Completed</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-purple-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-bold">+34%</span>
                </div>
                <p className="text-xs text-gray-600">This Month</p>
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="p-4 overflow-y-auto max-h-[45vh]">
              <div className="space-y-2">
                {leaderboardData.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`p-3 rounded-xl border transition-all hover:shadow-md ${getRankBg(entry.rank)} ${
                      entry.featured ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-8 flex justify-center">
                        {getRankIcon(entry.rank)}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7dd87d] to-[#4a7c59] flex items-center justify-center text-xl">
                        {entry.avatar}
                      </div>

                      {/* Name & Stats */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#1a472a] truncate">
                            {entry.name}
                          </h3>
                          {entry.featured && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>{entry.questsCompleted} quests</span>
                          <span>•</span>
                          <span>{entry.badges} badges</span>
                          <span>•</span>
                          <span>{entry.streak}d streak</span>
                        </div>
                      </div>

                      {/* Tokens */}
                      <div className="text-right">
                        <div className="font-bold text-[#4a7c59]">
                          {entry.regenTokens.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">$Regen</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gradient-to-r from-amber-50 to-yellow-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Complete quests to climb the leaderboard!
                </p>
                <a
                  href="https://app.hypha.earth/en/dho/regen-games/agreements"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-full text-sm font-medium hover:shadow-lg transition-all"
                >
                  Start Questing
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
