# Fixes to Make — 2026-03-31 (Image Performance + UX)

Found during Cowork browser audit. The site is loading 2048x2048 PNG images through a server-side proxy and displaying them at 168px. Every image loads eagerly. No responsive sizes. This is the single biggest performance bottleneck on the site right now.

---

## Fix 1 — Pass width to cdnImg() for all path card images (Critical)

**Status:** CODED BY CLAUDE CODE

**Symptom:** Hero images on the 4 path cards (Investors, Land Projects, Alliance Partners, ReGen Players) load slowly, especially on mobile. Users see blank cards for 2-5 seconds.

**Root cause:** `cdnImg(url)` is called without a width parameter in Home.tsx lines 66-118. The `/api/img` proxy fetches the full 2048x2048 PNG from R2, then resizes with sharp on every request. On mobile, these cards display at ~168px. Even on desktop, max display is 237px.

**Fix:** Pass explicit widths to every `cdnImg()` call in the pathCards array:
- Default images: `cdnImg(url, 480)` (237px display * 2x retina)
- Activated (hover) images: `cdnImg(url, 480)` (same size)
- Quality can drop to 75 for these: `cdnImg(url, 480, 75)`

**Files to change:**
- `client/src/pages/Home.tsx` lines 66-118 (all 8 cdnImg calls in pathCards)
- `client/src/components/ImagePreloader.tsx` (update preload URLs to include width param)

---

## Fix 2 — Lazy-load activated (hover) path card images (Critical)

**Status:** CODED BY CLAUDE CODE

**Symptom:** 8 images load eagerly on page load (4 default + 4 activated hover states). The activated images are invisible until hover, wasting bandwidth on initial load.

**Root cause:** `PathCardImage.tsx` sets `loading="eager"` on both default and activated `<img>` tags. Comment says "Safari iOS compat" but that's only needed for the default (visible) image.

**Fix:** In `PathCardImage.tsx`:
- Default image: keep `loading="eager"` (it's above the fold)
- Activated image: change to `loading="lazy"` (only needed on hover)
- Add `fetchpriority="high"` to the default image, `fetchpriority="low"` to activated

**Files to change:**
- `client/src/components/PathCardImage.tsx`

---

## Fix 3 — Add width param to all "Pick Up Where You Left Off" card images (High)

**Status:** CODED BY CLAUDE CODE

**Symptom:** The 4 quick-action cards above the path cards (Journey Quests, Back to the Forum, etc.) also load full-size images displayed at ~167x80px.

**Root cause:** Same as Fix 1. These card images (900x491 originals from the quest/page thumbnails) are loaded without width constraints through the proxy.

**Fix:** Pass `cdnImg(url, 340)` (167px * 2x retina) for these smaller card images.

**Files to change:**
- `client/src/pages/Home.tsx` (the "Pick Up Where You Left Off" section)

---

## Fix 4 — Add server-side proxy cache for resized images (High)

**Status:** CODED BY CLAUDE CODE

**Symptom:** Every request to `/api/img?url=...&w=480&q=75` re-fetches the original from R2 and re-processes with sharp, even for the same URL+params combination. This means first load AND every repeat load are slow.

**Root cause:** The image proxy in `server/routes/global.ts` (line 149+) has no caching layer. It sets client-side cache headers (`max-age=31536000`) but the server itself processes fresh every time.

**Fix:** Add an in-memory LRU cache (or Redis cache if available) keyed on `url+w+h+q`:
1. Generate a cache key from the request params: `${url}-${w}-${h}-${q}`
2. Check cache before processing
3. Store the processed Buffer in cache after processing
4. Use an LRU with a max size (e.g., 200MB or 500 entries)
5. Alternative: store resized versions back in R2 as `{hash}-{w}x{h}-q{q}.webp` and serve directly on subsequent requests

**Files to change:**
- `server/routes/global.ts` (the image proxy handler)

---

## Fix 5 — Use OptimizedImage component for homepage cards (High)

**Status:** CODED BY CLAUDE CODE

**Symptom:** The homepage doesn't use the existing `OptimizedImage` component which has IntersectionObserver lazy loading, srcset support, aspect ratio placeholders, and fade-in animation. Instead it uses raw `<img>` tags.

**Root cause:** The PathCardImage component was written separately and doesn't use the optimization patterns already built into OptimizedImage.

**Fix:** Refactor PathCardImage to use OptimizedImage internally, or at minimum adopt these features from it:
- `srcSet` with multiple widths: `240w, 480w, 720w`
- `sizes` attribute: `(max-width: 768px) 168px, 237px`
- Aspect ratio placeholder to prevent layout shift
- Fade-in on load

**Files to change:**
- `client/src/components/PathCardImage.tsx`

---

## Fix 6 — "Start Your Journey" cards: reduce transparency, improve text readability (High)

**Status:** CODED BY CLAUDE CODE

**Symptom:** On mobile, the "Start Your Journey" section (Play Quests, Join the Network, Invest or Partner) has cards overlaying a parallax background illustration. The card backgrounds are too transparent, making the text nearly unreadable against the busy village/garden image behind them.

**Root cause:** The card background opacity is set too low. Text contrast fails WCAG AA on mobile where cards are smaller and the background image is more prominent.

**Fix:** In the HowItWorks component or the landing page section that renders these cards:
- Increase the card background opacity from current value to at least `rgba(0, 40, 0, 0.85)` or higher
- Add a subtle `backdrop-filter: blur(4px)` to further separate text from background
- Ensure all text passes WCAG AA contrast ratio (4.5:1 minimum) against the card background

**Files to change:**
- `client/src/components/HowItWorks.tsx` or the relevant landing page parallax section
- Check for CSS in `client/src/pages/Home.tsx` or associated CSS modules

---

## Fix 7 — Community page 404 for logged-out users (High)

**Status:** INVESTIGATE

**Symptom:** When a user is not logged in and navigates to /community, they get the "ponder the TAO" 404 error page. All other pages also stop working after hitting this error.

**Root cause:** Likely the community route or its data-fetching middleware requires authentication and throws an unhandled error (or redirects to 404) instead of showing a public/read-only view of the forum.

**Fix:**
- The community page should be publicly accessible (read-only for logged-out users, "Sign in to participate" prompt for actions)
- Check the tRPC procedure that loads forum data. If it uses `protectedProcedure`, it needs a public fallback
- The catch-all 404 in App.tsx should not prevent navigation to other pages after one route fails

**Files to check:**
- `client/src/App.tsx` (route definition for /community)
- `server/routes/` or tRPC router for forum/community data
- Any auth guards wrapping the community page component

---

## Fix 8 — Duplicate image requests on homepage (Medium)

**Status:** CODED BY CLAUDE CODE

**Symptom:** Network tab shows the same images requested 3-4 times (e.g., YPVdYWGRrdEquJbO.webp loaded 4 times, OySlQvtOgDYjZaIa.webp loaded 4 times).

**Root cause:** Likely caused by: React re-renders triggering new image loads, the ImagePreloader loading images separately from the actual render, and/or the service worker cache-first strategy competing with browser cache.

**Fix:**
- Deduplicate: ensure ImagePreloader and PathCardImage use the exact same URL strings (including query params)
- Add `key` props or memoize image URLs to prevent re-renders from creating new requests
- Check if the service worker is re-fetching images that are already in browser cache

**Files to change:**
- `client/src/components/ImagePreloader.tsx`
- `client/src/components/PathCardImage.tsx`
- `client/src/pages/Home.tsx`

---

## Fix 9 — Pre-generate mobile-sized thumbnails in R2 (Medium)

**Status:** DESIGN ONLY

**Symptom:** Even with width params, the server still fetches the full 2048x2048 from R2 and resizes on every cold request. The first load is always slow.

**Root cause:** Source images in R2 are stored at full resolution only. The image proxy does real-time resizing.

**Fix:** Extend the `scripts/optimize-images.mjs` build script or create a new script that:
1. For each hero/card image in R2, generate pre-resized variants: 240px, 480px, 720px
2. Store them alongside the originals with a naming convention: `{hash}-480w.webp`
3. Update `cdnImg()` to point directly to the pre-resized variant, bypassing the proxy entirely for known sizes
4. This makes first load as fast as a static CDN fetch

**Files to change:**
- `scripts/optimize-images.mjs` or new `scripts/generate-thumbnails.mjs`
- `client/src/lib/utils.ts` (cdnImg function)

---

## Fix 10 — CI build failure: 10 TypeScript errors from social sharing Phase 5 (Critical)

**Status:** IN PROGRESS (Claude Code working on it)

**Symptom:** Latest push to main (commit 31ff090, "feat: social sharing Phase 5 - embeddable widgets + admin panel") failed CI with 10 TypeScript errors. Build did not pass.

**Root cause:** Multiple type mismatches across 6 files:
- `server/routes/features.ts#L27`: Property 'where' is missing
- `server/routes/embed.ts#L61-62`: 'currentAmount' and 'targetAmount' not on campaign type
- `client/src/pages/Quest.tsx#L1141-1142`: 'forumUrl' not on SeasonalQuest type
- `client/src/pages/PlayerProfile.tsx#L81,2885`: Import conflict + type mismatch
- `client/src/components/SocialLinks.tsx#L53`: 'discord'/'whatsapp' not in type union
- `client/src/components/SmartBottomNav.tsx#L97`: RefObject null type mismatch

**Fix:** Claude Code is working on fixing these TypeScript errors in the current session. Verify CI passes after the fix push.

**Files to change:**
- `server/routes/features.ts`
- `server/routes/embed.ts`
- `client/src/pages/Quest.tsx`
- `client/src/pages/PlayerProfile.tsx`
- `client/src/components/SocialLinks.tsx`
- `client/src/components/SmartBottomNav.tsx`

---

## Fix 11 -- OG social sharing image not showing + wrong copy (Critical)

**Status:** CODED BY CLAUDE CODE

**Symptom:** When sharing https://regencivics.earth/ on WhatsApp (and likely other platforms), the link preview shows no image. Just text. The forest/village illustration that used to appear is gone from the preview. Also, the description copy needs updating.

**Root cause:** The image file exists at `client/public/og-default.jpg` (the forest village waterfall scene, 275KB, 1200x630). The meta tag in `index.html` points to `https://regencivics.earth/og-default.jpg`. The server-side injection in `server/_core/vite.ts` also references it. But social crawlers may be getting blocked or the meta tag injection is breaking the image URL.

Possible causes:
1. The server-side meta injection in `vite.ts` (line 170+) may be double-encoding or malforming the og:image tag
2. A Content-Security-Policy or robots.txt may be blocking crawler access to the image file
3. WhatsApp might have cached an earlier version without the image

**Fix:**
1. Verify the og:image meta tag is correctly present in the HTML served to crawlers. Test by curling the page: `curl -s https://regencivics.earth/ | grep og:image` -- make sure the full URL is there and correct
2. Update the og:description in both `client/index.html` (line 61) and `server/_core/vite.ts` (line 100) to: "ReGen Civics is a fund for regenerative land projects, who also runs quests and games for real-world regeneration."
3. Update the og:title to: "ReGen Civics: Fund and Game for Regenerative Land Projects" (already close in vite.ts, sync with index.html)
4. Make sure the server-side injection doesn't strip or corrupt the og:image tag
5. After deploy, paste the URL into the Facebook Sharing Debugger (https://developers.facebook.com/tools/debug/) to force a re-scrape

**Files to change:**
- `client/index.html` (lines 60-65, 73-74)
- `server/_core/vite.ts` (lines 98-101)

---

## Fix 12 -- Profile edit button not working (High)

**Status:** CODED BY CLAUDE CODE

**Symptom:** Clicking the green pencil/edit icon on the player profile page does nothing. Users can't edit their profile.

**Root cause:** The edit button on the profile overview section (the green pencil icon next to the user's name/avatar) is either missing its onClick handler, navigating to a broken route, or conflicting with the tab-based settings system. The profile edit form exists at `client/src/components/ProfileEditForm.tsx` and is rendered inside the Settings tab. The edit icon may need to switch the active tab to "settings" and open the Profile section.

**Fix:**
1. Find the edit button on the profile overview (in `client/src/pages/PlayerProfile.tsx`, near the user's name/avatar area)
2. Wire its onClick to: `setActiveTab('settings')` so clicking it jumps to the Settings tab where ProfileEditForm lives
3. If the edit button is supposed to open a modal instead, check if the modal component exists and its open state is being set
4. Test: click the edit icon, verify it either opens Settings > Profile or opens an inline edit form

**Files to change:**
- `client/src/pages/PlayerProfile.tsx` (edit button onClick handler)

---

## Fix 13 -- Show user avatar image in top-right nav (Medium)

**Status:** CODED BY CLAUDE CODE

**Symptom:** The top-right navigation shows a green circle with the user's initial letter ("R" for Rye). When a user has a profile image uploaded, it should display that image instead of the initial. This makes it clearer that they're looking at their own profile area.

**Root cause:** The Navigation component (`client/src/components/Navigation.tsx`, lines 470-481 for desktop, 979-986 for mobile) only renders the first letter of the user's name. It doesn't check for or display `user.avatarUrl` even though the field exists on the user object.

**Fix:** In Navigation.tsx, for both desktop and mobile avatar circles:
1. Check if `user.avatarUrl` exists and is non-empty
2. If yes: render an `<img>` tag with `src={cdnImg(user.avatarUrl, 64)}` (32px display * 2x retina), rounded full, same dimensions as the letter circle
3. If no: fall back to the existing initial letter display
4. Add `alt={user.name}` to the image
5. Add error fallback: if the image fails to load, fall back to the letter

**Files to change:**
- `client/src/components/Navigation.tsx` (desktop avatar ~line 470, mobile avatar ~line 979)

---

## Priority Order

1. **Fix 10** (CI build failure) -- site stability, Claude Code is on it
2. **Fix 11** (OG social sharing) -- first impression for every shared link
3. **Fix 12** (profile edit button) -- core UX broken
4. **Fix 1** (pass width to cdnImg) -- biggest single performance win
5. **Fix 2** (lazy-load hover images) -- halves initial image bandwidth
6. **Fix 4** (server-side proxy cache) -- prevents re-processing
7. **Fix 6** (card transparency) -- text readability
8. **Fix 7** (community 404 for logged-out) -- access for new visitors
9. **Fix 13** (nav avatar image) -- polish
10. **Fix 3** (width for quick-action cards) -- more perf gains
11. **Fix 5** (use OptimizedImage) -- proper responsive images
12. **Fix 8** (duplicate requests) -- bandwidth waste
13. **Fix 9** (pre-generate thumbnails) -- ultimate perf solution

---

## Handoff Breakdown -- Who Does What

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 10 | Verify CI passes after Claude Code fix push | Need to check GitHub Actions | GitHub Actions tab |
| 11 | Re-scrape OG after deploy | Browser action | Paste URL into Facebook Sharing Debugger |
| 11 | Test WhatsApp link preview | Phone required | Share regencivics.earth link in a chat |
| ALL | git push after Claude Code commits | Git push requires your machine | `git add -A && git commit -m "msg" && git push` |
| ALL | Verify visual fixes on mobile after deploy | Browser testing on your phone | regencivics.earth on mobile |

### CLAUDE CODE -- can do without you

| # | Task | Status |
|---|------|--------|
| 1 | Pass width to cdnImg() in Home.tsx pathCards | CODED BY CLAUDE CODE |
| 2 | Lazy-load activated images in PathCardImage | CODED BY CLAUDE CODE |
| 3 | Add width to quick-action card images | CODED BY CLAUDE CODE |
| 4 | Add LRU/Redis cache to image proxy | CODED BY CLAUDE CODE |
| 5 | Refactor PathCardImage to use OptimizedImage patterns | CODED BY CLAUDE CODE |
| 6 | Increase card background opacity in HowItWorks | CODED BY CLAUDE CODE |
| 7 | Make community page accessible to logged-out users | CODED BY CLAUDE CODE |
| 8 | Deduplicate image requests | CODED BY CLAUDE CODE |
| 9 | Pre-generate thumbnail script | CODED BY CLAUDE CODE |
| 10 | Fix 10 TypeScript errors | IN PROGRESS |
| 11 | Fix OG meta tags + update copy | CODED BY CLAUDE CODE |
| 12 | Fix profile edit button onClick | CODED BY CLAUDE CODE |
| 13 | Show avatar image in nav | CODED BY CLAUDE CODE |

### WAITING ON YOU before Claude Code can proceed

- Fix 10 is in progress. Once CI passes, remaining fixes can be built on top.
- Fix 11 needs a re-scrape after deploy (Facebook Debugger + WhatsApp re-share).
- All other fixes can be batched into a single commit.
