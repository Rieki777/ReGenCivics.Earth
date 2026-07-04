/**
 * /notifications: full notification history with filter chips, infinite
 * scroll, mark-all-read, and a link to email preferences. Every item deep
 * links to its source (forum items land scrolled to the exact comment).
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Check, Settings } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/BackButton';
import { TaoSpinner } from '@/components/TaoSpinner';
import { PageTransition } from '@/components/PageTransition';
import { FlowerOfLifeIcon } from '@/components/FlowerOfLifeIcon';
import { formatDistanceToNow } from 'date-fns';
import { typeGlyph } from '@/components/NotificationBell';

const FILTERS: { key: string; label: string; types?: string[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'mentions', label: 'Mentions', types: ['mention'] },
  { key: 'replies', label: 'Replies', types: ['forum_reply', 'thread_followed_activity'] },
  { key: 'gratitude', label: 'Gratitude', types: ['gratitude'] },
  { key: 'guides', label: 'Guide + Elders', types: ['guide_reply', 'elder_reply'] },
];

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState('all');
  const utils = trpc.useUtils();

  const types = FILTERS.find(f => f.key === filter)?.types;
  const query = trpc.notifications.list.useInfiniteQuery(
    { limit: 30, types },
    {
      enabled: !!user,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }
  );

  const invalidate = () => {
    query.refetch();
    utils.notifications.unreadCount.invalidate();
  };
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: invalidate });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: invalidate });

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><TaoSpinner /></div>;
  }
  if (!user) {
    navigate('/');
    return null;
  }

  const items = query.data?.pages.flatMap(p => p.items) ?? [];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#faf8f5] pb-20">
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <BackButton />
          <div className="flex items-center justify-between mt-4 mb-2">
            <h1 className="text-2xl font-bold text-[#1a472a]" style={{ fontFamily: 'Righteous, cursive' }}>
              Notifications
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}
                className="text-xs text-[#4a7c59] hover:text-[#1a472a]">
                <Check className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/settings/notifications')}
                aria-label="Notification settings"
                className="text-[#4a7c59] hover:text-[#1a472a]">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mb-4" role="tablist" aria-label="Filter notifications">
            {FILTERS.map(f => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  filter === f.key
                    ? 'bg-[#1a472a] text-white'
                    : 'bg-white text-[#4a7c59] border border-[#7dd87d]/40 hover:bg-[#f0f7f0]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#e8e4de] overflow-hidden">
            {query.isLoading ? (
              <div className="p-10 flex justify-center"><TaoSpinner /></div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-[#1a472a]/80">
                <FlowerOfLifeIcon size={40} className="mx-auto mb-3 opacity-30 text-[#1a472a]" />
                <p className="text-sm">Nothing here yet. Join a conversation in the <button className="underline text-[#4a7c59]" onClick={() => navigate('/community')}>community</button> and replies will find you.</p>
              </div>
            ) : (
              items.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) markRead.mutate({ id: item.id });
                    if (item.link) navigate(item.link);
                  }}
                  className={`w-full text-left p-4 border-b border-[#7dd87d]/10 hover:bg-[#f0f7f0] transition-colors ${
                    !item.isRead ? 'bg-[#f0f7f0]/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 text-center text-[#4a7c59] font-bold flex-shrink-0" aria-hidden="true">
                      {typeGlyph(item.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm ${!item.isRead ? 'font-semibold' : ''} text-[#1a472a]`}>
                        {item.groupCount > 1 ? `${item.groupCount} new: ${item.title}` : item.title}
                      </h3>
                      {item.body && <p className="text-xs text-[#1a472a]/70 mt-1 line-clamp-2">{item.body}</p>}
                      <p className="text-xs text-[#1a472a]/60 mt-1">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!item.isRead && <span className="w-2 h-2 rounded-full bg-[#4a7c59] mt-2 flex-shrink-0" aria-label="Unread" />}
                  </div>
                </button>
              ))
            )}
          </div>

          {query.hasNextPage && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="text-[#1a472a] border-[#7dd87d]/50"
              >
                {query.isFetchingNextPage ? 'Loading…' : 'Show older'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
