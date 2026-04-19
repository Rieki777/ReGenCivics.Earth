import { Sparkles } from 'lucide-react'
import { useReGenGuide } from '@/contexts/ReGenGuideContext'

const STARTER_PROMPTS = [
  'How does the ReGen Civics fund work?',
  'What are quests and how do I earn rewards?',
  'How do I invest or contribute?',
  'What is the difference between the 4 paths?',
]

type Props = {
  onClose?: () => void
}

/**
 * AssistTab: opens the ReGenGuide chat assistant.
 * The actual chat lives in <ReGenGuide /> (floating panel, mounted in App.tsx).
 * This tab is the entry point from the CommandPanel.
 */
export function AssistTab({ onClose }: Props = {}) {
  const guide = useReGenGuide()

  const launch = (prompt?: string) => {
    guide.open()
    onClose?.()
    if (prompt) {
      // Broadcast starter prompt for ReGenGuide to pick up on open.
      window.dispatchEvent(new CustomEvent('regen-guide-prompt', { detail: prompt }))
    }
  }

  return (
    <div className="py-3 space-y-3">
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-9 h-9 rounded-full bg-[#7dd87d]/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-[#7dd87d]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Your ReGen Guide</p>
          <p className="text-[11px] text-white/50">Ask about quests, the Fund, or how to participate.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => launch()}
        className="w-full flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] rounded-lg py-2.5 text-xs font-bold transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Open the Guide
      </button>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40 px-1">Try asking</p>
        <div className="flex flex-col gap-1.5">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => launch(prompt)}
              className="text-left text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#7dd87d]/40 text-white/80 hover:text-white transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
