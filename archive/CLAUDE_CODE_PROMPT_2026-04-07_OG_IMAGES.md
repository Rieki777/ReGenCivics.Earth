# Claude Code Prompt: OG Images (Launch Blocker)

**Priority: LAUNCH BLOCKER — must ship before Earth Day (Apr 22)**

Read `SOCIAL_SHARING_SPEC.md` in full before starting. Then read `CTO_VISUAL_AUDIT_2026-04-07.md` sections LB-2 and LB-3. Then execute this prompt.

---

## What you are doing

Generating 7 missing per-route OG images so every shared link on regencivics.earth shows a unique, on-brand preview card instead of the generic Ghibli village fallback. Then fixing the Tokenomics duplicate section (a two-line rename, no content decision required from Rye).

---

## Track A: Generate the 7 missing OG images

Use the `nano-banana-pro` skill to generate each image. Generate them one at a time (the skill is sequential). Each image must be:
- Exactly 1200x630px
- Saved as `.jpg` in `client/public/og/`
- Ghibli-style illustration matching the site's visual tone
- Main content within the center 800x400 safe zone

**The 7 images and their prompts:**

| File | Route | Prompt |
|------|-------|--------|
| `bionomics.jpg` | /bionomics | A living economy drawn as an ecosystem: mycelial networks underground connecting roots of diverse food trees. Above ground, a thriving bioregional village market. Warm afternoon light. People, birds, and bees all participating. Ghibli style, lush and grounded. |
| `land.jpg` | /land | Aerial view of a regenerative land project: food forests, earthen buildings, solar panels, ponds, pathways. Real land, not abstract. A mix of cultivated abundance and wild nature. Warm golden hour. Ghibli style. |
| `quests.jpg` | /quests | A quest board inside a treehouse tavern. Scrolls pinned to corkboard, glowing markers, a diverse group of adventurers planning their next move. Maps on the wall. Warm lamplight. Ghibli style, cozy and adventurous. |
| `forum.jpg` | /community | A village commons at dusk. Groups of people in conversation around fire pits and under lanterns. Notice boards with paper notes. A sense of living, ongoing community. Ghibli style, warm and intimate. |
| `tools.jpg` | /tools | A craftsperson's workshop filled with living tools: glowing instruments, books that breathe, devices that grow. A regenerative technology library. Warm, organized, slightly magical. Ghibli style. |
| `hymn-book.jpg` | /hymn-book | A circle of singers in a forest clearing, music visually flowing from their voices as light and leaves. A book of songs open on a mossy stone. Diverse voices, communal joy. Ghibli style, magical realism. |
| `features.jpg` | /features | A seedling idea sprouting from a community suggestion box, growing into a full tree. People gathered around it pointing and contributing. The living process of collective design. Ghibli style. |

**After generating each image:**
1. Confirm it is 1200x630 (resize/crop if not using ImageMagick or Pillow)
2. Save as `.jpg` to `client/public/og/[name].jpg`
3. Do NOT overwrite any existing file — check first with `ls client/public/og/`

**Existing files to leave alone:**
`community.webp`, `connect.webp`, `crowd-pooling.webp`, `fund.webp`, `map.webp`, `og-default.jpg`

---

## Track B: Wire the OG image paths into the SSR meta layer

After all 7 images are generated, open `server/vite.ts` (or wherever `ROUTE_META` lives — grep for `og-default` to find it).

For each of the 7 routes, update the `ogImage` (or equivalent) field to point to the new local file:

```
/bionomics   → /og/bionomics.jpg
/land        → /og/land.jpg
/quest       → /og/quests.jpg   (confirm the route key)
/community   → /og/forum.jpg
/tools       → /og/tools.jpg
/hymn-book   → /og/hymn-book.jpg
/features    → /og/features.jpg
```

Also check `client/src/components/SEO.tsx` for a `pageSEO` map and update those entries too if they exist.

---

## Track C: Fix Tokenomics duplicate "How Returns Flow" heading (2 min)

**No content decision needed from Rye — this is a cosmetic rename.**

Open `client/src/pages/Tokenomics.tsx`. Find the `ReturnsFlowDiagram` function (around line 669). Inside it there is an `<h4>` with the text `How Returns Flow` (around line 686). This same text also appears as the `<h2>` of the section that renders `<ReturnsFlowDiagram />` (around line 999), so users see the phrase twice on screen back-to-back.

Rename the `<h4>` inside `ReturnsFlowDiagram` from `How Returns Flow` to `Distribution Breakdown`.

That's the entire fix. One string change, one line.

**Also check for the "How to Acquire" duplicate:**
Search `Tokenomics.tsx` for all occurrences of `How to Acquire`. The CTO audit flagged a second static version. If you find more than one section with that heading, delete the shorter/less-polished one and keep the version that uses `<AcquisitionRoutes />`. If only one occurrence exists, it was already cleaned up — leave it alone.

---

## Verification

After all three tracks:

1. `npm run build` — must complete with zero TS errors.
2. In a browser with DevTools open, visit `/bionomics`, `/land`, `/quest`, `/community`, `/tools`, `/hymn-book`, `/features`. In the `<head>`, confirm `og:image` points to the new local file (not `og-default.jpg`).
3. Visit `/tokenomics`. Confirm "How Returns Flow" appears only once as a heading on the page.
4. Paste `https://regencivics.earth/bionomics` into [https://cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) and confirm a unique image shows (do this after deploy).

---

## Commit

One commit per track. Suggested messages:

```
feat(og): generate 7 missing per-route OG images

Images for /bionomics, /land, /quest, /community, /tools,
/hymn-book, and /features. All 1200x630 JPG, served from
client/public/og/. Wired into ROUTE_META and SEO.tsx.
```

```
fix(tokenomics): remove duplicate "How Returns Flow" heading

h4 inside ReturnsFlowDiagram renamed to "Distribution Breakdown"
so the phrase no longer appears twice on the same page.
```
