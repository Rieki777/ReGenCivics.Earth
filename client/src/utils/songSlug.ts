import { PLAYLIST, type Song } from "@/contexts/AudioContext"

export function toSlug(input: string): string {
  return input.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export function indexFromSlug(slug: string): number {
  return PLAYLIST.findIndex((s) => s.slug === slug)
}

export function songFromSlug(slug: string): Song | null {
  const i = indexFromSlug(slug)
  return i === -1 ? null : PLAYLIST[i]
}
