# SPEC 01: Music Experience Overhaul

**Status:** READY FOR CLAUDE CODE
**Source:** Screenshot 2 from Rye's April 17 walkthrough, plus follow-up clarifications
**Priority:** High (player-facing signature moment, shareable)
**Estimated effort:** 1.5 to 2 days

---

## 1. Goals in plain language

1. Every song on the site has its own shareable URL. When someone opens that URL, they land on the home page with that exact song playing.
2. The mobile More menu shows the music player with two buttons underneath it, side by side: "Show playlist" and "Add your song".
3. "Show playlist" expands an inline playlist listing every song. Tapping any row jumps playback to that song. The last row is "Add your song" that links to the submission form.
4. "Add your song" links directly to the Hymn Book submission form.
5. Nothing else about the audio system breaks. Persisted state, auto-play on interaction, page-start index, and existing controls continue to work.

---

## 2. Affected files

| Path | Change type |
|------|-------------|
| `client/src/contexts/AudioContext.tsx` | Extend: add `slug` field, `playSongBySlug`, `queueSongBySlug` |
| `client/src/pages/HymnPlayer.tsx` | NEW: thin route component at `/hymn-book/:slug` that triggers auto-play then redirects to `/` |
| `client/src/App.tsx` | Add lazy route for `HymnPlayer` under `/hymn-book/:slug` (before the existing `/hymn-book` route) |
| `client/src/components/mobile/MobileMoreMenu.tsx` | Swap the inline Hymns link for a 3-button row (Playlist, Add song, Copy link) + inline playlist expand |
| `client/src/components/mobile/MobilePlaylistPanel.tsx` | NEW: reusable inline playlist panel |
| `client/src/components/CommandPanel.tsx` | Desktop Sound tab: replace the inline "Add Your Voice" anchor and "Hymns of the ReGeneration (N)" toggle with the same 3-button row |
| `client/src/components/audio/CopyLinkButton.tsx` | NEW: shared clipboard button with inline "Copied" feedback |
| `client/src/utils/songSlug.ts` | NEW: pure slug helpers (`toSlug`, `indexFromSlug`, `songFromSlug`) |

No server changes. No database changes. No migration.

---

## 3. Data shape changes

### 3.1 Extend the `Song` interface

`client/src/contexts/AudioContext.tsx`:

```ts
export interface Song {
  title: string
  src: string
  page: string
  artist?: string
  /** URL slug segment, stable. Used for /hymn-book/:slug share links. */
  slug: string
}
```

### 3.2 Update `PLAYLIST` with explicit slugs

Slugs are explicit (not derived at runtime) so they stay stable even if a title changes:

```ts
export const PLAYLIST: Song[] = [
  { slug: "wasteland-into-wonderland", title: "Wasteland into Wonderland", src: "/audio/wasteland-into-wonderland.mp3", page: "/land", artist: "ReGen Transition Team" },
  { slug: "we-are-the-land", title: "We are the Land", src: "/audio/we-are-the-land.mp3", page: "/community", artist: "ReGen Transition Team" },
  { slug: "regen-transition-team", title: "ReGen Transition Team", src: "/audio/regen-transition-team.mp3", page: "/play", artist: "ReGen Transition Team" },
  { slug: "better-and-better", title: "Better & Better & Better", src: "/audio/better-and-better-v2.mp3", page: "/team", artist: "Hymns of the ReGeneration" },
  { slug: "addiction-2-addition", title: "Addiction 2 Addition", src: "/audio/addiction-2-addition-hymns-of-the-regeneration.mp3", page: "/game", artist: "Hymns of the ReGeneration" },
  { slug: "cult-to-culture", title: "Cult to Culture", src: "/audio/cult-to-culture-hymns-of-the-regeneration.mp3", page: "/governance", artist: "Hymns of the ReGeneration" },
]
```

---

## 4. New slug helpers

`client/src/utils/songSlug.ts`:

```ts
import { PLAYLIST, Song } from "@/contexts/AudioContext"

/**
 * Fallback slugifier for user-submitted Hymn Book tracks. PLAYLIST songs
 * should have explicit slugs on the object.
 */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function indexFromSlug(slug: string): number {
  return PLAYLIST.findIndex((s) => s.slug === slug)
}

export function songFromSlug(slug: string): Song | null {
  const i = indexFromSlug(slug)
  return i === -1 ? null : PLAYLIST[i]
}
```

---

## 5. AudioContext changes

### 5.1 New API surface

Add two methods to `AudioContextValue`:

```ts
interface AudioContextValue {
  // ...existing fields
  /** Jump straight to a track by slug. Returns true if found. */
  playSongBySlug: (slug: string) => boolean
  /** Set the song index without starting playback. Used by route mount. */
  queueSongBySlug: (slug: string) => boolean
}
```

### 5.2 Implementation

Inside `AudioProvider`:

```ts
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
```

Expose both from the provider value object.

### 5.3 Preserve existing behavior

Do NOT change `PAGE_START_INDEX` logic. The `hasInteracted.current = true` guard already prevents page navigation from overriding a user-selected song, so setting it to true when we hit the share route is what we want.

---

## 6. New route: `/hymn-book/:slug`

### 6.1 New page component

`client/src/pages/HymnPlayer.tsx`:

```tsx
/**
 * HymnPlayer: landing route for shared song links.
 * Visiting /hymn-book/:slug sets the audio to that song, starts playback,
 * then redirects to the home page so the listener sees the full site
 * with the chosen hymn playing.
 */
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
    // If the slug is unknown, redirect to the Hymn Book index.
    if (!song) {
      setLocation("/hymn-book", { replace: true })
      return
    }
    // Start playback (may be blocked until user interacts; that is fine).
    audio.playSongBySlug(song.slug)
    // Send the visitor to the home page so they experience the whole site.
    const t = setTimeout(() => setLocation("/", { replace: true }), 50)
    return () => clearTimeout(t)
  }, [song?.slug])

  return (
    <>
      {song ? (
        <SEO
          title={`${song.title}: Hymns of the ReGeneration`}
          description={`Listen to ${song.title} by ${song.artist ?? "Hymns of the ReGeneration"} on ReGen Civics.`}
          image="/og/hymn-book.webp"
          url={`/hymn-book/${song.slug}`}
        />
      ) : null}
      <div className="min-h-screen bg-[#0d2818] flex items-center justify-center text-white/80 text-sm">
        {song ? `Loading ${song.title}…` : "Song not found. Taking you to the Hymn Book…"}
      </div>
    </>
  )
}
```

### 6.2 Register the route

`client/src/App.tsx`:

```tsx
const HymnPlayer = lazy(() => import("./pages/HymnPlayer"));

// Inside <Switch>, BEFORE the existing /hymn-book route:
<Route path="/hymn-book/:slug"><EB><HymnPlayer /></EB></Route>
<Route path="/hymn-book"><EB><HymnBook /></EB></Route>
```

Order matters in wouter. Place `:slug` before the static path.

### 6.3 Auto-play caveat

Browsers block `audio.play()` until the page has had a user interaction. This is accepted behavior. Flow:

- First-time visitor opens a share link in a fresh tab. The redirect happens. Playback will be attempted but may stall until they tap anywhere. The Wizard Radial Menu, Play button in the More menu, and the footer music control will all pick up and resume.
- Return visitors who have already interacted with the site on this origin will hear playback start immediately because the browser has granted media autoplay permission.

Surface a small toast or banner (optional for v1) only if playback fails. For v1: do nothing. The existing play buttons are visible.

---

## 7. Mobile More menu: two action buttons + inline playlist

### 7.1 New component

`client/src/components/mobile/MobilePlaylistPanel.tsx`:

```tsx
/**
 * MobilePlaylistPanel: inline expandable playlist for the More menu.
 * Renders every song from PLAYLIST plus an "Add your song" row at the end.
 */
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
                onClick={() => {
                  audio.playSong(i)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isCurrent ? "bg-[#7dd87d]/15" : "hover:bg-white/5"
                }`}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`Play ${song.title}`}
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1a472a] text-[#7dd87d] flex-shrink-0">
                  {isCurrent && audio.isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <Play className="w-3.5 h-3.5" />
                  ) : (
                    <Music className="w-3.5 h-3.5" />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-white text-sm truncate">{song.title}</span>
                  {song.artist ? (
                    <span className="block text-white/55 text-[11px] truncate">{song.artist}</span>
                  ) : null}
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
            <span className="flex-1 min-w-0 text-[#7dd87d] text-sm font-semibold">
              Add your song
            </span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
```

### 7.2 Update `MobileMoreMenu.tsx`

Replace the current music player row with this block:

```tsx
// Add to imports
import { ListMusic, Plus } from "lucide-react"
import { MobilePlaylistPanel } from "./MobilePlaylistPanel"

// Add state alongside `expanded`:
const [playlistOpen, setPlaylistOpen] = useState(false)

// Replace the current music-row block with:
<div className="space-y-2">
  {/* Music player row */}
  <div className="flex items-center gap-3 bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-4 py-3">
    <Music className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
    <span className="flex-1 min-w-0 text-white/70 text-sm truncate">
      {audio.currentSong?.title ?? "Hymns for the ReGeneration"}
    </span>
    <div className="flex items-center gap-1">
      <button onClick={audio.prevSong} className="p-1.5 text-white/60 hover:text-white" aria-label="Previous track">
        <SkipBack className="w-4 h-4" />
      </button>
      <button onClick={audio.togglePlay} className="p-2 text-[#7dd87d] hover:text-[#9de89d]" aria-label={audio.isPlaying ? "Pause" : "Play"}>
        {audio.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      <button onClick={audio.nextSong} className="p-1.5 text-white/60 hover:text-white" aria-label="Next track">
        <SkipForward className="w-4 h-4" />
      </button>
    </div>
  </div>

  {/* Three side-by-side action buttons (see section 10.1 for full code) */}
  {/* Show playlist / Add song / Copy link */}

  {/* Inline playlist panel */}
  {playlistOpen ? (
    <div id="mobile-playlist-panel">
      <MobilePlaylistPanel onSelect={onClose} />
    </div>
  ) : null}
</div>
```

Remove the separate `Hymns` link inside the music row. The Add-your-song button replaces it. Keep the existing `Link href="/hymn-book"` elsewhere if it appears in other menu rows.

### 7.3 Keep the "Hymns" footer link

`MOBILE_MENU_FOOTER` can keep any existing `/hymn-book` entry. The footer row is unchanged.

---

## 8. Desktop coverage (CommandPanel Sound tab)

Desktop users interact with music through `client/src/components/CommandPanel.tsx` (the Sound tab). It already has a track list and an "Add Your Voice" link. Bring the same feature parity as mobile:

### 8.1 Edit CommandPanel.tsx Sound tab

The current Sound tab already renders a track toggle (`ListMusic` button labeled "Hymns of the ReGeneration (N)") and an "Add Your Voice" inline link. Reshape into:

1. Song title and artist (unchanged)
2. Progress bar (unchanged)
3. Transport controls: prev, play/pause, next (unchanged)
4. Volume (unchanged)
5. NEW row of three buttons: "Show playlist" (toggles the existing track list), "Add your song" (links to `/hymn-book#add-your-voice`), "Copy link" (copies the current song's share URL)
6. Track list (the existing `showTrackList` panel, now triggered by the "Show playlist" button)

Replace the current `setShowTrackList` toggle line and the `Add Your Voice` anchor with a 3-button row:

```tsx
import { Plus, Link2 } from "lucide-react"
import { useState } from "react"

// Inside the Sound tab render body, replace the current toggle + "Add Your Voice" block with:
<div className="grid grid-cols-3 gap-2">
  <button
    type="button"
    onClick={() => setShowTrackList(s => !s)}
    className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg py-2 text-white text-xs font-semibold transition-colors"
    aria-expanded={showTrackList}
    aria-controls="hymn-book-track-list"
  >
    <ListMusic className="w-3.5 h-3.5 text-[#7dd87d]" />
    {showTrackList ? "Hide playlist" : "Show playlist"}
  </button>
  <a
    href="/hymn-book#add-your-voice"
    className="flex items-center justify-center gap-1.5 bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] rounded-lg py-2 text-xs font-bold transition-colors"
  >
    <Plus className="w-3.5 h-3.5" />
    Add your song
  </a>
  <CopyLinkButton song={currentSong} />
</div>
```

### 8.2 CopyLinkButton (shared)

Create `client/src/components/audio/CopyLinkButton.tsx`:

```tsx
import { useState } from "react"
import { Link2, Check } from "lucide-react"
import type { Song } from "@/contexts/AudioContext"

type Props = {
  song: Song | null
  /** "desktop" uses compact style. "mobile" uses larger row style. */
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
      // Fallback for older browsers: temporary textarea + execCommand
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
    : "flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl py-2.5 text-sm font-semibold transition-colors"

  const colorClass = copied ? "text-[#7dd87d]" : "text-white"
  const iconSize = variant === "desktop" ? "w-3.5 h-3.5" : "w-4 h-4"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!song}
      className={`${base} ${colorClass}`}
      aria-live="polite"
      aria-label={copied ? "Link copied" : "Copy share link for this song"}
    >
      {copied ? (
        <>
          <Check className={iconSize + " text-[#7dd87d]"} />
          Copied
        </>
      ) : (
        <>
          <Link2 className={iconSize + " text-[#7dd87d]"} />
          Copy link
        </>
      )}
    </button>
  )
}
```

The share links work identically on desktop because the route is registered globally.

---

## 9. OG image and meta for shared song URLs

v1 uses the existing `/og/hymn-book.webp` image for every song so we do not need new assets yet. The title is dynamic: `{song.title}: Hymns of the ReGeneration`. Description uses artist when present.

A later pass can generate per-song OG cards. File that under `FUTURE_EVOLUTION_IDEAS.md`.

---

## 10. Copy-song-link button (IN SCOPE, both surfaces)

Every music surface shows a "Copy link" control that copies `window.location.origin + '/hymn-book/' + audio.currentSong.slug` to the clipboard. Use the shared `CopyLinkButton` component from section 8.2.

### 10.1 Mobile placement

Change the mobile More menu from a 2-button grid to a 3-button grid. Update the grid in `MobileMoreMenu.tsx` from `grid-cols-2` to `grid-cols-3`:

```tsx
import { CopyLinkButton } from "@/components/audio/CopyLinkButton"

{/* Three side-by-side action buttons */}
<div className="grid grid-cols-3 gap-2">
  <button
    type="button"
    onClick={() => setPlaylistOpen((s) => !s)}
    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl py-2.5 text-white text-xs font-semibold transition-colors"
    aria-expanded={playlistOpen}
    aria-controls="mobile-playlist-panel"
  >
    <ListMusic className="w-4 h-4 text-[#7dd87d]" />
    {playlistOpen ? "Hide" : "Playlist"}
  </button>
  <Link
    href="/hymn-book#add-your-voice"
    onClick={onClose}
    className="flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] rounded-2xl py-2.5 text-xs font-bold transition-colors"
  >
    <Plus className="w-4 h-4" />
    Add song
  </Link>
  <CopyLinkButton song={audio.currentSong} variant="mobile" />
</div>
```

Because we now fit three buttons on mobile, label text shortens to "Playlist" / "Add song" / "Copy link" to stay readable on a 320px viewport. On narrower widths stack to two rows using `sm:grid-cols-3` if needed; in testing, 320px handles three buttons at this font size.

### 10.2 Desktop placement

Already covered in section 8.1: the Sound tab in `CommandPanel.tsx` gets the same 3-button row.

### 10.3 Feedback behavior

- On click: attempt `navigator.clipboard.writeText(url)`.
- On success: button switches to green check + "Copied" for 1.8 seconds, then reverts.
- On failure (old browser, no permission): fallback to the temporary textarea + `execCommand` path. Still show "Copied" feedback if that path succeeds.
- `aria-live="polite"` on the button so screen readers announce the state change.

### 10.4 Why not a separate toast

This avoids introducing a new toast system (SPEC_04 idea 13 is the planned toast garden). Inline button-state feedback is self-contained and does not block on a future toast system.

---

## 11. Acceptance criteria

Every item must pass before merge.

### Slug route
- [ ] Visiting `/hymn-book/better-and-better` in a new tab redirects to `/` and starts playing "Better & Better & Better" (or queues it if autoplay is blocked).
- [ ] Visiting `/hymn-book/totally-fake-song` redirects to `/hymn-book` (the index page).
- [ ] All 6 slugs from section 3.2 load their intended track.
- [ ] After landing, the footer music control shows the shared song as current.

### Mobile More menu
- [ ] Opening the More menu shows the music row unchanged.
- [ ] Below the music row three buttons sit side by side: "Playlist" (neutral), "Add song" (green), "Copy link" (neutral).
- [ ] All three fit on a 320px viewport without wrapping.
- [ ] Tapping "Playlist" expands an inline list of all 6 songs.
- [ ] The currently playing song is visually marked (background tint + check icon).
- [ ] Tapping any song row jumps playback to that song and keeps the menu open.
- [ ] The last row of the playlist is "Add your song" with a `+` icon, links to `/hymn-book#add-your-voice`, closes the menu.
- [ ] Tapping "Add song" directly also links to `/hymn-book#add-your-voice` and closes the menu.
- [ ] Tapping "Copy link" copies the share URL for the current song and shows "Copied" inline for 1.8s.

### Desktop CommandPanel Sound tab
- [ ] The Sound tab shows a 3-button row: "Show playlist" (toggles the existing track list), "Add your song" (links to `/hymn-book#add-your-voice`), "Copy link" (copies share URL).
- [ ] The legacy "+ Add Your Voice" inline anchor is removed (now handled by the "Add your song" button).
- [ ] The legacy "Hymns of the ReGeneration (N)" chevron toggle is removed (now handled by the "Show playlist" button).
- [ ] Track list behavior is unchanged (tap row to play).
- [ ] "Copy link" works on desktop (clipboard API) and shows "Copied" inline feedback.

### Unchanged behaviors
- [ ] localStorage persistence of song index, time, volume still works.
- [ ] Page-start defaults (`PAGE_START_INDEX`) still apply on first load when the user has not interacted.
- [ ] Prev/Next/Play/Pause still work.
- [ ] Volume and seek still work.
- [ ] The Wizard Radial Menu play/pause button still reflects state.

### Accessibility
- [ ] All new buttons have `aria-label` or visible text.
- [ ] Playlist expand uses `aria-expanded` and `aria-controls`.
- [ ] Focus is not trapped. Tab order is logical.
- [ ] Tap targets are at least 44x44 CSS pixels.

### No-regression
- [ ] Build passes (`npm run check` and `npm run build`).
- [ ] `npm run dev` console shows no new errors on home, `/hymn-book`, `/hymn-book/better-and-better`.
- [ ] Playwright smoke (if present) still passes.

---

## 12. Edge cases and how to handle them

| Scenario | Handling |
|----------|----------|
| Slug mismatch (typo in URL) | Redirect to `/hymn-book`. Never error. |
| Autoplay blocked by browser | Song is queued. Play button in the footer and More menu is unchanged and works on first user tap. |
| User hits `/hymn-book/better-and-better` while another song is playing | Current song stops, shared song starts. Existing `useEffect` on `currentIndex` already handles src swap and play. |
| User submits a Hymn Book song (server table) | By design: submissions live on `/hymn-book` where players listen, vote, and see the leaderboard. Only the top-voted song at the end of the season gets promoted into the PLAYLIST and earns a `/hymn-book/:slug` share URL at that time. The seasonal promotion process is a separate admin step; not part of this spec. |
| PLAYLIST reordered in the future | Slug stays on the song object, so share links continue to resolve. This is why slugs are explicit and not computed. |
| Server-side rendering or prerender of `/hymn-book/:slug` | Client-only SPA, so no SSR concerns. Route renders a loading state then redirects. |

---

## 13. Testing checklist (manual)

Run `npm run dev`, open in both desktop Chrome and mobile Chrome emulation.

1. Paste each of these into a fresh tab. Observe redirect and playback:
   - `/hymn-book/wasteland-into-wonderland`
   - `/hymn-book/we-are-the-land`
   - `/hymn-book/regen-transition-team`
   - `/hymn-book/better-and-better`
   - `/hymn-book/addiction-2-addition`
   - `/hymn-book/cult-to-culture`
   - `/hymn-book/this-slug-does-not-exist` (should redirect to `/hymn-book`)
2. Mobile emulation, open More menu, verify music row + two buttons.
3. Tap "Show playlist", verify all 6 songs listed, tap each, verify playback switches.
4. Tap the "Add your song" row at the bottom of the playlist. Verify you land on `/hymn-book#add-your-voice` (scrolled to the form).
5. Tap the top-right "Add your song" button. Verify same destination.
6. Reload the site, verify persisted index, time, and volume are restored.
7. Navigate to `/community` as a fresh session (no `hasInteracted`), verify PAGE_START_INDEX still picks index 1.
8. Desktop: open the Command Panel, select the Sound tab. Verify the 3-button row renders, "Show playlist" toggles the existing track list, "Add your song" links out to `/hymn-book#add-your-voice`, and "Copy link" copies the current song's URL and shows "Copied" for 1.8 seconds.
9. Paste the copied URL into a new desktop tab. Verify it redirects to `/` and queues the right song.
10. Repeat step 8 on mobile emulation. Verify the same 3-button row appears in the More menu and all three actions work.

---

## 14. What to skip for v1 (and why)

| Skipped item | Reason |
|--------------|--------|
| Per-song OG images | No assets yet. One image covers all v1 share links. Put on roadmap. |
| Sharing community-submitted Hymn Book songs | By design. Only the top-voted seasonal winner gets promoted into PLAYLIST and therefore earns a share URL. Listening and voting for submissions stays on `/hymn-book`. |
| Automatic seasonal promotion cron | Out of scope. The process of adding the top song to PLAYLIST at season-end is a human admin step for now. |

---

## 15. Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| M1 | Review the spec and confirm slugs are what you want | You own the brand | Read section 3.2 |
| M2 | After merge, verify autoplay behavior in Safari iOS (autoplay rules vary) | Real device testing | Open share link on iPhone |
| M3 | Deploy to production | Railway | `git push origin main` |

### CLAUDE CODE: can be done without you

| # | Task | Status |
|---|------|--------|
| M4 | Add `slug` field to `Song` interface and to all 6 PLAYLIST entries | CODED PENDING |
| M5 | Create `client/src/utils/songSlug.ts` | CODED PENDING |
| M6 | Add `playSongBySlug` and `queueSongBySlug` to `AudioContext` | CODED PENDING |
| M7 | Create `client/src/pages/HymnPlayer.tsx` | CODED PENDING |
| M8 | Register `/hymn-book/:slug` before `/hymn-book` in `App.tsx` | CODED PENDING |
| M9 | Create `client/src/components/mobile/MobilePlaylistPanel.tsx` | CODED PENDING |
| M10 | Create `client/src/components/audio/CopyLinkButton.tsx` (shared mobile + desktop) | CODED PENDING |
| M11 | Update `MobileMoreMenu.tsx` with 3-button row (Playlist, Add song, Copy link) + inline playlist | CODED PENDING |
| M12 | Update `CommandPanel.tsx` Sound tab with matching 3-button row; remove legacy inline "Add Your Voice" anchor and legacy "Hymns of the ReGeneration (N)" toggle | CODED PENDING |
| M13 | Run `npm run check`, `npm run build`, fix any type errors | CODED PENDING |
| M14 | Manual test checklist in section 13 | VERIFIED PENDING |

### WAITING ON YOU before Claude Code can proceed

None. Spec is self-contained.
