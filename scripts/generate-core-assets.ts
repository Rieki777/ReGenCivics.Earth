/**
 * Generate every CORE illustration with Nano Banana Pro (Gemini 3 Pro Image).
 *
 * Prompts below mirror client/src/pages/core/ASSET_PROMPTS.md (the human source
 * of truth). Each is the shared style preamble + the per-asset scene. Raw PNGs
 * land in client/public/core/raw/ (gitignored); scripts/process-core-assets.ts
 * then crops, resizes, and uploads them.
 *
 * NEEDS GEMINI_API_KEY (Rye handoff task 2b). Run from repo root:
 *   GEMINI_API_KEY=... npx tsx scripts/generate-core-assets.ts
 *   GEMINI_API_KEY=... npx tsx scripts/generate-core-assets.ts --only=home-hero,core-emblem
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = join(REPO_ROOT, "client", "public", "core", "raw");
const SKILL = join(homedir(), ".claude", "skills", "nano-banana-pro", "scripts", "generate_image.py");

// Evolved to match the "solarpunk meets elven meets regenerative future" feeling
// used for the ReGen Civics role character art (grown-not-built materials,
// bioluminescence, crystal and mycelium instead of leather and iron), while
// keeping CORE's people fully human (no pointed ears, no fantasy creatures).
// Also mandates the more-than-human world (food forests, fungi, wildlife) be
// visible wherever the composition allows. See client/src/pages/core/ASSET_PROMPTS.md
// for the full rationale; keep both files in sync.
const PREAMBLE =
  "Painterly storybook illustration in an enchanted-forest solarpunk style, a regenerative future where nature and gentle living technology have grown into one, magical and hopeful without ever feeling artificial. Hand-painted texture with soft edges, subtle grain, and luminous highlights. Warm, reverent, hopeful, alive, touched with quiet wonder. Soft golden dawn light and gentle atmosphere, with a delicate bioluminescent glow woven through the living world: moss and mycelium that hold a faint inner light, motes of light drifting like slow fireflies, a crystalline clarity to the air. Where architecture or tools appear, they are grown rather than built: living wood, woven vine, and soft crystal, never metal or machinery. The Earth herself is a temple, and her great trees are living cathedrals: canopies meet and arch overhead like vaulted ceilings, trunks stand like a nave's columns, and dawn light falls through leaves in shafts like stained glass, dappling moss and soil below. Where people build a home or a village, it rises from the land itself, domed and vaulted like something raised in prayer, walls of woven wood and living roof, nestled unhurried among orchards, raised garden beds, and animals (goats, chickens, deer, doves) at ease in the company of people. Color palette centered on deep forest greens (#0d2818, #1a472a, #2d5a3d), spring green (#7dd87d), warm parchment cream (#f8f5f0, #f0ebe3), and amber-gold accents (#d4a574, #ffd700), with a soft bioluminescent teal (#4a9f9f) used sparingly as a hint of magic, never dominant. A sense of living systems, reciprocity, and abundance: wherever the composition allows, the scene is rich with the more-than-human world, food forests and fruiting trees, fungi and mushrooms, and wildlife at ease among people. Nothing is barren, empty, or sterile. Where people appear they are fully human, ordinary and dignified, no pointed ears and no fantasy creatures, simply touched by the same soft magic and light as the world around them. Diverse, tender, warm. No text, no lettering, no logos, no watermarks, no UI elements, no borders. One cohesive art style across the whole set.";

type Gen = { id: string; resolution: "1K" | "2K" | "4K"; prompt: string };

const ASSETS: Gen[] = [
  { id: "home-hero", resolution: "4K", prompt: "Wide 16:9 composition. Dawn over a thriving food forest on gently rolling land, heavy with fruit: figs, apples, citrus, berries. A small group of diverse people of different ages tending the earth together, planting and gathering, unhurried and joyful. Layers of fruit trees, cedars, and garden beds receding into golden morning mist, threads of soft bioluminescent light drifting between the trees like slow fireflies. Songbirds and butterflies move through the branches, a deer grazes calmly at the treeline, and small mushrooms dot the leaf litter. The whole scene feels like a single living organism breathing, thriving and abundant. Depth and openness, room for a headline in the lower portion." },
  { id: "faith-seed", resolution: "4K", prompt: "Close, reverent 4:3 composition. Two cupped human hands lowering a single pale seed into dark, crumbling, living soil rich with faintly glowing mycelium, tiny roots, and a small mushroom at the edge of the frame. A thread of soft golden light travels between the hand and the seed, suggesting a bond of knowing. A curling fern frond softly out of focus behind the hands. Shallow depth of field, sacred and quiet." },
  { id: "program-gathering", resolution: "2K", prompt: "Square 1:1 composition. A warm circle of diverse faces gathered close in soft candle and firelight around a single glowing seedling at the center, ferns and small flowering plants ringing the circle, a moth drawn to the light, as if meeting across distance yet fully present. Intimate, tender, luminous." },
  { id: "program-meal", resolution: "2K", prompt: "Square 1:1 composition. Many hands passing bowls of colorful, abundant food across a long wooden table outdoors under fruit trees heavy with citrus and grapes, dappled golden light. Songbirds in the branches above, a vine of grapes trailing along the table's edge, bees drifting past. Generosity in motion, food moving from hand to hand." },
  { id: "program-healing", resolution: "2K", prompt: "Square 1:1 composition. A gentle healing circle of people seated on the grass at dusk beneath a fruiting tree, one hand resting softly on another's shoulder, soft candlelight, fireflies rising around them, a fox resting quietly at the circle's edge. An atmosphere of safety and being held. Calm and warm, nothing clinical." },
  { id: "program-planting", resolution: "2K", prompt: "Square 1:1 composition. Close view of hands pressing a young fruit-tree sapling into rich dark earth threaded with the faint glow of mycelium and dotted with small mushrooms, other saplings and a watering can nearby, a rabbit in soft focus in the background, morning light. Hopeful, grounded, tactile." },
  { id: "program-ceremony", resolution: "2K", prompt: "Square 1:1 composition. A small sacred fire in a forest clearing at night, diverse people gathered around it in celebration, sparks rising toward a starlit sky, warm amber glow on their faces, fruit trees ringing the clearing and an owl watching quietly from a branch above. Festive and reverent." },
  { id: "program-song", resolution: "2K", prompt: "Square 1:1 composition. A cluster of diverse people singing together outdoors at the edge of a food forest, faces open and joyful, mouths mid-song, soft golden light, fruiting vines overhead, a few leaves drifting, butterflies and a deer at the wood's edge. Music made visible as gentle waves of warm light." },
  { id: "elders-anastasia", resolution: "4K", prompt: "Vertical 3:4 portrait composition. A symbolic, non-identifiable figure standing barefoot in a sunlit cedar forest, seen softly from behind or in gentle silhouette, long hair catching golden light, one hand resting on a tall cedar whose bark holds a faint thread of bioluminescent moss. Ferns, small mushrooms, and wildflowers grow at the roots, and a deer or fox is glimpsed softly in the background. She reads as a spirit of the forest and the land rather than a portrait of any specific person. Fully human, no pointed ears. Do not show a clear, recognizable face. Serene, luminous, timeless." },
  { id: "elders-yeshua", resolution: "4K", prompt: "Vertical 3:4 portrait composition. A symbolic, non-identifiable male figure walking a sunlit path through a green garden at dawn, seen softly from behind or in gentle silhouette, robed in simple flowing cloth, one hand open at his side. Around him a thriving garden of fig and olive trees heavy with fruit, running water catching the light, doves and small birds, a faint bioluminescent glow in the moss along the path. He reads as a spirit of peace and the living law of love rather than a portrait of any specific person. Fully human. Do not show a clear, recognizable face, and do not depict the iconic conventional image of Jesus. Calm, luminous, timeless." },
  { id: "donate-seed-to-tree", resolution: "2K", prompt: "Wide 16:9 composition. On the left, a seed resting in an open hand; a ribbon of golden light flows rightward where the same light blossoms into a great, generous fruit-laden tree sheltering small figures beneath it, its branches heavy with fruit and nesting birds, small animals resting peacefully among its roots. Giving becoming abundance, light passing from hand to hand." },
  { id: "transparency-open-hand", resolution: "2K", prompt: "Wide 16:9 composition. A single open, upturned hand holding a small open book or ledger made of soft golden light, pages glowing, nothing hidden. A single leaf and a small mushroom rest quietly beside the hand, the only nod to the living world in an otherwise spare frame. Honesty and openness, clean and calm, plenty of negative space." },
  { id: "core-emblem", resolution: "2K", prompt: "Square 1:1, centered, flat vector-like emblem on a fully transparent background. A single sprouting seed with two small leaves rising from a stylized curved horizon, enclosed in a clean circular ring. Simple, balanced, iconic, two or three colors only (forest green, spring green, amber). No text. Reads clearly at small sizes." },
  { id: "not-found-404", resolution: "2K", prompt: "4:3 composition. A single small glowing seedling growing at a gentle fork in a mossy forest path at dusk, the path edged with faintly bioluminescent moss and small glowing mushrooms, fireflies drifting, a rabbit pausing at the fork, inviting rather than sad. A quiet sense of being a little lost but safe, the path ahead soft and green." },

  // --- Round 2: temple/cathedral theme + more site imagery (see ASSET_PROMPTS.md) ---
  { id: "home-village-abundance", resolution: "4K", prompt: "Wide 16:9 composition. A thriving village of domed, living-roofed homes grown from wood and earth, nestled among terraced food-forest gardens on a hillside at golden hour. Goats and chickens graze at ease near raised garden beds heavy with vegetables, people of all ages tend the land and gather at a central clearing, smoke rises gently from a communal kitchen. Layers of orchard trees and cedars recede into soft haze. Abundant, rooted, lived-in, radiant with quiet industry and peace." },
  { id: "home-temple-grove", resolution: "2K", prompt: "Wide 16:9 composition. An ancient grove of towering trees whose canopies meet high overhead and arch like the vaulted ceiling of a cathedral nave. Shafts of golden morning light fall through the leaves like light through stained glass, dappling a soft mossy floor below. A few small figures stand reverently among the trunks, dwarfed and at peace. No walls, no roof, only the living cathedral of the grove itself." },
  { id: "home-night-ceremony", resolution: "2K", prompt: "Wide 16:9 composition. A cluster of warmly lit, domed living-roof dwellings at the edge of a food forest under a brilliant starlit night sky with a faint band of the Milky Way. People gather around several small fires between the domes, talking, singing, and dancing softly, golden window light spilling out onto the grass. Fireflies drift and an owl watches from a nearby branch. Festive, safe, and quietly holy." },
  { id: "faith-cathedral-canopy", resolution: "4K", prompt: "Wide 16:9 composition. Looking up and outward through the soaring, arching canopy of ancient cathedral trees, trunks like columns receding into golden haze, branches interlacing overhead like vaulted stonework. Broad shafts of dawn light pour down through gaps in the leaves like colored light through cathedral windows, illuminating drifting motes and a carpet of ferns and moss below. A small group of diverse people stand quietly at the base, heads tilted up in reverence. Awe-inspiring scale, deeply sacred, room for a headline in the lower portion." },
  { id: "faith-root-communion", resolution: "2K", prompt: "4:3 composition, cross-section view beneath the soil. The roots of a single great tree spread outward and downward, each glowing softly with a different gentle color (rose, amber, spring green, soft violet, bioluminescent teal) like a rainbow woven underground, threaded through with fine mycelial filaments that connect to smaller roots and mushrooms nearby. Above the soil line at the top of the frame, a hint of grass and dappled light. A visual metaphor for interconnection and oneness, luminous and intricate." },
  { id: "faith-animals-abundance", resolution: "2K", prompt: "Wide 16:9 composition. A gentle hillside orchard and pasture in soft afternoon light, terraced gardens receding into the distance. Deer, goats, rabbits, and chickens rest and graze at ease alongside a few people quietly harvesting fruit and vegetables together, wholly unafraid of one another. Fruit trees heavy with apples and pears, beehives tucked at the garden's edge. A vision of life deepening into beauty and abundance, calm and sunlit." },
  { id: "programs-hero", resolution: "4K", prompt: "Wide 16:9 composition. An elevated view over a living village of grown, domed and vaulted structures encircled by concentric rings of food-forest gardens, orchard trees, and winding paths, golden hour light raking across the rooftops and gardens. Small figures move between the buildings and gardens, tending, gathering, and greeting one another. The whole settlement reads as a single blossoming organism grown from the land. Spacious, inviting, room for a headline in the lower portion." },
  { id: "program-stewardship", resolution: "2K", prompt: "Square 1:1 composition. An elder and a child kneeling together on a terraced hillside garden, four hands cupped around a small mound of dark earth, planting together. Layers of terraced beds and fruit trees rise behind them, birds crossing a golden sky. A quiet transmission of care for the land from one generation to the next." },
  { id: "elders-hero", resolution: "4K", prompt: "Wide 16:9 composition. The interior of an ancient tree cathedral: immense trunks like columns ringing a soft mossy clearing, canopy arching far overhead, shafts of light falling to the forest floor. At the base, a loose circle of empty stones or fallen logs suggests a place where wisdom keepers gather and speak, though the circle sits empty and waiting, luminous and still. Reverent, timeless, room for a headline in the lower portion." },
  { id: "elders-future-lantern", resolution: "2K", prompt: "4:3 composition. In soft dusk light beneath a canopy of trees, one weathered hand passes a small glowing lantern, or a single softly glowing seed of light, into a younger open hand reaching to receive it. Fireflies drift nearby, ferns underfoot. A quiet symbol of wisdom passed on and a circle that keeps growing." },
  { id: "get-involved-hero", resolution: "4K", prompt: "Wide 16:9 composition. A lone figure walking toward a rustic wooden gate and threshold at the edge of a warmly lit village, gardens and domed homes glowing golden beyond it, a small fire circle visible in the distance with people gathered around it. Dusk light, the gate open and welcoming, the path underfoot soft with fallen leaves. A sense of arrival and belonging, room for a headline in the lower portion." },
  { id: "get-involved-community-life", resolution: "2K", prompt: "Wide 16:9 composition. A sun-warmed earthen village of adobe-and-living-wood dwellings with flowering vines climbing the walls, raised garden beds bursting with vegetables in the foreground, a wood-fired oven venting a thread of smoke, people carrying baskets and tending plants in easy, unhurried motion. Terraced hills recede behind. Grounded, industrious, sunlit daily life." },
  { id: "get-involved-sanctuary", resolution: "2K", prompt: "Wide 16:9 composition. A small sanctuary campus of timber, living-roof buildings set among tall pines at the edge of a calm mountain lake at dawn, mist rising off the water, mountains reflected in the still surface. A handful of people walk a garden path along the shore together, unhurried. Spacious, restorative, quietly grand." },
  { id: "get-involved-path", resolution: "2K", prompt: "4:3 composition. A winding forest path threaded with soft bioluminescent light along its edges, leading through ferns and tall trees toward a distant, warmly lit village glowing at dusk. A single figure walks the path from behind, unhurried, toward the light. An invitation to begin the walk in." },
  { id: "donate-temple-offering", resolution: "2K", prompt: "Wide 16:9 composition. A pair of hands gently placing a piece of ripe fruit and a small cloth pouch of seeds onto a moss-covered stone altar at the base of a great cathedral-canopy tree, soft golden light falling from above through the leaves. Ferns and small mushrooms grow around the altar's base. Reverent, simple, giving as an act of worship." },
  { id: "transparency-roots-of-trust", resolution: "2K", prompt: "Wide 16:9 composition. A cross-section view beneath open soil showing a wide, healthy network of glowing golden-white roots and mycelium spreading in full view, nothing tangled or hidden, each thread traceable from root to root. Above the soil line, an open meadow in soft daylight. A visual metaphor for openness and nothing hidden, clean and legible." },
  { id: "elder-chat-threshold", resolution: "2K", prompt: "Square 1:1 composition. A gentle doorway formed where two living trees have grown and bent together overhead, trunks and branches interlacing into a natural archway wound with softly glowing moss. Beyond the threshold, warm golden light and soft blur suggest an inviting space just out of sight. Symbolic of stepping into a conversation with an elder's wisdom." },
  { id: "thank-you-blossom", resolution: "2K", prompt: "Wide 16:9 composition. A single tree caught in the moment of bursting into blossom, thousands of pale pink and white petals lifting into golden light alongside a flock of small rising birds, soft bioluminescent motes drifting among the petals. Below, a few diverse figures look up in quiet joy. A visual expression of gratitude and abundance in motion." },
  { id: "reconciliation-ledger-grove", resolution: "2K", prompt: "Wide 16:9 composition. A pair of hands resting open over a small book or ledger made of soft golden light, its pages faintly glowing, set on a simple wooden table in a quiet forest clearing dappled with morning light. Sparse and calm, only a single fern and a small mushroom nearby, plenty of negative space. Honest, spare, unremarkable in a good way." },
  { id: "footer-canopy-band", resolution: "2K", prompt: "Wide 21:9 composition, low horizontal band. A silhouette of a tree-of-life canopy and its mirrored root system at dusk, deep forest greens fading to near-black at the edges, a thin band of golden-amber light along the horizon line between roots and branches, a few faint bioluminescent motes scattered through the silhouette. Simple, atmospheric, reads well as a quiet recurring background strip, not busy." },
];

function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set. This script generates the site illustrations and needs it.");
    process.exit(1);
  }
  if (!existsSync(SKILL)) {
    console.error(`Nano Banana Pro skill not found at ${SKILL}`);
    process.exit(1);
  }
  mkdirSync(RAW_DIR, { recursive: true });

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? new Set(onlyArg.slice(7).split(",").map((s) => s.trim())) : null;

  for (const a of ASSETS) {
    if (only && !only.has(a.id)) continue;
    const filename = join(RAW_DIR, `${a.id}.png`);
    console.log(`\nGenerating ${a.id} (${a.resolution}) -> ${filename}`);
    const res = spawnSync("uv", ["run", SKILL, "--prompt", `${PREAMBLE}\n\n${a.prompt}`, "--filename", filename, "--resolution", a.resolution], {
      stdio: "inherit",
      env: process.env,
    });
    if (res.status !== 0) {
      console.error(`Generation failed for ${a.id} (exit ${res.status}). Continuing.`);
    }
  }
  console.log("\nDone. Next: npx tsx scripts/process-core-assets.ts");
}

main();
