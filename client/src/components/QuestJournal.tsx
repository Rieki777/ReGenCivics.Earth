/**
 * QuestJournal - chronological log of quest completions.
 * Shows date, quest title, optional reflection, and forum post link.
 */
import { BookOpen } from 'lucide-react';

interface JournalEntry {
  id: number;
  questTitle: string;
  completedAt: string;
  reflection?: string | null;
  forumPostId?: number | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function QuestJournal({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-white/60 text-sm">
        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>Your quest journal is empty. Complete a quest to start your log.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div key={entry.id} className="border-l-2 border-[#7dd87d]/30 pl-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{entry.questTitle}</span>
            <span className="text-xs text-white/60">{formatDate(entry.completedAt)}</span>
          </div>
          {entry.reflection && (
            <p className="text-xs text-white/60 mt-1">{entry.reflection}</p>
          )}
          {entry.forumPostId && (
            <a href={`/community/post/${entry.forumPostId}`} className="text-xs text-[#7dd87d] hover:underline mt-1 inline-block">
              View forum post
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
