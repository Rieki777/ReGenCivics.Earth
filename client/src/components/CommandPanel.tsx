import { useState } from 'react'
import { useAudio } from '@/contexts/AudioContext'
import { usePresence } from '@/hooks/usePresence'
import { useAuth } from '@/_core/hooks/useAuth'
import { getCurrentSeason, SEASON_THEMES } from '@/lib/seasons'
import { SkipBack, SkipForward, Play, Pause, Volume2, Coins, Send } from 'lucide-react'

interface CommandPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPanel({ isOpen, onClose }: CommandPanelProps) {
  const { isPlaying, togglePlay, nextSong, prevSong, currentSong,
          duration, currentTime, seek, volume, setVolume } = useAudio()
  const { count } = usePresence()
  const { isAuthenticated } = useAuth()

  // Quick-post state
  const [quickPost, setQuickPost] = useState('')
  const [posting, setPosting] = useState(false)

  // Seasonal theme
  const season = getCurrentSeason()
  const theme = SEASON_THEMES[season]

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleQuickPost = async () => {
    if (!quickPost.trim() || posting) return
    setPosting(true)
    try {
      await fetch('/api/forum/quick-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: quickPost.trim() }),
      })
      setQuickPost('')
    } catch {
      // Silently fail for now. Wire up error toasts later.
    } finally {
      setPosting(false)
    }
  }

  return (
    <div
      className={`fixed bottom-16 left-0 right-0 z-40 bg-gradient-to-br ${theme.gradient} backdrop-blur-md border-t border-[#7dd87d]/20 transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
      style={{ opacity: 0.98 }}
    >
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Player count + token balance row */}
        <div className="flex items-center justify-between text-xs">
          {/* A.2: Player count display */}
          <div className="flex items-center gap-1.5 text-white/60">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span>{count !== null ? `${count} players online` : 'Connecting...'}</span>
          </div>

          {/* A.4: Token balance placeholder */}
          {/* TODO: Wire up when profile context is available. Pull balance from user profile data. */}
          <div className="flex items-center gap-1 text-white/40">
            <Coins className="w-3.5 h-3.5" />
            <span>--</span>
          </div>
        </div>

        {/* Song title */}
        <div className="text-center">
          <p className="text-[#7dd87d] text-sm font-medium">{currentSong?.title ?? 'No song loaded'}</p>
          <p className="text-white/40 text-xs">ReGen Civics Soundtrack</p>
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
          <div className="flex justify-between text-white/40 text-xs mt-1">
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
          <Volume2 className="w-4 h-4 text-white/40" />
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

        {/* A.3: Quick-post section (authenticated users only) */}
        {isAuthenticated && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <input
              type="text"
              value={quickPost}
              onChange={e => setQuickPost(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickPost() }}
              placeholder="What did you do today?"
              className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2 placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#7dd87d]/50"
            />
            <button
              onClick={handleQuickPost}
              disabled={!quickPost.trim() || posting}
              className="p-2 rounded-lg bg-[#7dd87d]/20 text-[#7dd87d] hover:bg-[#7dd87d]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Submit quick post"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
