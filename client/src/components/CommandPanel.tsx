import { useAudio } from '@/contexts/AudioContext'
import { SkipBack, SkipForward, Play, Pause, Volume2 } from 'lucide-react'

interface CommandPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPanel({ isOpen, onClose }: CommandPanelProps) {
  const { isPlaying, togglePlay, nextSong, prevSong, currentSong,
          duration, currentTime, seek, volume, setVolume } = useAudio()

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div
      className={`fixed bottom-16 left-0 right-0 z-40 bg-[#1a472a]/98 backdrop-blur-md border-t border-[#7dd87d]/20 transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
    >
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
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
      </div>
    </div>
  )
}
