import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import { useLocation } from 'wouter'

interface Song {
  title: string
  src: string
  page: string
}

const PLAYLIST: Song[] = [
  { title: "Wasteland into Wonderland", src: "/audio/wasteland-into-wonderland.mp3", page: "/land" },
  { title: "We are ReGen Magicians", src: "/audio/we-are-regen-magicians.mp3", page: "/quest" },
  { title: "We are the Land", src: "/audio/we-are-the-land.mp3", page: "/community" },
  { title: "ReGen Transition Team", src: "/audio/regen-transition-team.mp3", page: "/play" },
]

const PAGE_START_INDEX: Record<string, number> = {
  "/land": 0,
  "/quest": 1,
  "/community": 2,
  "/play": 3,
}

interface AudioContextValue {
  isPlaying: boolean
  currentSong: Song | null
  currentIndex: number
  togglePlay: () => void
  nextSong: () => void
  prevSong: () => void
  volume: number
  setVolume: (v: number) => void
  duration: number
  currentTime: number
  seek: (t: number) => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.7)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [location] = useLocation()
  const hasInteracted = useRef(false)

  useEffect(() => {
    const audio = new Audio()
    audio.volume = 0.7
    audio.preload = 'metadata'
    audioRef.current = audio

    audio.addEventListener('ended', () => {
      setCurrentIndex(i => (i + 1) % PLAYLIST.length)
    })
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
    audio.addEventListener('durationchange', () => setDuration(audio.duration))

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

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

  return (
    <AudioCtx.Provider value={{
      isPlaying, currentSong: PLAYLIST[currentIndex], currentIndex,
      togglePlay, nextSong, prevSong, volume, setVolume,
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
