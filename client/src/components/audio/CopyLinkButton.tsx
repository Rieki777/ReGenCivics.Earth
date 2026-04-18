import { useState } from "react"
import { Link2, Check } from "lucide-react"
import type { Song } from "@/contexts/AudioContext"

type Props = {
  song: Song | null
  variant?: "desktop" | "mobile"
}

export function CopyLinkButton({ song, variant = "desktop" }: Props) {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    if (!song) return
    const url = `${window.location.origin}/hymn-book/${song.slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = url
      ta.setAttribute("readonly", "")
      ta.style.position = "absolute"
      ta.style.left = "-9999px"
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
      document.body.removeChild(ta)
    }
  }

  const base = variant === "desktop"
    ? "flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg py-2 text-xs font-semibold transition-colors"
    : "flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl py-2.5 text-xs font-semibold transition-colors"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!song}
      className={`${base} ${copied ? "text-[#7dd87d]" : "text-white"}`}
      aria-live="polite"
      aria-label={copied ? "Link copied" : "Copy share link for this song"}
    >
      {copied ? <><Check className="w-3.5 h-3.5 text-[#7dd87d]" /> Copied</> : <><Link2 className="w-3.5 h-3.5 text-[#7dd87d]" /> Copy link</>}
    </button>
  )
}
