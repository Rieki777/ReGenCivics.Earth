# Claude Code Session: Recording Flow + Map Integration

**Date:** 2026-03-28 (Part 5)
**Project:** regen-civics-clean

**Read `CLAUDE.md` before writing any user-facing copy.** Writing rules are non-negotiable: zero em-dashes, no AI-isms, no contrast-framing, no rhetorical questions, no passive inspiration.

---

## What You're Building

6 things, in order. Run `pnpm build` after each part.

---

### Part 1: Fix Zapier Data Field Mapping in Riverside Webhook

**File:** `server/webhooks/riverside.ts`

**The problem:** Zapier sends flat keys with `data_` prefix (`data_title`, `data_youtube_url`, `data_thumbnail_url`, `data_created_at`) but the webhook handler expects either nested `data.title` or flat `title`. The current code does `payload.data ?? payload` which falls back to `payload` when there's no nested `data` object, but the flat payload has keys like `data_title` not `title`. This means recordings may get generic fallback titles.

**What to do:**

In `processRiversideEvent` (around line 226), after the `const data = payload.data ?? payload;` line, add normalization for Zapier-style flat keys:

```typescript
const data = payload.data ?? payload;

// Normalize Zapier-style flat keys (data_title -> title, data_youtube_url -> youtube_url, etc.)
const normalize = (obj: any): any => {
  const result: any = { ...obj };
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('data_')) {
      const normalizedKey = key.replace(/^data_/, '');
      if (!(normalizedKey in result)) {
        result[normalizedKey] = value;
      }
    }
  }
  return result;
};
const d = normalize(data);
```

Then replace all subsequent references from `data.xxx` to `d.xxx`:
- `d.id ?? d.recording_id` (line ~227)
- `d.title` (line ~228)
- `d.youtube_url` (line ~229)
- etc.

**Run `pnpm build`.**

---

### Part 2: Update Forum Category from "episodes" to "session-recordings"

**File:** `server/webhooks/riverside.ts`

Rye created a new forum category at `/community/c/session-recordings`. The webhook handler currently uses a fuzzy `LIKE '%episode%'` lookup (line 394) which is fragile.

**What to do:**

In `createRecordingForumPost` (around line 391-395), replace:

```typescript
const [episodesCategory] = await database
  .select()
  .from(forumCategories)
  .where(like(forumCategories.name, "%episode%"))
  .limit(1);
```

With an exact slug lookup:

```typescript
const { eq: eqFn } = await import("drizzle-orm");
const [recordingsCategory] = await database
  .select()
  .from(forumCategories)
  .where(eqFn(forumCategories.slug, "session-recordings"))
  .limit(1);
```

Update the fallback comment and variable name accordingly:
```typescript
// Fall back to category 1 (General) if session-recordings category doesn't exist
const categoryId = recordingsCategory?.id ?? 1;
```

Also update the tags array (line ~425) from `["recording", "episode"]` to `["recording", "session"]`.

**Run `pnpm build`.**

---

### Part 3: Add Recording Replay to Schedule Page Event Cards

**File:** `client/src/pages/Schedule.tsx`

When a recording exists for a completed event, show a "Watch Replay" button on the event card.

**3a. Add a tRPC route to fetch recordings by event**

**File:** Create `server/routes/recordings.ts` or add to an existing router.

```typescript
// In server/routes/recordings.ts (new file)
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { getDb } from "../db";
import { recordings, events } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const recordingsRouter = router({
  // Get recording linked to a specific event
  byEventId: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;
      const [event] = await database.select({ recordingId: events.recordingId })
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);
      if (!event?.recordingId) return null;
      const [recording] = await database.select({
        id: recordings.id,
        title: recordings.title,
        youtubeUrl: recordings.youtubeUrl,
        riversideUrl: recordings.riversideUrl,
        thumbnailUrl: recordings.thumbnailUrl,
        durationSeconds: recordings.durationSeconds,
      }).from(recordings).where(eq(recordings.id, event.recordingId)).limit(1);
      return recording ?? null;
    }),

  // List recent recordings (for a recordings page or widget)
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      return database.select({
        id: recordings.id,
        title: recordings.title,
        youtubeUrl: recordings.youtubeUrl,
        thumbnailUrl: recordings.thumbnailUrl,
        sessionDate: recordings.sessionDate,
        durationSeconds: recordings.durationSeconds,
        forumPostId: recordings.forumPostId,
      }).from(recordings)
        .orderBy(desc(recordings.sessionDate))
        .limit(input.limit);
    }),
});
```

Wire it in `server/routers.ts`:
```typescript
import { recordingsRouter } from "./routes/recordings";
// In appRouter:
recordings: recordingsRouter,
```

**3b. Link recording to event in the webhook handler**

**File:** `server/webhooks/riverside.ts`

The events table already has `recordingId` column. After upserting a recording, update the matched event's `recordingId`:

In `processRiversideEvent`, after the event matching block (around line 310), when `matchedEvent` is found, also update the event:

```typescript
if (matchedEvent?.forumThreadId) {
  // ... existing reply logic ...

  // Link recording to event for schedule page replay
  await database.update(eventsTable)
    .set({ recordingId, status: "completed" })
    .where(eqOp(eventsTable.id, matchedEvent.id));
  console.log(`[riverside-webhook] Linked recording ${recordingId} to event ${matchedEvent.id}`);
}
```

Note: `eqOp` is already imported as `eq` (but aliased). Check the existing imports and use the correct reference. The `eq` from drizzle-orm may already be imported at line 20 or via dynamic import at line 294.

**3c. Show replay button on Schedule event cards**

**File:** `client/src/pages/Schedule.tsx`

In the event card's expanded section (around line 724 where buttons are rendered), add a "Watch Replay" button for completed events:

```tsx
{/* Replay button for completed events */}
{(event as any).status === 'completed' && (event as any).recordingId && (
  <ReplayButton eventId={event.id} />
)}
```

Create a small `ReplayButton` component inside Schedule.tsx or as a separate file:

```tsx
function ReplayButton({ eventId }: { eventId: number }) {
  const { data: recording } = trpc.recordings.byEventId.useQuery({ eventId });
  if (!recording) return null;
  const url = recording.youtubeUrl ?? recording.riversideUrl;
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
    >
      <Video className="w-4 h-4" />
      Watch Replay
    </a>
  );
}
```

**Run `pnpm build`.**

---

### Part 4: Recording Email Preference (Opt-in Only)

Currently `sendRecordingEmail` in `server/webhooks/riverside.ts` (line 442) sends to ALL active newsletter subscribers via `db.getActiveNewsletterSubscribers()`. This needs to change to opt-in only.

**4a. Add `notifyRecordings` column to `newsletterSubscribers`**

**File:** `drizzle/schema.ts`

Add to the `newsletterSubscribers` table definition (after the `isActive` column):

```typescript
// Email preferences
notifyRecordings: tinyint("notifyRecordings").default(0).notNull(), // opt-in for recording emails
```

**4b. Create migration SQL**

**File:** `drizzle/0091_recording_email_pref.sql`

```sql
ALTER TABLE newsletter_subscribers ADD COLUMN notifyRecordings TINYINT(1) NOT NULL DEFAULT 0;
```

**DO NOT RUN THIS MIGRATION.** It has already been applied in Railway.

**4c. Add DB helper for recording subscribers**

**File:** `server/db.ts`

Add a new function:

```typescript
export async function getRecordingSubscribers(): Promise<{ email: string; name: string | null }[]> {
  const database = await getDb();
  if (!database) return [];
  const rows = await database.select({
    email: newsletterSubscribers.email,
    name: newsletterSubscribers.name,
  }).from(newsletterSubscribers)
    .where(and(
      eq(newsletterSubscribers.isActive, 1),
      eq(newsletterSubscribers.notifyRecordings, 1),
    ));
  return rows;
}
```

**4d. Update the webhook email sender**

**File:** `server/webhooks/riverside.ts`

In `sendRecordingEmail` (line 442), replace:

```typescript
const subscribers = await db.getActiveNewsletterSubscribers();
```

With:

```typescript
const subscribers = await db.getRecordingSubscribers();
```

**4e. Add recording email toggle to user profile**

**File:** Wherever the newsletter/notification preferences are rendered in the frontend profile page.

Look for the profile edit form or notification settings component. Add a toggle/checkbox:

```tsx
<label className="flex items-center gap-3">
  <input
    type="checkbox"
    checked={notifyRecordings}
    onChange={(e) => setNotifyRecordings(e.target.checked)}
    className="..."
  />
  <div>
    <p className="text-sm font-medium text-white">Recording updates</p>
    <p className="text-xs text-white/50">Get an email when a new session recording is ready</p>
  </div>
</label>
```

You'll need a tRPC mutation to update the `notifyRecordings` column on the subscriber's row (matched by email from the authenticated user). If the user isn't a newsletter subscriber yet, create a row with `isActive: 1` and `notifyRecordings: 1` and `source: "profile"` (add `"profile"` to the source enum if needed, or use `"other"`).

**4f. Update email footer text**

In `buildEmailHtml` (around line 141), change:
```
"You're receiving this because you subscribed to ReGen Civics updates."
```
To:
```
"You're receiving this because you opted into recording updates in your profile."
```

**Run `pnpm build`.**

---

### Part 5: Wire Map Illustrations Into the Codebase

**The 7 map WebP files already exist in `client/public/map/`.** They were generated and optimized outside of this session. Do NOT generate, download, or recreate any images. Your job is strictly to wire them into the codebase.

**Verify first:**
```bash
ls -la client/public/map/*.webp | wc -l  # Must output 7
```

If you don't see 7 files, STOP and tell Rye. Do not proceed with Part 5.

**These are the files:**

| File | Size | Use |
|------|------|-----|
| `progress-map-full.webp` | 338 KB | Hero map background for ProgressMapSVG |
| `zone-earth-land.webp` | 346 KB | Earth/Land zone detail |
| `zone-water-ally.webp` | 375 KB | Water/Ally zone detail |
| `zone-air-play.webp` | 294 KB | Air/Play zone detail |
| `zone-fire-fund.webp` | 356 KB | Fire/Fund zone detail |
| `regen-tree-center.webp` | 366 KB | Central tree (convergence point) |
| `village-endgame.webp` | 363 KB | Village endgame reward view |

**5a. Check CDN setup**

Look for a `cdnImg()` utility in `client/src/lib/utils.ts`. If the project uses Cloudflare for image hosting, the map images should be referenced via `cdnImg()`. If not, serve them directly from `/map/filename.webp` as static assets.

**5b. Create the asset mapping constant**

**File:** `client/src/components/ProgressMap/mapAssets.ts` (new file)

```typescript
import { cdnImg } from "@/lib/utils";

export const MAP_ASSETS = {
  hero: cdnImg("/map/progress-map-full.webp"),
  earth: cdnImg("/map/zone-earth-land.webp"),
  water: cdnImg("/map/zone-water-ally.webp"),
  air: cdnImg("/map/zone-air-play.webp"),
  fire: cdnImg("/map/zone-fire-fund.webp"),
  tree: cdnImg("/map/regen-tree-center.webp"),
  village: cdnImg("/map/village-endgame.webp"),
} as const;
```

If `cdnImg` doesn't exist or isn't appropriate, use plain paths instead:
```typescript
export const MAP_ASSETS = {
  hero: "/map/progress-map-full.webp",
  earth: "/map/zone-earth-land.webp",
  water: "/map/zone-water-ally.webp",
  air: "/map/zone-air-play.webp",
  fire: "/map/zone-fire-fund.webp",
  tree: "/map/regen-tree-center.webp",
  village: "/map/village-endgame.webp",
} as const;
```

**5c. Preload the hero map**

In the ProgressMap component or the page that renders it, add a preload link for the hero image:

```tsx
<link rel="preload" href={MAP_ASSETS.hero} as="image" type="image/webp" />
```

**5d. Confirm .gitignore doesn't exclude them**

Make sure `client/public/map/*.webp` is NOT in `.gitignore`. These are production assets that must be committed.

**Run `pnpm build`.**

---

### Part 6: Migration SQL File (Version Control Only)

The migration has already been applied in Railway. Create this file for version control only.

**File:** `drizzle/0091_recording_email_pref.sql`

```sql
-- Recording email preference (already applied in production)
ALTER TABLE newsletter_subscribers ADD COLUMN notifyRecordings TINYINT(1) NOT NULL DEFAULT 0;

-- Add "profile" to source enum for subscribers created via profile page
-- Note: MySQL ALTER TABLE for enum changes requires restating all values
-- ALTER TABLE newsletter_subscribers MODIFY COLUMN source ENUM('homepage','investor_form','connect_form','apply_form','footer','exit_intent','other','profile') NOT NULL DEFAULT 'other';
```

---

## What NOT To Do

- Do NOT run any DB migrations. The migration is already applied.
- Do NOT generate, download, or create any images. The map WebPs already exist.
- Do NOT modify quest-related code.
- Do NOT change the existing newsletter subscriber email flow for non-recording emails.
- Do NOT remove the fallback Zoom references that Part 3 of the previous prompt (CLAUDE_CODE_PROMPT_2026-03-27_PART3.md) already handles. That prompt covers the Zoom-to-Riverside migration separately.
- Do NOT modify the Zapier configuration. Only fix the webhook handler to accept Zapier's data format.

---

## Done Criteria

All must be true before claiming done:

- [ ] `pnpm build` passes with zero errors
- [ ] Zapier flat keys (`data_title`, `data_youtube_url`, etc.) are normalized to standard keys in the webhook handler
- [ ] Forum posts for recordings go to `session-recordings` category (exact slug lookup, not fuzzy LIKE)
- [ ] `recordings.byEventId` tRPC route returns recording data for a given event
- [ ] `recordings.list` tRPC route returns recent recordings
- [ ] Schedule page event cards show "Watch Replay" button for completed events with linked recordings
- [ ] Webhook links `recordingId` to the matched event and sets event status to "completed"
- [ ] `newsletterSubscribers` schema includes `notifyRecordings` column
- [ ] `getRecordingSubscribers()` DB helper filters by `notifyRecordings = 1`
- [ ] `sendRecordingEmail` uses the new opt-in subscriber list
- [ ] User profile has a toggle for recording email notifications
- [ ] Email footer text updated for recording emails
- [ ] Migration file `drizzle/0091_recording_email_pref.sql` created (for version control)
- [ ] `mapAssets.ts` created with all 7 image paths
- [ ] All 7 map WebPs confirmed present in `client/public/map/`
- [ ] Hero map preload link added
- [ ] Zero em-dashes in any user-facing copy

---

## Handoff Breakdown

### Rye (human, after this runs)

| # | Task | Why |
|---|------|-----|
| 1 | `git push` | Git credentials |
| 2 | Verify Zapier data mapping with a real recording | Riverside account access |

### Claude Code (all autonomous)

| # | Task |
|---|------|
| 1 | Zapier data field normalization in riverside.ts |
| 2 | Forum category update to session-recordings |
| 3 | recordings tRPC router (byEventId + list) |
| 4 | Wire recordingsRouter in server/routers.ts |
| 5 | Link recordingId to event in webhook handler |
| 6 | Schedule page "Watch Replay" button |
| 7 | notifyRecordings column in schema |
| 8 | getRecordingSubscribers DB helper |
| 9 | Update sendRecordingEmail to use opt-in list |
| 10 | Recording email toggle in user profile |
| 11 | Email footer text update |
| 12 | mapAssets.ts + preload link + .gitignore check |
| 13 | Migration SQL file for version control |

Nothing is blocked. Everything can run now.
