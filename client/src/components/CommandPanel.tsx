import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useAudio } from '@/contexts/AudioContext'
import { useAuth } from '@/_core/hooks/useAuth'
import { getCurrentSeason, SEASON_THEMES } from '@/lib/seasons'
import {
  SkipBack, SkipForward, Play, Pause, Volume2, ChevronDown, Music, ListMusic,
  Search, Clock, Sparkles, Wrench, Map as MapIcon
} from 'lucide-react'
import { useReGenGuide } from '@/contexts/ReGenGuideContext'
import { usePageTools } from '@/hooks/usePageTools'
import { NavIcon } from '@/components/SmartBottomNav'
import { ProgressMapMini } from '@/components/ProgressMap/ProgressMapMini'
import { SearchTab } from '@/components/command/SearchTab'
import { RecentFavoritesTab } from '@/components/command/RecentFavoritesTab'
import { AssistTab } from '@/components/command/AssistTab'

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
  const { isPlaying, togglePlay, nextSong, prevSong, currentSong, currentIndex, playlist, playSong,
          duration, currentTime, seek, volume, setVolume } = useAudio()
  const { isAuthenticated } = useAuth()
  const guide = useReGenGuide()
  const pageTools = usePageTools()
  const panelRef = useRef<HTMLDivElement>(null)
  const [showMap, setShowMap] = useState(false)
  const [showTrackList, setShowTrackList] = useState(false)

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

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

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
          {tab === 'sound' && (
            <div className="space-y-3">
              {/* Song title + add your voice + track list toggle */}
              <div className="text-center">
                <p className="text-[#7dd87d] text-sm font-medium">{currentSong?.title ?? 'No song loaded'}</p>
                <a
                  href="/hymn-book"
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#7dd87d]/80 hover:text-[#7dd87d] transition-colors"
                >
                  + Add Your Voice
                </a>
                {currentSong?.artist && (
                  <p className="text-white/60 text-[11px]">{currentSong.artist}</p>
                )}
                <button
                  onClick={() => setShowTrackList(s => !s)}
                  className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-white/55 hover:text-[#7dd87d] transition-colors"
                  aria-expanded={showTrackList}
                  aria-controls="hymn-book-track-list"
                >
                  <ListMusic className="w-3 h-3" />
                  <span>Hymns of the ReGeneration ({playlist.length})</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showTrackList ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Expandable track list */}
              {showTrackList && (
                <div
                  id="hymn-book-track-list"
                  className="rounded-lg border border-white/10 bg-black/20 max-h-56 overflow-y-auto"
                >
                  <ul className="divide-y divide-white/5">
                    {playlist.map((track, i) => {
                      const isCurrent = i === currentIndex
                      return (
                        <li key={track.src}>
                          <button
                            type="button"
                            onClick={() => playSong(i)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                              isCurrent
                                ? 'bg-[#7dd87d]/15 text-[#7dd87d]'
                                : 'text-white/75 hover:bg-white/5 hover:text-white'
                            }`}
                            aria-current={isCurrent ? 'true' : undefined}
                          >
                            <span className="w-5 flex-shrink-0 flex items-center justify-center">
                              {isCurrent && isPlaying
                                ? <Music className="w-3 h-3 text-[#7dd87d] animate-pulse" />
                                : <span className="text-[10px] text-white/60 tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-xs font-medium truncate">{track.title}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Progress bar */}
              <div>
                <input
                  type="range"
                  aria-label="Song progress"
                  min={0}
                  max={duration || 1}
                  value={currentTime}
                  onChange={e => seek(Number(e.target.value))}
                  className="w-full accent-[#7dd87d] h-1"
                />
                <div className="flex justify-between text-white/60 text-xs mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button onClick={prevSong} className="text-white/60 hover:text-white transition-colors p-2" aria-label="Previous song">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 bg-[#7dd87d] rounded-full flex items-center justify-center text-[#1a472a] hover:bg-[#9de89d] transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button onClick={nextSong} className="text-white/60 hover:text-white transition-colors p-2" aria-label="Next song">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-white/60" />
                <input
                  type="range"
                  aria-label="Volume"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="flex-1 accent-[#7dd87d] h-1"
                />
              </div>

              {/* Online indicator */}
              <div className="flex items-center justify-center text-xs">
                <div className="flex items-center gap-1.5 text-white/60">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span>Online</span>
                </div>
              </div>
            </div>
          )}

          {/* Search tab */}
          {tab === 'search' && <SearchTab />}

          {/* Recent & Favorites tab */}
          {tab === 'recent' && <RecentFavoritesTab />}

          {/* Assist tab */}
          {tab === 'assist' && <AssistTab />}

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
