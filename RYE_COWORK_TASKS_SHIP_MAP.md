# ReGen Ship Treasure Map — Today's Tasks (Claude Cowork)

The map v2 is shipped and live at https://regencivics.earth/ship/map. It renders 2,868 pins right now. Only a few human-gated things are left to make it complete. This file is one place for all of them.

**Paste this whole file into a fresh Claude Cowork session.** Cowork works top to bottom.

---

## How Cowork should work (read this first, Cowork)

For every task below:

1. **Try to do it yourself, end to end.** Use the terminal and the browser. Run the commands. Fill the forms. Draft the emails. Fetch the credentials from my dashboards where you can (I'm usually already logged in).
2. **Only stop when you hit a wall you genuinely cannot cross:** my login where I'm signed out, a credential you can't find, a payment, sending a message as me, or a physical action. When that happens, don't guess and don't push a wall of text at me. Give me a short, numbered, no-jargon checklist of exactly what to click or type, wait for me to do it, then keep going.
3. **Confirm each task's "Done when" before moving on.** Tell me what you see.

**Machine facts you'll need:**
- Repo folder (run all commands here): `C:\Users\taren\Downloads\regen-civics-clean`. It's on branch `main`. A `.env` with `DATABASE_URL` is already there.
- To check a deploy, the repo's Railway CLI is linked to the wrong service, so always name the real one: `railway deployment list -s "ReGenCivics.Earth"`.
- Tasks 2 and 3 change R2 and the database, not the code, so they need no redeploy. The map picks them up on the next page load.

Priority order: **Task 1 is the only thing making the map look unfinished. Do it first.**

---

## Task 1 — Upload the basemap (the one visible gap) 🔴 blocks the look of the map

Right now the map draws all the pins over a blank parchment background because the basemap tile file isn't uploaded yet. The file gets built and pushed to Cloudflare R2 by one script. The build is done; this is a data upload, no code change.

The script needs five R2 credentials that are **not** in `.env` yet:
`AWS_BUCKET_NAME`, `AWS_REGION`, `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
(the bucket behind `assets.regencivics.earth`; the endpoint is my R2 S3 endpoint, `https://<account-id>.r2.cloudflarestorage.com`).

### 🤖 Cowork does this first
1. Check whether those five values already exist anywhere on my machine (search my `.env` files, a password manager if open, `~/.aws`). If found, add them to `C:\Users\taren\Downloads\regen-civics-clean\.env` (this file is gitignored, secrets stay local).
2. If not found, open the Cloudflare dashboard → R2. Get the bucket name and the **S3 API** endpoint from the bucket's settings, and an **Access Key ID + Secret** from R2 → Manage API Tokens (create a token scoped to that bucket if none exists). Region is `auto`. Write all five into `.env`.
3. Run, from the repo folder:
   ```
   npx tsx scripts/build-ship-basemap.ts
   ```
   Expect it to download a helper binary, extract a 1–3 GB Cascadia slice of the map, then upload it. This takes several minutes and real bandwidth. If it says the daily build URL 404s, re-run with a recent date it prints, e.g. `--build-url=https://build.protomaps.com/20260709.pmtiles`. To test the build without uploading, add `--dry-run`.
4. When it prints "Basemap live at https://assets.regencivics.earth/ship/basemap.pmtiles", open https://regencivics.earth/ship/map and confirm real map tiles (roads, terrain, labels) now sit behind the pins. Open the browser console and confirm no red errors about `basemap.pmtiles`.

### 🙋 If Cowork gets stuck (probably at the Cloudflare login), you do this
1. Cowork will tell you it needs the Cloudflare R2 values. Go to **dash.cloudflare.com → R2**.
2. Click the bucket behind `assets.regencivics.earth`. In its **Settings**, copy the **S3 API endpoint** (looks like `https://abc123….r2.cloudflarestorage.com`) and the **bucket name**. Paste both to Cowork.
3. Go to **R2 → Manage R2 API Tokens → Create API token** (read+write, that one bucket). Copy the **Access Key ID** and **Secret Access Key** it shows once. Paste both to Cowork.
4. That's it. Cowork adds them and runs the rest. If you'd rather run the command yourself: open a terminal in `C:\Users\taren\Downloads\regen-civics-clean` and type `npx tsx scripts/build-ship-basemap.ts`, then tell Cowork what it prints.

**Done when:** the map at `/ship/map` shows tiles behind the pins.

---

## Task 2 — Map data partnerships (warm intros only you can make) 🟡 makes the map more accurate

Three orgs already do this work and their data is open. A warm note from you unlocks what scraping shouldn't. Two payoffs: the **official Cascadia boundary** (we're using an approximate one), and blessed **springs + food-forest** data.

### 🤖 Cowork does this first
1. Draft three short, warm emails in my voice (direct, grounded, specific — no em-dashes, no hype, no "in today's world" openers). Save them so I can review:
   - **Regenerate Cascadia / Cascadia Department of Bioregion** — ask for the Cascadia bioregion boundary + the nine-region boundaries as GeoJSON or shapefile (David McCloskey / Cascadia Institute is the canonical shape). Offer a credit line on `/ship/map`.
   - **Find a Spring Foundation** — ask for a Cascadia springs export, or blessing to cross-reference their pages from our pins. Offer: our crews submit spring updates and water tests back to them.
   - **Falling Fruit** — tell them a church program's free, non-commercial community map uses their Cascadia food-forest data with attribution (CC-BY-NC-SA), ask for their blessing and any bulk-export or API-key guidance. Offer crew discoveries back.
2. Find the right contact address/form for each (their sites, contact pages) and pre-fill everything. Show me the drafts.
3. **Stop and hand me the send.** Do not send as me.

### 🙋 Your part
1. Read Cowork's three drafts, tweak anything that doesn't sound like me, hit send (or approve Cowork to send from my account if I say so explicitly).
2. When any file comes back (a `.geojson`, `.shp`, a springs export, a Falling Fruit API key), drop it in this folder and tell Cowork, or start a Claude Code session with: *"Import this into ship_locations per CLAUDE_CODE_PROMPT_2026-07-10_SHIP_MAP_V2.md Section 6, source-stamped; swap the boundary into shared/data/cascadia-boundary.geojson if it's the official Cascadia shape."*

**Done when:** the three emails are sent. (Data flows in over the following days; that's a later Claude Code step, not a today blocker.)

---

## Task 3 — Optional data imports (only if you already have the source) 🟢 nice-to-have

Two importers are built and ready but need a source you provide. Skip either you don't have handy right now.

### 🤖 Cowork does this first
- **Falling Fruit food forests** — if I have (or Task 2 produced) a Falling Fruit API key: add `FALLINGFRUIT_API_KEY=<key>` to `.env`, then run `npx tsx scripts/seed-ship-foodforest-ff.ts --dry-run` to preview counts, then the same command without `--dry-run` to load them.
- **NOAA hot springs** — if I can point you at a CSV or GeoJSON of the NOAA/NGDC thermal-springs inventory: `npx tsx scripts/seed-ship-hotsprings.ts --url=<url>` (or `--file=<path>`), `--dry-run` first.
- Both are idempotent (safe to re-run). After a live run, reload `/ship/map`, toggle **"Verified only"** off, and confirm the new faded (unverified) pins appear.

### 🙋 Your part
Just tell Cowork whether you have a Falling Fruit key or a NOAA data link. If not, this waits on Task 2. Nothing breaks either way.

**Done when:** any source you have is loaded, or you've told Cowork to skip.

---

## Task 4 — Ground-truth the boondocks (ongoing, only you can) ⚪ no rush

The map already has researched Tier 1 + Tier 2 free boondocks (the 60-mile ring around Ashland and the Ashland→Portland corridor), each marked with a rig-length estimate. The 40-foot confirmations are the one thing only a driver can make. There's nothing to do at a keyboard.

### 🙋 Your part, over time
When you're at one of these spots and confirm a 40-footer really fits, open its pin on `/ship/map` and tap **"Confirmed, still true."** If a gate's locked or the road's washed out, tap **"Flag a problem."** That's it. It bumps the pin's freshness and feeds the admin queue.

**Done when:** ongoing. No deadline.

---

## Everything else (not today)

The broader ReGen Ship program tasks (Outdoorsy listing, Zeffy forms, Railway ship vars, GPS tracker, photo/video, insurance, DEQ, counsel packet, hiring the Keeper) live in **`RYE_BROWSER_TASKS_REGEN_SHIP.md`**, same folder. None of them block the map. Do those when you're ready; each is its own paste-into-Cowork block there.

---

### Quick status recap
- ✅ Map v2 shipped, live, 2,868 pins, deploy verified green.
- 🔴 Task 1 (basemap upload) — the only thing making the map look unfinished today.
- 🟡 Task 2 (partnership emails) — 15 minutes of your time to send three notes.
- 🟢 Task 3 (optional imports) — only if you have a key/link.
- ⚪ Task 4 (ground-truthing) — whenever you're out there.
