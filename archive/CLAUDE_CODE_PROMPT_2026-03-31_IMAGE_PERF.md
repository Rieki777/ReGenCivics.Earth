# Claude Code Execution Prompt — Image Performance + UX Fixes

Read `CLAUDE.md` and `FIXES_TO_MAKE_2026-03-31_IMAGES.md` before starting.

This batch fixes the single biggest performance problem on the site: homepage images are 2048x2048px PNGs displayed at 168px, all loaded eagerly through a server-side proxy with no caching. Execute fixes 1-9 in order. Fix 10 (CI TypeScript errors) should already be done from the previous session. If it's not, do Fix 10 first.

---

## Fix 1: Pass width to cdnImg() for path card images

**File:** `client/src/pages/Home.tsx` (lines 66-118, the pathCards array)

Every `cdnImg(url)` call in the pathCards array is missing the width parameter. The proxy fetches full 2048x2048 and resizes server-side on every request.

Change all 8 calls (4 default + 4 activated images) to: `cdnImg(url, 480, 75)`

480px covers 237px display at 2x retina. Quality 75 is plenty for card thumbnails.

Also update `client/src/components/ImagePreloader.tsx` to use the same `cdnImg(url, 480, 75)` URLs so the preloader and the actual render hit the same cached URL.

## Fix 2: Lazy-load activated (hover) path card images

**File:** `client/src/components/PathCardImage.tsx`

Currently both the default and activated `<img>` tags have `loading="eager"`. The activated image is invisible until hover, so it wastes bandwidth on initial load.

Changes:
- Default image: keep `loading="eager"`, add `fetchpriority="high"`
- Activated image: change to `loading="lazy"`, add `fetchpriority="low"`

## Fix 3: Pass width to "Pick Up Where You Left Off" card images

**File:** `client/src/pages/Home.tsx`

Find the section that renders the quick-action cards (Journey Quests, Back to the Forum, Seasonal Accelerator, Book a Discovery Call). These images are 900x491 displayed at ~167x80. Pass `cdnImg(url, 340)` for these (167px * 2x retina).

## Fix 4: Add server-side LRU cache to image proxy

**File:** `server/routes/global.ts` (the `/api/img` handler, around line 149+)

Every request re-fetches from R2 and re-processes with sharp. Add an in-memory LRU cache:

```typescript
import { LRUCache } from 'lru-cache';

const imageCache = new LRUCache<string, Buffer>({
  max: 200,           // max 200 entries
  maxSize: 200_000_000, // 200MB max
  sizeCalculation: (value) => value.length,
  ttl: 1000 * 60 * 60 * 24, // 24 hour TTL
});
```

Cache key: `${url}-${w}-${h}-${q}-${acceptsWebp}`. Check cache before sharp processing. Store result after processing. If lru-cache isn't installed, install it (`npm install lru-cache`).

## Fix 5: Use OptimizedImage patterns in PathCardImage

**File:** `client/src/components/PathCardImage.tsx`

The codebase already has `client/src/components/OptimizedImage.tsx` with IntersectionObserver, srcset, sizes, and fade-in. Adopt these patterns into PathCardImage:

- Add `srcSet` with multiple widths on the default image: generate URLs for 240w, 480w, 720w using cdnImg
- Add `sizes="(max-width: 768px) 168px, 237px"` attribute
- Add `decoding="async"` (may already be there)
- Keep the cross-fade hover behavior intact

## Fix 6: Increase card background opacity on "Start Your Journey" section

**File:** `client/src/components/HowItWorks.tsx` or the landing page component that renders the "Play Quests", "Join the Network", "Invest or Partner" cards with the parallax village/garden background.

The card backgrounds are too transparent on mobile. Text is hard to read against the busy background image.

Find the card background styles (likely a semi-transparent dark green). Change to:
- Background: `rgba(0, 40, 0, 0.88)` or similar (was likely ~0.5-0.6)
- Add `backdrop-filter: blur(6px)` and `-webkit-backdrop-filter: blur(6px)` for extra separation
- Verify all card text passes WCAG AA contrast (4.5:1 minimum)

If the component doesn't have image backgrounds, check the parent landing page section. The screenshots show a painted village/garden illustration behind 3 stacked cards. It's the section with "START YOUR JOURNEY" as the header.

## Fix 7: Make community page accessible to logged-out users

When a user is not logged in and navigates to /community, they get the "ponder the TAO" 404 page. The community forum should be publicly readable.

Check:
1. The route definition in `client/src/App.tsx` for `/community` -- does it require auth?
2. The tRPC procedures that load forum data -- are they `protectedProcedure` when they should be `publicProcedure`?
3. Does the community page component crash when there's no user session?

Fix: Make the forum listing and thread reading publicly accessible. Show a "Sign in to participate" prompt for write actions (post, reply, react). The forum should be a public showcase of community activity to attract new members.

## Fix 8: Deduplicate image requests

Network audit showed the same images requested 3-4 times each (YPVdYWGRrdEquJbO.webp loaded 4 times).

Check:
1. Does `ImagePreloader.tsx` use the exact same URL strings (with same query params) as the actual `<img>` tags? If the preloader uses `cdnImg(url)` but the render uses `cdnImg(url, 480, 75)`, they'll be different URLs.
2. Are React re-renders causing img src to change (new object reference each render)? Memoize the URL strings.
3. After fixing Fix 1, make sure ImagePreloader URLs match exactly.

## Fix 9: Write a thumbnail pre-generation script

**New file:** `scripts/generate-thumbnails.mjs`

Create a script that:
1. Takes a list of R2 image URLs (the path card images, quest thumbnails, etc.)
2. For each, generates resized WebP variants at 240px, 480px, 720px wide
3. Uploads them back to R2 with naming: `{original-hash}-{width}w.webp`
4. Outputs the new URLs so cdnImg() can be updated to point directly to pre-sized variants

This is a one-time optimization script. Don't integrate it into the build pipeline yet, just write it so Rye can run it manually.

## Fix 11: OG social sharing image not showing + update copy

The homepage OG image exists at `client/public/og-default.jpg` (the forest village waterfall scene). The meta tag in `index.html` points to `https://regencivics.earth/og-default.jpg`. But social previews on WhatsApp show no image.

1. Check the server-side meta tag injection in `server/_core/vite.ts` (line 170+). The `.replace()` chain that injects og:image may be malforming the tag, double-encoding the URL, or stripping it. Debug this carefully. Curl the deployed URL and verify the og:image tag is present and correct in the raw HTML.

2. Update the OG description copy in BOTH locations:
   - `client/index.html` line 61: change og:description to: `"ReGen Civics is a fund for regenerative land projects, who also runs quests and games for real-world regeneration."`
   - `server/_core/vite.ts` line 100: change the DEFAULT_META description to match: `"ReGen Civics is a fund for regenerative land projects, who also runs quests and games for real-world regeneration."`
   - `client/index.html` line 73: update twitter:description to match
   - `client/index.html` line 60: sync og:title with vite.ts line 99

3. Make sure the og:image URL is absolute (`https://regencivics.earth/og-default.jpg`) and not relative

## Fix 12: Profile edit button not working

**File:** `client/src/pages/PlayerProfile.tsx`

The green pencil/edit icon on the profile overview section does nothing when clicked. Find the edit button near the user's name/avatar area. It should switch to the Settings tab where `ProfileEditForm` lives.

Wire its onClick to: `setActiveTab('settings')` (or whatever the state setter is for the tab system). If the button already has an onClick, debug why it's not firing. Check for `e.stopPropagation()`, missing event binding, or a z-index issue where something is covering the button.

## Fix 13: Show user avatar image in top-right nav

**File:** `client/src/components/Navigation.tsx`

The nav shows a green circle with the user's initial letter. When a user has a profile image, show it instead.

Desktop avatar (~line 470) and mobile avatar (~line 979):
1. Check if `user.avatarUrl` (or the equivalent field from the auth/user hook) exists and is non-empty
2. If yes: render `<img src={cdnImg(user.avatarUrl, 64)} alt={user.name} className="w-8 h-8 rounded-full object-cover" />` (same dimensions as the letter circle)
3. If no: keep the existing initial letter
4. Add an `onError` handler that hides the image and falls back to the letter (in case the image URL is broken)

---

## After all fixes

1. Run `npm run build` and fix any TypeScript errors
2. Run `npm run lint` and fix any lint issues
3. Verify the homepage loads with the browser devtools Network tab open. Confirm:
   - Path card images are now requested at 480px width (check URL params)
   - Only 4 images load eagerly (not 8)
   - No duplicate image requests
   - Total image payload is under 500KB for initial load
4. Commit with a clear message
