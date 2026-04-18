import { Link } from "wouter"
import { Music, Play, Pause, Plus, Check } from "lucide-react"
import { PLAYLIST, useAudio } from "@/contexts/AudioContext"

type Props = { onSelect?: () => void }

export function MobilePlaylistPanel({ onSelect }: Props) {
  const audio = useAudio()
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-2">
      <ul className="divide-y divide-white/5">
        {PLAYLIST.map((song, i) => {
          const isCurrent = audio.currentIndex === i
          return (
            <li key={song.slug}>
              <button
                type="button"
                onClick={() => audio.playSong(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isCurrent ? "bg-[#7dd87d]/15" : "hover:bg-white/5"
                }`}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`Play ${song.title}`}
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1a472a] text-[#7dd87d] flex-shrink-0">
                  {isCurrent && audio.isPlaying ? <Pause className="w-3.5 h-3.5" /> : isCurrent ? <Play className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-white text-sm truncate">{song.title}</span>
                  {song.artist ? <span className="block text-white/55 text-xs truncate">{song.artist}</span> : null}
                </span>
                {isCurrent ? <Check className="w-4 h-4 text-[#7dd87d] flex-shrink-0" /> : null}
              </button>
            </li>
          )
        })}
        <li>
          <Link
            href="/hymn-book#add-your-voice"
            onClick={onSelect}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center bg-[#7dd87d] text-[#0d2818] flex-shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </span>
            <span className="flex-1 min-w-0 text-[#7dd87d] text-sm font-semibold">Add your song</span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
