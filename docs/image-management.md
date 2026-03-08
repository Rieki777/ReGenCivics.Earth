# Image Management Process

## Two-Location System

All images exist in two places:
1. **Archive** (`~/Nano Photos/<category>/`) — master copies, never deleted
2. **Public** (`client/public/images/<category>/`) — served locally, git-tracked

CDN (`https://assets.regencivics.earth/`) is for legacy images only. New images go local.

## Generating New Images

Use the nano-banana-pro skill (requires `uv`):

```bash
UV="/c/Users/taren/.local/bin/uv"
SCRIPT="/c/Users/taren/.claude/skills/nano-banana-pro/scripts/generate_image.py"

$UV run $SCRIPT \
  --prompt "your image description" \
  --filename "/c/Users/taren/Nano Photos/<category>/image-name.png" \
  --resolution 1K
```

Then copy to public:
```bash
cp "/c/Users/taren/Nano Photos/<category>/image-name.png" \
   "client/public/images/<category>/image-name.png"
```

See `scripts/generate-quest-images.sh` and `scripts/generate-return-card-images.sh` for examples.

## Naming Conventions

| Category | Pattern | Example |
|---|---|---|
| Quest cards | `quest-NN-slug.png` | `quest-07-wild-foraging.png` |
| Return cards | `slug.png` | `next-quest.png` |
| Governance | `descriptive-name.png` | `rcvoice-vs-rgvoice.png` |

## Fallback Chain

Code should always try CDN first, fall back to local:
```ts
function questImageUrl(id: number, slug: string) {
  return `${CDN_BASE}/quest-${String(id).padStart(2, '0')}-${slug}.png`;
}
function questImageFallback(id: number, slug: string) {
  return `/images/quests/quest-${String(id).padStart(2, '0')}-${slug}.png`;
}
// In JSX: src={imgError ? questImageFallback(...) : questImageUrl(...)}
// onError={() => setImgError(true)}
```

## CDN Audit

Run `scripts/audit-cdn-images.sh` to find all CDN URLs in the codebase and check which are broken.

## Categories

- `quests/` — quest card images (quests 0–12), referenced in `Quest.tsx`
- `return-cards/` — personalized return cards, referenced in `ProgressiveOnboarding.tsx`
- `governance/` — governance diagrams, referenced in `Governance.tsx`
