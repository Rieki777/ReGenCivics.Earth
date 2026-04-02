import os, base64
from pathlib import Path
from google import genai
from google.genai import types

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
  print("Set GEMINI_API_KEY")
  exit(1)

PROMPT = """
Fantasy illustration in storybook style titled 'Bridging Worlds.'
A dramatic landscape split across a deep chasm.

The LEFT side is a dark, decaying industrial wasteland -- crumbling stone cliffs,
grey smokestacks, broken scaffolding, stormy overcast skies, ash and rust.

The RIGHT side is a luminous, thriving regenerative paradise -- lush floating green
islands, cascading waterfalls, greenhouse domes, abundant gardens, warm golden
sunrise light, people tending crops and community.

Spanning the chasm is a magical glowing bridge made of intertwined luminous green
vines, leaves, and mycelium threads, with a few people walking across it.

At the LEFT base of the bridge, roots emerge from the dark rocky ground and weave
upward into the bridge. Above these roots is a glowing stone plaque etched with the
words "ReGen Civics Fund" -- the anchor grounding the bridge on the old-world side,
lit with soft green bioluminescent light.

At the RIGHT base of the bridge, roots emerge from the rich green earth and weave
upward into the bridge. Above them is a glowing stone plaque etched with the words
"ReGen Civics Game" -- the anchor grounding the bridge on the regenerative side,
lit with warm golden-green light.

The two anchors send their vines toward each other, meeting and weaving together in
the center to form the bridge itself -- showing how the Fund and the Game unite to
bridge the worlds.

Ornate fantasy lettering at the bottom reads "Bridging Worlds."
Rich detail, warm magical lighting, epic scale, ultra high resolution 4K quality.
"""

print("Connecting to Gemini API...")
client = genai.Client(api_key=API_KEY)

print("Generating image with imagen-4.0-generate-001 (this may take 30-60 seconds)...")
response = client.models.generate_images(
    model="imagen-4.0-generate-001",
    prompt=PROMPT.strip(),
    config=types.GenerateImagesConfig(
        number_of_images=1,
        aspect_ratio="16:9",
        safety_filter_level="BLOCK_LOW_AND_ABOVE",
        person_generation="ALLOW_ADULT",
    ),
)

if not response.generated_images:
    print("ERROR: No images were generated.")
else:
    img_bytes = response.generated_images[0].image.image_bytes
    if not isinstance(img_bytes, (bytes, bytearray)):
        img_bytes = base64.b64decode(img_bytes)
    out = Path("bridging-worlds-regen-civics.png")
    out.write_bytes(img_bytes)
    print("Done! Image saved to:", out.resolve())
