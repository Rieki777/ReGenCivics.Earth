#!/usr/bin/env python3
"""
generate-living-tree-plates.py

Batch-generates the 24 Living Tree base plates (6 stages x 4 seasons) using
the Gemini 3 Pro Image API in image-to-image mode, anchored on the style of
tree-final-B1-clean-vignette.png.

Outputs to generated/living-tree/  in the repo root.
After review, run scripts/upload-living-tree-plates.mjs to push to R2.

Usage:
  python3 scripts/generate-living-tree-plates.py [--dry-run] [--stage STAGE] [--season SEASON]
  # dry-run: print prompts without calling the API
  # --stage / --season: generate only one combination for testing

Requirements:
  GEMINI_API_KEY in .env or environment.
  tree-final-B1-clean-vignette.png at repo root (the style anchor image).
"""

import argparse
import os
import sys
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
ANCHOR_IMAGE = REPO_ROOT / "tree-final-B1-clean-vignette.png"
OUT_DIR = REPO_ROOT / "generated" / "living-tree"
GEN_SCRIPT = REPO_ROOT / "scripts" / "nano-banana-pro-generate-image.py"

STAGES = [
    "seedling",
    "sapling",
    "young-tree",
    "flowering-tree",
    "fruiting-tree",
    "ancient-tree",
]

SEASONS = ["spring", "summer", "autumn", "winter"]

SEASON_PALETTE = {
    "spring": "pale cyan and soft pink light",
    "summer": "warm gold and white light",
    "autumn": "amber and rose light",
    "winter": "cool crystalline blue-white light",
}

STAGE_CANOPY = {
    "seedling": "a small sprout breaking through soil, two or three tiny leaves, a single pale taproot visible below ground",
    "sapling": "a thin trunk with a growing canopy of 8 to 12 leaves, roots beginning to split into nine distinct arteries",
    "young-tree": "a full young canopy with subtle trunk texture and a complex branching root system",
    "flowering-tree": "a broad canopy in soft blossom, blossoms distributed across the branches",
    "fruiting-tree": "a mature canopy heavy with glowing fruit among the leaves",
    "ancient-tree": "a vast mossy landmark tree with broad spreading canopy, small birds nesting, smaller plants in its shade, and mycelium filaments reaching to the edges",
}

BASE_PROMPT = """\
Style: dark bioluminescent fantasy concept art for a dark interface. A single magical tree at night \
glowing softly like living light. Above ground: {canopy_desc}, a gentle glow and a few drifting light \
particles, {season_palette} applied to the blossoms. Below a clear soil line: exactly nine separate \
glowing root arteries fanning symmetrically downward into near-black soil, each a distinct vivid jewel \
tone (violet, amber, copper, gold, leaf-green, coral, lavender, teal, rose), clearly countable and \
evenly spaced, interlaced by a fine web of glowing white-gold mycelium threads reaching to the edges. \
Centered, symmetrical, isolated subject, deep near-black background with a soft dark-green radial \
vignette, generous empty margin on all four edges for interface overlay. Luminous, sacred, hopeful, \
clean and uncluttered. No text, no labels, no watermark.\
"""


def load_env():
    env_path = REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())


def build_prompt(stage: str, season: str) -> str:
    return BASE_PROMPT.format(
        canopy_desc=STAGE_CANOPY[stage],
        season_palette=SEASON_PALETTE[season],
    )


def generate_plate(stage: str, season: str, dry_run: bool) -> bool:
    filename = f"{stage}-{season}.png"
    out_path = OUT_DIR / filename
    prompt = build_prompt(stage, season)

    if not dry_run and out_path.exists():
        print(f"  SKIP  {filename}  (already exists)")
        return True

    if dry_run:
        print(f"\n  [{stage}] [{season}]")
        print(f"  Out: {out_path}")
        print(f"  Prompt ({len(prompt)} chars):")
        print(f"    {prompt[:200]}...")
        return True

    print(f"\n  Generating  {filename} ...")
    cmd = [
        sys.executable,
        str(GEN_SCRIPT),
        "--prompt", prompt,
        "--filename", str(out_path),
        "--resolution", "2K",
        "--aspect", "4:5",
        "--input-image", str(ANCHOR_IMAGE),
    ]
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if api_key:
        cmd += ["--api-key", api_key]

    result = subprocess.run(cmd, capture_output=False, text=True)
    if result.returncode != 0:
        print(f"  ERROR: generation failed for {filename}", file=sys.stderr)
        return False
    return True


def main():
    parser = argparse.ArgumentParser(description="Batch-generate Living Tree base plates")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without calling the API")
    parser.add_argument("--stage", choices=STAGES, help="Generate only this stage")
    parser.add_argument("--season", choices=SEASONS, help="Generate only this season")
    args = parser.parse_args()

    load_env()

    if not ANCHOR_IMAGE.exists():
        print(f"ERROR: anchor image not found at {ANCHOR_IMAGE}", file=sys.stderr)
        print("Make sure tree-final-B1-clean-vignette.png is at the repo root.", file=sys.stderr)
        sys.exit(1)

    if not GEN_SCRIPT.exists():
        print(f"ERROR: generator script not found at {GEN_SCRIPT}", file=sys.stderr)
        sys.exit(1)

    if not args.dry_run:
        OUT_DIR.mkdir(parents=True, exist_ok=True)

    targets = [
        (s, sn)
        for s in ([args.stage] if args.stage else STAGES)
        for sn in ([args.season] if args.season else SEASONS)
    ]

    mode = "DRY RUN" if args.dry_run else "GENERATING"
    print(f"\n=== Living Tree plate batch ({mode}) ===")
    print(f"    {len(targets)} plates  •  anchor: {ANCHOR_IMAGE.name}")
    print(f"    output: {OUT_DIR}")

    failures = []
    for i, (stage, season) in enumerate(targets, 1):
        print(f"\n[{i}/{len(targets)}]", end="")
        ok = generate_plate(stage, season, args.dry_run)
        if not ok:
            failures.append(f"{stage}-{season}")

    print("\n")
    if failures:
        print(f"FAILED: {', '.join(failures)}")
        sys.exit(1)
    else:
        if not args.dry_run:
            print(f"Done. {len(targets)} plates saved to {OUT_DIR}")
            print("Next: review the images, then run:")
            print("  node scripts/upload-living-tree-plates.mjs")
        else:
            print(f"Dry run complete. {len(targets)} plates would be generated.")


if __name__ == "__main__":
    main()
