# ReGen Civics — Image Management Process

A repeatable workflow for creating, saving, and deploying images to the site. Follow this every time an image is added or updated.

---

## The Problem We're Solving

Images have been breaking because:
- Files uploaded to Cloudflare with messy names (spaces, parentheses) → URL encoding issues
- No local fallback when CDN 404s
- No audit step before deploying

**New rule: all images live locally in `client/public/images/` first. CDN is optional-but-preferred for production.**

---

## Standard Workflow

### Step 1 — Generate or obtain the image

**If generating with nano-banana-pro (Claude Code):**
```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Your detailed prompt here" \
  --filename "Nano Photos/<folder>/<kebab-case-name>.png"
```

**If using an existing image:** save it to `Nano Photos/<folder>/<kebab-case-name>.png`

**Naming rules:**
- Use kebab-case only: `rcvoice-vs-rgvoice.png` ✅
- No spaces: `Earned Through Quests (1).png` ❌
- No parentheses or special characters
- Use descriptive names, not random hashes

---

### Step 2 — Save to the site's local images folder

```bash
mkdir -p client/public/images/<folder>
cp "Nano Photos/<folder>/<kebab-case-name>.png" client/public/images/<folder>/
```

**Folder conventions:**

| Page / Use case | Folder |
|---|---|
| Quest cards on /quest | `client/public/images/quests/` |
| Return visitor shortcut cards | `client/public/images/return-cards/` |
| Governance page infographics | `client/public/images/governance/` |
| General page illustrations | `client/public/images/pages/` |
| Shared UI components | `client/public/images/ui/` |

---

### Step 3 — Reference the image in code

Use the local path. Do NOT use a CDN URL for new images unless they're already confirmed live on the CDN:

```tsx
// ✅ Correct — local path, always works after deploy
<img src="/images/governance/rcvoice-vs-rgvoice.png" alt="..." />

// ⚠️  CDN URL — only use if you've verified it's live
<img src="https://assets.regencivics.earth/abc123.png" alt="..." />
```

**If you want both CDN (fast) + local fallback (reliable):**
```tsx
const [imgErr, setImgErr] = useState(false);
<img
  src={imgErr
    ? "/images/governance/rcvoice-vs-rgvoice.png"
    : "https://assets.regencivics.earth/abc123.png"}
  onError={() => setImgErr(true)}
  alt="..."
/>
```

---

### Step 4 — Verify before committing

```bash
# Check all CDN URLs in the codebase
bash scripts/audit-cdn-images.sh
```

This script:
- Scans `client/src/` for all `assets.regencivics.earth` URLs
- Makes a HEAD request to each one
- Reports ✅ OK or ❌ BROKEN with the file that uses it
- Exits with code 1 if any images are broken (so CI can catch it)

**Run this before every PR that touches images.**

---

### Step 5 — Upload to Cloudflare R2 (optional — for CDN performance)

If you want the image served from the fast CDN in production:

1. Go to Cloudflare dashboard → R2 → `assets.regencivics.earth` bucket
2. Upload the file from `Nano Photos/<folder>/`
3. **Use the kebab-case filename** (e.g. `governance/rcvoice-vs-rgvoice.png`)
4. After upload, verify the URL works:
   ```bash
   curl -I "https://assets.regencivics.earth/governance/rcvoice-vs-rgvoice.png"
   # Expect: HTTP/2 200
   ```
5. Update the `src` in code to use the CDN URL, keep the local path as `onError` fallback

---

## Quick Reference — Current Broken Images

Images that are currently 404 on the CDN and need to be fixed:

| URL / Status | Fix | Notes |
|---|---|---|
| `assets.regencivics.earth/Earned%20Through%20Quests%20(1).png` | Use local path `/images/governance/rcvoice-vs-rgvoice.png` | File saved, see Task 8 |
| `assets.regencivics.earth/quests/quest-00-fire.png` ... `quest-12-...png` | Generate with nano-banana-pro, see Task 6 | 13 images total |

Run `bash scripts/audit-cdn-images.sh` for a live check of all URLs.

---

## Checklist for Every New Image

```
[ ] Saved to Nano Photos/<folder>/<kebab-case>.png  (archive copy)
[ ] Copied to client/public/images/<folder>/         (site copy)
[ ] Code uses /images/... local path (not CDN URL) OR has onError fallback
[ ] bash scripts/audit-cdn-images.sh passes with no failures
[ ] If uploaded to CDN: verified URL with curl -I
```
