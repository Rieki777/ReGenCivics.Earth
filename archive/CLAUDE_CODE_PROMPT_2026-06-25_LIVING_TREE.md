# Claude Code Prompt — 2026-06-25 Living Tree Visual Overhaul

Dramatically improve the Living Tree on player profiles. Rye approved the direction: a hybrid of AI-painted base art and a live data overlay, beauty first, while the tree still tells a meaningful story from each player's data.

**Style is locked (Rye, 2026-06-25): the bioluminescent direction.** The production style anchor is `tree-final-B1-clean-vignette.png` (repo root), with `tree-final-B2-fuller-canopy.png` as an approved alternate. The look: a tree glowing like living light at night, a luminous pale-cyan and gold blossom canopy above ground, and below a clear soil line exactly nine separate glowing root arteries in distinct jewel tones, interlaced with a white-gold mycelium web, on a near-black background with a soft dark-green vignette and generous margin for UI. Earlier exploration files (`tree-concept-example.png`, `tree-concept-option-A/B/C-*.png`) are kept for reference only; match the B1 anchor across the set.

This style was chosen partly because it makes the live overlay native: the roots already read as glowing light, so brightening and lengthening a capital's root from real data sits naturally on top of the base plate.

Read first: `LIVING_TREE_VISUALIZATION_SPEC.md` (the approved concept and the visual-to-data mapping), the current implementation `client/src/components/LivingTree.tsx` (procedural SVG today), and `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` (solarpunk style direction and image-gen conventions).

## The architecture (hybrid, beauty first, still data-true)

Two layers composed on top of each other:

1. **Base plate (AI raster art).** A painterly canopy + trunk + soil/mist scene per life stage and seasonal palette. This carries the beauty. It includes a soft painterly root underlay for richness but no hard data meaning.
2. **Live overlay (SVG/canvas, drawn from real data).** Rendered on top of the base plate, anchored to fixed positions. This carries the story:
   - Nine glowing root arteries, one per form of capital. Each artery's length, branch density, and glow intensity is driven by that capital's score. A player heavy in Social and Cultural has two long bright roots and seven quieter ones.
   - Flowers: count maps to current-season contribution actions; color follows the seasonal palette.
   - Fruit: size maps to depth of high-impact contributions, count to total volume, type to dominant capital.
   - Mycelium links: at Ancient stage, glowing filaments connect outward to nearby players' trees.

This is the resolution to "100 versions." The variety players see is generated at runtime by their data on the overlay, not by hundreds of static files. The base art set stays small and curated; the living feel comes from the overlay.

Runtime is fully deterministic: pick the base plate by `(stage, season)`, draw the overlay from `CapitalScores`. No model call at runtime. The only place a model runs is the one-time asset generation below, so this respects the deterministic-first rule.

## Base art set to generate (curated, not 100 bespoke files)

- Six life stages from the spec: Seedling, Sapling, Young Tree, Flowering Tree, Fruiting Tree, Ancient Tree.
- Four seasonal palettes each: Spring, Summer, Autumn, Winter.
- That is 24 base plates. Generate at 2K, 3:4 portrait, with empty margin around the subject for the overlay and UI.
- One Ancient-stage mycelium-connection variant set for inter-player links (a few edge pieces or a single rich network the overlay modulates).

If Rye wants a true growth animation later, the same pipeline can produce an interpolated frame sequence between stages. Start with the 24 plates; expand only if needed.

### Keep the tree identity consistent across stages

Generate the set as the same tree maturing, not 24 unrelated trees. Use `tree-final-B1-clean-vignette.png` as the style and identity anchor via image-to-image (`--input-image`) for each stage, holding the bioluminescent look, palette, and composition fixed and changing only maturity and season. The locked prompt template:

> Style: dark bioluminescent fantasy concept art for a dark interface. A single magical tree at night glowing softly like living light. Above ground: [STAGE canopy description], a gentle glow and a few drifting light particles, [SEASON palette applied to the blossoms]. Below a clear soil line: exactly nine separate glowing root arteries fanning symmetrically downward into near-black soil, each a distinct vivid jewel tone (violet, amber, copper, gold, leaf-green, coral, lavender, teal, rose), clearly countable and evenly spaced, interlaced by a fine web of glowing white-gold mycelium threads reaching to the edges. Centered, symmetrical, isolated subject, deep near-black background with a soft dark-green radial vignette, generous empty margin on all four edges for interface overlay. Luminous, sacred, hopeful, clean and uncluttered. No text, no labels, no watermark.

Seasonal palette tokens for the blossoms (the bioluminescent glow stays, the bloom hue shifts): Spring (pale cyan and soft pink light), Summer (warm gold and white light), Autumn (amber and rose light), Winter (cool crystalline blue-white light).

Stage canopy descriptions: Seedling (a small sprout, two or three leaves, single pale taproot); Sapling (thin trunk, 8-12 leaves, roots beginning to split into nine); Young Tree (full canopy, textured trunk, complex roots); Flowering Tree (broad canopy in soft blossom); Fruiting Tree (canopy bearing fruit); Ancient Tree (vast mossy landmark, birds, smaller plants in its shade, mycelium reaching to the edges).

### Asset pipeline

- Generation: the Nano Banana Pro flow. In this repo the working call reads `GEMINI_API_KEY` from `.env` and posts to `gemini-3-pro-image-preview:generateContent` with `responseModalities:["IMAGE"]` and `imageConfig.aspectRatio:"3:4"`. The example was produced exactly this way.
- Storage: upload the final plates to Cloudflare R2 (`assets.regencivics.earth`) and serve through the existing `/api/img` resize and cache proxy. Do not ship 2K PNGs raw to mobile; serve sized webp via the proxy.
- Naming: `living-tree/{stage}-{season}.png` (for example `living-tree/flowering-summer.png`).

## Runtime component

- Build `LivingTreeV2` (or upgrade `LivingTree.tsx`) that renders the base plate `<img>` plus an absolutely positioned SVG overlay sized to the same box.
- Drive it from the existing data: `CapitalScores`, `seasonsCompleted`, `totalContributionScore`, `currentSeasonActions` (already the props of the current `LivingTree`). Stage is derived from `seasonsCompleted` per the spec thresholds; season from the real-world date.
- Overlay anchors: define nine fixed root anchor points and growth vectors per stage so the live arteries align with the painted composition. Keep the painted roots faint so the live arteries read as the data layer on top.
- Preserve the Root Detail View: tapping the roots opens the radial nine-artery view with labels and scores (this already exists in concept in the spec and the current component). The overlay and the detail view read the same numbers.
- Animation: gentle growth and glow on mount; respect `prefers-reduced-motion` (the project already has `useReducedMotion`). No heavy loops.

## Mobile and performance

- Serve sized webp through `/api/img`; lazy-load below the fold; set explicit width and height to avoid layout shift.
- The overlay is light SVG; avoid `transition: all`. Test on a real iPhone Safari for paint cost and for the glow filters (Safari `feGaussianBlur` can be expensive; cap blur radius).
- Provide a static fallback (base plate only) if the overlay fails.

## Acceptance criteria

- The profile tree renders the AI base plate for the player's current stage and season, with the live overlay drawn from their real capital scores.
- Two players at the same stage with different capital shapes have visibly different root arteries, flower, and fruit readouts.
- The seasonal palette changes with the real-world season; the tree never resets.
- Root detail view opens and matches the overlay numbers.
- Mobile Safari renders smoothly with no layout shift and no runaway blur cost.

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | RESOLVED 2026-06-25: style locked to the bioluminescent direction, anchor `tree-final-B1-clean-vignette.png` | Aesthetic call | Done |
| 2 | Confirm the base set: 6 stages x 4 seasons = 24 plates, or a different scope | Scope/cost call | Reply in chat |
| 3 | Run or approve the batch image generation (uses your `GEMINI_API_KEY`) | Credential + cost | Local, or approve Claude Code to run it |
| 4 | Approve R2 upload of final plates | Asset hosting | R2 / Railway |
| 5 | Push and approve the Railway deploy | Deploy auth | Local + Railway |

### CLAUDE CODE — can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Build `LivingTreeV2`: base plate `<img>` + data-driven SVG overlay | READY |
| 2 | Derive stage/season; map nine arteries, flowers, fruit, mycelium to data | READY |
| 3 | Asset pipeline: generation script, R2 upload, `/api/img` serving, naming | READY |
| 4 | Generate the 24 base plates from the locked prompt template + anchor image | READY (run on approval, HUMAN #3) |
| 5 | Preserve Root Detail View; wire to the same scores | READY |
| 6 | Mobile Safari pass: sized webp, lazy load, capped blur, reduced-motion | READY |
| 7 | Ship Gate before VERIFIED (audit-truncation, className grep, typecheck) | required |

### WAITING ON YOU

- Base art generation (HUMAN #3) and R2 upload (HUMAN #4) gate the final visual, but Claude Code can build and test the whole component against the single example plate first, then swap in the full set.

## Writing and project rules

No em-dashes, capitalize Game as a noun, plain language. The tree's data mapping is load-bearing: nothing on the overlay is decorative, every element reads a real number.
