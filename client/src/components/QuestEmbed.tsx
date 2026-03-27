/**
 * QuestEmbed - inline quest card preview for forum posts.
 * Renders when a forum post body contains a link to /quest/[id].
 */
import { Sprout } from 'lucide-react';

interface QuestEmbedProps {
  questId: string;
  title?: string;
}

export function QuestEmbed({ questId, title }: QuestEmbedProps) {
  // Static quest data lookup from the quest data files
  // TODO: Wire up to API endpoint GET /api/quests/:id for dynamic data
  return (
    <a
      href={`/quest#quest-${questId}`}
      className="block bg-[#1a472a]/40 border border-[#7dd87d]/20 rounded-lg p-3 my-2 hover:bg-[#1a472a]/60 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Sprout className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
        <span className="text-sm font-medium text-[#7dd87d]">{title || `Quest ${questId}`}</span>
      </div>
      <p className="text-xs text-white/50 mt-1">Click to view quest details</p>
    </a>
  );
}
