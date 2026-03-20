import { trpc } from '@/lib/trpc'
import { useAuth } from '@/_core/hooks/useAuth'
import { getLoginUrl } from '@/const'

const ALLOWED_EMOJIS = ['👍', '❤️', '🌱', '🔥', '💡', '🌍'] as const

interface EmojiReactionsProps {
  postId?: number
  replyId?: number
}

export function EmojiReactions({ postId, replyId }: EmojiReactionsProps) {
  const { user } = useAuth()
  const { data: reactions, refetch } = trpc.forum.reactions.get.useQuery(
    { postId, replyId },
    { staleTime: 30_000 }
  )
  const toggleMutation = trpc.forum.reactions.toggle.useMutation({
    onSuccess: () => refetch(),
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
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-colors ${
              reacted
                ? 'bg-green-500/20 border-green-500/50 text-green-700'
                : 'bg-white/5 border-[#e8e4de] hover:bg-[#f0f7f0] text-[#1a472a]/50 hover:text-[#1a472a]/80'
            }`}
            aria-label={`React with ${emoji}${count > 0 ? `, ${count} reactions` : ''}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
