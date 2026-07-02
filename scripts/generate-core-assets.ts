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
  "Painterly storybook illustration in an enchanted-forest solarpunk style, a regenerative future where nature and gentle living technology have grown into one, magical and hopeful without ever feeling artificial. Hand-painted texture with soft edges, subtle grain, and luminous highlights. Warm, reverent, hopeful, alive, touched with quiet wonder. Soft golden dawn light and gentle atmosphere, with a delicate bioluminescent glow woven through the living world: moss and mycelium that hold a faint inner light, motes of light drifting like slow fireflies, a crystalline clarity to the air. Where architecture or tools appear, they are grown rather than built: living wood, woven vine, and soft crystal, never metal or machinery. Color palette centered on deep forest greens (#0d2818, #1a472a, #2d5a3d), spring green (#7dd87d), warm parchment cream (#f8f5f0, #f0ebe3), and amber-gold accents (#d4a574, #ffd700), with a soft bioluminescent teal (#4a9f9f) used sparingly as a hint of magic, never dominant. A sense of living systems, reciprocity, and abundance: wherever the composition allows, the scene is rich with the more-than-human world, food forests and fruiting trees, fungi and mushrooms, and wildlife at ease among people. Nothing is barren, empty, or sterile. Where people appear they are fully human, ordinary and dignified, no pointed ears and no fantasy creatures, simply touched by the same soft magic and light as the world around them. Diverse, tender, warm. No text, no lettering, no logos, no watermarks, no UI elements, no borders. One cohesive art style across the whole set.";

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
