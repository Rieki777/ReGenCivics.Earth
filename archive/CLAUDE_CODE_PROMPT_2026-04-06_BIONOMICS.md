# Claude Code Prompt — Bionomics Page Finishing Tasks (2026-04-06)

The Bionomics page has been built and wired in. This prompt covers everything Cowork could not finish: DB seeding for the forum, image generation, browser end-to-end testing, and a polish pass.

## What is already done (do not redo)

- `client/src/pages/Bionomics.tsx` is built (16 sections, all accordions, inline SVGs for the bridge yin/yang, the three legs triangle, and the p2p food economy ring). Hero uses `/blog-hero-bridging-worlds.webp`.
- `client/src/App.tsx` adds `const Bionomics = lazy(() => import("./pages/Bionomics"))`, the `/bionomics` route, and `<Redirect to="/bionomics" />` for both `/economy` and `/local-food-economy`. The chrome-bypass also excludes `/bionomics`.
- `client/src/components/Navigation.tsx` desktop dropdown and mobile menu both have a "The Two Sides of the Bridge" label with a yin/yang glyph followed by Tokenomics (the Fund) and Bionomics (the Game). Game Mechanics is in both.
- `client/src/components/SiteFooter.tsx` has Bionomics added to the Game column. Local Food Economy now points to `/bionomics#local-food-economies`.
- `client/src/components/GameHookBanner.tsx` has a `bionomics` variant and now links to `/bionomics`.
- `client/src/pages/Tokenomics.tsx` $ReGen note links across the bridge to `/bionomics`.
- `client/src/pages/GameMechanics.tsx` has the full Citizenship Tiers section near the top (after the hero, before Live Variables).

All edited files pass an esbuild syntax check.

## Task 1 — Forum: add Bioregions category under Earth

Voice rule: zero em-dashes, no contrast framing, no AI-isms.

1. In the forum schema, add a new category `Bioregions` nested under the existing `Earth` parent category. Slug: `bioregions`. Description: "Where bioregions organising for regeneration meet, share, and find each other."
2. Write a migration in `drizzle/` following the existing numbering pattern. Use the migration runner: `npx tsx scripts/run-migration.ts <file>`.
3. Seed one stickied thread in the new category:
   - Title: `Bioregions Organising for Regeneration`
   - Author: ReGen Civics system account (whichever account the existing seed threads use)
   - Pinned: true
   - Body (use plain markdown, no em-dashes, no AI-isms):

     > This is the gathering thread for bioregions actively organising for regeneration.
     >
     > If you are part of a place-based effort that is healing land, weaving community, building local food economies, or experimenting with new financial and governance tooling, post here. Tell us where you are, who you are organising with, and what you are working on right now.
     >
     > We are a global network that supports bioregions in tooling. The point of this thread is connection. Find each other. Compare notes. Borrow what works. Share what hurts.
     >
     > One post per bioregion to start. Reply to others to start a conversation.

4. Make sure the new category appears in the forum navigation under Earth.
5. Verify by visiting `/community` in the browser after migration. The Bioregions category should be visible, and the seed thread should open cleanly.

## Task 2 — Section illustrations via nano-banana-pro

The Bionomics page uses inline SVG for the bridge glyph, the three legs triangle, and the p2p food economy ring. The hero image is the existing Bridging Worlds illustration. Generate three additional WebP illustrations using the `nano-banana-pro` skill to enrich the page.

Style guide for all three: enchanted forest realism, deep greens (#0d2818, #1a472a) and warm amber accents (#d4a574, #f0c040), painterly with hand-drawn texture, no text, 1536x1024, save as WebP to `client/public/`.

1. **`bionomics-12-attributes.webp`** — A circular mandala of twelve woven attributes: each attribute as a small symbolic element (river, seed, root, hand, leaf, fire, etc.) arranged in a clock face around a central tree. Earthy palette.

2. **`bionomics-three-legs.webp`** — A triangular composition: top node a small group of people in a circle (organising team), bottom-left node a stone hub building under a tree (the Hub), bottom-right node a glowing seed of light flanked by a coin and a leaf (the BFF). Mycelial threads connect the three nodes.

3. **`bionomics-regenerators.webp`** — A wide landscape: foreground hands cupping soil with sprouting seedlings, midground a regenerative farm with hedgerows and grazing animals, background bioregional valley with a stream and forest. A small bridge glyph (yin/yang) glows softly in the sky as a sun.

After generating, drop the references into Bionomics.tsx in the corresponding sections (12 attributes, three legs, regenerators) as `<img>` tags above the existing inline SVG/cards. Use `loading="lazy"`.

## Task 3 — Browser end-to-end test

Use the `webapp-testing` skill (Playwright) and run the dev server.

Verify:

1. `GET /bionomics` renders. Hero image loads. No console errors.
2. `GET /economy` redirects to `/bionomics`.
3. `GET /local-food-economy` redirects to `/bionomics#local-food-economies` and the page scrolls to that section.
4. All accordions open and close on click. Test at least three: 12 BFF Attributes, the Timeline, and Local Food Economies.
5. The yin/yang glyph in the desktop nav and mobile nav appears, sits next to the "The Two Sides of the Bridge" label, and the Tokenomics + Bionomics links navigate correctly.
6. SiteFooter Bionomics link works from any page.
7. Tokenomics page $ReGen note shows the new wording and the inline link to /bionomics works.
8. GameMechanics page shows the Citizenship Tiers section near the top.
9. Mobile breakpoints: 360px, 414px, 768px. Check the hero, the bridge panels, the BFF type quadrant, and the timeline. Capture a screenshot of each on mobile and desktop and save under `screenshots/bionomics-2026-04-06/`.
10. Lighthouse pass on `/bionomics` (desktop). Aim for >85 on Performance, >95 on Accessibility, >95 on Best Practices, >90 on SEO. Report scores. If LCP is bad, add `fetchpriority="high"` to the hero image.

## Task 4 — Polish pass (voice and copy)

Re-read every section copy in `client/src/pages/Bionomics.tsx`. Ensure:

- Zero em-dashes (search for the literal `—` character).
- Zero contrast framing (`not X, but Y` / `less X, more Y` / `this isn't X, it's Y`).
- Zero banned AI words: `delve`, `tapestry`, `foster`, `leverage`, `it's worth noting`, `embark on`, `vibrant`, `crucial`, `groundbreaking`, `transformative journey`, `testament to`, `beacon of`, `unlock`, `unleash`, `seamless`, `robust`, `comprehensive`, `cutting-edge`, `empower`, `utilize`, `nurture` (as metaphor), `navigate` (as metaphor).
- "Dominant economy" or "current economy", never "old economy" or "old games".
- The phrase "The Index Fund for the Regenerative Renaissance" appears in the Index Fund section.
- Winter season copy explicitly says winter is for regenerating and redesigning systems for a new spring, and that each full season cycle the Game is renewed.
- Right Relationship section does NOT name any specific bioregion. It only says we are open to connect with bioregions actively organising.

If any of these fail, fix in place.

## Task 5 — Verify the build

```bash
npm run check
npm run build
```

Both must pass before reporting done. If `npm run check` fails because of an unrelated pre-existing TS error in another file, note it but do not block on it.

## Task 6 — Commit

Commit message:

```
feat(bionomics): add Bionomics page, redirect /economy + /local-food-economy, pair with Tokenomics in nav

- New /bionomics page (16 sections, BFF framework, 4 BFF types, 12 attributes, three legs, p2p food economy, timeline)
- Redirects from /economy and /local-food-economy
- Navigation: "The Two Sides of the Bridge" pairing with yin/yang glyph
- SiteFooter: Bionomics link added
- GameMechanics: Citizenship Tiers section inserted near top
- Tokenomics: $ReGen note now links to Bionomics
- GameHookBanner: bionomics variant + updated CTA target
```

Do not push without Rye's say-so.

## Notes

- The Bionomics page is fully self-contained. Do not split it into multiple component files unless a section grows past ~300 lines.
- The page intentionally loads lots of accordions because the spec called for "ample collapsible accordions". Keep them collapsed by default.
- The p2p food economy SVG is inline. If Task 2 generates a more beautiful raster version, swap it in but keep the SVG as fallback for when the image fails to load.
