import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useAudio } from '@/contexts/AudioContext'
import { useAuth } from '@/_core/hooks/useAuth'
import { getCurrentSeason, SEASON_THEMES } from '@/lib/seasons'
import {
  Play, Pause, ChevronDown, Music,
  Search, Clock, Sparkles, Wrench, Map as MapIcon,
} from 'lucide-react'
import { useReGenGuide } from '@/contexts/ReGenGuideContext'
import { usePageTools } from '@/hooks/usePageTools'
import { NavIcon } from '@/components/SmartBottomNav'
import { ProgressMapMini } from '@/components/ProgressMap/ProgressMapMini'
import { SearchTab } from '@/components/command/SearchTab'
import { RecentFavoritesTab } from '@/components/command/RecentFavoritesTab'
import { AssistTab } from '@/components/command/AssistTab'
import { SoundPlayer } from '@/components/SoundPlayer'

const ProgressMap = lazy(() => import('@/components/ProgressMap/ProgressMap'))

type TabId = 'sound' | 'search' | 'recent' | 'assist' | 'tools' | 'map'

const TAB_DEFS: { id: TabId; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'sound',  label: 'Sound',   Icon: Music },
  { id: 'search', label: 'Search',  Icon: Search },
  { id: 'recent', label: 'Recent',  Icon: Clock },
  { id: 'assist', label: 'Assist',  Icon: Sparkles },
  { id: 'tools',  label: 'Tools',   Icon: Wrench },
  { id: 'map',    label: 'Map',     Icon: MapIcon },
]

interface CommandPanelProps {
  isOpen: boolean
  onClose: () => void
  toggleRef?: React.RefObject<HTMLButtonElement | null>
}

export function CommandPanel({ isOpen, onClose, toggleRef }: CommandPanelProps) {
  const { isPlaying, togglePlay, currentSong } = useAudio()
  const { isAuthenticated } = useAuth()
  const guide = useReGenGuide()
  const pageTools = usePageTools()
  const panelRef = useRef<HTMLDivElement>(null)
  const [showMap, setShowMap] = useState(false)

  // Default tab: sound when music is playing, search otherwise
  const [tab, setTab] = useState<TabId>(() => isPlaying ? 'sound' : 'search')

  // Update default tab when playing state changes and panel reopens
  useEffect(() => {
    if (isOpen) {
      setTab(isPlaying ? 'sound' : 'search')
    }
  }, [isOpen])

  // Seasonal theme
  const season = getCurrentSeason()
  const theme = SEASON_THEMES[season]

  // Click outside to collapse
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current && !panelRef.current.contains(target)) {
        if (toggleRef?.current?.contains(target)) return
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, toggleRef])

  return (
    <>
    <div
      ref={panelRef}
      className={`fixed bottom-16 left-0 right-0 z-40 bg-gradient-to-br ${theme.gradient} backdrop-blur-md border-t border-[#7dd87d]/20 transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
      style={{ opacity: 0.98 }}
    >
      <div className="max-w-lg mx-auto px-4 py-3 flex flex-col" style={{ maxHeight: '70vh' }}>
        {/* Close handle */}
        <button onClick={onClose} className="w-full flex justify-center py-0.5 -mt-1 mb-1 text-white/55 hover:text-white transition-colors" aria-label="Close panel">
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* Persistent top strip: current song + play/pause */}
        <div className="flex items-center gap-2 mb-2 px-1">
          <button
            onClick={togglePlay}
            className="w-7 h-7 bg-[#7dd87d] rounded-full flex items-center justify-center text-[#1a472a] hover:bg-[#9de89d] transition-colors flex-shrink-0"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[#7dd87d] text-xs font-medium truncate">{currentSong?.title ?? 'No song loaded'}</p>
          </div>
          <button
            onClick={guide.toggle}
            aria-label="Guide"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              guide.isOpen
                ? 'bg-[#7dd87d]/20 text-[#7dd87d]'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80'
            }`}
          >
            <span className="text-[10px] font-bold">?</span>
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none mb-2 -mx-1 px-1" role="tablist">
          {TAB_DEFS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                tab === id
                  ? 'bg-[#7dd87d]/20 text-[#7dd87d]'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content (scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/10" role="tabpanel">

          {/* Sound tab */}
          {tab === 'sound' && <SoundPlayer variant="desktop" />}

          {/* Search tab */}
          {tab === 'search' && <SearchTab />}

          {/* Recent & Favorites tab */}
          {tab === 'recent' && <RecentFavoritesTab />}

          {/* Assist tab */}
          {tab === 'assist' && <AssistTab onClose={onClose} />}

          {/* Tools tab */}
          {tab === 'tools' && (
            <div className="py-2 space-y-3">
              {pageTools.length > 0 ? (
                <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(pageTools.length, 5)}, 1fr)` }}>
                  {pageTools.map((tool, i) => (
                    <button key={i} onClick={tool.action} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white/80">
                      <NavIcon name={tool.icon} className="w-4 h-4" />
                      <span className="text-[9px]">{tool.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-white/30 text-center py-4">No page-specific tools on this page.</p>
              )}

              {/* Guide + Search quick buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={guide.toggle}
                  aria-label="Guide"
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                    guide.isOpen
                      ? 'bg-[#7dd87d]/20 text-[#7dd87d] ring-1 ring-[#7dd87d]/40'
                      : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80'
                  }`}
                >
                  <span className="text-sm">?</span>
                  <span className="text-[9px]">Guide</span>
                </button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))} aria-label="Search" className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white/80">
                  <Search className="w-4 h-4" />
                  <span className="text-[9px]">Search</span>
                </button>
              </div>
            </div>
          )}

          {/* Map tab */}
          {tab === 'map' && (
            <div className="py-2">
              <ProgressMapMini onExpand={() => setShowMap(true)} />
            </div>
          )}

        </div>
      </div>
    </div>

    {/* Full-screen map overlay */}
    {showMap && (
      <Suspense fallback={null}>
        <ProgressMap onClose={() => setShowMap(false)} />
      </Suspense>
    )}
    </>
  )
}
