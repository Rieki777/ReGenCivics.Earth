import { useEffect } from "react"
import { useLocation, useParams } from "wouter"
import { useAudio } from "@/contexts/AudioContext"
import { songFromSlug } from "@/utils/songSlug"
import { SEO } from "@/components/SEO"

export default function HymnPlayer() {
  const params = useParams<{ slug: string }>()
  const [, setLocation] = useLocation()
  const audio = useAudio()
  const song = params.slug ? songFromSlug(params.slug) : null

  useEffect(() => {
    if (!song) {
      setLocation("/hymn-book", { replace: true })
      return
    }
    audio.playSongBySlug(song.slug)
    const t = setTimeout(() => setLocation("/", { replace: true }), 50)
    return () => clearTimeout(t)
  }, [song?.slug])

  return (
    <>
      {song ? (
        <SEO
          title={`${song.title}: Hymns of the ReGeneration`}
          description={`Listen to ${song.title} by ${song.artist ?? "Hymns of the ReGeneration"} on ReGen Civics.`}
        />
      ) : null}
      <div className="min-h-screen bg-[#0d2818] flex items-center justify-center text-white/80 text-sm">
        {song ? `Loading ${song.title}...` : "Song not found. Taking you to the Hymn Book..."}
      </div>
    </>
  )
}
