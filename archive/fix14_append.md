
---

## Fix 14 — /admin Image Studio: Create and Edit Site Images

**Goal:** Add an "Images" tab to `/admin` that acts as a full image studio — generate new on-brand images for any content type, or edit existing site images by URL. The admin selects from generated variations, uploads the chosen one to R2, and the panel handles wiring it to the correct data source.

---

### The Flow

**Creating a new image:**
1. Pick content type (blog, quest, campaign, forum, video, profile, default)
2. Enter title + optional description/tags
3. Click "Generate" — backend builds the branded prompt using the same `BASE_THEME` and prefix logic from the `regen-content-image` skill, calls the Cloudflare Workers AI, and returns 4 variations
4. Admin clicks a variation to select it
5. Click "Upload to R2" — image is stored in `regen-civics-assets` with the standard timestamped filename
6. Panel shows the new public URL (`https://assets.regencivics.earth/{filename}`) with a Copy button

**Editing an existing image:**
1. Paste the current image URL (e.g., `https://assets.regencivics.earth/aVsQKWGuwteoFgZN.jpg`)
2. The original image renders as a preview
3. Enter an edit prompt (e.g., "add children playing in the foreground" or "make it feel more like dusk")
4. Click "Generate Variations" — backend uses the original as a reference and the edit prompt to produce 4 new variations
5. Admin selects one → Upload to R2 → get new URL
6. "Find Usages" button scans known data sources (blogPosts.ts, DB tables for forum/campaign/quest) for the old filename and shows what would be updated
7. "Replace All" updates those references automatically; or admin copies the URL and does it manually

---

### Architecture

#### New component: `client/src/components/AdminImageStudio.tsx`

```tsx
// Full image studio UI — new tab content in Admin.tsx
// State:
//   mode: 'create' | 'edit'
//   contentType: ContentType
//   title: string
//   description: string
//   editUrl: string          // existing image URL when editing
//   editPrompt: string       // user's edit instruction
//   generating: boolean
//   variations: string[]     // array of generated image URLs (4 items)
//   selected: number | null  // index of selected variation
//   uploadedUrl: string | null
//   usages: ImageUsage[]     // found references to the old URL

// Sections:
// 1. Mode toggle: "Create New" | "Edit Existing"
// 2. CREATE mode: ContentType picker + Title + Description fields
// 3. EDIT mode: URL input + preview of original + Edit Prompt textarea
// 4. "Generate Variations" button
// 5. 2x2 grid of variation previews (loading skeletons during generation)
// 6. Selected variation gets a green ring + "Upload to R2" button
// 7. Post-upload: URL display + Copy button + (EDIT mode) "Find & Replace" panel
```

#### New tRPC procedures in `server/routers.ts`

**`admin.generateImageVariations`**
```typescript
// Input:
//   mode: 'create' | 'edit'
//   contentType: ContentType
//   title: string
//   description?: string
//   tags?: string[]
//   editUrl?: string      // existing image URL (edit mode)
//   editPrompt?: string   // user's edit instruction (edit mode)
//   count?: number        // default 4

// What it does:
//   1. Builds the branded prompt using BASE_THEME + content-type prefix (same formula
//      as the regen-content-image skill, but server-side)
//   2. In edit mode: fetches the original image from editUrl and passes it to the AI
//      as a reference image alongside the edit prompt
//   3. Calls generateImage() (server/_core/imageGeneration.ts) count times in parallel
//      — Fix 12 implements this using @cf/black-forest-labs/flux-2-klein-9b via the
//      Cloudflare Worker; Fix 14 just calls the same function
//   4. Returns { variations: string[] } — array of base64 data URIs or temp URLs

// Returns: { variations: string[] }
```

**`admin.uploadGeneratedImage`**
```typescript
// Input:
//   imageData: string     // base64 data URI of the selected variation
//   contentType: ContentType
//   title: string
//   oldFilename?: string  // if replacing an existing image, the old filename

// What it does:
//   1. Generates a timestamped filename: YYYY-MM-DD-HH-MM-SS-{slug}.png
//   2. Uploads the image to R2 bucket regen-civics-assets
//   3. Returns { filename, publicUrl }

// Returns: { filename: string, publicUrl: string }
```

**`admin.findImageUsages`**
```typescript
// Input:
//   filename: string  // just the filename, e.g. "aVsQKWGuwteoFgZN.jpg"

// What it does:
//   Scans known data sources for this filename:
//   1. Queries DB: SELECT id, title FROM blog_posts WHERE image LIKE '%{filename}%'
//   2. Queries DB: SELECT id, title FROM forum_posts WHERE generated_image_url LIKE '%{filename}%'
//   3. Queries DB: SELECT id, title FROM campaigns WHERE generated_image_url LIKE '%{filename}%'
//   4. Queries DB: SELECT id, title FROM quests WHERE image LIKE '%{filename}%'
//   Note: blogPosts.ts is static — won't appear in DB, flag it as "static file, manual update needed"

// Returns: { usages: Array<{ source: string, id: string, title: string, manual?: boolean }> }
```

**`admin.replaceImageInUsages`**
```typescript
// Input:
//   oldFilename: string
//   newFilename: string
//   usages: Array<{ source: string, id: string }>  // which records to update

// What it does:
//   Runs DB updates for each usage (UPDATE forum_posts SET generated_image_url = ...
//   WHERE id = ...)
//   Returns count of updated records

// Returns: { updated: number }
```

---

### Prompt Building (server-side)

Add `buildImagePrompt()` to `server/_core/imageGeneration.ts`:

```typescript
const BASE_THEME = `solarpunk regenerative world where ancient golden-age civilizations are overgrown with cascading life, massive ancient trees coated in moss and bioluminescent mycelium, glowing teal mushrooms, mycorrhizal network threadwork visible in soil and bark, fruiting plants and abundant layered gardens, birds and animals present at every scale, diverse life teeming at all levels, warm golden amber light emanating from within the canopy and from distant golden-spired living cities, deep forest green tones, golden accents and highlights, hyperrealistic magical realism, detailed fantasy concept art, photorealistic texture and specificity, ultra detailed, 4K, the scene feels real but more alive than reality — as if life's volume has been turned all the way up`;

const PREFIXES: Record<ContentType, string> = {
  blog: "A detailed magical realism scene depicting",
  quest: "A richly illustrated quest card scene showing a player in the act of",
  campaign: "A wide panoramic view of a regenerative landscape where",
  forum: "A real-looking gathering of diverse people in a living space where",
  video: "A cinematic landscape portal scene, as if the viewer is stepping through into",
  profile: "A photorealistic person standing within a regenerative landscape, surrounded by",
  default: "A lush regenerative scene within the ReGen Civics world, showing",
};

export function buildImagePrompt(
  contentType: ContentType,
  title: string,
  description?: string,
  tags?: string[]
): string {
  const prefix = PREFIXES[contentType];
  const context = [title, description?.slice(0, 150)].filter(Boolean).join(" — ");
  return `${prefix} ${context}, ${BASE_THEME}`;
}
```

---

### Adding the Tab to Admin.tsx

**Step 1 — Add to TAB_KEYS constant** (near line 2274):
```typescript
{ key: '0', desc: 'Jump to Images tab' },
// add to the TAB_KEYS array
```

**Step 2 — Add TabsTrigger** (after the last trigger, near line 2780):
```tsx
<TabsTrigger
  value="images"
  className="text-xs sm:text-sm px-3 py-2 rounded-md data-[state=active]:bg-[#1a472a] data-[state=active]:text-white"
>
  🖼️ Images
</TabsTrigger>
```

**Step 3 — Add TabsContent** (after `<TabsContent value="settings">`):
```tsx
<TabsContent value="images">
  <AdminImageStudio />
</TabsContent>
```

**Step 4 — Add import**:
```typescript
import { AdminImageStudio } from "@/components/AdminImageStudio";
```

---

### AdminImageStudio UI Layout

```
┌─────────────────────────────────────────────────┐
│  🖼️ Image Studio                                │
│                                                 │
│  [Create New]  [Edit Existing]                  │
│                                                 │
│  ── CREATE mode ──────────────────────────────  │
│  Content Type: [Blog ▼]                         │
│  Title: [________________________]              │
│  Description (optional): [____________]         │
│  Tags (optional): [____________]                │
│                                                 │
│  ── EDIT mode ─────────────────────────────── │
│  Image URL: [https://assets.regencivics.earth/] │
│  [Preview of original image]                    │
│  Edit prompt: [add children in the foreground]  │
│                                                 │
│  [Generate 4 Variations]                        │
│                                                 │
│  ┌──────────┐  ┌──────────┐                     │
│  │ var 1    │  │ var 2    │  ← click to select  │
│  └──────────┘  └──────────┘                     │
│  ┌──────────┐  ┌──────────┐                     │
│  │ var 3 ✓  │  │ var 4    │  ← green ring       │
│  └──────────┘  └──────────┘                     │
│                                                 │
│  [Upload to R2]                                 │
│                                                 │
│  ✅ Uploaded: https://assets.regencivics.earth/ │
│              2026-03-10-14-23-05-blog-xyz.png   │
│  [Copy URL]                                     │
│                                                 │
│  (EDIT mode only) [Find Usages of Old Image]    │
│  Found in: blog_posts #4 "What Makes RC Different"  │
│  Found in: forum_posts #12 "Season 1 Recap"    │
│  [Replace All]  [Copy URL & Handle Manually]   │
└─────────────────────────────────────────────────┘
```

---

### Dependency on Fix 12

Fix 14 calls `generateImage()` from `server/_core/imageGeneration.ts`. Fix 12 implements that function properly (replacing the current stub) using the Cloudflare Workers AI + `@cf/black-forest-labs/flux-2-klein-9b`. **Fix 12 must be completed before Fix 14's generation pipeline works end-to-end.** However, Fix 14's UI and tRPC procedures can be scaffolded independently — generation will throw "not configured" until Fix 12 lands.

**Interim option:** while Fix 12 is pending, the `admin.generateImageVariations` procedure can instead call nano-banana-pro via a shell exec (using the same approach as Fix 13's manual test), allowing the admin studio to work immediately even before the Worker is deployed.

---

### Files to Create / Modify

| Action | Path | Description |
|--------|------|-------------|
| CREATE | `client/src/components/AdminImageStudio.tsx` | Full image studio component |
| MODIFY | `server/_core/imageGeneration.ts` | Add `buildImagePrompt()` + `ContentType` type |
| MODIFY | `server/routers.ts` | Add 4 new admin procedures |
| MODIFY | `client/src/pages/Admin.tsx` | Add Images tab trigger + content + import |

---

### Priority Notes

- The UI and tRPC stubs can ship immediately — they work without Fix 12 in place
- The "Find Usages" + "Replace All" flow is the highest-value feature: it makes image replacement safe and auditable
- Static files (`blogPosts.ts`) can't be auto-updated via DB; the panel should flag these clearly and show the exact line to change
- Generation speed: calling `generateImage()` 4 times in parallel adds ~4x latency vs single; consider returning 2 variations initially with a "Generate More" option

