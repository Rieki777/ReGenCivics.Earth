#!/usr/bin/env python3
"""
Nano Banana Pro Image Generator
Uses Google's Gemini 3 Pro Image API (model: gemini-3-pro-image) for
text-to-image and image-to-image generation. Supports 1K, 2K, and 4K output
and a configurable aspect ratio.

Usage:
  python generate_image.py --prompt "description" --filename "output.png" \
    [--resolution 1K|2K|4K] [--aspect 1:1|16:9|4:3|3:2|9:16|2:3] \
    [--input-image path] [--api-key KEY]

Environment:
  GEMINI_API_KEY - API key for Gemini (fallback if --api-key not provided)

Notes:
  - The retired gemini-2.0-flash-exp model and the generationConfig.imageResolution
    field are no longer accepted by the API. Resolution is now set via
    generationConfig.imageConfig.imageSize and aspect via imageConfig.aspectRatio.
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
import urllib.error

MODEL = "gemini-3-pro-image"
VALID_ASPECTS = ("1:1", "16:9", "4:3", "3:2", "2:3", "9:16", "21:9", "5:4", "4:5")


def generate_image(prompt: str, filename: str, resolution: str = "1K",
                   aspect: str = "1:1", input_image: str | None = None,
                   api_key: str | None = None) -> str:
    """Generate or edit an image using the Gemini 3 Pro Image API."""

    # Resolve API key
    key = api_key or os.environ.get("GEMINI_API_KEY")
    if not key:
        print("ERROR: No API key found. Provide --api-key or set GEMINI_API_KEY env var.", file=sys.stderr)
        sys.exit(1)

    # API endpoint
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}"

    # Build the request parts
    parts = []

    # If editing an existing image, include it first
    if input_image:
        if not os.path.exists(input_image):
            print(f"ERROR: Input image not found: {input_image}", file=sys.stderr)
            sys.exit(1)

        with open(input_image, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")

        # Detect MIME type
        ext = os.path.splitext(input_image)[1].lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
        }
        mime_type = mime_map.get(ext, "image/png")

        parts.append({
            "inlineData": {
                "mimeType": mime_type,
                "data": image_data
            }
        })

    # Add the text prompt
    parts.append({"text": prompt})

    # Build image config (aspect ratio + resolution).
    image_config = {"aspectRatio": aspect}
    if resolution in ("1K", "2K", "4K"):
        image_config["imageSize"] = resolution

    # Build request body
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": image_config,
        }
    }

    # Make the request
    req_data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        print(f"Generating image with {MODEL} (resolution: {resolution}, aspect: {aspect})...")
        with urllib.request.urlopen(req, timeout=180) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else "No details"
        print(f"ERROR: API returned {e.code}: {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"ERROR: Network error: {e.reason}", file=sys.stderr)
        sys.exit(1)

    # Extract image from response
    candidates = result.get("candidates", [])
    if not candidates:
        print(f"ERROR: No candidates in response. Full response: {json.dumps(result, indent=2)}", file=sys.stderr)
        sys.exit(1)

    content = candidates[0].get("content", {})
    parts_out = content.get("parts", [])

    image_data = None
    for part in parts_out:
        if "inlineData" in part:
            image_data = part["inlineData"].get("data")
            break

    if not image_data:
        # Print any text parts for debugging
        for part in parts_out:
            if "text" in part:
                print(f"API text response: {part['text']}", file=sys.stderr)
        print("ERROR: No image data in API response.", file=sys.stderr)
        sys.exit(1)

    # Decode and save
    img_bytes = base64.b64decode(image_data)

    # Ensure output directory exists
    out_dir = os.path.dirname(filename)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(filename, "wb") as f:
        f.write(img_bytes)

    full_path = os.path.abspath(filename)
    print(f"Image saved: {full_path} ({len(img_bytes):,} bytes)")
    return full_path


def main():
    parser = argparse.ArgumentParser(description="Generate images with the Gemini 3 Pro Image API")
    parser.add_argument("--prompt", required=True, help="Image description or editing instructions")
    parser.add_argument("--filename", required=True, help="Output filename (PNG)")
    parser.add_argument("--resolution", choices=["1K", "2K", "4K"], default="1K",
                        help="Output resolution (default: 1K)")
    parser.add_argument("--aspect", choices=list(VALID_ASPECTS), default="1:1",
                        help="Aspect ratio (default: 1:1)")
    parser.add_argument("--input-image", help="Path to input image for editing")
    parser.add_argument("--api-key", help="Gemini API key (overrides GEMINI_API_KEY env)")
    args = parser.parse_args()

    generate_image(
        prompt=args.prompt,
        filename=args.filename,
        resolution=args.resolution,
        aspect=args.aspect,
        input_image=args.input_image,
        api_key=args.api_key,
    )


if __name__ == "__main__":
    main()
