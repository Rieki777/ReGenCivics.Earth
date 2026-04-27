import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import { useLocation } from 'wouter'
import { indexFromSlug } from '@/utils/songSlug'

export interface Song {
  title: string
  src: string
  page: string
  slug: string
  /** Optional artist/contributor credit shown in the track list. */
  artist?: string
}

// Order is intentional: opening with the most upbeat/affirming track
// (Better & Better) and ending on Cult to Culture as the closing arc.
// Updated 2026-04-27 per Rye's intended sequence.
export const PLAYLIST: Song[] = [
  { title: "Better & Better & Better", src: "/audio/better-and-better-and-better-hymns-of-the-regeneration.mp3", page: "/team", slug: "better-and-better", artist: "Hymns of the ReGeneration" },
  { title: "We are the Land", src: "/audio/we-are-the-land.mp3", page: "/community", slug: "we-are-the-land", artist: "Hymns of the ReGeneration" },
  { title: "Children of the Earth Tribe", src: "/audio/children-of-the-earth-tribe-hymns-of-the-regeneration.mp3", page: "/local-food", slug: "children-of-the-earth-tribe", artist: "Hymns of the ReGeneration" },
  { title: "Wasteland into Wonderland", src: "/audio/wasteland-into-wonderland.mp3", page: "/land", slug: "wasteland-into-wonderland", artist: "Hymns of the ReGeneration" },
  { title: "Addiction 2 Addition", src: "/audio/addiction-2-addition-hymns-of-the-regeneration.mp3", page: "/game", slug: "addiction-2-addition", artist: "Hymns of the ReGeneration" },
  { title: "ReGen Transition Team", src: "/audio/regen-transition-team.mp3", page: "/play", slug: "regen-transition-team", artist: "Hymns of the ReGeneration" },
  { title: "Cult to Culture", src: "/audio/cult-to-culture-hymns-of-the-regeneration.mp3", page: "/governance", slug: "cult-to-culture", artist: "Hymns of the ReGeneration" },
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

// Updated 2026-04-27 to match the new playlist order.
const PAGE_START_INDEX: Record<string, number> = {
  "/team": 0,        // Better & Better & Better
  "/quest": 0,       // open with the upbeat first track
  "/community": 1,   // We are the Land
  "/local-food": 2,  // Children of the Earth Tribe
  "/land": 3,        // Wasteland into Wonderland
  "/game": 4,        // Addiction 2 Addition
  "/play": 5,        // ReGen Transition Team
  "/governance": 6,  // Cult to Culture
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
  /** Jump to a track by slug and start playback. Returns false if slug not found. */
  playSongBySlug: (slug: string) => boolean
  /** Jump to a track by slug without starting playback. Returns false if slug not found. */
  queueSongBySlug: (slug: string) => boolean
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
  const isPlayingRef = useRef(false)
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // Track consecutive load failures so a corrupted file in the playlist
  // doesn't cause an infinite skip loop. After a full cycle of failures we
  // give up and stop playback.
  const errorChainRef = useRef(0)

  useEffect(() => {
    const audio = new Audio()
    audio.volume = persisted?.volume ?? 0.7
    audio.preload = 'metadata'
    audioRef.current = audio

    audio.addEventListener('ended', () => {
      errorChainRef.current = 0
      setCurrentIndex(i => (i + 1) % PLAYLIST.length)
    })
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
    audio.addEventListener('durationchange', () => setDuration(audio.duration))
    // Restore the saved play position once metadata is loaded
    audio.addEventListener('loadedmetadata', () => {
      errorChainRef.current = 0
      if (restoredTimeRef.current > 0 && audio.currentTime === 0) {
        try { audio.currentTime = restoredTimeRef.current } catch { /* ignore */ }
        restoredTimeRef.current = 0
      }
    })

    // When a track fails to load (corrupted file, 404, codec mismatch),
    // skip to the next song instead of leaving playback frozen. This is
    // the "ReGen Transition Team song stops playback" symptom Rye flagged
    // on 2026-04-24: the bad file would 'error' but nothing advanced past
    // it, so the next user click was needed to recover.
    audio.addEventListener('error', () => {
      errorChainRef.current += 1
      if (errorChainRef.current >= PLAYLIST.length) {
        // All tracks failed — give up so we don't loop forever.
        errorChainRef.current = 0
        setIsPlaying(false)
        return
      }
      // Auto-advance. Only advance when we were trying to play; if the
      // user paused, leave the failed track loaded as-is.
      if (isPlayingRef.current) {
        setCurrentIndex(i => (i + 1) % PLAYLIST.length)
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

  const playSongBySlug = useCallback((slug: string) => {
    const i = indexFromSlug(slug)
    if (i === -1) return false
    hasInteracted.current = true
    setCurrentIndex(i)
    setTimeout(() => {
      const audio = audioRef.current
      if (!audio) return
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }, 0)
    return true
  }, [])

  const queueSongBySlug = useCallback((slug: string) => {
    const i = indexFromSlug(slug)
    if (i === -1) return false
    hasInteracted.current = true
    setCurrentIndex(i)
    return true
  }, [])

  return (
    <AudioCtx.Provider value={{
      isPlaying, currentSong: PLAYLIST[currentIndex], currentIndex,
      playlist: PLAYLIST,
      togglePlay, nextSong, prevSong, playSong, playSongBySlug, queueSongBySlug, volume, setVolume,
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
