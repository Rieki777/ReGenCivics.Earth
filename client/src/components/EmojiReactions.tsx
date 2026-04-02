import { trpc } from '@/lib/trpc'
import { useAuth } from '@/_core/hooks/useAuth'
import { getLoginUrl } from '@/const'

const ALLOWED_EMOJIS = ['✔️', '❤️', '🌱', '🔥', '💡', '🌍'] as const

const EMOJI_LABELS: Record<string, string> = {
  '✔️': 'Done This: I have tried or completed this',
  '❤️': 'Love It: I love and support this',
  '🌱': 'Considering Doing: This is growing on me and I might do it',
  '🔥': 'Paradigm Shifting: This challenges how I see things',
  '💡': 'Make Blog Post: This deserves a deeper write-up',
  '🌍': 'Globally Replicable: This could work anywhere on Earth',
}

interface EmojiReactionsProps {
  postId?: number
  replyId?: number
}

export function EmojiReactions({ postId, replyId }: EmojiReactionsProps) {
  const { user } = useAuth()
  const utils = trpc.useUtils()
  const { data: reactions } = trpc.forum.reactions.get.useQuery(
    { postId, replyId },
    { staleTime: 30_000 }
  )
  const toggleMutation = trpc.forum.reactions.toggle.useMutation({
    onMutate: async ({ emoji }) => {
      // Cancel any in-flight refetch
      await utils.forum.reactions.get.cancel({ postId, replyId });
      // Snapshot previous value
      const prev = utils.forum.reactions.get.getData({ postId, replyId });
      // Optimistically update
      utils.forum.reactions.get.setData({ postId, replyId }, (old) => {
        if (!old) return old;
        return old.map(r => {
          if (r.emoji !== emoji) return r;
          const alreadyReacted = r.userReacted;
          return {
            ...r,
            count: alreadyReacted ? Math.max(0, r.count - 1) : r.count + 1,
            userReacted: !alreadyReacted,
          };
        });
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      // Roll back on error
      if (context?.prev) {
        utils.forum.reactions.get.setData({ postId, replyId }, context.prev);
      }
    },
    onSettled: () => {
      utils.forum.reactions.get.invalidate({ postId, replyId });
    },
  })

  const handleReact = (emoji: string) => {
    if (!user) {
      window.location.href = getLoginUrl()
      return
    }
    toggleMutation.mutate({ postId, replyId, emoji: emoji as typeof ALLOWED_EMOJIS[number] })
  }

  return (
    <div className="flex gap-1 flex-wrap mt-2">
      {ALLOWED_EMOJIS.map(emoji => {
        const reaction = reactions?.find(r => r.emoji === emoji)
        const count = reaction?.count ?? 0
        const reacted = reaction?.userReacted ?? false
        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={toggleMutation.isPending}
            title={EMOJI_LABELS[emoji]}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-colors ${
              reacted
                ? 'bg-green-500/20 border-green-500/50 text-green-700'
                : 'bg-white/5 border-[#e8e4de] hover:bg-[#f0f7f0] text-[#1a472a]/50 hover:text-[#1a472a]/80'
            }`}
            aria-label={`${EMOJI_LABELS[emoji]}${count > 0 ? `, ${count} reactions` : ''}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
