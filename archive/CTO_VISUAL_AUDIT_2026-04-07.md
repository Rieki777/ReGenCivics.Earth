# CTO Visual Audit: 2026-04-07

**Auditor:** Claude (Opus 4.6), acting as pre-launch CTO review
**Target:** https://regencivics.earth
**Launch:** Earth Day 2026-04-22 (15 days out)
**Method:** Live browser walk via Claude in Chrome across every primary
route, DOM scans for Writing Rule 1 violations and error boundaries,
network + console inspection, spec cross-reference for quest locking.

---

## Executive Summary

The site is in strong shape for launch. Most of what the POST_CTO sprint
originally scoped was already shipped. This audit found **one true launch
blocker** (a React crash on `/tools`, now patched in this repo), **two
content polish items** that should be cleaned up before Earth Day, and
**a social-sharing gap** (missing per-route OG images) that will hurt
every share on Twitter, LinkedIn, and iMessage until it ships.

Nothing else in this audit should delay launch.

---

## Severity Key

- **LAUNCH BLOCKER**: must ship before 2026-04-22
- **HIGH**: should ship before 2026-04-22
- **MEDIUM**: nice to have, not blocking
- **NOTE**: tracked for post-launch

---

## LAUNCH BLOCKERS

### LB-1. `/tools` page React crash (FIXED in repo, needs deploy)

**Status:** Patched in this session. Not yet deployed.

**Symptom:** Navigating to `/tools` triggered the global React error
boundary and rendered "Something went wrong / An unexpected error
occurred." Every user who visited /tools hit this.

**Root cause:** Schema mismatch between `trpc.tools.list` (server) and
`ToolsLibrary.tsx` (client).

The server's `parseToolRow` helper in `server/routes/tools.ts` lines
275-287 transforms each row into:

```ts
{
  categories: [{ name, slug, color }, ...],  // array of objects
  shortSummary: string,
  pricingModel: string,
  totalClicks: number,
  ...
}
```

The client component was destructuring `tool.categories` as
`string[]`, `tool.summary`, `tool.pricing`, `tool.clickCount`. Two
separate things blew up:

1. `{cat}` where `cat` is `{name, slug, color}` threw
   "Objects are not valid as a React child" inside the category pill
   loop.
2. `tool.pricing.charAt(0).toUpperCase()` threw TypeError because
   `tool.pricing` was undefined (the field is `pricingModel`).

**Fix (already applied to `client/src/pages/ToolsLibrary.tsx`):**

Rewrote the card render callback to locally normalize the fields with
the correct names and render `cat.name` instead of `cat`:

```tsx
{(tools as any[]).map((tool) => {
  const pricingModel: string = tool.pricingModel ?? "free";
  const categories: { name: string; slug?: string; color?: string }[] =
    Array.isArray(tool.categories) ? tool.categories : [];
  const summary: string = tool.shortSummary ?? "";
  const clickCount: number = tool.totalClicks ?? 0;
  const pricingLabel = pricingModel === "open_source"
    ? "Open Source"
    : pricingModel.charAt(0).toUpperCase() + pricingModel.slice(1);
  // ...
  {categories.slice(0, 3).map((cat, i) => (
    <span key={cat.slug ?? `${cat.name}-${i}`}>{cat.name}</span>
  ))}
  // ...
})}
```

**What Rye needs to do:** Recover git index (see POST_CTO prompt), stage
`client/src/pages/ToolsLibrary.tsx`, commit, push. Railway will rebuild.
Then re-verify `/tools` loads without the error boundary.

---

### LB-2. Missing per-route OG images (7 pages)

**Status:** Not started. Blocks the social sharing launch story.

**Problem:** `SOCIAL_SHARING_SPEC.md` calls for a static Open Graph
image per primary route (1200x630 webp + jpg fallback). The server
has an OG endpoint and the `SharePrompt` component exists, but the
static files have not been generated for the 7 top-level marketing
routes. Right now every share of these pages falls back to the generic
`og-default.jpg`, which is the least effective possible moment: the
first impression someone gets before they click.

**Routes missing images:**

1. `/bionomics`
2. `/land`
3. `/quest`
4. `/forum` (or `/community` if that is the canonical route)
5. `/tools`
6. `/hymn-book`
7. `/features`

**What to do:** Either (a) hand-design 7 webp/jpg files and drop them in
`public/og/` per the spec, or (b) add these 7 routes to the dynamic
`server/routes/og.ts` generator so they render at build time from a
template. Option (b) is faster and consistent with what's already there
for blog posts.

**Acceptance:** Paste each URL into the Twitter/X Card Validator and
confirm a unique, on-brand image shows.

---

### LB-3. Tokenomics duplicate sections

**Status:** Flagged during live walk. Needs a content decision from Rye.

**Problem:** `/tokenomics` contains two of each of these sections:

- "How Returns Flow" appears twice. Lines 1080-1190 of `Tokenomics.tsx`
  render a version built around the `ReturnsFlowDiagram` component plus
  three explainer callouts. Lines 1214 onward render a second version
  built around the `HowReturnsFlowToggle` component.
- "How to Acquire $RCivics" appears twice. Lines 1199-1213 use the
  `AcquisitionRoutes` component. Lines 1237 onward are a hand-written
  static expanded version with numbered routes.

Users see both, back to back, and it reads like a bug. It's not a bug.
It's two iterations of the same content that were both committed.

**What to do:** Rye picks which version of each section stays. Then
delete the losing blocks.

My recommendation without knowing the latest intent: keep the component
versions (`ReturnsFlowDiagram`, `AcquisitionRoutes`) because they'll be
easier to iterate on later, and delete the hand-written expanded blocks.
But this is a content call, not a technical one.

---

## HIGH

### H-1. Writing Rule 1 violation in HymnBook SEO title (FIXED)

**Status:** Fixed in this session.

Found an em-dash in the HymnBook page's SEO title and file header
comment:

- File comment line 2: `Hymn Book — community song submissions` →
  `Hymn Book: community song submissions`
- `<SEO title>` line 42: `"Hymn Book — Community Song Submissions"` →
  `"Hymn Book: Community Song Submissions"`

This was the only em-dash I found in the pages I walked. Broader
grep-based sweep of `client/src/pages/` is still worth doing, but the
user-visible damage on top routes is clean.

### H-2. Community page contains 2 em-dashes in quest titles

**Status:** Content, not code. Needs DB or seed edit.

During the `/community` (forum) walk I saw em-dashes in two user-facing
strings that appear to come from seeded quest/prompt content (not hand
authored blog posts). I could not pin the source rows live. Rye should
run a quick SQL scan before launch:

```sql
SELECT id, title FROM forum_threads WHERE title LIKE '%—%';
SELECT id, title FROM quests WHERE title LIKE '%—%';
SELECT id, content FROM forum_posts WHERE content LIKE '%—%' LIMIT 50;
```

Replace each em-dash with a colon or a period. This is a five minute
cleanup but it's Writing Rule 1 and it ships to every visitor.

### H-3. `.ink-reveal` and `.blur-up` hero animations not wired

**Status:** CSS exists in `index.css`. DOM placements deferred.

The animation utility classes are defined site-wide but never attached
to any hero image or h1. Adding them needs a human eye on each page,
not a blind find-replace. Tracked as H-1 in the POST_CTO prompt.

Scope: Home, Bionomics, Fund, Game, Tokenomics, Land, Team. About 10
minutes in `npm run dev` with a browser open.

### H-4. Sentry DSN not wired in production env

**Status:** Blocker for post-launch debugging, not for launch itself.

`SENTRY_DSN` and `VITE_SENTRY_DSN` need to be set on Railway before
launch so that any error that slips through shows up with a
source-mapped stack. Otherwise the first week of launch traffic is
debugging blind. Rye only. Tracked in POST_CTO H-2.

---

## MEDIUM

### M-1. Fund page "Join the Movement" section is soft filler

The `/fund` page closes with a "Join the Movement" style CTA block that
trips Writing Rule 5 (passive inspiration). It's not catastrophic but
it's the last thing a potential donor reads and it reads like
boilerplate. A one-pass rewrite from Rye in his own voice would tighten
it. Non-blocking.

### M-2. Map key restriction (Rye-only, tracked in POST_CTO LB-1)

The Google Maps JavaScript API key currently has no referrer restriction
set. Anyone who scrapes the key from the bundle can burn quota against
Rye's billing account. Two minutes in the GCP console. Moved out of
"launch blocker" because no active abuse is happening, but absolutely
should happen this week.

### M-3. Citizenship tier nightly batch end-to-end test

`checkCitizenshipTiers` exists and is wired to the batch scheduler but
has never had an end-to-end test against a real user with an expired
grace period. Tracked in POST_CTO M-1. Not blocking, but worth a
one-hour spike before launch so no player silently fails to get
demoted.

---

## VERIFIED CLEAN

Things I specifically checked and found healthy:

- **Quest locking system:** Full audit in
  `FIX_17_QUEST_LOCKING_AUDIT_2026-04-07.md`. PASS with 2 minor notes.
  All 7 spec files present, all 14 Done Criteria satisfied, season
  rotation math correct for April 2026 (month=3, spring unlocks first).
- **`/quest` page live render:** "The Rites of Passage" h1, 19 images,
  0 broken, no error boundary, zero em-dashes in visible DOM.
- **Recording flow Zapier normalization:** `server/webhooks/riverside.ts`
  lines 229-237 handle both flat (`data_title`, `data_youtube_url`) and
  nested (`data.title`) payload shapes. HMAC-SHA256 in place.
- **`notifyRecordings` opt-in toggle:** `RecordingEmailToggle` in
  `UserNotificationPreferences.tsx` lines 107-147 is mounted and wired
  to `trpc.newsletter.recordingNotifyStatus` +
  `trpc.newsletter.toggleRecordingNotify`.
- **Network tab across routes walked:** All tRPC batch calls returned
  200 OK. No 4xx/5xx from our own endpoints.
- **Console tab across routes walked:** Clean except for MetaMask SES
  extension noise from my test browser profile, which is not us.
- **Home page hero, Bionomics hero, Fund hero, Land hero, Team page:**
  Render correctly, no broken images, no layout breaks at 1700px wide.

---

## NOT TESTED THIS PASS

Honest list of what I couldn't verify in-session. Rye or a second pass
should cover these before launch day:

1. **Mobile viewport (390x844).** Chrome in this sandbox has a minimum
   window width near 1700px, so I could not simulate phone sizes. Rye
   should spot-check `/`, `/quest`, `/fund`, `/tokenomics`, `/map`,
   `/community` on a real phone.
2. **Locked-card rendering for anonymous visitors on `/quest`.** Flagged
   in Fix 17 audit Note B. The DOM scan did not surface
   `opacity-40 grayscale` for anonymous visitors. Possible reasons: hook
   reads local storage (fresh anon would have none), lazy hydration, or
   the scan missed it. Five minute live check: open `/quest` in a
   private window, confirm only Fire and Food Foresting are in full
   color.
3. **Checkout / Stripe / donate flow.** I did not test any flow that
   takes money. Rye should run one real $1 donation end to end before
   launch to confirm the webhook, receipt email, and Sentry crumb all
   fire.
4. **Authenticated flows.** I audited as an anonymous visitor. The
   signed-in `/profile`, notification preferences, admin panel, and
   forum posting flows were not walked this pass.
5. **Heal-the-Land seed data.** The POST_CTO prompt's H-3 item. The
   seed script run and prod verification are Rye-gated (needs DB
   access).

---

## Handoff Breakdown

What Claude Code can do autonomously after git index is recovered:

- Deploy the `/tools` fix (it's already in the working tree).
- Wire `.ink-reveal` / `.blur-up` to hero sections.
- Generate the 7 missing OG images via the dynamic endpoint OR drop
  static files if Rye provides art direction.
- Run a site-wide em-dash grep across `client/src/`, `server/`, and
  `public/` and fix any found.
- Delete the Tokenomics duplicate section once Rye says which version
  to keep.
- Write the Heal-the-Land seed script per the database skill.

What Rye must do:

- Recover `.git/index` corruption (sandbox can't `rm` it).
- Set `SENTRY_DSN` and `VITE_SENTRY_DSN` in Railway env.
- Restrict the GCP Maps API key to `regencivics.earth` referrers.
- Run the em-dash SQL sweep against quests / forum_threads /
  forum_posts tables on Railway.
- Pick which duplicate Tokenomics section to keep.
- Mobile spot-check on a real phone.
- One real $1 donation end-to-end test.

---

## Verdict

**Ship-ready after these three blockers clear:**

1. Deploy the ToolsLibrary fix (code is done, just needs push).
2. Generate the 7 missing per-route OG images.
3. Decide and delete one of the two Tokenomics duplicate section pairs.

Everything else on this audit is polish or post-launch tech debt. The
site is in good shape for Earth Day.
