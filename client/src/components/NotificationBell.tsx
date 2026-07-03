/**
 * NotificationBell: unread badge + dropdown over the consolidated
 * notifications spine. Every item navigates to its deep link (forum events
 * land scrolled to the exact comment); grouped items ("3 new replies on X")
 * carry stacked actor avatars.
 */

import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { SeedOfLifeIcon } from '@/components/SeedOfLifeIcon';
import { decodeEntities } from '@/utils/sanitize';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'wouter';

// Fallback for rows migrated from the legacy table without a link.
function legacyLink(type: string): string | null {
  switch (type) {
    case 'contribution_accepted':
    case 'contribution_rejected':
    case 'new_contribution':
      return '/profile?tab=contributions';
    case 'campaign_milestone':
      return '/crowdpooling';
    case 'quest_complete':
      return '/quest';
    default:
      return null;
  }
}

export function typeGlyph(type: string): string {
  switch (type) {
    case 'mention': return '@';
    case 'forum_reply':
    case 'thread_followed_activity': return '↩';
    case 'gratitude': return '🙏';
    case 'guide_reply':
    case 'elder_reply': return '🌿';
    case 'reaction_milestone': return '✨';
    case 'governance_stage': return '🌀';
    case 'contribution_accepted': return '✓';
    case 'contribution_rejected': return '✗';
    case 'campaign_milestone': return '★';
    case 'quest_complete': return '⚑';
    default: return '•';
  }
}

interface BellItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: number;
  postId: number | null;
  createdAt: string | Date;
  groupCount: number;
  actors: { id: number; name: string; avatarUrl: string | null }[];
}

function ActorStack({ actors }: { actors: BellItem['actors'] }) {
  if (actors.length === 0) return null;
  return (
    <div className="flex -space-x-2 flex-shrink-0">
      {actors.slice(0, 3).map((a) => (
        a.avatarUrl ? (
          <img
            key={a.id}
            src={a.avatarUrl}
            alt=""
            className="w-7 h-7 rounded-full border-2 border-white object-cover bg-[#f0f7f0]"
            loading="lazy"
          />
        ) : (
          <div
            key={a.id}
            className="w-7 h-7 rounded-full border-2 border-white bg-[#4a7c59] text-white text-xs flex items-center justify-center font-bold"
            aria-hidden="true"
          >
            {(a.name || '?').charAt(0).toUpperCase()}
          </div>
        )
      ))}
    </div>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { enabled: !!user, refetchInterval: 30000 }
  );

  const { data: listData, refetch } = trpc.notifications.list.useQuery(
    { limit: 12 },
    { enabled: !!user && isOpen }
  );
  const items: BellItem[] = (listData?.items as BellItem[]) ?? [];

  const invalidate = () => {
    refetch();
    utils.notifications.unreadCount.invalidate();
  };
  const markReadMutation = trpc.notifications.markRead.useMutation({ onSuccess: invalidate });
  const markThreadReadMutation = trpc.notifications.markThreadRead.useMutation({ onSuccess: invalidate });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({ onSuccess: invalidate });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleOpen = (item: BellItem) => {
    if (!item.isRead) {
      if (item.groupCount > 1 && item.postId) {
        markThreadReadMutation.mutate({ postId: item.postId });
      } else {
        markReadMutation.mutate({ id: item.id });
      }
    }
    setIsOpen(false);
    const target = item.link || legacyLink(item.type);
    if (target) navigate(target);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-[#1a472a]/10 transition-colors"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <SeedOfLifeIcon size={22} animate={false} className="text-amber-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#7dd87d]/30 z-50 max-h-[70vh] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[#7dd87d]/20">
            <h3 className="font-bold text-[#1a472a]">Notifications</h3>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-[#4a7c59] hover:text-[#1a472a]">
                <Check className="w-3 h-3 mr-1" /> Mark all read
              </Button>
            )}
          </div>

          <div className="overflow-y-auto max-h-80">
            {items.length === 0 ? (
              <div className="p-6 text-center text-[#1a472a]/80">
                <SeedOfLifeIcon size={32} animate={false} className="mx-auto mb-2 opacity-30 text-[#1a472a]" />
                <p className="text-sm">Nothing here yet. When someone mentions you or replies to your posts, it lands here.</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleOpen(item)}
                  className={`w-full text-left p-3 border-b border-[#7dd87d]/10 hover:bg-[#f0f7f0] transition-colors ${
                    !item.isRead ? 'bg-[#f0f7f0]/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 w-5 text-center text-[#4a7c59] font-bold" aria-hidden="true">
                      {typeGlyph(item.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm ${!item.isRead ? 'font-semibold' : ''} text-[#1a472a]`}>
                        {decodeEntities(item.groupCount > 1 ? `${item.groupCount} new replies: ${item.title.replace(/^New reply in /, '')}` : item.title)}
                      </h4>
                      {item.body && (
                        <p className="text-xs text-[#1a472a]/70 mt-1 line-clamp-2">{decodeEntities(item.body)}</p>
                      )}
                      <p className="text-xs text-[#1a472a]/80 mt-1">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ActorStack actors={item.actors} />
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t border-[#7dd87d]/20 text-center">
            <button
              onClick={() => { setIsOpen(false); navigate('/notifications'); }}
              className="text-xs text-[#4a7c59] hover:underline font-semibold"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
