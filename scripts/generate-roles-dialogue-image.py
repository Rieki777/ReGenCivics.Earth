"""
Run this script locally to generate the Roles Dialogue card image.
It uses the GEMINI_API_KEY from your .env file.

Usage:
  python3 scripts/generate-roles-dialogue-image.py

Output:
  client/public/images/quests/roles-dialogue.png
"""

import os
import sys

# Load .env manually (no dotenv dependency needed)
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

api_key = os.environ.get('GEMINI_API_KEY')
if not api_key:
    print("ERROR: GEMINI_API_KEY not found in environment or .env")
    sys.exit(1)

try:
    from google import genai
except ImportError:
    print("ERROR: google-genai not installed. Run: pip install google-genai")
    sys.exit(1)

client = genai.Client(api_key=api_key)

prompt = (
    "A circle of diverse people engaged in deep dialogue around a glowing table "
    "covered in leaves and living plants, solarpunk aesthetic, soft golden light, "
    "people holding cards and scrolls representing roles and ideas, lush green vines "
    "framing the scene, warm earthtones with pops of emerald and amber, "
    "painterly illustration style, cinematic framing from slightly above"
)

print("Generating image...")
response = client.models.generate_images(
    model='imagen-3.0-generate-002',
    prompt=prompt,
    config=genai.types.GenerateImagesConfig(
        number_of_images=1,
        aspect_ratio='16:9',
    )
)

out_path = os.path.join(
    os.path.dirname(__file__), '..',
    'client', 'public', 'images', 'quests', 'roles-dialogue.png'
)
out_path = os.path.normpath(out_path)

img = response.generated_images[0]
with open(out_path, 'wb') as f:
    f.write(img.image.image_bytes)

print(f"Saved: {out_path}")
