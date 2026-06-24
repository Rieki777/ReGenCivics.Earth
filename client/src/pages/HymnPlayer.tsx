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
    // Redirect to the canonical share URL on /hymn-book so the user
    // lands on the song row with the full hymn book context, not on
    // the home page. The HymnBook page reads ?song= and plays it.
    setLocation(`/hymn-book?song=${song.slug}`, { replace: true })
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
