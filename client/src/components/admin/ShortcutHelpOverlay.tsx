import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useLocation } from 'wouter'

const SHORTCUT_GROUPS = [
  {
    label: 'Navigation',
    shortcuts: [
      { key: 'G → F', action: 'Go to Fund' },
      { key: 'G → C', action: 'Go to Community' },
      { key: 'G → M', action: 'Go to Map' },
      { key: 'G → P', action: 'Go to Profile' },
      { key: 'G → Q', action: 'Go to Quests' },
      { key: 'j', action: 'Next row' },
      { key: 'k', action: 'Previous row' },
      { key: 'Enter', action: 'Open selected row' },
    ],
  },
  {
    label: 'Actions',
    shortcuts: [
      { key: '1–9', action: 'Jump to admin tab' },
      { key: '[', action: 'Toggle sidebar' },
      { key: 'N', action: 'New post (Community)' },
      { key: 'v', action: 'Verify selected player' },
    ],
  },
  {
    label: 'Overlays',
    shortcuts: [
      { key: '/', action: 'Focus search' },
      { key: '⌘K', action: 'Command palette' },
      { key: '?', action: 'Show shortcuts' },
      { key: 'Esc', action: 'Close modal / overlay' },
    ],
  },
]

const G_CHORD_ROUTES: Record<string, string> = {
  f: '/fund',
  c: '/community',
  m: '/map',
  p: '/profile',
  q: '/quest',
}

export function ShortcutHelpOverlay() {
  const [open, setOpen] = useState(false)
  const [, navigate] = useLocation()

  useEffect(() => {
    // Show/hide overlay on '?'
    const overlayHandler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '?') setOpen(o => !o)
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', overlayHandler)
    return () => window.removeEventListener('keydown', overlayHandler)
  }, [])

  useEffect(() => {
    // G-chord navigation handler
    let gPressed = false
    let gTimer: ReturnType<typeof setTimeout>

    const chordHandler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPressed = true
        clearTimeout(gTimer)
        gTimer = setTimeout(() => { gPressed = false }, 1000)
        return
      }

      if (gPressed) {
        gPressed = false
        clearTimeout(gTimer)
        const route = G_CHORD_ROUTES[e.key.toLowerCase()]
        if (route) {
          e.preventDefault()
          navigate(route)
        }
      }
    }

    window.addEventListener('keydown', chordHandler)
    return () => {
      window.removeEventListener('keydown', chordHandler)
      clearTimeout(gTimer)
    }
  }, [navigate])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[#0a1f14] border border-white/20 rounded-2xl p-6 w-96 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Keyboard Shortcuts</h3>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close keyboard shortcuts"
            className="text-white/60 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-5">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.shortcuts.map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">{s.action}</span>
                    <kbd className="bg-white/10 text-white/80 text-xs px-2 py-0.5 rounded font-mono whitespace-nowrap">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
