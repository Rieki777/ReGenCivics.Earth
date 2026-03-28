# Claude Code Session: Recording Flow Fixes + Progress Map Illustrations + Zapier Data Fix

**Date:** 2026-03-28 (Part 4)
**Project:** regen-civics-clean
**What this is:** Implementation prompt for 3 recording flow improvements, a Zapier data mapping fix, progress map illustration generation, and the illustration spec baked into the codebase.

**Read `CLAUDE.md` before writing any user-facing copy.** Writing rules are non-negotiable: zero em-dashes, no AI-isms, no contrast-framing, no rhetorical questions, no passive inspiration.

**Read `PROGRESS_MAP_DESIGN.md` for the full map spec.** The illustration prompts in this file are production-ready.

---

## Execution Order

Work through these in order. Run `pnpm build` after each major part to catch errors early.

---

### Part 1: Fix Zapier Data Field Mapping in Riverside Webhook

**File:** `server/webhooks/riverside.ts`

**The problem:** Zapier sends flat keys with `data_` prefix (`data_title`, `data_youtube_url`, `data_thumbnail_url`, `data_created_at`) but the webhook handler expects either nested `data.title` or flat `title`. The current code does `payload.data ?? payload` which falls back to `payload` when there's no nested `data` object, but the flat payload has keys like `data_title` not `title`. This means recordings may get generic fallback titles.

**What to do:**

In `processRiversideEvent` (around line 226), after the `const data = payload.data ?? payload;` line, add normalization for Zapier-style flat keys:

```typescript
const data = payload.data ?? payload;

// Normalize Zapier-style flat keys (data_title → title, data_youtube_url → youtube_url, etc.)
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

**DO NOT RUN THIS MIGRATION.** Rye will apply it in Railway.

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

### Part 5: Progress Map Illustrations (using Gemini 3 Pro Image API)

Generate 7 high-quality illustrations at 4K resolution for the progress map feature. Output to `client/public/map/`.

**5a. Set up generation script**

Use the `generate_map_images.py` script in the project root (already created). It requires `GEMINI_API_KEY` environment variable. Run:

```bash
pip install httpx --break-system-packages -q
GEMINI_API_KEY=$GEMINI_API_KEY python3 generate_map_images.py
```

If `GEMINI_API_KEY` is not available, skip this part and note it in the handoff.

**5b. The 7 illustrations to generate**

Each prompt below includes the full style prefix. All at 4K resolution. Output PNG files to `client/public/map/`.

**1. `progress-map-full.png`** (Hero map, bird's-eye view)

Prompt: "Hand-drawn line art with rich watercolor fills, Studio Ghibli art style meets treasure map cartography. Solarpunk aesthetic, futuristic yet ancient, elven architecture blended with regenerative permaculture design. Warm, inviting, lived-in feeling. Fine pen details on buildings and nature. Soft watercolor gradients. Tiny rewarding details: cats on rooftops, mushrooms at tree bases, bees near flowers, birds in canopy. Bird's-eye view illustrated map of a regenerative settlement village. Four distinct zones arranged around a magnificent central tree with glowing roots visible underground connecting all zones via mycelium. BOTTOM-LEFT: Earth Zone with terraced hillsides, lush food forests, a stone seed vault, winding restoration trails. Deep greens, rich browns, amber. TOP-LEFT: Water Zone with a flowing river delta, settlements joined by elegant wooden bridges, a grand confluence meeting hall. Teals, deep blues, silver. TOP-RIGHT: Air Zone on high ground with ancient quest stones in a spiral, healing circles in forest clearings, luminous golden-purple canopies. Purples, soft golds, starlight white. BOTTOM-RIGHT: Fire Zone forge district with solar arrays on copper rooftops, treasury carved into hillside, exchange garden. Warm oranges, deep reds, amber. CENTER: Great ancient tree with massive visible root system, glowing mycelium. Four winding paths in green, blue, purple, orange from each zone to center. Overhead perspective, slightly tilted for depth. Rich saturated watercolor palette. Soft gradient sky."

**2. `zone-earth-land.png`** (Earth Zone detail)

Prompt: "Hand-drawn line art with rich watercolor fills, Studio Ghibli art style meets treasure map cartography. Solarpunk aesthetic. Detailed illustration of the Earth Zone of a regenerative village map. Terraced hillsides with abundant food forests, cascading permaculture gardens. A stone seed vault built into a hillside with an arched wooden door. Winding restoration trails through deep green canopy with dappled sunlight. A gathering grove with a circular clearing and log seating. A great stone terrace overlooking a valley with planted gardens. A summit overlook at the highest point with a planted flag and panoramic views. Color palette: deep forest greens, rich earth browns, warm amber, golden sunlight. Mushrooms growing at tree bases, fallen logs with moss, a small creek flowing through, butterflies, a fox in the underbrush. Overhead tilted perspective."

**3. `zone-water-ally.png`** (Water Zone detail)

Prompt: "Hand-drawn line art with rich watercolor fills, Studio Ghibli art style meets treasure map cartography. Solarpunk aesthetic. Detailed illustration of the Water Zone of a regenerative village map. A flowing river delta with crystal clear water branching into streams. Interconnected settlements on river islands joined by elegant curved wooden bridges. A river dock with small boats and rope moorings at the entrance. A bridge market with colorful awnings and stalls on a wide stone bridge. A grand confluence meeting hall where three rivers meet, with tall windows reflecting water light. A council chamber with a round table visible through an open roof. The Great Bridge at the far end with ceremonial banners raised. Color palette: teals, deep sapphire blues, silver water reflections, jade green riverbanks. Fish visible in shallow water, lily pads, a heron on a rock, waterfalls in the background. Overhead tilted perspective."

**4. `zone-air-play.png`** (Air Zone detail)

Prompt: "Hand-drawn line art with rich watercolor fills, Studio Ghibli art style meets treasure map cartography. Solarpunk aesthetic. Detailed illustration of the Air Zone of a regenerative village map. High ground with sweeping panoramic views and clear open sky. A spiral of ancient standing quest stones, each carved with different symbols, arranged in an ascending spiral path up a gentle hill. A threshold stone at the entrance, a single tall monolith with runes. Healing circles in forest clearings with soft grass and wildflowers. Ancient trees with massive trunks and luminous golden-purple canopies that seem to glow from within. A speaking circle with a natural amphitheatre. The High Ring near the top with a circle of the tallest quest stones. The Ancient Tree at the peak, enormous, with branches reaching into clouds. Color palette: deep purples, soft golds, starlight white, mystical violet, pale moonlight blue. Fireflies, owls in trees, crystals embedded in stones, wispy clouds. Overhead tilted perspective."

**5. `zone-fire-fund.png`** (Fire Zone detail)

Prompt: "Hand-drawn line art with rich watercolor fills, Studio Ghibli art style meets treasure map cartography. Solarpunk aesthetic. Detailed illustration of the Fire Zone of a regenerative village map. A forge district alive with productive energy. Solar arrays gleaming on copper and terracotta rooftops. An observatory tower with a telescope and star charts visible through windows. A forge amphitheatre with tiered stone seating around a central flame. An exchange garden where resources flow between growing beds and trading posts, a living marketplace. A treasury gate carved into a hillside with ornate metalwork doors. The Forge itself with glowing furnaces and a great chimney with smoke wisps. The Great Hall of the Forge, a grand building with high arched ceilings and stained glass windows in flame colors. The Flame Garden at the far end with an eternal flame at center surrounded by blooming fire-colored flowers and fruit trees. Color palette: warm oranges, deep reds, amber glow, copper, bronze, golden yellow. Sparks floating, hawks soaring overhead. Overhead tilted perspective."

**6. `regen-tree-center.png`** (Central tree)

Prompt: "Hand-drawn line art with rich watercolor fills, Studio Ghibli art style meets treasure map cartography. Solarpunk aesthetic. Detailed illustration of the ReGen Tree, the great central tree of a regenerative village. An enormous ancient tree with a massive trunk, wider than a house, with deep textured bark covered in moss and lichens. The canopy spreads across the sky with thousands of leaves in shifting colors: green to gold to purple to silver, reflecting all four elements. Below ground, visible in cross-section: a vast root system spreading in all directions, with glowing bioluminescent mycelium networks pulsing with soft light in green, blue, purple, and orange, connecting to the four zones. At the base: a circular stone platform where all four paths converge, with mosaic tiles in four colors. Small offerings at the roots: flowers, crystals, written notes. Birds nesting in every branch, squirrels, a treehouse platform visible high up. Sunlight filtering through the canopy creating god-rays. Centered composition, slightly tilted perspective."

**7. `village-endgame.png`** (Village reward view)

Prompt: "Hand-drawn line art with rich watercolor fills, Studio Ghibli art style meets treasure map cartography. Solarpunk aesthetic. Panoramic illustration of a regenerative futuristic-yet-ancient elven village with food forest. A thriving village nestled in a valley surrounded by food forests and permaculture gardens. Architecture blends living trees with elegant elven-style buildings: curved organic forms, living roofs with gardens, solar-crystal panels, water features, bridges between treetop homes. A central plaza with the great ReGen Tree at its heart, now in full bloom with golden fruit. Community gathering spaces: an open-air kitchen, a library in a tree, a healing springs bath house, a children's play area in a grove, a star-watching platform on the highest building. Every element is alive: smoke from bakery chimneys, water wheels turning, flags flying, instruments on porches. Extensive food forests with beehives, aquaponics systems, seed libraries. Color palette: full rich spectrum, golden hour lighting, warm and abundant. Wide panoramic composition, slightly elevated perspective."

**If generation succeeds, verify all 7 PNGs exist in `client/public/map/`.**

---

### Part 6: Migration SQL File (Version Control Only)

This file is NOT yet applied in Railway. Create it for Rye to review and run:

**File:** `drizzle/0091_recording_email_pref.sql`

```sql
-- Add recording email preference to newsletter subscribers
ALTER TABLE newsletter_subscribers ADD COLUMN notifyRecordings TINYINT(1) NOT NULL DEFAULT 0;

-- Add "profile" to source enum for subscribers created via profile page
-- Note: MySQL ALTER TABLE for enum changes requires restating all values
-- ALTER TABLE newsletter_subscribers MODIFY COLUMN source ENUM('homepage','investor_form','connect_form','apply_form','footer','exit_intent','other','profile') NOT NULL DEFAULT 'other';
```

---

## What NOT To Do

- Do NOT run any DB migrations. Just create the SQL files.
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
- [ ] Migration file `drizzle/0091_recording_email_pref.sql` created
- [ ] If GEMINI_API_KEY available: all 7 map PNGs generated in `client/public/map/`
- [ ] Zero em-dashes in any user-facing copy

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Run migration 0091 in Railway | DB access | `mysql -h ... < drizzle/0091_recording_email_pref.sql` |
| 2 | Set `GEMINI_API_KEY` env var if needed | API credentials | Railway env vars or local `.env` |
| 3 | `git push` after Claude Code finishes | Git credentials | `git add -A && git commit -m "recording flow + map illustrations" && git push` |
| 4 | Verify Zapier data mapping with a real recording | Riverside account | Record a test session, check webhook logs |

### CLAUDE CODE: can do without you

| # | Task | Status |
|---|------|--------|
| 1 | Zapier data field normalization in riverside.ts | READY |
| 2 | Forum category update to session-recordings | READY |
| 3 | recordings tRPC router (byEventId + list) | READY |
| 4 | Wire recordingsRouter in server/routers.ts | READY |
| 5 | Link recordingId to event in webhook handler | READY |
| 6 | Schedule page "Watch Replay" button | READY |
| 7 | notifyRecordings column in schema + migration SQL | READY |
| 8 | getRecordingSubscribers DB helper | READY |
| 9 | Update sendRecordingEmail to use opt-in list | READY |
| 10 | Recording email toggle in user profile | READY |
| 11 | Email footer text update | READY |
| 12 | Map illustration generation (if API key available) | READY |

### WAITING ON YOU before Claude Code can proceed

Nothing blocked. Claude Code can execute Parts 1-4 and Part 6 immediately. Part 5 (illustrations) requires `GEMINI_API_KEY` to be available in the environment. If it's not set, Claude Code should skip illustration generation and note it in the output.
