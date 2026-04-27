# Launch Runbook: Rye-only items (2026-04-07)

Do these in order. Some depend on others.

---

## STEP 1. Recover git index and push the staged fixes (~5 min)

PowerShell, in the repo root:

```powershell
cd C:\path\to\regen-civics-clean
Remove-Item -Force .git\index, .git\index.lock -ErrorAction SilentlyContinue
git reset
git status
```

You should see 4 modified files:

- `client/src/pages/ToolsLibrary.tsx`
- `client/src/pages/HymnBook.tsx`
- `client/src/components/AnimatedSection.tsx`
- `client/src/pages/GameMechanics.tsx`

Run typecheck (sandbox couldn't run this):

```powershell
npm run check
```

If clean, commit and push:

```powershell
git add client/src/pages/ToolsLibrary.tsx client/src/pages/HymnBook.tsx client/src/components/AnimatedSection.tsx client/src/pages/GameMechanics.tsx
git commit -m "fix(ui): launch blocker batch - tools crash, hero animations, hymn-book em-dash, game-mechanics tooltips and file repair"
git push
```

Watch Railway auto-deploy. Wait for green before moving on.

**Verify after deploy:**

- `/tools` loads without the error boundary
- `/game-mechanics` scrolls all the way down with Live Variables visible
- Tooltip question-mark icons appear next to every variable label on `/game-mechanics`
- `/hymn-book` title has no em-dash

---

## STEP 2. Restrict the GCP Maps API key (~3 min)

1. https://console.cloud.google.com/
2. Top bar: confirm the right project (the one billing the Maps API)
3. Left nav: APIs & Services → Credentials
4. Click the Maps JavaScript API key name (not the checkbox)
5. Under **Application restrictions**, select "Websites" and add:
   - `https://regencivics.earth/*`
   - `https://*.regencivics.earth/*`
   - `http://localhost:5173/*`
   - `http://localhost:3000/*`
6. Under **API restrictions**, select "Restrict key" and enable only:
   - Maps JavaScript API
   - Places API (if used)
   - Geocoding API (if used)
7. Save. Propagation is ~5 minutes.

**Verify:** reload `regencivics.earth/map` after 5 min. If the map breaks, devtools console will tell you the exact origin the key rejected and you can add it.

---

## STEP 3. Set Sentry DSN in Railway (~10 min)

**Get a DSN first if you don't have one:**

1. https://sentry.io → your org → Projects → New Project
2. Platform: pick "React" (single project for both server and client is fine for a site this size)
3. On the Configure page, copy the DSN. Looks like `https://abc123@o000.ingest.sentry.io/123`

**Add it to Railway:**

1. https://railway.app → your regen-civics project → the web service
2. Variables tab
3. Add two variables with the same value:
   - `SENTRY_DSN` = the DSN
   - `VITE_SENTRY_DSN` = the same DSN (Vite needs the `VITE_` prefix to expose it to the client bundle)
4. Railway triggers a redeploy automatically.

**Verify:** after redeploy, open `regencivics.earth`, open devtools console, paste:

```js
throw new Error("sentry test " + new Date().toISOString())
```

Check Sentry → Issues. The error should appear within 30 seconds. If it does, Sentry is wired. If not, the DSN is probably only on the server side; double-check `VITE_SENTRY_DSN` is set.

Source maps upload is post-launch. You'll still get readable prod stacks with minified line numbers.

---

## STEP 4. Em-dash SQL sweep (~5 min)

Two options. Pick whichever is faster for you.

**Option A: Railway dashboard query tool**

1. Railway → your project → MySQL service → Data tab → Query
2. Run each of these and note any rows returned:

```sql
SELECT id, title FROM forum_threads WHERE title LIKE '%—%';
SELECT id, title FROM quests WHERE title LIKE '%—%';
SELECT id, LEFT(content, 200) AS snippet FROM forum_posts WHERE content LIKE '%—%' LIMIT 100;
SELECT id, name FROM land_projects WHERE name LIKE '%—%' OR description LIKE '%—%';
SELECT id, displayName, description FROM game_variables WHERE description LIKE '%—%' OR displayName LIKE '%—%';
```

**Option B: Railway CLI from PowerShell**

```powershell
railway link
railway connect MySQL
# then paste the SQL above at the mysql> prompt
```

**Fix each hit manually.** Don't mass-REPLACE. Some should become `:`, some `.`, some rewritten. Example:

```sql
UPDATE quests SET title = REPLACE(title, '—', ':') WHERE id = 42;
```

Count is probably small (< 10 rows total based on what I saw in the live walk).

---

## STEP 5. Heal-the-Land DB seed (~2 min)

From the repo root, after `.env` has the Railway `DATABASE_URL`:

```powershell
npx tsx scripts/run-migration.ts --status
npx tsx scripts/run-migration.ts --all
```

If a `drizzle/XXXX_heal_the_land*.sql` file exists, it'll be applied. If nothing like that exists yet, skip this step. Claude Code can write the seed script in the next session (it's marked H-3 in the POST_CTO prompt).

---

## STEP 6. Real $1 donation end-to-end (~5 min)

1. Incognito window, regencivics.earth
2. Navigate to the donate/fund flow
3. Donate $1 with a real card (use your own)
4. Confirm all of these:
   - Stripe charge appears in your Stripe dashboard
   - Receipt email lands in the inbox you used
   - Sentry shows no errors during the flow
5. Refund the $1 from the Stripe dashboard immediately after

If any step fails: note exact step and screenshot it. Don't debug during the test. Come back after.

---

## STEP 7. Mobile spot-check on a real phone (~10 min)

Open each of these on your phone and watch for layout breaks, overflowing content, unreadable text, tap targets that are too small, and any blank sections:

- `/` (home)
- `/game-mechanics` ← most important; confirm Live Variables renders after the fix
- `/tools` ← confirm crash fix holds
- `/fund`
- `/tokenomics`
- `/quest`
- `/map`
- `/community`
- `/hymn-book`

On `/game-mechanics` specifically, also tap a few question-mark icons to confirm tooltips work on touch (Radix should handle this but worth confirming).

---

## STEP 8. Twitter Card Validator spot-check (~2 min, after STEP 1 deploys)

https://cards-dev.twitter.com/validator

Paste each of these and confirm a unique image shows:

- `https://regencivics.earth/`
- `https://regencivics.earth/fund`
- `https://regencivics.earth/tokenomics`

If they all fall back to the generic default image, that's LB-2 from `CTO_VISUAL_AUDIT_2026-04-07.md` (7 routes missing per-route OG images). Flag it for the next Claude Code session; it's blocking the social sharing story but not the site itself.

---

## Out of scope for this runbook

These are tracked but don't fit in this pass:

- **CSP nonce migration (C1 from POST_CTO).** Code change, needs dev server plus staged verification. Post-launch.
- **Schema drift fix.** Needs your call on which path to take. Tell me which direction you want and Claude Code can implement it.
- **7 pre-existing test failures.** Separate cleanup pass. Not blocking launch.

---

## Quick reference: what was fixed this session

Files currently modified in your working tree that will ship with STEP 1:

| File | What changed |
|---|---|
| `client/src/pages/ToolsLibrary.tsx` | Render against actual tRPC response shape (pricingModel, shortSummary, totalClicks, categories as object array). Unblocks /tools. |
| `client/src/components/AnimatedSection.tsx` | IntersectionObserver threshold 0.1 → 0 plus on-mount rect check. Unblocks long sections like Live Variables. |
| `client/src/pages/HymnBook.tsx` | Em-dash removed from SEO title and file header. Writing Rule 1. |
| `client/src/pages/GameMechanics.tsx` | Repaired truncated tail (Trust Graph card + closing tags). Added HelpTip component and plain-language tooltips for every variable in Live Variables, Game Simulator, and Gratitude System sections. |
