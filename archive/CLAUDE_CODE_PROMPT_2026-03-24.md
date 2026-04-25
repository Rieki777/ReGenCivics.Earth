# Claude Code Session -- ReGen Civics Quality Sprint

**Date:** 2026-03-24
**Project:** regen-civics-clean
**What this is:** A comprehensive implementation prompt for all READY TO IMPLEMENT fixes. Run this in a Claude Code terminal session in the project root.

---

## Context

This is the ReGen Civics web app: a fund and in-real-life game for supporting regenerative land projects. Full stack: React + TypeScript (Vite), tRPC, Express, MySQL on Railway, R2 (S3-compatible) for assets.

Read `FIXES_TO_MAKE_2026-03-24.md` for full context on every fix. The Handoff Breakdown table at the bottom shows what's coded vs. what needs implementing.

**Already coded in this session (do NOT reimplement):**
- Fix 169: CI pnpm version mismatch
- Fix 192: cookie package ESM fix
- Fix 193: stale-chunk auto-reload
- Fixes 194-204: wallet fixes, profile fixes, email digest, emoji reactions, forum deep links, quest links
- Fix 212: RichEditor forwardRef + reply focus

**Your job:** Implement all fixes marked READY TO IMPLEMENT below.

---

## Before You Start

1. Run `pnpm install` to confirm deps are clean
2. Run `pnpm build` to confirm baseline build passes
3. Check `client/public/audio/` -- three MP3s should be present:
   - `wasteland-into-wonderland.mp3`
   - `we-are-regen-magicians.mp3`
   - `we-are-the-land.mp3`

Work through fixes in priority order. After every group, run `pnpm build` to catch errors early.

---

## Writing Rules (MANDATORY -- applies to ALL content you touch)

- No em-dashes anywhere. Use commas, colons, or separate sentences.
- No AI-isms: no "delve", "tapestry", "foster", "leverage", "vibrant", "transformative", "unlock", "empower", "seamless", "robust", "comprehensive", "utilize", "navigate" (as metaphor).
- No contrast-framing ("not X, but Y"). Lead with the affirmative.
- Direct, grounded voice. Sound like a thoughtful person inside the regen movement.

---

## Priority 1: Forum + Profile UX Fixes (Fixes 205-213)

These are the most visible user-facing issues. Do these first.

### Fix 205: Profile Overview Tab -- Remove Quest Card List

**File:** `client/src/pages/PlayerProfile.tsx` (or wherever the Overview tab renders)

The Overview tab currently shows the full `WelcomeAboardQuests` component (a card grid of all 10 quest cards). Remove it. Keep only:
1. The progress board / quest progress summary
2. The "Explore Quests" button linking to `/quest`

The full quest cards belong on the Quest page, not the profile overview. The overview should be clean and focused.

Search for `WelcomeAboardQuests` usage in the profile pages and remove the card list render. Keep any progress tracker components that show completion state.

### Fix 206: Forum Cards on Community Page -- Full-Width Desktop Layout

**File:** `client/src/pages/Community.tsx`

The forum thread cards on `/community` currently render as small inline cards on desktop. They should be full-width, beautiful feature cards matching the visual weight of the rest of the page.

Find the section rendering forum/thread cards (look for a grid or list of thread preview cards). Change the layout so on desktop (`md:`) each card is full-width with:
- Larger text and more breathing room
- Category color accent on the left border or top
- Clear post title, excerpt, reply count, and last-activity timestamp
- Hover state with subtle elevation or background shift

The cards should feel like editorial features, not navigation links.

### Fix 207: Alliance Partners Thread -- Quest Cards Like Fire

**File:** `client/src/pages/Community.tsx` (or a sub-component for Alliance Partners)

The Fire category has a beautiful section with quest cards. The Alliance Partners thread/category needs the same treatment: a header card or feature section that introduces the Alliance Partners context and shows relevant quest cards or content.

Look at how the Fire section is implemented and replicate the same pattern for Alliance Partners. Use the same card components and color treatment but with Alliance Partners branding (earth tones, partnership iconography).

### Fix 208: Relabel "Rites of Passage" Button to "Welcome Aboard Quests"

Search the codebase for "Rites of Passage" text in button labels, nav items, or section headers. The button/label that triggers the 10-quest onboarding flow should read "Welcome Aboard Quests" instead.

This is a string replacement in the component that renders the profile quests tab or community navigation. Do NOT rename the component files -- just change the visible label text.

### Fix 209: Add New "Rites of Passage" Section for Quests 0-13

The 14 quests numbered 0-13 are actual rites of passage (life stage quests). They need their own section separate from the Welcome Aboard onboarding quests.

After relabeling (Fix 208), add a new button/section labeled "Rites of Passage" that loads/displays the quest set for quests 0-13. Check `client/src/data/` for quest data files to find how quests are categorized. Add the appropriate filter or data reference to surface the 0-13 range.

If quests 0-13 don't have a category flag yet, add a `category: 'rites-of-passage'` field to those quest records and filter by it.

### Fix 210: Seasonal Quest Order -- Spring, Summer, Fall, Winter

**File:** Wherever seasonal quests are displayed (likely in `client/src/pages/Quest.tsx` or a seasonal section component)

The seasonal follow-on quests are currently in incorrect order. Fix the display order to: Spring, Summer, Fall, Winter. This is likely a sort order or array ordering issue in the quest data or the rendering component.

Search for "Spring" and "Summer" and "Fall" and "Winter" in the quest data files to find the ordering.

### Fix 211: Fix Stacked Bottom-Right Buttons on Profile Page

**File:** `client/src/pages/PlayerProfile.tsx`

There are multiple floating action buttons or absolute-positioned buttons stacking on top of each other in the bottom-right corner of the profile page. This is a z-index or positioning conflict.

Audit the profile page for any `fixed bottom-` or `absolute bottom-` buttons. Either:
1. Consolidate them into a single button group (column or row)
2. Give them distinct positions that don't overlap
3. Move secondary actions into a dropdown or menu

Make sure no buttons overlap on any screen size (mobile and desktop).

### Fix 213: Forum Category Cards -- Earth, Water, Air Get Beautiful Headers Like Fire

**File:** `client/src/pages/Community.tsx` (or `client/src/components/ForumCategoryCard.tsx` or similar)

The Fire category has a beautiful header card with an icon, description, and featured quest links. Earth, Water, and Air categories currently have plain or minimal headers.

Apply the same beautiful header card treatment to Earth, Water, and Air. Each should have:
- Category icon (nature-themed: leaf for Earth, wave for Water, wind/cloud for Air)
- Short description of what content lives in that category
- Same glass-card styling as Fire

Find the Fire category implementation and use it as the template. The colors should feel distinct per category:
- Earth: warm browns/greens
- Water: cool blues/teals
- Air: light purples/silvers
- Fire: warm oranges/reds (already done)

---

## Priority 2: Command Center + Music Player (Fix 217)

This is the biggest new feature. Build it carefully.

### Architecture Overview

You're adding a persistent bottom bar (visible on ALL screen sizes, not just mobile) with:
1. The existing nav slots (extended to desktop)
2. A play/pause music button
3. An expand button that reveals a full music player panel

### Step 1: Create AudioContext

Create `client/src/contexts/AudioContext.tsx`:

```tsx
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

  // Create audio element once
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

  // When currentIndex changes, load and maybe play
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

  // When page changes, update starting song preference (but don't interrupt if already playing)
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
    setCurrentIndex(i => (i + 1) % PLAYLIST.length)
  }, [])

  const prevSong = useCallback(() => {
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
```

### Step 2: Wrap App with AudioProvider

In `client/src/App.tsx`, import `AudioProvider` and wrap the app:

```tsx
import { AudioProvider } from '@/contexts/AudioContext'

// Inside the JSX, wrap the router/layout:
<AudioProvider>
  {/* existing app content */}
</AudioProvider>
```

### Step 3: Update SmartBottomNav

In `client/src/components/SmartBottomNav.tsx`:

1. Remove `md:hidden` from the `<nav>` element so it shows on all screen sizes
2. Add bottom padding to `<main>` or the layout wrapper to prevent content hiding behind the nav bar (add `pb-16` or `pb-20` to the main content area in the layout)
3. Import and use `useAudio` hook
4. Add a 5th slot to the grid (`grid-cols-5`) for the music play/pause button:

```tsx
import { PlayCircle, PauseCircle, ChevronUp } from 'lucide-react'
import { useAudio } from '@/contexts/AudioContext'

// Inside the component:
const { isPlaying, togglePlay, currentSong } = useAudio()
const [panelOpen, setPanelOpen] = useState(false)
```

The nav grid becomes 5 columns on all sizes. The 4 existing slots stay unchanged. Add:

```tsx
{/* Music slot */}
<button
  onClick={togglePlay}
  className={`flex flex-col items-center justify-center gap-1 transition-colors text-white/40 hover:text-white/70 ${isPlaying ? 'text-[#7dd87d]' : ''}`}
  aria-label={isPlaying ? 'Pause music' : 'Play music'}
>
  {isPlaying ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
  <span className="text-[10px] font-medium">
    {isPlaying && currentSong ? currentSong.title.slice(0, 9) + '…' : 'Music'}
  </span>
</button>

{/* Expand slot */}
<button
  onClick={() => setPanelOpen(p => !p)}
  className="flex flex-col items-center justify-center gap-1 transition-colors text-white/40 hover:text-white/70"
  aria-label="Open command panel"
>
  <ChevronUp className={`w-5 h-5 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
  <span className="text-[10px] font-medium">More</span>
</button>
```

Wait -- that's 6 slots. Keep it to 5. Combine the music controls into one slot with a long-press or second-tap to expand. Or: keep 4 nav slots + 1 music/expand slot that opens the panel on click. The panel has the full player UI.

Final decision: **5 slots total**: Quests (fixed) | Adaptive | Adaptive | Music Play/Pause | Expand Panel. The music button shows the current song title when playing and toggles play/pause on click. The expand button opens the full CommandPanel.

### Step 4: Create CommandPanel

Create `client/src/components/CommandPanel.tsx`:

```tsx
import { useAudio } from '@/contexts/AudioContext'
import { SkipBack, SkipForward, Volume2 } from 'lucide-react'

interface CommandPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPanel({ isOpen, onClose }: CommandPanelProps) {
  const { isPlaying, togglePlay, nextSong, prevSong, currentSong, currentIndex,
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
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Song title */}
        <div className="text-center">
          <p className="text-[#7dd87d] text-sm font-medium">{currentSong?.title ?? 'No song loaded'}</p>
          <p className="text-white/40 text-xs">ReGen Civics Soundtrack</p>
        </div>

        {/* Progress bar */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={currentTime}
          onChange={e => seek(Number(e.target.value))}
          className="w-full accent-[#7dd87d] h-1"
        />
        <div className="flex justify-between text-white/40 text-xs">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={prevSong} className="text-white/60 hover:text-white transition-colors" aria-label="Previous song">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 bg-[#7dd87d] rounded-full flex items-center justify-center text-[#1a472a] hover:bg-[#9de89d] transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={nextSong} className="text-white/60 hover:text-white transition-colors" aria-label="Next song">
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
```

### Step 5: Fix Layout Padding

The nav bar is now always visible. Find the main layout wrapper (likely in `client/src/App.tsx` or a `Layout` component) and ensure the main content area has `pb-16` (or `pb-20` for safety) so content isn't hidden behind the bottom bar on any page.

### Step 6: Remove Quest Page FABs

In `client/src/pages/Quest.tsx`, find any floating action buttons (position: fixed, bottom-right) that duplicate nav actions. Remove them since the Command Center's nav slots now handle this. Keep any FABs that are truly page-specific and not covered by the nav.

---

## Priority 3: Gathering Grove Hero Image (Fix 216)

**Requires GEMINI_API_KEY environment variable.**

Check if `GEMINI_API_KEY` is set: `echo $GEMINI_API_KEY`. If not set, skip image generation and leave a comment in `Community.tsx` for where to add the hero image once generated.

If the key IS available:

```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Epic aerial photograph of a gathering grove: ancient trees forming a cathedral circle around a central fire pit, golden late-afternoon light streaming through old-growth forest canopy, mossy stone seats arranged in concentric rings, wildflowers carpeting the forest floor, smoke rising gently from the fire, a sense of sacred community gathering, hyper-realistic nature photography, cinematic wide angle, 16:9 landscape, no people" \
  --filename "gathering-grove-hero.png" \
  --resolution 2K
```

**Optimization step (MANDATORY before any upload):**

```bash
node -e "
const sharp = require('sharp');
sharp('gathering-grove-hero.png')
  .resize(1920, 1080, { fit: 'cover' })
  .webp({ quality: 85, effort: 6 })
  .toFile('gathering-grove-hero.webp')
  .then(info => console.log('Optimized:', info));
"
```

Target: under 300KB for the `.webp` output. If over, lower quality to 75.

**Upload to R2** using the existing `storagePut` pattern in `server/storage.ts`. The key should be `gathering-grove-hero.webp`. The public URL pattern is `${process.env.STORAGE_PUBLIC_URL}/gathering-grove-hero.webp`.

Alternatively, copy the `.webp` to `client/public/` as a fallback if R2 upload needs env vars you don't have:
```bash
cp gathering-grove-hero.webp client/public/gathering-grove-hero.webp
```

**Integration in Community.tsx:**

Find the hero `<section>` in `client/src/pages/Community.tsx` (around the "Gathering Grove" heading). Add a background image:

```tsx
{/* Hero section */}
<section className="relative ...">
  {/* Add this image tag inside the hero section, as the first child */}
  <img
    src="/gathering-grove-hero.webp"
    alt=""
    className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
    loading="eager"
  />
  {/* existing hero content stays on top */}
</section>
```

Make sure the hero section has `relative` positioning and `overflow-hidden`. Adjust opacity (0.15-0.35) so the image is visible but text stays readable.

---

## Priority 4: Photo Optimization Rule (Fix 218)

Update `~/.claude/skills/nano-banana-pro/SKILL.md` to add a mandatory optimization step after the Output section:

Add this section between "## Output" and "## Examples":

```markdown
## Mandatory Post-Processing

Every generated image MUST be optimized before saving to the repo or uploading to R2.

Run immediately after generation:
\`\`\`bash
node -e "
const sharp = require('sharp');
sharp('path/to/generated.png')
  .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 85, effort: 6 })
  .toFile('path/to/output.webp')
  .then(info => console.log('Optimized:', info));
"
\`\`\`

Target sizes:
- Hero images: under 300KB
- Content/card images: under 150KB
- Thumbnails: under 50KB

If over target, reduce quality to 75 or resize further. NEVER commit unoptimized PNG files.
```

---

## Priority 5: SEO Fixes (170-176)

These are important but lower urgency than UX. Do them after the above.

### Fix 170: SiteNavigationElement Schema + URL Consistency

**File:** `client/src/components/StructuredData.tsx`

1. Fix the BASE_URL: change `https://www.regencivics.earth` to `https://regencivics.earth` everywhere in this file
2. Add a `SiteNavigationElement` schema to the global structured data injection:

```typescript
const siteNav = {
  "@context": "https://schema.org",
  "@type": "SiteNavigationElement",
  "name": "Main Navigation",
  "hasPart": [
    { "@type": "SiteNavigationElement", "name": "Sign In", "url": "https://regencivics.earth/community" },
    { "@type": "SiteNavigationElement", "name": "Apply", "url": "https://regencivics.earth/apply" },
    { "@type": "SiteNavigationElement", "name": "Quests", "url": "https://regencivics.earth/quest" },
    { "@type": "SiteNavigationElement", "name": "Crowd Pooling", "url": "https://regencivics.earth/crowd-pooling" },
    { "@type": "SiteNavigationElement", "name": "The Fund", "url": "https://regencivics.earth/fund" },
    { "@type": "SiteNavigationElement", "name": "Community", "url": "https://regencivics.earth/community" },
  ]
}
```

Inject this alongside the existing Organization and WebSite schemas.

3. Fix the SearchAction URL: make sure it points to `/search?q=` consistently (not `/glossary?q=`)

### Fix 171: Page Titles + H1 Tags

Audit all pages for:
- Duplicate `<title>` tags (SPA should set one per route)
- Legal pages (`/terms`, `/privacy`) missing H1 tags

Check `client/src/pages/TermsOfService.tsx` and `client/src/pages/PrivacyPolicy.tsx`. Add `<h1>` as the page's first visible heading if missing.

### Fix 172: Canonical URLs + OG Images

**File:** `client/src/components/SEO.tsx` (or wherever meta tags are set)

1. Ensure canonical tags use the bare domain (no `www`)
2. Ensure OG image URLs are absolute (start with `https://regencivics.earth/...`), not relative paths

### Fix 173: llms.txt + Schema Updates

**File:** `public/llms.txt` (if it exists)

Update or create `public/llms.txt` with a brief description of the site for AI crawlers:

```
# ReGen Civics
> A fund and in-real-life game supporting regenerative land projects and the Regenerative Renaissance.

## Key Pages
- /quest - Browse and complete quests for regenerative action
- /apply - Apply to join as a land project
- /fund - Learn about the ReGen Civics Fund
- /crowd-pooling - Pool capital for land projects
- /community - The Gathering Grove community forum
- /play - The game and how to play

## About
ReGen Civics creates quests and games that help people heal, and in doing so builds new financial, economic, and governance systems that support and network land projects across the movement.
```

### Fix 174: Footer Nav Links + Prerender Hints

In the main footer component, ensure all primary pages have direct `<a>` links (not just JavaScript navigation). This helps crawlers discover all pages.

Add `<link rel="prerender">` hints in `index.html` for the top 3 pages: `/quest`, `/apply`, `/community`.

### Fix 175: Heading IDs for SectionNav

On long pages (Land, Quest, Fund pages), add `id` attributes to major section headings so in-page anchor links work. This enables a future SectionNav component and improves crawlability.

Example: `<h2 id="how-it-works">How It Works</h2>`

---

## Priority 6: Security Fixes (177-180)

### Fix 177: CSP Hardening

**File:** `server/_core/index.ts` (or wherever helmet/CSP middleware is configured)

Review the existing Content Security Policy. Remove `unsafe-eval` if present. Add nonce-based script loading if inline scripts exist.

Check what the current CSP allows and tighten where possible without breaking the app. Key changes:
- `script-src 'self'` (remove `unsafe-eval` if present)
- `img-src 'self' data: blob: https://assets.regencivics.earth`
- Test locally before committing

### Fix 178: Cookie Hardening

**File:** `server/index.ts` and any other files setting cookies

The `/api/csrf-token` endpoint already sets `httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production'`. Audit for any other cookies being set without these flags. Add `secure` to all cookies in production.

### Fix 179: Rate Limiting on Public Forms

**File:** `server/_core/index.ts` or the routes file handling public form submissions

Add rate limiting to the apply form, newsletter signup, and any other public POST endpoints. Use `express-rate-limit` (check if already installed):

```typescript
import rateLimit from 'express-rate-limit'

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 form submissions per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Apply to form endpoints:
app.post('/api/apply', formLimiter, ...)
app.post('/api/newsletter', formLimiter, ...)
```

If `express-rate-limit` isn't installed, run `pnpm add express-rate-limit` first.

### Fix 180: Auth Gate on /create-campaign

Find the route or component for `/create-campaign`. Add an auth check that redirects unauthenticated users to `/community` (the login entry point) instead of showing the page. Use the same auth pattern as other protected pages.

---

## Priority 7: Accessibility Fixes (181-184)

### Fix 181: Touch Target Sizes

Audit all button and link elements in the main nav, bottom nav, and card components. Any interactive element with `w-` or `h-` values under `w-10 h-10` (40px) should be bumped up. Use padding to increase hit area without changing visual size:

```css
/* Instead of small icon buttons, wrap with: */
className="p-2" /* adds 8px padding on all sides */
```

Pay special attention to: emoji reaction buttons, profile action buttons, forum like/reply buttons.

### Fix 182: SPA Focus Management

**File:** `client/src/App.tsx` or a new `client/src/hooks/useFocusOnNavigation.ts`

When the route changes in a SPA, focus should move to the main content area so screen reader users know the page changed. Add:

```typescript
import { useEffect } from 'react'
import { useLocation } from 'wouter'

export function useFocusOnNavigation() {
  const [location] = useLocation()
  useEffect(() => {
    const main = document.querySelector('main') as HTMLElement
    if (main) {
      main.setAttribute('tabIndex', '-1')
      main.focus({ preventScroll: true })
    }
  }, [location])
}
```

Call this hook in the App or Layout component.

### Fix 183: Image Alt Text Audit

Search for `<img` tags with empty or missing `alt` attributes (other than intentional decorative images which should have `alt=""`). Decorative images that are background art should have `alt=""`. Any image conveying information needs descriptive alt text.

Run: `grep -r '<img' client/src --include="*.tsx" | grep -v 'alt='`

Fix any images that have content but lack alt text.

### Fix 184: Color Contrast

Check the most common text-on-background combinations:
- `text-[#1a472a]/50` on white -- may fail at 4.5:1 ratio
- `text-white/40` on dark green -- likely fails

For body text and interactive labels, ensure at least 4.5:1 contrast ratio. Use the WCAG contrast ratio formula or a browser dev tools check.

Increase opacity on low-contrast text: change `/50` to `/70` or higher where needed. For placeholder text, `/40` is acceptable since it's not the primary content.

---

## Priority 8: Performance + Polish (185-191)

### Fix 185: Visual Rhythm on Long Pages

On pages like `/fund` and `/land`, add alternating section backgrounds to create visual rhythm:
- Odd sections: `bg-[#f5f2ee]` (warm cream)
- Even sections: `bg-white`

This prevents the "wall of same" effect on long scroll pages.

### Fix 186: Opportunity Page Density

**File:** `client/src/pages/Opportunity.tsx` (or `/crowd-pooling`)

The page is too dense. Add more vertical padding between sections (`py-16` instead of `py-8`), increase font sizes for key statistics, and reduce the number of items visible above the fold to give each element more room to breathe.

### Fix 187: Legal Page Polish

**Files:** `client/src/pages/TermsOfService.tsx`, `client/src/pages/PrivacyPolicy.tsx`

These pages need:
- A proper `<h1>` with the page title (if not already present -- see Fix 171)
- Consistent section heading hierarchy (`<h2>` for major sections)
- Last-updated date visible near the top
- Adequate line-height for dense legal text (`leading-relaxed`)

### Fix 188: Broken Image Fallback

Add a global `onError` handler for `<img>` elements that sets a fallback when an image fails to load. Create a reusable component or utility:

```tsx
// In a shared component or directly on key images:
<img
  src={src}
  alt={alt}
  onError={(e) => {
    (e.target as HTMLImageElement).src = '/placeholder-image.webp'
    ;(e.target as HTMLImageElement).onerror = null
  }}
/>
```

Check if `client/public/placeholder-image.webp` or similar exists. If not, create a simple 1x1 transparent WebP as the fallback.

### Fix 189: Lazy Loading for Long Pages

On pages with many images or heavy sections below the fold, add `loading="lazy"` to all `<img>` tags that are not above the fold. The hero/first-visible image should keep `loading="eager"`.

Also add React lazy loading for heavy page components. In `App.tsx`, convert any large page imports to `React.lazy()`:

```typescript
const Fund = React.lazy(() => import('./pages/Fund'))
const Quest = React.lazy(() => import('./pages/Quest'))
```

Wrap the router in `<Suspense fallback={<PageSkeleton />}>`.

### Fix 190: AI-Isms Voice Polish

Run a grep for banned words across all user-facing content:

```bash
grep -ri "delve\|tapestry\|foster\|leverage\|vibrant\|transformative\|unlock\|empower\|seamless\|robust\|comprehensive\|utilize\|embark\|testament\|beacon\|nurture" client/src --include="*.tsx" --include="*.ts" -l
```

Open each flagged file and rewrite sentences containing these words. Apply the writing rules: direct, specific, no AI patterns.

### Fix 191: Homepage Meta Description

**File:** `client/src/pages/Home.tsx` or wherever the homepage SEO meta is set

Current meta description is likely too long (over 155 characters) or contains AI-isms. Rewrite to:
- Under 155 characters
- Leads with the most specific, compelling claim
- No AI-isms, no contrast-framing
- Makes someone want to click

Example: "ReGen Civics runs quests and games that fund regenerative land projects. Complete real-world actions, earn tokens, and build the movement."

---

## After Each Batch: Verify

After completing each priority group, run:

```bash
pnpm build
```

Fix any TypeScript errors before moving on. A broken build blocks everything else.

After all fixes:

```bash
pnpm build
# Check output for warnings and errors
# Then test the app locally: pnpm dev
# Navigate to: /community, /quest, /land, /profile (if logged in)
# Verify: music button shows in bottom nav, CommandPanel opens, no console errors
```

---

## Git Commit

When done with a logical group of fixes, commit with descriptive messages:

```bash
git add -A
git commit -m "feat: command center music player + desktop nav (Fix 217)"
git commit -m "fix: profile overview cleanup, forum card layout, category headers (Fixes 205-213)"
git commit -m "fix: SEO structured data, canonicals, llms.txt (Fixes 170-176)"
git commit -m "fix: security hardening, accessibility, performance polish (Fixes 177-191)"
git push
```

---

## Things That Need Rye (Do NOT attempt)

- **Fix 214**: Move Welcome Aboard Quests thread to Fire category -- requires Railway DB access
- **Fix 219**: DB migration for newsletter enum -- requires Railway DB access
- **Fix 174-5**: Submit sitemap in Google Search Console -- requires GSC login
- **Fixes 169, 192-212**: Already coded, need `git push` from Rye's terminal to deploy

---

## Summary of Files You'll Touch

| File | Fixes |
|------|-------|
| `client/src/contexts/AudioContext.tsx` | 217 (new) |
| `client/src/components/CommandPanel.tsx` | 217 (new) |
| `client/src/components/SmartBottomNav.tsx` | 217 |
| `client/src/App.tsx` | 217, 182, 189 |
| `client/src/pages/PlayerProfile.tsx` | 205, 211 |
| `client/src/pages/Community.tsx` | 206, 207, 213, 216 |
| `client/src/pages/Quest.tsx` | 209, 210, 217 |
| `client/src/components/StructuredData.tsx` | 170, 172 |
| `client/src/components/SEO.tsx` | 172, 191 |
| `client/src/pages/TermsOfService.tsx` | 171, 187 |
| `client/src/pages/PrivacyPolicy.tsx` | 171, 187 |
| `server/_core/index.ts` | 177, 179 |
| `server/index.ts` | 178 |
| `public/llms.txt` | 173 |
| `~/.claude/skills/nano-banana-pro/SKILL.md` | 218 |
