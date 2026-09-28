# Image Architecture -- ReGen Civics

**Date:** 2026-03-31
**Status:** Active

---

## The Rule

Static images go in `client/public/images/`. R2 is only for dynamic user-uploaded content.

If an image URL is hardcoded in source code, it belongs in `public/images/`, full stop. Hardcoded R2 URLs break when R2 has issues, and there's no recovery path. Local images deploy with the app and always work.

---

## Directory Structure

```
client/public/images/
  backgrounds/         # Full-page background images (PageBackground component)
    home-desktop.webp
    home-mobile.webp
    play-desktop.webp   # MISSING -- needs upload
    play-mobile.webp    # MISSING -- needs upload
    fund-desktop.webp   # MISSING -- needs upload
    fund-mobile.webp    # MISSING -- needs upload
  quests/              # Quest card artwork (30 files, all present)
  logos/               # Brand logos (6 files, all present)
  return-cards/        # Onboarding return cards (6 files, all present)
  governance/          # Governance diagrams (1 file, present)
```

---

## What Goes Where

| Image type | Location | Example |
|------------|----------|---------|
| Page backgrounds | `public/images/backgrounds/` | `home-desktop.webp` |
| Quest card art | `public/images/quests/` | `quest-00-fire.webp` |
| Logos | `public/images/logos/` | `regencivics-logo-dark-rounded.webp` |
| Static content images | `public/images/[category]/` | Team photos, blog headers, icons |
| User avatars | R2 via `resolveAssetUrl()` | Uploaded through profile |
| Campaign images | R2 via `resolveAssetUrl()` | Uploaded through campaign builder |
| Forum attachments | R2 via upload API | Attached in forum posts |

---

## R2 "Data Loss" (2026-03-31) — RESOLVED 2026-07-15, was not data loss

**Update 2026-07-15:** This was misdiagnosed. The objects were never lost. They were sitting in the `regen-civics-assets` bucket the whole time and were unreachable because of a Cloudflare zone URL Rewrite rule.

Root cause: a URL Rewrite (Transform) rule named "R2 Assets Path Rewrite" on the `regencivics.earth` zone matched `http.host eq "assets.regencivics.earth"` and rewrote every path to `concat("/regen-civics-assets", http.request.uri.path)`, prepending the bucket name to the key. So `assets.regencivics.earth/<key>` was looked up in R2 as `regen-civics-assets/<key>`, which did not exist for normally-stored objects. Only a set of legacy objects that happened to be stored under a doubled `regen-civics-assets/` prefix resolved, which is why a handful of keys appeared to "survive" while everything else 404'd.

Fix: copied the legacy prefixed objects down to bare keys, deleted the rewrite rule, and removed the redundant prefixed duplicates. `assets.regencivics.earth/<key>` now maps directly to R2 key `<key>`. Use the bucket's Public Development URL (`https://pub-d072540ca4004f09a1f07636184fdd73.r2.dev/<key>`) to check what is actually in the bucket, bypassing the zone.

The list below is kept for history. Most of these URLs should resolve again now that the rule is gone; verify with `scripts/audit-cdn-images.sh` before treating anything as missing.

### Images that were reported missing (historical)

**Page backgrounds (highest priority):**
- `play-desktop.webp` -- Play page background, save to `client/public/images/backgrounds/`
- `play-mobile.webp` -- Play page mobile background, save to `client/public/images/backgrounds/`
- `fund-desktop.webp` -- Fund page background, save to `client/public/images/backgrounds/`
- `fund-mobile.webp` -- Fund page mobile background, save to `client/public/images/backgrounds/`

**Content images (medium priority, still using broken R2 URLs):**
These are hardcoded in source and should eventually move to `public/images/` too. For now they show placeholder graphics when R2 fails.

- Showcase/land project photos (7 JPGs in Showcase.tsx)
- Blog post headers (12 JPGs in blogPosts.ts)
- Team photos (2 images in Team.tsx)
- Governance icons (4 PNGs in Governance.tsx, Game.tsx)
- Home page content images (path card icons, section images)
- SEO meta images (20+ in SEO.tsx)
- Navigation logo (1 PNG)
- CrowdPooling images (5 JPGs)
- Calculator, Connect, Blog page images

**Videos (low priority):**
- Play page intro video (`WZgPeSZvhJLTVpCn.mp4`)
- Fund page video (`VeYvNDrIyHjuiPlZ.mp4`)
- Game page videos (2 MP4s)

---

## Error Handling

Every image component now handles failures gracefully:

1. **PageBackground**: If the full image fails to load, the blur filter is removed from the placeholder so users see the low-res version clearly instead of a blurred mess. If no placeholder exists, a solid theme color shows.

2. **LazyImage**: If src fails, tries `fallbackSrc` if provided. If that also fails, shows a styled placeholder with a landscape icon instead of a broken image.

3. **cdnImg() / resolveAssetUrl()**: These proxy functions route R2 URLs through `/api/img`. If R2 returns 404, the proxy returns 404, and the component-level error handling kicks in.

---

## How to Add New Static Images

1. Save the file to `client/public/images/[category]/`
2. Reference it in code as `/images/[category]/filename.webp`
3. Do NOT upload to R2 and hardcode the R2 URL
4. Format: prefer WebP, max 800KB for backgrounds, 200KB for content images
5. Sizes: desktop backgrounds 1920px wide, mobile 768px wide

---

## Migration Plan

Phase 1 (done): Page backgrounds switched to local paths. Home works now. Play and Fund need images supplied.

Phase 2 (next session): Move remaining static content images from R2 to local. This is ~80 images across showcase, blog, team, governance, home, etc. Rye needs to supply the originals since R2 lost them.

Phase 3 (future): Clean up R2 references. Once all static images are local, the only R2 usage should be dynamic user uploads. The cdnImg() function can be simplified or removed.
