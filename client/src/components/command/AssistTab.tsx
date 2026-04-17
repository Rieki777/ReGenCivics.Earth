import { Sparkles } from 'lucide-react'

/**
 * AssistTab - placeholder for embedded AI chat.
 * Will use AIChatBox once a tRPC AI chat endpoint is wired up.
 */
export function AssistTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <div className="w-10 h-10 rounded-full bg-[#7dd87d]/10 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-[#7dd87d]/60" />
      </div>
      <p className="text-sm text-white/60">ReGen Guide AI</p>
      <p className="text-[11px] text-white/40 max-w-[220px]">
        Coming soon. Ask questions about quests, land projects, and the ReGen movement.
      </p>
    </div>
  )
}
