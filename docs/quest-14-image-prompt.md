# Quest 14 Hero Image -- Claude Code Prompt

Copy this into Claude Code to generate the hero image:

---

Generate a quest hero image using the nano-banana-pro skill. Save it as a WebP file.

**Prompt:**
A painterly digital illustration for a regenerative healing quest called "Love to Heal Your Body." A person sitting cross-legged in meditation in a sun-dappled forest clearing at golden hour. Soft golden light radiates from their hands resting on their knees, and from their chest. Warm earth tones with rich greens and golds. Moss, ferns, and wildflowers surround them. The feeling is deep stillness, self-love, and body awareness. Ethereal but grounded. No text, no UI elements. Aspect ratio 16:9.

**Resolution:** 2K

**Output filename:** quest-14-love-to-heal-your-body.png

**After generation, convert to WebP and move to the right location:**
```bash
# Convert PNG to WebP (install cwebp if needed: brew install webp / choco install webp)
cwebp -q 80 quest-14-love-to-heal-your-body.png -o client/public/images/quests/quest-14-love-to-heal-your-body.webp

# Or if cwebp isn't available, use ffmpeg:
ffmpeg -i quest-14-love-to-heal-your-body.png -quality 80 client/public/images/quests/quest-14-love-to-heal-your-body.webp

# Commit it
git add client/public/images/quests/quest-14-love-to-heal-your-body.webp
git commit -m "feat: add Quest 14 hero image"
git push origin main
```
