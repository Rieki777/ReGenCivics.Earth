# QA-3 · checked and CLEAN, stated explicitly

Base SHA `b5bed01`. LOCAL unless marked. A category not listed here was not checked, and a category
listed here was exercised, not read.

## The brief's named items

| Item | Verdict |
|---|---|
| The break-glass decline printing "Saved!" over a declined change | **CLOSED.** Driven in a browser: Save, dialog, "Leave it" gives "Left it with Steward Circle. The act did not go through." No "Saved!", no stuck "Saving...", `GET /api/content/team` unchanged. |
| The exit policy checkbox that clears the placeholder warning over platform boilerplate | **CLOSED.** 409 naming all four fields. Editor carries a field for all five printed terms plus a per-field stale marker. |
| Voting weights require a written reason and land in the append-only trail | **TRUE.** No reason gives 400. With a reason gives 200, the trail row, and a member notification I read from the member's own account. |
| Orphan sweep: does the list match what removal removes | **YES.** Two named, two removed, nothing else. |
| Orphan sweep: does removing one break a live reference | **NO.** Referencing a file from the brand hero pulled that file and its `.thumb.webp` sibling off the list; both still serve 200 after the sweep ran. |
| Module go-live: does each state mean what the UI says | **YES.** off 404/404/404, preview 404/404/200, members 401/200/200, public 200/200/200, read as anon / member / founder. |
| R59: does the pool's own share visibly recycle | **YES.** `/modules` renders "The pool 10,000 / To builders 0 / Back into the pool 10,000 / Next cycle holds 20,000" plus "No module has been opened this cycle, so the whole pool carries forward." |
| Village Brain sections reaching members | **The write lands and the audience wall works.** Member reads the member-audience section at `GET /api/village/brain`, does not read the admin-audience one, anon gets 401. Its reach through the guide is NOT MEASURABLE (no LLM key). |
| Project History "Discussion topics" localStorage only | Confirmed, one line, per house rules section 7 item 6. |

## The persistence question

Cold reload: **21 needles written across 21 controls, 21 survived a full server process restart.**
Nothing lived only in an in-memory document cache. The one line reading GONE is `tools`, which was
never written (see the unmeasured list).

## The operator controls found genuinely WIRED

Each was changed with founder credentials, then read back from the surface a member or a signed-out
visitor sees, then re-read after a process restart.

Site Content: village dues; Visit Program; Investor Summary; Build Progress (create); Work With Us;
FAQs (create). Content: Team Page. Training: Training Modules (create). The Game: Quests (create);
Circles and Map (create circle); Season (multi-season save); Game Mechanics dial
(`org.public_people`); Org Chart (create seat); Calendar (create gathering); Library (create
category); Stays (create accommodation); Voting Weights; Tokens (create, rename, hand-mint); Game
Roles (grant a capability, with the escalation confirm); The Handover (move a power to a role). The
Guide: Village Brain (member section, admin section). Documents: Uploaded Files (orphan list, orphan
removal). Notifications: Email Settings. Setup Wizard: identity, pictures. Module Library: lifecycle
off / preview / members / public, and twenty modules enabled.

## Gates

- `check-save-honesty.mjs` clean, 200 mutating calls, 321 files. Its seven unreadable-method calls
  read by hand: **seven examined, zero defects.**
- `check-admin-reach.mjs` clean, 0 orphans, 11 standing debt. One standing item confirmed still
  orphaned by hand, proved against a known-present control in the same sweep.
- `check-repo-payloads.mjs` clean: 12 payload literals, every payload names every required column.
- `check-brand-refs.mjs` clean. Its SHOPFRONT exemption is the reason HIGH-2 passes CI, and that is a
  stated design decision rather than a gate hole.

## Rendering and reachability

- **48 of 48 admin tabs render** as founder at 1440x1000 with every module on. 1789 form controls,
  **0 covered**, 0 unmeasurable, 1 console error.
- **55 of 55 routes render** signed out on a fresh fork. No 500s, no blank pages. Four routes I first
  guessed do not exist and are honest 404s; the real paths are `/investor`, `/steward`, `/resident`,
  `/prosperity`, `/campaigns`.
- `/project-history` and `/journey-to-launch` refuse a signed-out visitor with a sentence naming who
  they are for, not a blank.
- **R55 at zero:** `/powers` and Admin, The Handover both render every power identically at zero held.
  No fraction, no total, no percentage, no ranking, no countdown, no cross-village comparison.
- A power moved to a role nobody sits in reads **"Steward Circle holds this, and nobody is sitting
  there yet"** on the member page. The honest sentence, not a fallback.
- The Setup Wizard prints "Amora's value: ..." under every identity field and says "Blank fields keep
  Amora's value as the suggestion." That is the right pattern, and it is why the two HIGH fork
  findings are about the surfaces the wizard does not cover.

## Honest refusals (not defects), 30 responses

Exit policy false claim (409, four fields named). Weight change with no reason. Orphan removal with
no digest. Orphan removal with a stale digest (409 plus the fresh report). Training module with no
type. Tool with no purpose. Tool with an unknown category (points at a real editor). Badge with an
unknown kind. Library category with no label. Forum config with the wrong shape (names the shape).
Resources source with an unknown kind (names all eight). Org relation with an unknown type. Game
Mechanics with an unknown variable key. Six module_disabled 404s while the module is off. Three
core-module lifecycle refusals. Introductions before messaging (names the missing module). Handover
before the role carries the power (names the step). First-role escalation 409 naming the consequence.
Two break-glass 409s naming the holder. enable-all-modules.mjs refusing to report success on a stale
list. Anonymous `/api/village/brain` 401. A member correctly not seeing an admin-audience brain
section.

**Zero writes were accepted into a void.** Every refusal named what was wrong.
