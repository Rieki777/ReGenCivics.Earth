# Fixes to Make — 2026-06-25 Live Sweep

A walkthrough of the live site (regencivics.earth) after the recent deploys. Ten fixes and improvements, prioritized. Each lists the page where I saw it. Note on method: the browser would not render at a true phone width from my side (the capture stayed desktop), so these were found at desktop width and the mobile-specific ones still want an on-device Safari confirm.

## Confirmed working (recent fixes that are live)

- Alliance "How to Join" accordions expand and collapse correctly (`/ally`).
- Fund buttons are real links: Pitch Deck, Book a Call, View Investment Thesis (`/fund`). The investor deck PDF now resolves (`regen-civics-investor-deck-v3`).
- "Start a Dialogue" rename shipped; "Infinite Game" is capitalized (`/community`, `/play`).
- Tools "Explore" links now point to the real external sites (`/tools`).

## The 10

### 1. Forum thread page is washed out and low-contrast (High)
On `/community/post/600` the whole post sits under a heavy dark overlay. The thread title, the governance lifecycle strip ("Dialogue"), the "Ready to sense the room?" prompt, and "Promote to decision" all render as dark gray on dark green and are barely legible. Raise the faint text tiers (`text-white/30` through `/50`) in `GovernanceLifecycleStrip.tsx` and the thread page, and reduce the page background overlay opacity on `/community/post/*`. This is the most important visual fix.

### 2. Nav wordmark collides with the menu pills (High)
The "ReGen Civics" logo top-left is clipped and overlapped by the "4 Paths" and "Play the Game" pills. Seen across `/play`, `/community`, `/community/post/*`, `/tools`. Give the wordmark its own min-width and spacing, or collapse the menu earlier so they never overlap.

### 3. Home "Pick up where you left off" thumbnails fail on reload (High)
The three cards (Journey Quests, Back to the Forum, Seasonal Accelerator) showed images on first load and came back as empty dark cards on reload. Looks like a flaky image load. Check the `/api/img` proxy and the lazy-load trigger, and add a visible fallback so a missed image does not leave a blank card. Seen on the home page.

### 4. Home assumes a returning user for first-time and logged-out visitors (Medium, improvement)
The home hero says "Welcome Back to ReGen Civics," "Pick up where you left off," and tags cards "YOUR PATH." A brand-new or logged-out visitor has nothing to pick up and no path yet. Show a first-visit variant (a welcome and an invitation to choose a path) when there is no session or history, and keep the "Welcome Back" variant for returning players.

### 5. Community hero title is low-contrast (Medium)
On `/community` the "Gathering Grove" title renders as muted gray on the dark forest hero and is hard to read. Lighten the title or add a focused scrim behind the text only.

### 6. Tool card logos are missing (Medium)
On `/tools` every tool card (Hypha, LocalScale, Gitcoin, Hylo) shows an empty gray square where the logo should be. Wire the logo asset (or a clean lettermark fallback) so the cards do not look broken.

### 7. Governance lifecycle strip shows on every thread and feels crowded (Medium, improvement)
The four-stage strip plus "Ready to sense the room?" plus the emoji row plus "Promote to decision" all stack on an ordinary quest discussion thread. It reads heavy and competes for attention. Gate the strip (or show a simplified one-line version) until a thread is actually nearing governance, and tighten the spacing and hierarchy when it does show.

### 8. Reversibility explanation uses a hover-only tooltip (Medium)
In `GovernanceLifecycleStrip.tsx` (and `PerspectiveControl.tsx`) the reversibility meaning is delivered via the HTML `title` attribute, which never appears on touch. On a phone the explanation is invisible. Move it to tap-to-reveal or render it inline.

### 9. Thread page has a large dead band at the top (Low)
On `/community/post/*` there is a tall empty dark area between the top nav and the breadcrumb/title. Tighten the top padding so the thread starts higher.

### 10. Living Tree on the profile is still the basic render (Improvement)
The profile tree is the minimal version. The bioluminescent overhaul is fully planned in `CLAUDE_CODE_PROMPT_2026-06-25_LIVING_TREE.md` with the style anchor locked. This is the single biggest visual upgrade to the player profile; prioritize shipping it.

## Still outstanding

A true mobile Safari pass. I could not get the live site to render at a real phone width from here, and all of your original feedback is iOS Safari. Run items 1, 7, and 8 (the governance strip, its contrast, and the tooltip) plus the perspective control on your actual phone, or I can hand Claude Code a device checklist.

## Handoff Breakdown — Who Does What

### YOU (Rye)

| # | Task | Where |
|---|------|-------|
| 1 | On-device Safari confirm of items 1, 7, 8 and the perspective control | Your iPhone |
| 2 | Confirm whether the home first-visit variant (item 4) is wanted | Reply in chat |
| 3 | Push and approve the Railway deploy after Claude Code commits | Local + Railway |

### CLAUDE CODE

| # | Task | Status |
|---|------|--------|
| 1 | Raise contrast on thread page + governance strip; reduce post overlay (item 1) | READY |
| 2 | Fix nav wordmark collision (item 2) | READY |
| 3 | Fix home thumbnail load + fallback (item 3) | READY |
| 4 | Home first-visit vs returning variant (item 4) | READY on HUMAN #2 |
| 5 | Community hero title contrast (item 5) | READY |
| 6 | Tool card logo asset/fallback (item 6) | READY |
| 7 | Gate/simplify governance strip; tighten hierarchy (item 7) | READY |
| 8 | Replace hover tooltips with tap/inline (item 8) | READY |
| 9 | Tighten thread page top spacing (item 9) | READY |
| 10 | Ship the Living Tree overhaul (item 10, separate plan) | READY |
| - | Ship Gate before VERIFIED (audit-truncation, className grep, typecheck) | required |

## Writing rules

No em-dashes, capitalize Game as a noun, plain language.
