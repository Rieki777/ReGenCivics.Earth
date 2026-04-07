import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import { useLocation } from 'wouter'

export interface Song {
  title: string
  src: string
  page: string
  /** Optional artist/contributor credit shown in the track list. */
  artist?: string
}

export const PLAYLIST: Song[] = [
  { title: "Wasteland into Wonderland", src: "/audio/wasteland-into-wonderland.mp3", page: "/land", artist: "ReGen Transition Team" },
  { title: "We are ReGen Magicians", src: "/audio/we-are-regen-magicians.mp3", page: "/quest", artist: "ReGen Transition Team" },
  { title: "We are the Land", src: "/audio/we-are-the-land.mp3", page: "/community", artist: "ReGen Transition Team" },
  { title: "ReGen Transition Team", src: "/audio/regen-transition-team.mp3", page: "/play", artist: "ReGen Transition Team" },
  { title: "Better & Better & Better", src: "/audio/better-and-better-v2.mp3", page: "/team", artist: "Hymns of the ReGeneration" },
  { title: "Addiction 2 Addition", src: "/audio/addiction-2-addition-hymns-of-the-regeneration.mp3", page: "/game", artist: "Hymns of the ReGeneration" },
  { title: "Cult to Culture", src: "/audio/cult-to-culture-hymns-of-the-regeneration.mp3", page: "/governance", artist: "Hymns of the ReGeneration" },
]

const PERSIST_KEY = 'regen-audio-state-v1'

interface PersistedState {
  index: number
  time: number
  volume: number
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (
      typeof parsed.index === 'number' &&
      typeof parsed.time === 'number' &&
      typeof parsed.volume === 'number' &&
      parsed.index >= 0 && parsed.index < PLAYLIST.length
    ) return parsed
  } catch { /* ignore */ }
  return null
}

const PAGE_START_INDEX: Record<string, number> = {
  "/land": 0,
  "/quest": 1,
  "/community": 2,
  "/play": 3,
  "/team": 4,
  "/game": 5,
  "/governance": 6,
  "/economy": 6,
  "/tokenomics": 6,
}

interface AudioContextValue {
  isPlaying: boolean
  currentSong: Song | null
  currentIndex: number
  playlist: Song[]
  togglePlay: () => void
  nextSong: () => void
  prevSong: () => void
  /** Jump straight to a track by index (used by the track list UI). */
  playSong: (index: number) => void
  volume: number
  setVolume: (v: number) => void
  duration: number
  currentTime: number
  seek: (t: number) => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const persisted = typeof window !== 'undefined' ? loadPersisted() : null
  const [currentIndex, setCurrentIndex] = useState(persisted?.index ?? 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(persisted?.volume ?? 0.7)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(persisted?.time ?? 0)
  const [location] = useLocation()
  const hasInteracted = useRef(false)
  const restoredTimeRef = useRef<number>(persisted?.time ?? 0)

  useEffect(() => {
    const audio = new Audio()
    audio.volume = persisted?.volume ?? 0.7
    audio.preload = 'metadata'
    audioRef.current = audio

    audio.addEventListener('ended', () => {
      setCurrentIndex(i => (i + 1) % PLAYLIST.length)
    })
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
    audio.addEventListener('durationchange', () => setDuration(audio.duration))
    // Restore the saved play position once metadata is loaded
    audio.addEventListener('loadedmetadata', () => {
      if (restoredTimeRef.current > 0 && audio.currentTime === 0) {
        try { audio.currentTime = restoredTimeRef.current } catch { /* ignore */ }
        restoredTimeRef.current = 0
      }
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
    // Intentionally only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state to localStorage on every meaningful change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify({
        index: currentIndex,
        time: currentTime,
        volume,
      } satisfies PersistedState))
    } catch { /* ignore quota errors */ }
  }, [currentIndex, currentTime, volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const wasPlaying = isPlaying
    audio.src = PLAYLIST[currentIndex].src
    audio.load()
    if (wasPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [currentIndex])

  useEffect(() => {
    const pagePath = '/' + location.split('/')[1]
    const idx = PAGE_START_INDEX[pagePath]
    if (idx !== undefined && !hasInteracted.current) {
      setCurrentIndex(idx)
    }
  }, [location])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    hasInteracted.current = true
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }, [isPlaying])

  const nextSong = useCallback(() => {
    hasInteracted.current = true
    setCurrentIndex(i => (i + 1) % PLAYLIST.length)
  }, [])

  const prevSong = useCallback(() => {
    hasInteracted.current = true
    setCurrentIndex(i => (i - 1 + PLAYLIST.length) % PLAYLIST.length)
  }, [])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
    if (audioRef.current) audioRef.current.volume = v
  }, [])

  const seek = useCallback((t: number) => {
    if (audioRef.current) audioRef.current.currentTime = t
  }, [])

  const playSong = useCallback((index: number) => {
    hasInteracted.current = true
    if (index < 0 || index >= PLAYLIST.length) return
    setCurrentIndex(index)
    // Start playback after src swap settles
    setTimeout(() => {
      const audio = audioRef.current
      if (!audio) return
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }, 0)
  }, [])

  return (
    <AudioCtx.Provider value={{
      isPlaying, currentSong: PLAYLIST[currentIndex], currentIndex,
      playlist: PLAYLIST,
      togglePlay, nextSong, prevSong, playSong, volume, setVolume,
      duration, currentTime, seek,
    }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}
