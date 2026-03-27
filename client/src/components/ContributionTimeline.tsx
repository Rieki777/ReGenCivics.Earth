interface DayData {
  date: string;
  quests: number;
  posts: number;
  tokens: number;
}

interface ContributionTimelineProps {
  data: DayData[];
}

// Pick a green shade based on activity level
function cellColor(total: number): string {
  if (total === 0) return "bg-gray-800";
  if (total <= 2) return "bg-[#2a6e2a]";
  if (total <= 5) return "bg-[#4da64d]";
  if (total <= 10) return "bg-[#6cc96c]";
  return "bg-[#7dd87d]";
}

export default function ContributionTimeline({ data }: ContributionTimelineProps) {
  // Fill a grid: 7 rows (days of week), columns flow left to right
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];

  for (let i = 0; i < data.length; i++) {
    currentWeek.push(data[i]);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => {
              const total = day.quests + day.posts + day.tokens;
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${total} contributions`}
                  className={`h-3 w-3 rounded-sm ${cellColor(total)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
