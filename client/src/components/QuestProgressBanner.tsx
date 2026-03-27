import { useQuery } from "@tanstack/react-query";

interface QuestCompletionData {
  title: string;
  completionCount: number;
  totalParticipants: number;
}

interface QuestProgressBannerProps {
  questId: number;
}

export default function QuestProgressBanner({ questId }: QuestProgressBannerProps) {
  const { data, isLoading } = useQuery<QuestCompletionData>({
    queryKey: ["quest-completions", questId],
    queryFn: async () => {
      const res = await fetch(`/api/quests/${questId}/completions`);
      if (!res.ok) throw new Error("Failed to load quest completions");
      return res.json();
    },
  });

  if (isLoading || !data) return null;

  const pct =
    data.totalParticipants > 0
      ? Math.round((data.completionCount / data.totalParticipants) * 100)
      : 0;

  return (
    <div className="rounded-lg border border-green-800/40 bg-green-900/20 p-4">
      <p className="mb-2 text-sm font-medium text-green-300">{data.title}</p>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-green-900/50">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-green-400">
          {data.completionCount} completed
        </span>
      </div>
    </div>
  );
}
