import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useAudio } from '@/contexts/AudioContext'
import { useAuth } from '@/_core/hooks/useAuth'
import { getCurrentSeason, SEASON_THEMES } from '@/lib/seasons'
import { SkipBack, SkipForward, Play, Pause, Volume2, HelpCircle, Search, ChevronDown } from 'lucide-react'
import { useReGenGuide } from '@/contexts/ReGenGuideContext'
import { usePageTools } from '@/hooks/usePageTools'
import { NavIcon } from '@/components/SmartBottomNav'
import { ProgressMapMini } from '@/components/ProgressMap/ProgressMapMini'

const ProgressMap = lazy(() => import('@/components/ProgressMap/ProgressMap'))

interface CommandPanelProps {
  isOpen: boolean
  onClose: () => void
  toggleRef?: React.RefObject<HTMLButtonElement | null>
}

export function CommandPanel({ isOpen, onClose, toggleRef }: CommandPanelProps) {
  const { isPlaying, togglePlay, nextSong, prevSong, currentSong,
          duration, currentTime, seek, volume, setVolume } = useAudio()
  const { isAuthenticated } = useAuth()
  const guide = useReGenGuide()
  const pageTools = usePageTools()
  const panelRef = useRef<HTMLDivElement>(null)
  const [showMap, setShowMap] = useState(false)

  // Seasonal theme
  const season = getCurrentSeason()
  const theme = SEASON_THEMES[season]

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // Click outside to collapse (but ignore clicks on the toggle button itself,
  // since that button already handles toggling via its own onClick)
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current && !panelRef.current.contains(target)) {
        // If the click landed on the toggle button, let the button's onClick handle it
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
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Close handle */}
        <button onClick={onClose} className="w-full flex justify-center py-0.5 -mt-2 mb-1 text-white/30 hover:text-white/60 transition-colors" aria-label="Close panel">
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* Quick tools: Guide + Search (the two that work everywhere) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={guide.toggle}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
              guide.isOpen
                ? 'bg-[#7dd87d]/20 text-[#7dd87d] ring-1 ring-[#7dd87d]/40'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-[9px]">Guide</span>
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white/80">
            <Search className="w-4 h-4" />
            <span className="text-[9px]">Search</span>
          </button>
        </div>

        {/* Page-specific tools */}
        {pageTools.length > 0 && (
          <div className={`grid gap-2 pt-1 border-t border-white/10`} style={{ gridTemplateColumns: `repeat(${Math.min(pageTools.length, 5)}, 1fr)` }}>
            {pageTools.map((tool, i) => (
              <button key={i} onClick={tool.action} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white/80">
                <NavIcon name={tool.icon} className="w-4 h-4" />
                <span className="text-[9px]">{tool.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Progress Map mini widget */}
        <ProgressMapMini onExpand={() => setShowMap(true)} />

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

        {/* Song title */}
        <div className="text-center">
          <p className="text-[#7dd87d] text-sm font-medium">{currentSong?.title ?? 'No song loaded'}</p>
          <p className="text-white/60 text-xs">ReGen Civics Soundtrack</p>
        </div>

        {/* Progress bar */}
        <div>
          <input
            type="range"
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
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="flex-1 accent-[#7dd87d] h-1"
          />
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
