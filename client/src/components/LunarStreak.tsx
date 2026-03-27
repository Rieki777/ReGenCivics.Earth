import { Flame } from "lucide-react";

interface LunarStreakProps {
  streak: number;
  className?: string;
}

export default function LunarStreak({ streak, className }: LunarStreakProps) {
  if (streak === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <Flame className="h-4 w-4 text-amber-400" />
      <span className="text-sm font-medium text-amber-400">{streak}</span>
    </span>
  );
}
