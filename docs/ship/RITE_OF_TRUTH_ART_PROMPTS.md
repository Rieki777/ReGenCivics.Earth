# Rite of Truth Deck — Card Art Prompts

The 33 oracle cards for the Saturday Rite of Truth deck. Generated with the
`nano-banana-pro` skill and saved to
`client/public/images/ship/rite-cards/card-NN-slug.webp`.

## How to (re)generate a card

```bash
# Load the key from .env, then generate at 2K, then convert PNG -> WebP.
export $(grep GEMINI_API_KEY /c/Users/taren/Downloads/regen-civics-clean/.env | xargs)
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "<STYLE PREFIX><per-card central image>" \
  --filename "card-01-the-fire.png" --resolution 2K
python3 -c "from PIL import Image, os; p='card-01-the-fire.png'; w=p.replace('.png','.webp'); Image.open(p).save(w,'WEBP',quality=88,method=6); os.remove(p)"
```

Note: the delivered files are `.webp`, not `.png`. The nano-banana-pro skill
mandates WebP (3-4x smaller at equal quality) and the repo already serves ship
art as WebP. The stable base names (`card-01-the-fire` ... `card-33-one-body`)
are preserved; only the extension differs from the original spec.

## Shared style prefix (prepend to EVERY prompt)

> Ornate oracle card illustration, portrait orientation, tall 2:3 format. Luminous hand-painted style blending sacred gouache and gold-leaf, earthy and numinous. Rich earth-tone palette of deep forest green, soil brown, ember gold, and twilight indigo, lit by warm firelight glow and a soft ethereal luminescence. Symbolic mythic composition, a single central image, reverent and dreamlike, with fine botanical detail. A thin ornate border of living vines and small gold sigils frames the scene. Painterly, not photorealistic. No text, no words, no lettering anywhere in the image. Central image:

## Per-card central image (append after the prefix)

01. **The Fire** — A lone figure seated before a great bonfire at night; translucent old stories, masks, and worn beliefs lift off them as sparks and smoke dissolving upward into stars; the heart of the fire glows molten gold.
02. **The Forgotten Pleasure** — A human hand opening to release a luminous moth of light, the body half-dissolving into warm flower petals and glow, an expression of remembered delight.
03. **Sun-Ripe** — A sun-ripened peach split open bursting with radiant golden light and dewdrops, sunbeams pouring through a food-forest canopy, bees and shimmer in the air.
04. **Pleasure as Compass** — A glowing compass whose needle is a small flame-heart, set within a translucent human chest of light, pointing toward a blooming path; body and cosmos aligned.
05. **The Shade You'll Become** — A great ancient tree growing up out of a peacefully reclining human form becoming soil and roots; children play in the dappled shade beneath; seven young saplings in a row.
06. **Who You Look Up To** — A child riding on someone's shoulders reaching up toward the stars, an elder's warm silhouette behind under lantern light; mirrored generations.
07. **The Mirror** — A child holding up a luminous round mirror in which an adult sees their own younger, truer face reflected back; gentle light.
08. **Present, Not Performing** — A person stepping out from behind a hollow theatrical mask and stage curtain into real warm firelight, the mask fading to smoke; a small child watches, fully present.
09. **What You'll Refuse to Pass On** — Two hands, one lowering a heavy dark chain into fire where it dissolves into light, the other passing a small glowing seed to a child; a lineage of shadow breaking.
10. **Add, Don't Subtract** — Hands adding glowing seeds and fruits into an empty bowl that fills with light and abundance, plus-shaped vines growing outward; nothing taken away.
11. **What Truly Nourishes** — A person drinking from a spring of light, roots drawing nourishment up through the body into a full warm glowing heart.
12. **The Signal** — A glowing thread rising from a reaching hand and tracing down into the chest, revealing a hidden tender need, a small curled inner child of light; a signal followed to its root.
13. **No More Shame** — A figure cupping their own face with tender glowing hands, shadows of shame melting into soft light, a gentle halo of self-compassion.
14. **The Holy Hunger** — Silhouettes walking toward a distant sacred fire across a dark open field, hands open in longing, a holy warm glow waiting ahead.
15. **Books Wide Open** — An open luminous ledger radiating light at the center of a circle of equal figures, everything visible, nothing hidden; transparency as light.
16. **Where You Stepped Aside** — A crowd of small silhouettes reclaiming glowing voices that rise like light from their throats as a single oversized throne-shadow dissolves; power redistributed.
17. **What You Leave at the Door** — A figure at a threshold picking back up a glowing discarded piece of themselves, a luminous shadow-self, and carrying it inside toward a circle.
18. **From I to We** — Many separate small glowing figures merging their streams of light into one radiant body-tree; from many small flames to one great fire.
19. **Come Here With a Crew** — A small crew gathered around a fire beneath a vast starfield, fine threads of light connecting them heart to heart; a soul-crew reunited.
20. **Refined by Fire** — A figure standing strong within flames, their form becoming luminous like tempered gold, hardship visibly transmuting into strength and light; grounded, not consumed.
21. **Why You Came** — A soul descending through starry veils toward Earth carrying a small glowing seed of purpose held to the chest; a sacred vow, mission-light.
22. **Shared Needs** — A circle of hands placing their separate glowing needs into a shared central bowl of light, then drawing from it together; mutual provision.
23. **Gratitude as Currency** — Streams of golden light passing between people as gifts, a circulating chain of gratitude glowing brighter as it moves.
24. **Provision Without Possession** — An open-handed figure releasing an object that multiplies into abundance shared across a community; open palm against closed fist.
25. **Belonging** — A person nestled into the roots of a great tree, community and land gathered around them, deeply held in a warm belonging glow.
26. **Love Multiplies Capacity** — Two figures whose joined hands generate a radiant surge of light and strength, together lifting something that looked impossible alone.
27. **What the Land Would Give You** — A person kneeling with open hands as the land offers gifts in beams of light, spring water, glowing herbs, ripe fruit, restful moss; reciprocity with the more-than-human world.
28. **Love as a Nutrient** — A heart shaped as a tree whose roots draw up glowing love-light that feeds the whole luminous body; love flowing like sap and sun.
29. **The Garden Loves You Back** — A gardener embraced by luminous vines and flowers that lean toward them, the affection visibly mutual.
30. **Enough** — A cupped pair of hands overflowing endlessly with light and seeds, a cracked empty vessel of scarcity dissolving away; the revelation of abundance.
31. **Reverence Changes the Yield** — Loving hands harvesting from a tree that visibly brightens and fruits more richly exactly where it is touched with reverence.
32. **The Need Under the Anger** — A red storm-cloud of anger parting to reveal a small tender glowing need beneath it, a lonely inner light; compassion seeing through blame.
33. **One Body** — Concentric rings of light, a single human at center, then community, then bioregion and watershed, then the whole Earth, all one glowing living organism.
