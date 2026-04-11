#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "pillow>=10.0.0",
# ]
# ///
"""
Generates the bird's-eye village ProgressMap art:
- 1 map canvas (1200x800-ish village aerial view)
- 23 landmark illustrations (1 per node in mapData.ts)

Style: solarpunk-elven-jedi per CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md.
Saves PNG, converts to WebP at quality 85, removes PNG.

Usage:
    cd regen-civics-clean
    export $(grep GEMINI_API_KEY .env | xargs)
    uv run scripts/generate-village-map-images.py
"""

import os
import sys
from io import BytesIO
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image as PILImage


REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "client" / "public" / "map" / "landmarks"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CANVAS_OUT = REPO_ROOT / "client" / "public" / "map" / "village-canvas-lg.webp"


STYLE_PRIMER = (
    "Style: solarpunk-elven-jedi watercolor illustration, deep forest greens, "
    "warm golds, bioluminescent teals, sunrise amber, living wood browns, soft "
    "white light. Hand-painted quality, no medieval browns or grays. Tools are "
    "grown not forged. Architecture is part tree, part crystal, part solar "
    "membrane. Every surface alive with moss, vines, fruiting plants, and small "
    "creatures. Studio Ghibli future earth meets Rivendell built by permaculture "
    "designers. Golden hour light always."
)


# 1 canvas
CANVAS_PROMPT = (
    "Bird's-eye top-down aerial view of a solarpunk-elven-jedi village laid out "
    "across an alpine valley. The composition is wide landscape (3:2 ratio). "
    "At the exact center sits a massive ancient living tree (the ReGen Tree) "
    "with bioluminescent roots radiating outward as soft glowing veins of "
    "mycelium. The valley is divided into four softly-blended quadrants:\n"
    "- Lower-left (Earth/Land): terraced gardens, food forests, winding "
    "earthen paths leading uphill to a summit overlook.\n"
    "- Upper-left (Water/Ally): a curving river with bridges, river docks, "
    "and a council bridge in the upper area.\n"
    "- Upper-right (Air/Play): a misty grove of treehouses connected by aerial "
    "walkways, climbing toward an ancient tree on a high ring.\n"
    "- Lower-right (Fire/Fund): a sun-warmed amphitheatre, an observatory dome, "
    "a forge, and a great hall built into rolling golden hills.\n"
    "Soft golden hour light. Painterly. No text, no labels, no UI. Empty space "
    "around landmarks so circular hotspots can be drawn on top later. "
    + STYLE_PRIMER
)


# 23 landmarks (matches mapData.ts node IDs exactly)
LANDMARKS = [
    # Land path (Earth, green)
    ("land-1", "Trailhead",
     "A small living-wood archway at the start of a forest path, mossy stones, "
     "a weathered wooden sign carved with a leaf, dappled morning light, "
     "fiddleheads unfurling at the base."),
    ("land-2", "Seed Vault",
     "A small round earth-bermed dome with a crystal door, jars of glowing "
     "seeds visible inside, vines bearing pomegranates climbing the dome, "
     "a rabbit at the entrance."),
    ("land-3", "Gathering Grove",
     "A circle of wooden benches around a low fire pit beneath a circle of "
     "fruiting trees, soft hanging lanterns, hummingbirds drifting past, "
     "a clearing for community sessions."),
    ("land-4", "The Great Terrace",
     "A wide stone terrace cut into a hillside with a long carved table, "
     "scrolls and offerings laid out, terraced food forests below, golden "
     "evening light, bees among flowering vines."),
    ("land-5", "Summit Overlook",
     "A high mountain summit with a single ancient tree and a circular "
     "viewing platform of polished living wood, eagles overhead, distant "
     "valleys glowing in golden light."),

    # Ally path (Water, blue)
    ("ally-1", "River Dock",
     "A small wooden dock on a slow river, a flat-bottomed boat tied with "
     "vine rope, river otters playing nearby, willow trees overhanging the "
     "water, dragonflies."),
    ("ally-2", "Bridge Market",
     "A covered wooden footbridge over a river, lined with small market "
     "stalls of woven baskets, jars of preserves, hanging citrus and "
     "passionfruit, a flock of small songbirds."),
    ("ally-3", "Confluence Hall",
     "A circular pavilion at the meeting of two streams, open sides, a "
     "central fountain made of crystal and living wood, koi fish in the "
     "shallow pool below, banners of woven fiber."),
    ("ally-4", "Council Chamber",
     "A round chamber grown into the trunk of a giant fig tree, a circle "
     "of carved wooden seats, soft skylight from above, a wise owl on a "
     "high beam, scrolls on a low table."),
    ("ally-5", "The Great Bridge",
     "A grand living-wood arch bridge spanning a wide river valley, "
     "bioluminescent fibers woven through the railings, a heron in flight "
     "below, golden mist."),

    # Play path (Air, purple)
    ("play-1", "Threshold Stone",
     "A tall standing stone carved with spirals, set at the edge of a misty "
     "forest path, faintly glowing runes, a small fox sitting beside it, "
     "dawn light filtering through fir trees."),
    ("play-2", "First Quest Stone",
     "A round stone altar in a small clearing, a single white flower "
     "growing from its top, a beam of sunlight, a curious rabbit nearby, "
     "wildflowers around the edge."),
    ("play-3", "Midway Clearing",
     "A wide grassy clearing in the woods with five smooth stones arranged "
     "in a circle, deer grazing peacefully, butterflies, late afternoon "
     "golden light through the trees."),
    ("play-4", "Speaking Circle",
     "A circle of cushioned moss-covered logs around a small fire, paper "
     "lanterns hung from branches above, a cat dozing on one log, "
     "fireflies beginning to glow at dusk."),
    ("play-5", "The High Ring",
     "A high mountain ring of standing stones with bioluminescent moss, "
     "low clouds drifting past, an owl perched on one stone, the valley "
     "spread out far below."),
    ("play-6", "The Ancient Tree",
     "A massive ancient oak with a doorway grown into its trunk, golden "
     "light glowing from within, songbirds in the canopy, a small altar "
     "of stones at its base, hanging vines bearing soft glowing fruit."),

    # Fund path (Fire, orange)
    ("fund-1", "Observatory",
     "A small domed observatory of crystal and living wood on a hillside, "
     "a brass-and-wood telescope visible inside, evening sky with first "
     "stars, a constellation map painted on the dome interior glimpsed "
     "through the door."),
    ("fund-2", "Forge Amphitheatre",
     "A small open-air amphitheatre with curved stone seating around a "
     "central forge that burns with a clean blue-gold flame, banners of "
     "woven copper and silk, sparks rising into the dusk."),
    ("fund-3", "Exchange Garden",
     "A walled garden with raised beds in a circular pattern, baskets "
     "of fresh harvest at each bed, bees and hummingbirds, a small wooden "
     "trade table at the center."),
    ("fund-4", "Treasury Gate",
     "A grand arched gate of polished living wood and golden metal, "
     "carved with a great tree, two stone lanterns flanking the path, "
     "warm sunset light, marigolds along the threshold."),
    ("fund-5", "The Forge",
     "A larger workshop forge of stone and timber, a wide hearth with "
     "blue-gold flame, hanging tools made of crystal and copper, a "
     "blacksmith's anvil at the center, ferns growing from the walls."),
    ("fund-6", "Great Hall",
     "A grand long hall of living wood with a high vaulted ceiling, "
     "long oak tables set for a feast, hanging garlands of fruit and "
     "flowers, light streaming through tall windows, an orange tabby "
     "cat asleep on the floor."),
    ("fund-7", "Flame Garden",
     "A walled garden of red and orange flowers and fruiting trees with "
     "a small ceremonial fire pit at the center, butterflies, sunset "
     "light, persimmons and pomegranates, a small bird drinking from a "
     "stone basin."),
]


def png_to_webp(png_path: Path, quality: int = 85) -> Path:
    webp_path = png_path.with_suffix(".webp")
    img = PILImage.open(png_path)
    img.save(str(webp_path), "WEBP", quality=quality, method=6)
    png_path.unlink(missing_ok=True)
    return webp_path


def generate(client: genai.Client, prompt: str, out_path: Path, resolution: str) -> bool:
    full_prompt = prompt + " " + STYLE_PRIMER
    try:
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=full_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(image_size=resolution),
            ),
        )
        for part in response.parts:
            if part.inline_data is not None:
                data = part.inline_data.data
                if isinstance(data, str):
                    import base64
                    data = base64.b64decode(data)
                img = PILImage.open(BytesIO(data))
                if img.mode == "RGBA":
                    rgb = PILImage.new("RGB", img.size, (255, 255, 255))
                    rgb.paste(img, mask=img.split()[3])
                    rgb.save(str(out_path), "PNG")
                else:
                    img.convert("RGB").save(str(out_path), "PNG")
                return True
        return False
    except Exception as e:
        print(f"  ERR: {e}", file=sys.stderr, flush=True)
        return False


def main() -> int:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set in environment", file=sys.stderr)
        return 1

    client = genai.Client(api_key=api_key)
    failures: list[str] = []
    total = 1 + len(LANDMARKS)
    done = 0

    # Canvas first (2K so it stays sharp on desktop)
    canvas_png = CANVAS_OUT.with_suffix(".png")
    print(f"[1/{total}] canvas village-canvas-lg ...", flush=True)
    if generate(client, CANVAS_PROMPT, canvas_png, "2K"):
        webp = png_to_webp(canvas_png, quality=88)
        print(f"  OK -> {webp.name} ({webp.stat().st_size // 1024} KB)", flush=True)
        done += 1
    else:
        failures.append("village-canvas-lg")

    # 23 landmarks at 1K (square-ish, small icons on the canvas)
    for i, (slug, name, prompt) in enumerate(LANDMARKS, start=2):
        out_png = OUTPUT_DIR / f"{slug}.png"
        print(f"[{i}/{total}] {slug} ({name}) ...", flush=True)
        full = (
            f"A small isometric/3-quarter view of a single landmark called "
            f"'{name}'. {prompt} Composition: the landmark sits centered in "
            f"the frame with soft transparent or watercolor edges fading to "
            f"a soft cream-green wash so it sits cleanly on a map background. "
            f"No text, no labels, no UI elements. Square composition. Painterly."
        )
        if generate(client, full, out_png, "1K"):
            webp = png_to_webp(out_png)
            print(f"  OK -> {webp.name} ({webp.stat().st_size // 1024} KB)", flush=True)
            done += 1
        else:
            failures.append(slug)

    print(f"\nDone: {done}/{total} succeeded", flush=True)
    if failures:
        print("Failed: " + ", ".join(failures), flush=True)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
