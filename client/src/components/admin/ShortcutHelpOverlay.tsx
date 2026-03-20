import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { key: '?', action: 'Show this overlay' },
  { key: '[', action: 'Toggle sidebar' },
  { key: '/', action: 'Focus search' },
  { key: 'j', action: 'Next row' },
  { key: 'k', action: 'Previous row' },
  { key: 'Enter', action: 'Open selected row' },
  { key: 'Escape', action: 'Close modal' },
  { key: 'v', action: 'Verify selected player' },
]

export function ShortcutHelpOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
      <div className="bg-[#0a1f14] border border-white/20 rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Keyboard Shortcuts</h3>
          <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-white/60 text-sm">{s.action}</span>
              <kbd className="bg-white/10 text-white/80 text-xs px-2 py-0.5 rounded font-mono">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
