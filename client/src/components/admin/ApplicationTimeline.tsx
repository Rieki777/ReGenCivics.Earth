import React from "react";
import { trpc } from "@/lib/trpc";
import { GitCommitHorizontal, Mail, StickyNote, Zap } from "lucide-react";

const eventIcons: Record<string, React.ElementType> = {
  status_change: GitCommitHorizontal,
  email_sent: Mail,
  note_added: StickyNote,
  admin_action: Zap,
};

const eventColors: Record<string, string> = {
  status_change: "text-blue-600 bg-blue-50 border-blue-200",
  email_sent: "text-purple-600 bg-purple-50 border-purple-200",
  note_added: "text-amber-600 bg-amber-50 border-amber-200",
  admin_action: "text-green-600 bg-green-50 border-green-200",
};

function formatAge(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  applicationId: number;
}

export function ApplicationTimeline({ applicationId }: Props) {
  const { data: events, isLoading } = trpc.admin.getApplicationEvents.useQuery({ applicationId });

  if (isLoading) {
    return <div className="text-xs text-[#1a472a]/80 py-2">Loading timeline...</div>;
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-xs text-[#1a472a]/80 py-2 italic">
        No events recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      <h4 className="text-xs font-semibold text-[#1a472a]/80 uppercase tracking-wider">
        Activity Timeline
      </h4>
      <div className="relative pl-4 border-l-2 border-[#1a472a]/10 space-y-3">
        {events.map((event: any) => {
          const Icon = eventIcons[event.eventType] ?? Zap;
          const colorClass = eventColors[event.eventType] ?? eventColors.admin_action;
          return (
            <div key={event.id} className="relative">
              <div className={`absolute -left-5 w-4 h-4 rounded-full border flex items-center justify-center ${colorClass}`}>
                <Icon className="w-2 h-2" />
              </div>
              <div className="ml-2">
                <p className="text-xs text-[#1a472a]">{event.description}</p>
                <p className="text-[10px] text-[#1a472a]/80 mt-0.5">
                  {event.createdAt ? formatAge(event.createdAt) : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
