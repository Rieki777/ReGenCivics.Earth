import { Search } from 'lucide-react'

export function SearchTab() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/60 hover:text-white/80"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">Search pages, quests, tools...</span>
        <kbd className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">Ctrl+K</kbd>
      </button>
      <p className="text-[10px] text-white/60">Opens the full search palette</p>
    </div>
  )
}
