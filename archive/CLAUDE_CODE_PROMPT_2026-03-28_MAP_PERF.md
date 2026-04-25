# Claude Code Session: Map Performance + Dissolve Transitions + Quest Hero Images

**Date:** 2026-03-28
**Project:** regen-civics-clean

**Read `CLAUDE.md` before writing any user-facing copy.** Writing rules are non-negotiable: zero em-dashes, no AI-isms, no contrast-framing, no rhetorical questions, no passive inspiration.

**Read `PROGRESS_MAP_DESIGN.md` for the full map spec.** This prompt covers performance optimization and a new page transition system.

**Read `QUEST_PROGRESSION_SPEC.md` for the quest locking system.** The hero images generated here are used by the HeroQuestCard component defined in that spec.

---

## What You're Building

3 things. Work through them in order. Run `pnpm build` after each part.

---

### Part 1: Generate Quest Hero Images

Generate 2 background images for the quest cards using the nano-banana-pro skill (Gemini 3 Pro Image API, model `nano-banana-pro-preview`). These are used as background images on the Fire and Food Foresting quest cards (see QUEST_PROGRESSION_SPEC.md, HeroQuestCard component).

**IMPORTANT:** After generating each image as PNG, convert it to optimized WebP (quality=85, method=6) using Pillow. Delete the PNG after conversion. This is mandatory.

**Image 1: Fire Quest Hero**

- **Filename:** `client/public/images/quests/quest-fire-hero.webp`
- **Prompt:** "A sacred bonfire ceremony at twilight in a forest clearing. Warm amber and orange flames rising from a stone circle, casting golden light on surrounding ancient trees. Sparks drifting upward into a deep violet sky. The fire feels like transformation and release, old stories burning away. Studio Ghibli art style meets treasure map illustration, rich painterly textures, warm earth tones with deep amber highlights. No text, no people, just the fire and the forest."
- **Resolution:** 2K

**Image 2: Food Foresting Quest Hero**

- **Filename:** `client/public/images/quests/quest-food-foresting-hero.webp`
- **Prompt:** "A lush food forest in full abundance. Fruit trees heavy with ripe fruit, berry bushes, herbs growing wild between paths, dappled sunlight filtering through a living canopy. A winding path disappears into the green. Ferns, mushrooms, and wildflowers at the base of the trees. The feeling is paradise found, nature providing everything. Studio Ghibli art style meets treasure map illustration, rich painterly textures, emerald greens with golden sunlight accents. No text, no people, just the forest garden in its fullness."
- **Resolution:** 2K

**Verify both WebPs exist and are under 500KB each.**

**Run `pnpm build`.**

---

### Part 2: Optimize Map Image Loading

The progress map at `/play` (regencivics.earth/play) uses 7 large WebP illustrations as background layers. They currently load slowly and the map feels sluggish to pan and interact with.

**2a. Responsive image sizes**

The 7 map WebPs in `client/public/map/` are all ~1400px wide at 300-375KB each. Create smaller variants for different viewport sizes:

```bash
# For each of the 7 map WebPs, create 3 sizes:
# -sm.webp  (640px wide, quality 80)  -- mobile
# -md.webp  (1024px wide, quality 85) -- tablet
# -lg.webp  (1408px wide, quality 85) -- desktop (original size, just copy)
```

Use sharp, Pillow, or any image processing tool available. Put all variants in `client/public/map/`.

Naming convention:
```
progress-map-full-sm.webp
progress-map-full-md.webp
progress-map-full-lg.webp
zone-earth-land-sm.webp
zone-earth-land-md.webp
zone-earth-land-lg.webp
... etc for all 7
```

**2b. Update mapAssets.ts with responsive srcSets**

Update `client/src/components/ProgressMap/mapAssets.ts` to export responsive variants:

```typescript
export const MAP_ASSETS = {
  hero: {
    sm: "/map/progress-map-full-sm.webp",
    md: "/map/progress-map-full-md.webp",
    lg: "/map/progress-map-full-lg.webp",
  },
  earth: {
    sm: "/map/zone-earth-land-sm.webp",
    md: "/map/zone-earth-land-md.webp",
    lg: "/map/zone-earth-land-lg.webp",
  },
  // ... all 7
} as const;

// Helper to get the right size
export function getMapSrc(asset: { sm: string; md: string; lg: string }): string {
  if (typeof window === "undefined") return asset.lg;
  const w = window.innerWidth;
  if (w < 768) return asset.sm;
  if (w < 1280) return asset.md;
  return asset.lg;
}
```

If `cdnImg()` is used, wrap the paths with it.

**2c. Preload the hero map and lazy-load zone images**

The hero map (`progress-map-full`) should preload since it's the first thing visible:

```html
<link rel="preload" href="/map/progress-map-full-md.webp" as="image" type="image/webp" media="(min-width: 768px)" />
<link rel="preload" href="/map/progress-map-full-sm.webp" as="image" type="image/webp" media="(max-width: 767px)" />
```

Zone detail images should lazy-load only when the user interacts with that zone (hover, click, or scroll into view). Use `loading="lazy"` on `<img>` tags or load them on demand via state.

**2d. GPU-accelerated panning**

If the map is pannable (touch/drag), ensure the map container uses GPU compositing:

```css
.map-container {
  will-change: transform;
  transform: translateZ(0); /* Force GPU layer */
  contain: layout style paint; /* CSS containment */
}
```

Add `image-rendering: auto` (not `crisp-edges`) for smooth scaling during pinch-zoom.

**Run `pnpm build`.**

---

### Part 3: "Go There" Dissolve Transition

When a player clicks "Go there" on a map node, the destination page should preload in the background while the map stays visible. Once loaded, the map dissolves into the destination page. The player never sees a loading screen or blank white flash.

**3a. Create a MapTransition component**

```typescript
// client/src/components/ProgressMap/MapTransition.tsx

interface MapTransitionProps {
  targetPath: string;        // e.g., "/quest", "/land", "/ally"
  onTransitionStart?: () => void;
  children: React.ReactNode; // The "Go there" button content
}
```

When the user clicks:

1. **Prevent default navigation.** Don't use `navigate()` or `<Link>` directly.
2. **Start preloading the target route.** Since routes use `React.lazy()`, trigger the dynamic import so the chunk downloads:
   ```typescript
   // Preload the route's chunk
   const preloadRoute = (path: string) => {
     // Map paths to their lazy imports (these are already defined in App.tsx)
     const routeMap: Record<string, () => Promise<any>> = {
       "/quest": () => import("@/pages/Quest"),
       "/land": () => import("@/pages/Land"),
       "/ally": () => import("@/pages/Ally"),
       "/play": () => import("@/pages/ReGenGames"),
       "/opportunity": () => import("@/pages/Opportunity"),
       "/investor": () => import("@/pages/InvestorInfo"),
       "/community": () => import("@/pages/Community"),
       "/schedule": () => import("@/pages/Schedule"),
       "/profile": () => import("@/pages/PlayerProfile"),
     };
     return routeMap[path]?.();
   };
   ```
3. **Show a subtle loading indicator on the map node** (a small spinner or pulse on the "Go there" button) while the chunk loads.
4. **Once the chunk is loaded, start the dissolve:**
   - The map container fades out over 600ms (`opacity: 1 -> 0`, ease-out)
   - Simultaneously, trigger the actual `navigate(targetPath)` at the 300ms mark (midway through the fade) so the new page starts rendering behind the dissolving map
   - The map overlay is removed from DOM after the transition completes

**3b. CSS for the dissolve**

```css
.map-dissolve-out {
  animation: mapDissolve 600ms ease-out forwards;
  pointer-events: none; /* Prevent clicks during transition */
}

@keyframes mapDissolve {
  0% {
    opacity: 1;
    filter: blur(0px);
  }
  50% {
    opacity: 0.6;
    filter: blur(2px);
  }
  100% {
    opacity: 0;
    filter: blur(8px);
  }
}
```

The blur adds a dreamy quality to the dissolve. The map doesn't just fade, it gently blurs away like waking from a vision.

**3c. Wire into the existing map node click handler**

In the ProgressMap component, the node detail popup currently has a "Go there" button that navigates directly. Replace that with the MapTransition component:

```tsx
// Before (direct navigation)
<button onClick={() => navigate(node.targetPath)}>
  Go there >
</button>

// After (dissolve transition)
<MapTransition targetPath={node.targetPath}>
  Go there >
</MapTransition>
```

**3d. Handle the map being a full-screen overlay vs a route**

If the map is rendered as a full-screen overlay (modal), the dissolve works by:
1. Starting the dissolve animation on the overlay
2. Navigating to the target route at the midpoint
3. Removing the overlay from DOM after animation ends

If the map is a route (`/play`), the dissolve works by:
1. Rendering a portal overlay that captures the current map visual
2. Starting the dissolve on the portal
3. Navigating to the target route
4. The portal sits on top of the new page and dissolves away

Check how the map is currently rendered and use the appropriate approach.

**3e. Fallback for slow connections**

If the route chunk hasn't loaded after 2 seconds, navigate anyway (hard cut). Don't leave the user staring at a spinner forever.

```typescript
const PRELOAD_TIMEOUT = 2000;
const preloadPromise = preloadRoute(targetPath);
const timeoutPromise = new Promise(resolve => setTimeout(resolve, PRELOAD_TIMEOUT));
await Promise.race([preloadPromise, timeoutPromise]);
// Proceed with dissolve regardless
```

**Run `pnpm build`.**

---

## What NOT To Do

- Do NOT change the map illustration files themselves. Only create responsive size variants.
- Do NOT modify the map's SVG node/path logic. This is only about performance and transitions.
- Do NOT add any backend code. This is entirely frontend.
- Do NOT use heavy animation libraries (Framer Motion is fine if already imported, but prefer CSS animations for the dissolve).
- Do NOT remove the existing direct navigation as a fallback. If MapTransition fails for any reason, a normal `navigate()` should still work.

---

## Done Criteria

- [ ] `pnpm build` passes with zero errors
- [ ] `quest-fire-hero.webp` exists in `client/public/images/quests/`, under 500KB
- [ ] `quest-food-foresting-hero.webp` exists in `client/public/images/quests/`, under 500KB
- [ ] All 7 map images have -sm, -md, -lg variants in `client/public/map/` (21 files total)
- [ ] `mapAssets.ts` exports responsive srcSets with `getMapSrc()` helper
- [ ] Hero map preloads via `<link rel="preload">`
- [ ] Zone images lazy-load on interaction
- [ ] Map container uses GPU-accelerated compositing (`will-change`, `translateZ`, `contain`)
- [ ] "Go there" button triggers dissolve transition instead of hard navigation
- [ ] Route chunk preloads in background when "Go there" is clicked
- [ ] Dissolve animation: 600ms fade + blur, navigation at 300ms midpoint
- [ ] Fallback: hard navigate after 2s if chunk hasn't loaded
- [ ] Zero em-dashes in any user-facing copy

---

## Handoff Breakdown

### Rye: things only you can do

| # | Task | Why |
|---|------|-----|
| 1 | `git push` after Claude Code finishes | Git credentials |
| 2 | Visual QA on dissolve transition feel | Taste call on timing/blur |
| 3 | Confirm quest hero images look good | Art direction |

### Claude Code: can do without you

| # | Task | Status |
|---|------|--------|
| 1 | Generate Fire quest hero image (nano-banana-pro) | READY |
| 2 | Generate Food Foresting quest hero image | READY |
| 3 | Convert both to optimized WebP | READY |
| 4 | Create responsive map image variants (21 files) | READY |
| 5 | Update mapAssets.ts with responsive srcSets | READY |
| 6 | Add preload links for hero map | READY |
| 7 | Add lazy loading for zone images | READY |
| 8 | Add GPU compositing to map container | READY |
| 9 | Create MapTransition component | READY |
| 10 | Wire dissolve into map node "Go there" buttons | READY |
| 11 | Add preload timeout fallback | READY |

Nothing is blocked. Everything can run now.
