/**
 * Polymorphic follow toggle (Phase 2): one component for users, categories,
 * bioregions, and tags. Followed things boost the For You feed and populate
 * the Following tab.
 */
import { UserPlus, UserCheck, Rss } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface Props {
  targetType: 'user' | 'category' | 'bioregion' | 'tag';
  targetId: string;
  /** What is being followed, for the label: "Follow Maya", "Follow Water". */
  targetLabel?: string;
  size?: 'sm' | 'default';
  className?: string;
}

export function FollowButton({ targetType, targetId, targetLabel, size = 'sm', className = '' }: Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data } = trpc.forumFeed.follows.isFollowing.useQuery(
    { targetType, targetId },
    { enabled: !!user }
  );
  const toggle = trpc.forumFeed.follows.toggle.useMutation({
    onSuccess: () => {
      utils.forumFeed.follows.isFollowing.invalidate({ targetType, targetId });
      utils.forumFeed.feed.invalidate();
    },
  });

  if (!user) return null;
  if (targetType === 'user' && targetId === String(user.id)) return null;

  const following = data?.following ?? false;
  const Icon = targetType === 'user' ? (following ? UserCheck : UserPlus) : Rss;

  return (
    <Button
      variant={following ? 'outline' : 'default'}
      size={size}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ targetType, targetId })}
      aria-pressed={following}
      className={
        (following
          ? 'border-[#7dd87d]/50 text-[#1a472a] hover:bg-[#f0f7f0] '
          : 'bg-[#1a472a] hover:bg-[#2d5a3d] text-white ') + className
      }
    >
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {following ? 'Following' : targetLabel ? `Follow ${targetLabel}` : 'Follow'}
    </Button>
  );
}
