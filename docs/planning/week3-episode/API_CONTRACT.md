# Week 3 board: API contract for phase 2

Written 2026-10-13 evening by the CORE lane, after the shared contract landed and passed (`npx vitest run shared/`, 80 files, 1,375 tests; `pnpm check` clean). Three lanes build in parallel from here: **SERVER**, **STAGES**, **PROFILE**. Follow this file exactly. Where it differs from `WEEK3_BOARD_SPEC_V1.md`, this file wins, because it carries Rye's decisions of 2026-10-13.

## 0. Ground rules for every lane

- Never commit, push, stash, reset, checkout or rebase. The lead does all git. Write only inside this worktree.
- Database: only the scratch MariaDB (`rc_week3` on 127.0.0.1:3307). Its URL is in the scratchpad file `scratch-db-url.txt`; set `DATABASE_URL` and `TEST_DATABASE_URL` from it. Never read the repo root `.env` (production). Never write to regencivics.earth.
- **No migration.** `kind` and `block` are VARCHAR(16), `text` VARCHAR(400), vote `target` VARCHAR(32). Everything below fits.
- **Shared files are frozen.** `shared/sessionBoard.ts`, `shared/humanNeeds.ts`, `shared/boardEntries.ts`, `shared/season2Curriculum.ts` and their tests belong to CORE. If you need a change there, stop and tell the lead; do not edit them. A pure helper only your lane needs goes in your own files.
- Copy rules for every string you add: Rye's voice, plain, warm, second person. No em-dash or en-dash. No "not X but Y". None of delve, journey, unlock, empower, seamless, tapestry, foster, leverage. Say "human needs" (plain "needs" means crowdpool asks on this site). No money, returns or legal-structure claims. Prefer the copy constants that already exist (section 1) over writing new strings.
- Every board stays open (Rye): never close a board automatically, and never write code that assumes a board closes after its session. "Session ended" (the clock) is not "board closed" (`status`).

## 1. What CORE already built (import, don't redefine)

### `shared/sessionBoard.ts`
| Export | What it is |
|---|---|
| `STAGE_KINDS`, `StageKind` | adds `"checkin"`, `"prompt"`, `"needs"` |
| `STAGE_RENDERERS` | kind to component name: `CheckIn`, `PromptStage`, `NeedsStage` for the new three |
| `SlideRef`, `PromptOption`, `BoardPrompt`, `PromptRef` | types (see the file's doc comments) |
| `BoardStage` | adds optional `lede`, `slides`, `prompts`, `step` (`pick`/`depth`/`meet`/`room`), `quote`, `notes`, `feedback` |
| `WEEK3_DECK` | **the one deck constant**: `fileId` + `pages` (clean slide number to page id). 1 and 2 are placeholders `NEW1`, `NEW2` |
| `BOARD_DECKS`, `slideHref(week, n)`, `stageSlides(week, stage)`, `isPlaceholderSlideId(id)` | `slideHref` returns `https://docs.google.com/presentation/d/<fileId>/edit#slide=id.<pageId>`, or null for a placeholder |
| `boardStages(3)` | the 17 stages, 120 minutes (indices below) |
| `boardWelcome(3)` | Part 1 of 2 lede, four "We leave with" lines |
| `CHECKIN_COPY`, `PROMPT_COPY`, `NEEDS_COPY`, `TELL_US_COPY`, `CLOSE_COPY_WEEK3` | every new board string; `fillCopy(template, vars)` fills `{name}`, `{n}`, `{week}`. `TELL_US_COPY.topic` is now a `{week}` template with `topicNext` and `sentNext` fallbacks (contract check) |
| `promptsForWeek(week)` | `Map<key, BoardPrompt>`, definitions only |
| `promptHomes(week)` | key to the stage index that defines it |
| `resolvedPrompts(week, index)` | a stage's prompts with `{ ref }` resolved, ref words laid over; each has `isRef` |
| `anonymousKeys(week)` | Week 3: `mate`, `pulse-a`, `pulse-b`, `useful` |
| `promptMax(p)` (default 1), `promptFull(p)` (the refusal sentence) | |
| `PROMPT_KEY_RE` `/^[a-z0-9-]{1,16}$/`, `OPTION_KEY_RE` `/^[a-z0-9-]{1,24}$/` | |
| `askBlock(i)` = `s<i>`, `parseAskBlock(block)`, `canAskFrom(week, i)` | `canAskFrom`: true only for a `prompt` or `needs` stage (contract check) |
| `ITEM_KINDS` (+`ask`, `answer`), `NOTE_ITEM_KINDS` (everything but `answer`), `NoteItemKind` | |
| `BOARD_LIMITS.answersPerAuthor` 300, `.answersPerBoard` 10000 | `maxTextFor("ask" \| "answer")` = 300 |
| `voteTarget.checkin(cardId)` = `checkin:<id>` | |
| `CHECKIN_APPLICATION_STATUSES` (submitted, under_review, approved, active), `PUBLIC_PLACE_STATUSES` (approved, active) | |
| `foldProjectName(name)` | the one name fold for every dedupe |
| `TileRef`, `tileRef(t)`, `parseTileRef(ref)`, `TILE_REF_RE` | `p12` (this board's card), `a57` (application), `w2p8` (earlier week's card) |

Week 3 stage indices (0-based), kind, and keys defined there:

| i | Stage | kind / step | Prompt keys (defined here unless marked ref) |
|---|---|---|---|
| 0 | Welcome | welcome | |
| 1 | Tap your project | checkin | |
| 2 | Drop in | breath | (existing `arrive` items) |
| 3 | What you came for | prompt | `ask` (mode ask), `hope` (note, max 2) |
| 4 | What it's all for | prompt | `mate` (pick, room, anonymous), `feel` (**private**), `purpose` (note, max 1) |
| 5 | What your project is for | needs / pick | `needs` (pick, max 10), `top` (pick, max 3, full "Three seeds each. Take one back to move it."), `other` (note, max 3) |
| 6 | How deep, how wide | needs / depth | `n-<id>`, `g-<id>`, `b-<id>` for all ten (pick, max 1, `need` set), `whole` (pick, max 1), `pulse-a` (room, anonymous) |
| 7 | Living ways | prompt | `living` (note, 1), `allies` (pick, max 4) |
| 8 | Who meets each need | needs / meet | `m-<id>` for all ten (pick, 1, options carry `tip` on market and holder), `want` (note, 3), `pulse-b` (room, anonymous) |
| 9 | Who decides | prompt | `decide-now`, `decide-aim` (pick, 1), `play` (note, 1) |
| 10 | Circles and players | prompt | `circles` (pick, 4), `players`, `players-now` (pick, 1), `calls` (note, 1, `link`) |
| 11 | From the centre out | prompt | `economies` (pick, 1), `rite` (note, 1) |
| 12 | Your project in one breath | needs / room | ref `purpose` (title "Polish your first line...") |
| 13 | Your questions, and next week | prompt | ref `ask` (the wall), `box` (pick, 6), `move` (note, 1), `week4` (pick, 3) |
| 14 | Tell us | prompt, `feedback: true` | `landed` (note, room, max 2), `useful` (room, anonymous) |
| 15 | Close | close | (existing `leave` items) |
| 16 | Get your Village OS | getvillageos | |

### `shared/humanNeeds.ts` (no imports from sessionBoard; keep it that way)
`shownAnswerRows(items, hiddenProjectIds)` (contract check: drop hidden rows and rows on hidden cards before any view), `HUMAN_NEEDS` (id, label, word, plain, deck, hue; pinned to Village OS), `HUMAN_NEED_IDS`, `humanNeedById`, `isHumanNeedId`, `needShort`, `NEED_RUNGS`, `rungLabel`, `rungMeaning(rung, needId)`, `BREADTH_STOPS`, `WHOLE_STOPS`, `MEET_WAYS` (key, label, small, by, tip), `DECIDE_OPTIONS`, `CIRCLES`, `MATE_SCALE`, `PULSE_OPTIONS`, `ALLIES`, `PLAYER_COUNTS`, `ECONOMIES`, `BOX_STEPS`, `WEEK4_PICKS`, `USEFUL_SCALE`, `FEEL_WORDS`, `NEEDS_KEYS`, `perNeedKeys(id)` (the un-pick cascade keys), `SEEDS_PER_PERSON`, `AnswerRow`, `projectView(items, projectId)`, `othersLine(others, label)` ("2 of you say Unmet."), `projectCardLines(view)`, `toVillageOsScope(view)`, `customNeedKey`, `needsSummary(items)`.

`projectView` and `needsSummary` read the public `items` as they come from `get`: a count of rows is a count of people, because the server keeps one row per person per key (and per option on a many-pick). No author key ever has to reach a page.

### `shared/boardEntries.ts`
`describeItem(week, item)`, `describeVote(target, { itemText })`, `describeCard(card)`, `entryStage(week, item)`, `weekHeading(week)`, `adminApplicationPath(id)` (contract check), `SUBMISSIONS_COPY`, `EXPORT_WHY`, `EXPORT_COPY`, the export types `BoardExport`, `BoardExportWeek`, `BoardExportProject`, `BoardExportRow`, `BoardExportAnon`, and `boardExportCsv(data)` / `csvCell(v)` (formula-safe CSV). (The brief put `describeItem` in humanNeeds.ts; it lives here so humanNeeds.ts never imports sessionBoard.ts, which would be a load-order cycle.)

## 2. Row conventions (the server keeps these true; the views rely on them)

- **Answer row:** `session_board_items` with `kind = "answer"`, `block = <prompt key>`, `text = <option key>` (pick) or the cleaned words (note, `cleanBoardLine(text, 300)`), `projectId` = the tapped card or null, `authorKey = keys[0]`, `displayName` = the name kept in the browser (null when anonymous), `createdAt` = when its current answer was given (reset on replace).
- **Uniqueness (logical, enforced by `answer`):** per `(authorKey, projectId, block)` at most `promptMax(p)` rows; on a pick, at most one row per `(authorKey, projectId, block, text)`. "Same person" means any of the caller's keys (`callerKeys`).
- **Scope:** `scope: "room"` and `anonymous` force `projectId = null`. Anonymous also forces `displayName = null`.
- **Question row:** `kind = "ask"`, `block = s<stage index>`, optional `projectId`. The facilitator's **Answered** is the existing `chosen` flag (`curateItem({ chosen })`). No server change.
- **Check-in mark:** `session_board_votes` row `target = checkin:<cardId>`, `voterKey = keys[0]`. One per person per card (the unique key already guarantees it).
- **The private card (`feel`) is never sent.** No procedure takes it; `answer` refuses its key. No request, no storage of any kind.

## 3. tRPC procedures (router `sessionBoard`)

Existing helpers to reuse: `callerKeys`, `requireKeys`, `writableBoard`, `projectOnBoard`, `itemOnBoard`, `cleanName`, `facilitatorProcedure`, `bumpVersion`, `ensureBoard`, `findBoard`, `canFacilitate`. Existing refusal sentences stay word for word.

### 3.1 `get` (public query, changed)
Input unchanged `{ week }`. Not rate-limited (unchanged). Changes:
1. Rows with `kind = "answer"` and `block` in `anonymousKeys(week)` are **removed from `items` for everyone, facilitators included**.
2. New field `answerCounts: Record<string, Record<string, number>>`: for each anonymous key, counts by option over its unhidden rows. Every option of the prompt is present, starting at 0.
3. New field `checkins: Record<number, number>`: from `rows.counts`, targets starting `checkin:`, card id to count.

Everything else (hidden rows, `applicationId` and `displayName` facilitator-only, no author keys) is unchanged.

### 3.2 `whoami` (public mutation, changed)
Output adds:
- `anon: { key: string; option: string }[]`: the caller's own anonymous answers on this board (so the page can show their pick even though `get` hides the rows).
- `checkins: number[]`: card ids the caller checked in with on this board, oldest first.

`itemIds` already includes answer and ask rows (by author key). Rate limit unchanged (30/min).

### 3.3 `addItem` (public mutation, changed)
- `kind: z.enum(NOTE_ITEM_KINDS)` (so `answer` is refused by zod). **Do this first**: until it lands, `z.enum(ITEM_KINDS)` would let `addItem` write an `answer` row.
- `block: z.union([z.enum(GAME_BLOCK_KEYS), z.string().regex(/^s\d{1,2}$/)]).optional()`.
- `kind = "ask"`: `block` must parse with `parseAskBlock` to an index `i` with `canAskFrom(week, i)` (a `prompt` or `needs` stage; contract check: an index merely inside the list let Week 2 take questions from any stage), else BAD_REQUEST **"Ask from a stage on this board."**. `projectId` optional; when given, an unhidden card on this board, else NOT_FOUND **"That project is not on this board."** (the existing sentence).
- `kind = "game"`: block must be a game block (existing sentence "Pick a block on the canvas.").
- Other kinds: `block` stored null, `projectId` only for pain/opp (unchanged).
- Caps: asks count toward `itemsPerAuthor` (80, existing sentence) and `itemsPerBoard` (2000). **`countRows(db, "items", ...)` must now exclude `kind = "answer"`** so answers never crowd out notes.
- Rate limit unchanged (30/min).

### 3.4 `removeItem` (public mutation, changed)
Unchanged rules (writer or facilitator; existing sentence "You can only take back what you wrote."). Two additions:
- If the row is `kind = "answer"` and `block = "needs"`, also delete the same author's rows on the same board and `projectId` (null-safe compare) where `(block = "top" AND text = row.text) OR block IN perNeedKeys(row.text)`.
- Output adds `removedIds: number[]` (the row and anything cascaded).

### 3.5 `answer` (NEW, public mutation)
Rate limit `ANSWER_LIMIT = { windowMs: 60_000, max: 90 }` (a household on one wifi shares a guest limit).

```ts
export const answerInput = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("pick"),
    week: weekInput,
    voterKey: voterKeySchema.optional(),
    key: z.string().regex(PROMPT_KEY_RE),
    projectId: idInput.nullable(),
    option: z.string().regex(OPTION_KEY_RE),
    on: z.boolean(),
    displayName: z.string().max(200).optional(),
  }),
  z.object({
    op: z.literal("note"),
    week: weekInput,
    voterKey: voterKeySchema.optional(),
    key: z.string().regex(PROMPT_KEY_RE),
    projectId: idInput.nullable(),
    text: z.string().min(1).max(1000),
    displayName: z.string().max(200).optional(),
  }),
]);
// output
type AnswerResult = { ok: true; id: number | null; removedIds: number[] };
```

Steps, in this order (first failing step refuses):

| # | Check | Refusal |
|---|---|---|
| 1 | `requireKeys(callerKeys(...))` | BAD_REQUEST "Reload the page so your browser can hold your place on the board." (existing) |
| 2 | `writableBoard(db, week, facilitator)` | BAD_REQUEST "This board is closed. It stays up as the week's record." (existing) |
| 3 | `prompt = promptsForWeek(week).get(key)` | NOT_FOUND **"That question isn't on this board."** |
| 4 | `prompt.mode === "private"` | BAD_REQUEST **"That one stays on your screen."** |
| 5 | `prompt.mode === "ask"` | BAD_REQUEST **"Add a question with the question box."** |
| 6 | `op` pick on a note prompt | BAD_REQUEST **"That question takes words."** |
| 7 | `op` note on a pick prompt, or `option` not in `prompt.options` | BAD_REQUEST **"Tap one of the choices."** |
| 8 | project: room scope or anonymous forces null; otherwise a non-null id must be an unhidden card on this board | NOT_FOUND "That project is not on this board." (existing) |
| 9 | note text `cleanBoardLine(text, 300)` empty | BAD_REQUEST "Write something first." (existing) |

Then, **inside one transaction that locks the board row** (`select ... from session_boards where id = ? for update`, like `actOnBoard`), so a double tap or two devices cannot pass `max`:

- Read the caller's rows: `kind = "answer" AND block = key AND projectId <=> pid AND authorKey IN keys`, newest first.
- **pick, on:**
  - a row with `text = option` exists: return `{ id: thatRow.id, removedIds: [] }`, no write, no version bump.
  - `key === "top"` and the caller has no `needs` row with `text = option` on the same project: BAD_REQUEST **"Pick this human need first, then plant a seed on it."** (`PROMPT_COPY.pickFirst`).
  - `max === 1` and a row exists: UPDATE that row `text = option, createdAt = NOW()` (and `displayName` unless anonymous); delete any further rows defensively; return its id.
  - rows `>= max`: BAD_REQUEST `promptFull(prompt)` (the usual sentence is **"That's all of yours for this one. Take one back to change it."**; `top` says **"Three seeds each. Take one back to move it."**).
  - caps (skip the per-author one for facilitators): caller's answer rows on this board `>= answersPerAuthor` → BAD_REQUEST **"You've answered a lot on this board already. Ask the facilitator to add the rest."**; answer rows on the board `>= answersPerBoard` → BAD_REQUEST "This board is full." (existing).
  - insert; return the new id.
- **pick, off:** delete the caller's rows with `text = option`. If `key === "needs"`, cascade exactly as `removeItem` (3.4) for the caller's keys. Return `{ id: null, removedIds }`. Nothing to delete is not an error.
- **note:** `max === 1` and a row exists: UPDATE `text, createdAt = NOW()`, return its id. Rows `>= max`: refuse with `promptFull(prompt)`. Else caps as above, insert, return id. Taking back a note answer is `removeItem`.
- `bumpVersion` when anything changed.

Facilitators answer as themselves: `max` applies to them too. Answers never count toward `itemsPerAuthor` (80) or `itemsPerBoard` (2000).

### 3.6 `checkInOptions` (NEW, public query)
Input `{ week: weekInput }`. Not rate-limited (a query, like `get`); cache the application and earlier-week reads in memory for 15 seconds per week. Output:

```ts
type CheckInOptions = {
  tiles: {
    ref: string;                     // tileRef(...)
    name: string;
    place: string | null;
    cardId: number | null;           // set only when from === "board"
    from: "board" | "application" | "earlier";
    fromWeek: number | null;         // set only when from === "earlier"
    here: number;                    // checkin:<cardId> count on this board (0 when not a card yet)
  }[];
};
```

Build, deduping with `foldProjectName` and keeping a running set of seen application ids and seen folded names:
1. **This board's cards**, unhidden (hidden cards are never tiles, facilitators included). Seed the seen sets with the `applicationId`s and names of **every** card on this board, hidden ones too (contract check: otherwise hiding a stray brings its application or its Week 2 card straight back as a tile, and a tap makes a new card).
2. **Earlier weeks' cards**: for `w` from `week - 1` down to 2, unhidden cards on that week's board; skip a card whose `applicationId` or folded name is seen; otherwise add it (`from: "earlier"`, `fromWeek: w`, `place` as stored) and mark its id and name seen. Earlier cards come before applications so a returning project keeps its original writer.
3. **Season 2 applications** (`applications.season = 2`, status in `CHECKIN_APPLICATION_STATUSES`, non-empty `projectName`), read approved and active first, then newest first: skip if its id or folded name is seen; otherwise add (`from: "application"`) **and mark its id and name seen**, so two applications with one name make one tile. `place` = cleaned `location` only when status is in `PUBLIC_PLACE_STATUSES` and the location isn't "TBD"; else null. Never return any other application field (no `userId`, no `stewardUserId`).

Sort by `foldProjectName(name)`. Application ids are already public (`applications.publicDetail`, `mapData`), so `a<id>` adds no exposure. Card `applicationId` stays facilitator-only, as in `get`.

### 3.7 `checkIn` (NEW, public mutation)
Rate limit `CHECKIN_LIMIT = { windowMs: 60_000, max: 20 }`.
```ts
input  { week: weekInput; voterKey?: voterKey; ref: z.string().regex(TILE_REF_RE) }
output { ok: true; cardId: number; name: string; created: boolean }
```
(Contract check: the unused `displayName` input is gone. The name a person types travels with each answer and question, as before.)

Refusals: no keys (existing sentence); closed board (existing); `p<id>` not an unhidden card here: NOT_FOUND "That project is not on this board."; application missing, not season 2, or status not in `CHECKIN_APPLICATION_STATUSES`: NOT_FOUND **"That project isn't open for check-in."**; earlier ref with `week >= current` or `< 2`, or the card missing or hidden: NOT_FOUND **"That project isn't open for check-in."**; an `a` or `w` ref with no unhidden match here whose `applicationId` or folded name matches a **hidden** card on this board (a stale tile for a project the facilitator hid): NOT_FOUND **"That project isn't open for check-in."** (contract check); creating past `projectsPerBoard`: BAD_REQUEST "The circle is full." (existing).

Inside one transaction that locks the board row (so two taps on one tile make one card):
- `p<id>`: the card itself.
- `a<id>`: this board's unhidden card with that `applicationId`; else an unhidden card with the same folded name and no `applicationId`, which gets `applicationId` set (linked); else create `{ name: cleanBoardLine(projectName, 120), place: (public status ? cleaned location : null), applicationId, authorKey: null, displayName: null }`. **Contract check: `authorKey` is null, not the applicant.** Rye's decision 13 says to create it "with the name and applicationId". An applicant author would put "You added Toa Hermitage" on the profile of a founder who never came, count them as the card's writer in the export, and give them a card they never touched. Nobody owns it, and facilitators curate it, the same as a register import.
- `w<w>p<id>`: this board's unhidden card with the earlier card's `applicationId` (if any), else with its folded name; else create `{ name, place, url, applicationId: earlier.applicationId ?? (the one Season 2 application with status in `CHECKIN_APPLICATION_STATUSES` whose folded name matches, if exactly one) ?? null, authorKey: earlier.authorKey, displayName: earlier.displayName }`, so the original writer still owns it (Rye's decision 13).
- Then insert the check-in mark `checkin:<cardId>` for `keys[0]` (`onDuplicateKeyUpdate` no-op). Bump the version if a card was created or linked, or the mark is new.

No per-person project cap here: the card's author is never the caller. Do **not** build `importSeasonProjects`: tiles are derived live (Rye's decision 13). The existing `importRegister`, the facilitator's "Link to an application" select (`curateProject.applicationId`), and `addProject` stay as they are.

### 3.8 `claimGuest` (NEW, protected mutation)
Rate limit `CLAIM_LIMIT = { windowMs: 60_000, max: 6 }`.
```ts
input  { voterKey: voterKeySchema }
output { ok: true; moved: number; merged: number; boards: number }
```
Moves every row the browser's guest key owns, **on every board**, to the signed-in account. `from = "k:<voterKey>"`, `to = "u:<ctx.user.id>"`. For each board with any `from` row, in a transaction locking that board row:
- **Votes:** if `to` already has the same `(boardId, target)`, delete the `from` row (`merged++`); else UPDATE `voterKey = to`.
- **Projects:** UPDATE `authorKey = to`.
- **Items:** UPDATE `authorKey = to`. Then restore the answer rules for `to` on that board, per `(projectId, block)` with `p = promptsForWeek(week).get(block)`: on a pick, keep the newest row per `text`; then keep the newest `promptMax(p)` rows; delete the rest (`merged += deleted`). Keys no longer in the week's prompts are left alone.
- `bumpVersion`.

Idempotent: a second call finds no `from` rows and returns zeros. **Never log the key** (log `"[sessionBoard] claimGuest failed"` and the error message only). Touches session board tables only; the Season Schedule's rows under the same key are out of scope. Holding the key already lets its holder edit and take back those rows, so claiming adds no new power.

### 3.9 `mySubmissions` (NEW, protected query)
Rate limit `{ windowMs: 60_000, max: 30 }`. No input. Reads rows by `u:<ctx.user.id>` only (guest rows arrive through `claimGuest`, which the profile calls first).
```ts
type MySubmissions = {
  weeks: {
    week: number;
    title: string;            // weekHeading(week).title
    href: string;             // weekHeading(week).href
    lastAt: string;           // ISO, newest thing in the week
    projects: { cardId: number; name: string; how: "added" | "checked in" }[];
    entries: {
      id: string;             // "i<itemId>", "v<voteId>", "c<cardId>:<field>"
      stage: string | null;   // boardStages(week)[entryStage(...)]?.name; a card's fields: the "circle" stage name
      label: string;          // describeItem / describeVote / describeCard
      value: string;
      project: string | null; // card name, null = for the room
      anonymous: boolean;     // block in anonymousKeys(week)
      at: string;             // ISO
    }[];
  }[];
};
```
Rules: every Season 2 board (`SESSION_BOARD_SEASON`) where the user has an item or a vote, or authored a card with something written on it (`describeCard(card)` gives at least one entry). **Contract check:** a card that only carries a name and place (one a check-in carried forward from an earlier week for its original writer) never makes a week appear on its own, so nobody's profile says they took part in a week they missed; on a week that does appear it is listed with `how: "added"`. Leave out hidden items. Leave hidden cards out of `projects`; an entry given for one still names it. Votes: `describeVote`, with `itemText` reading the opportunity's text on that board; `checkin:` votes become `projects` with `how: "checked in"`; authored cards become `how: "added"` plus their `describeCard` entries. A project both added and checked in shows once as "added". Weeks newest first; entries by `entryStage` (null last), then `at`. Omit empty weeks. Week 2 is included.

### 3.10 `adminExport` (NEW, admin query)
`adminProcedure`, rate limit `{ windowMs: 60_000, max: 10 }`.
```ts
input  z.object({ weeks: z.array(weekInput).max(12).optional() }).optional()
output BoardExport   // shared/boardEntries.ts
```
- Weeks: the given ones, else every week 2 to 13 that has a board. `status: "none"` only for a week asked for that has no board.
- `projects`: every card, hidden included (flagged), with `applicationName` and `applicationStatus` (join `applications`), `projectPath = projectPathForApplication(id, name)` only when the application is approved or active, `adminPath = adminApplicationPath(id)` for any linked application (contract check: most Week 3 tiles are submitted or under review, so `projectPath` alone left admins without a link), `addedBy` from the author key's prefix (`u:` signed-in, `k:` guest, null), `checkins` from the vote counts.
- `rows`: every item except anonymous answers, hidden included (flagged), with `label`/`value` from `describeItem`, `stage` from `entryStage`, the card's name and `applicationId`, `displayName`, `author` from the prefix, `userId` for `u:` keys only. **A guest key never leaves the server.**
- `anonymous`: each anonymous answer as `{ key, label, value, createdAt }`, nothing else (as stored: no name, no project, no author).
- `votes`: counts by target with `describeVote` labels; `checkin:` targets are left out (they are `projects[].checkins`).
- `summary`: `needsSummary(shownAnswerRows(items, hiddenCardIds))` when `promptsForWeek(week).has("needs")`, else null. `projectViews` read the same shown rows (contract check: the raw rows include hidden ones and rows on hidden cards).
- `projectViews`: when the week asks the human needs questions, one per unhidden card with any answer row, plus the room (`cardId: null`, name "From the room") if it has any: `{ cardId, name, lines: projectCardLines(view), villageOs: toVillageOsScope(view) }`.
- `why: EXPORT_WHY`, `generatedAt` ISO.

The client makes CSV with `boardExportCsv(data)`; the server never builds CSV.

### 3.11 No server change needed
- **Answered** on a question: existing `curateItem({ itemId, chosen })`. Add one guard to `curateItem`: a `text` edit on an `answer` row whose prompt is a pick refuses with BAD_REQUEST **"A pick can't be reworded. Hide it instead."**
- **+5 min**: existing `act({ type: "plan", stage: liveStage, minutes: plan[liveStage] + 5 })` (capped at 120 by the schema).
- `setStatus` stays (manual close and reopen). Nothing calls it automatically.

### 3.12 Rate limits at a glance
| Procedure | Limit / min |
|---|---|
| `answer` | 90 |
| `checkIn` | 20 |
| `claimGuest` | 6 |
| `mySubmissions` | 30 |
| `adminExport` | 10 |
| `addItem`, `removeItem` | 30 (unchanged) |
| `whoami` | 30 (unchanged) |
| `get`, `version`, `checkInOptions` | none (queries; `checkInOptions` caches 15 s) |

## 4. Client hook API (`client/src/components/session-board/useSessionBoard.ts`, SERVER lane)

Storage keys, every read and write in try/catch, the page working without storage:
- `session-board:project:<week>`: `{"cardId":12,"name":"Toa Hermitage"}` or `{"learn":true}`.
- `session-board:last-project`: `{ "name", "cardId", "ref", "week" }`, written on every check-in, for Week 4's "Same today?".
- The guest key stays `season-voter-key`. It never appears in a log or a URL.

New exports:
```ts
export type MyProject = { kind: "project"; cardId: number; name: string } | { kind: "learn" } | null;

/**
 * Claims this browser's guest rows for the signed-in person, once per page load. Idempotent on the server.
 * Contract check: it reads useAuth() itself and calls claimGuest only once a user is known, including a
 * sign-in that happens on this page through AuthDialog (no reload). It READS `season-voter-key` and never
 * mints one: no stored key, no call (sessionVoterKey() would write a fresh key on the profile page). A failed
 * claim is silent (no toast) and is tried again on the next page load.
 */
export function useClaimGuest(onClaimed?: (r: { moved: number; merged: number }) => void): void;

/** The check-in tiles, refetched when the board's version moves (at most every 10 s). */
export function useCheckInTiles(week: number, version: number | undefined): { tiles: CheckInOptions["tiles"]; loading: boolean };
```
`useSessionBoard(week)` returns, in addition to today's fields:
- `myProject: MyProject`, `setMyProject(p: MyProject)`: read from storage on mount; when the board loads, a stored card that is gone or hidden reads as null; with nothing stored and `whoami.checkins` non-empty (a signed-in person on a new device), the last check-in becomes the pick.
- `mine` gains `anon: Map<string, string>` (key to option) and `checkins: Set<number>`.
- It calls `useClaimGuest` itself; on `moved > 0` it runs `refreshMine()` and a board sync and shows the toast `SUBMISSIONS_COPY.claimed`.

New `actions` (all resolve without throwing; a failed save shows the server's sentence and rolls back through the existing writer):

| Action | Arguments | Returns | Optimistic behaviour |
|---|---|---|---|
| `answerPick` | `{ key, option, on, projectId: number \| null }` | `Promise<boolean>` | Room scope or anonymous: send `projectId: null`. Same option already mine: resolve true, no request. `max` 1 with a row of mine: change its text in place, `createdAt` now. At `max`: toast `promptFull(p)`, resolve false, **no request**. `top` with no `needs` row of mine for that option: toast `PROMPT_COPY.pickFirst`, false, no request. On: paint a temp row (negative id, `createdAt: new Date()`), swap in the real id and add it to `mine.itemIds`. Off: paint the removal, and for `needs` the cascade (my `top` row for it and my `perNeedKeys` rows). Anonymous: rows are not in `items`, so paint `board.answerCounts[key][option]` up or down (the old option down on a replace) and `mine.anon`. Queue with `writer.fifo("answer:<key>:<projectId or room>", ...)` so taps on one prompt stay in order. |
| `answerNote` | `{ key, text, projectId: number \| null }` | `Promise<{ id: number } \| null>` | `max` 1 with a row of mine: replace its text in place. At `max`: toast, null, no request. Else temp row, then real id. |
| `ask` | `{ text, stageIndex, projectId: number \| null }` | `Promise<{ id: number } \| null>` | `addItem({ kind: "ask", text, block: askBlock(stageIndex), projectId })` with the existing temp-row paint. |
| `checkIn` | `ref: string, tile?: { name: string; cardId: number \| null }` | `Promise<{ cardId: number; name: string } \| null>` | With `tile.cardId` known: `setMyProject` at once, then save the mark in the background. Otherwise await the server (the tile shows `CHECKIN_COPY.joining`), then `setMyProject`. Writes `session-board:last-project`. |
| `removeItem` | unchanged | unchanged | Now also paints the `needs` cascade. |

`addItem`'s input union becomes `kind: NoteItemKind`, `block?: string`. The existing `paint` helpers in `boardWriter.ts` gain what the new fields need (`answerCounts`, `checkins`); keep `boardWriter.test.ts` green and extend it.

## 5. `StageProps` additions (STAGES lane, `stages.tsx`)
```ts
export type StageProps = {
  /* existing */ board; week; stages; index; facilitator; canWrite; mine; actions; now; serverNow; go;
  myProject: MyProject;
  setMyProject: (p: MyProject) => void;
  displayName: string;          // now on every stage (was only passed to Circle)
  setDisplayName: (v: string) => void;
  signedIn: boolean;            // from useAuth() in SessionBoard.tsx, for the guest sign-in link
  look: (i: number) => void;    // contract check: moves THIS screen only, never the room
};
```

**`look` (contract check).** `go` calls `act({ type: "go" })` for a facilitator, so a facilitator pressing the chip's "Tap your project", or "Go back" on How deep, how wide, would move every screen in the room. `look(i)` sets the view and stops following (`setView(i); setFollowing(false)`), for everyone, facilitators included. Use `look` for those two buttons; keep `go` for the rail, the footer and the keys.

What STAGES builds, briefly (the spec's section 2 and 3 carry the detail; copy comes from the constants):
- `CheckIn`, `PromptStage`, `NeedsStage`, exported by those names from `stages.tsx` (they may live in `week3/` and be re-exported). Add a client test that every `STAGE_RENDERERS` value is an export of `stages.tsx`.
- `SessionBoard.tsx`: branches for the three kinds before the `Close` fallthrough; `"needs"` and `"checkin"` in `WIDE`; pass the new props; a **"+5 min"** button in the cues panel while a session is running (3.11); Close stats for a week with a `checkin` stage read `CLOSE_COPY_WEEK3.stats` (projects with a check-in or an answer, distinct human needs picked, `top` rows, `ask` rows) and the stage's `lede` when set.
- On every `prompt` and `needs` stage: the project chip (`PROMPT_COPY.forProject` / `forRoom` with a "Tap your project" button that moves only this screen to the `checkin` stage), the slides line from `stageSlides` (a placeholder renders "slide 1" with no link; links open in a new tab with `rel="noopener noreferrer"`), and the questions foot line (`PROMPT_COPY.askFoot`, `actions.ask` with this stage's index).
- **The private card:** local `useState` only. No tRPC call, no `localStorage`, no `sessionStorage`, nothing in the URL. The dictation mic is allowed (Rye's call; `DictationButton` uses the browser's own speech service and sends nothing to our server). Its hint is the config's hint, word for word. Contract check: the field also sets `autoComplete="off"`, has no `name`, and sits outside any `<form>`, so the browser's form history keeps nothing either. Add a component test: typing and tapping words calls no mutation and no `Storage.prototype.setItem`.
- Anonymous prompts show the person's own pick (`mine.anon`) and the room's counts (`board.answerCounts`) with `PROMPT_COPY.countsOnly`; never names.
- Stage 13's wall: every `ask` row newest first with its project's name; facilitators toggle Answered (`curateItem chosen`).
- Stage 14's feedback box (`stage.feedback`): calls the existing `seasonSchedule.sendFeedback({ topic, facilitation, isPublic, displayName, projectName })`, copy from `TELL_US_COPY`. Contract check: the box's title is `fillCopy(TELL_US_COPY.topic, { week })`, where `week` is the next session that hasn't started, from `useSeasonSchedule()` (the same filter `SessionBoard.tsx` uses for `nextSession`); with none, `TELL_US_COPY.topicNext`. Boards stay open, so someone doing Week 3 in Week 6 is asked about Week 7, which is where the server files it. After sending: `fillCopy(TELL_US_COPY.sent, { week: result.week })`, or `TELL_US_COPY.sentNext` when `result.week` is null (the procedure returns `week: number | null`).
- Guests on stage 2 get `CHECKIN_COPY.saved` and the `CHECKIN_COPY.signIn` link, which opens the site's existing `AuthDialog` (`@/components/AuthDialog`, `returnTo` defaults to this page). `onLogin` is a required prop: invalidate `auth.me` there so `signedIn` flips and `useClaimGuest` runs. Signed-in people get the `saved` line without the link.
- **Add your project checks you in** (contract check): when `actions.addProject` resolves with an id, call `actions.checkIn(tileRef({ from: "board", cardId: id }), { name, cardId: id })`, so the new card gets its check-in mark, its "here" count, and a place in the person's profile and in the Close stat "Projects checked in".
- **Views read shown rows** (contract check): pass `shownAnswerRows(board.items, hiddenCardIds)` to `projectView` and `needsSummary`. A facilitator's `get` includes hidden rows and rows on hidden cards.
- **The Recap keeps the Welcome on Week 3** (contract check): once the session has ended, stage 0 turns into `SessionRecap`, which returns nothing until the recording is mapped. Boards stay open for people going at their own pace, so on a week with a `checkin` stage, render the `Welcome` (Part 1 of 2 lede, "We leave with") under the Recap at stage 0. Week 2 stays as today.
- **No "Close the board" on Week 3's Close** (contract check): on a week with a `checkin` stage, the Close stage shows no "Close the board" button; "Open the board again" still shows if a board is closed. Every board stays open (Rye, 2026-10-13), and the button sits one tap from "End session". `setStatus` stays on the server. Week 2's Close is unchanged.
- Week 2 renders exactly as today.

## 6. PROFILE lane
- `client/src/components/profile/SessionSubmissions.tsx`: the **"Weekly sessions"** section. Calls `useClaimGuest(() => utils.sessionBoard.mySubmissions.invalidate())`, then shows `trpc.sessionBoard.mySubmissions`: per week (newest first) the heading linking to `href`, the projects line ("You added" / "You checked in with"), and every entry as label and value with its project (or `SUBMISSIONS_COPY.forRoom`) and, for anonymous ones, `SUBMISSIONS_COPY.anonymous`. Words from `SUBMISSIONS_COPY`. Mounted in `PlayerProfile.tsx`'s `SubmissionsTab`, right after "Land Project Applications" (one import, one element).
- `client/src/components/admin/SessionBoardExport.tsx`: `EXPORT_COPY` words, two buttons that fetch `utils.client.sessionBoard.adminExport.query()` on click (never on mount) and download `regen-session-boards-<date>.json` and `.csv` (`boardExportCsv`) through a Blob. Mounted in `client/src/components/admin/AdminEventsTab.tsx` right after `<AdminSeasonSchedule />` (one import, one element). Admins already manage the Season there.

## 7. File ownership (phase 2)

| Lane | Owns (only these) |
|---|---|
| **SERVER** | `server/lib/sessionBoard.ts`, `server/routes/sessionBoard.ts`, any new `server/lib/sessionBoard*.ts`, `server/sessionBoard.test.ts` and any new server test for the board, `client/src/components/session-board/useSessionBoard.ts`, `client/src/components/session-board/boardWriter.ts` and `boardWriter.test.ts` |
| **STAGES** | `client/src/pages/SessionBoard.tsx`, `client/src/components/session-board/stages.tsx`, new files under `client/src/components/session-board/week3/`, `client/src/components/session-board/session-board.css`, new client tests for those |
| **PROFILE** | `client/src/pages/PlayerProfile.tsx` (one section added), new files under `client/src/components/profile/` (`SessionSubmissions.tsx`), `client/src/components/admin/SessionBoardExport.tsx`, `client/src/components/admin/AdminEventsTab.tsx` (one mount line) |
| **CORE** (frozen in phase 2) | `shared/sessionBoard.ts`, `shared/humanNeeds.ts`, `shared/boardEntries.ts`, `shared/season2Curriculum.ts`, their tests, `shared/sessionCourse.test.ts` |
| **Lead** | git, `.ai/docs/` (a DOMAIN-LANGUAGE entry for "Human needs (on a board)" and an ADR for prompt stages and answer rows; re-check the next ADR number on origin/main right before pushing), `SHIPPED_LOG.md` |

Shared files someone else may need to touch, and why:
- `client/src/components/session-board/boardWriter.ts`: the optimistic paint helpers; SERVER owns it with the hook, since every new action paints through it.
- `server/_core/trpc.ts`, `server/routers.ts`: **no change needed** (`rateLimited`, `adminProcedure`, `protectedProcedure` exist; `sessionBoard` is mounted).
- `client/src/components/AuthDialog.tsx`: used as is by STAGES; no change.
- `.env.example`: no new variables.
- STAGES depends on SERVER's hook signatures in section 4. Until they land, code against the signatures above; the shapes are fixed here.

## 8. Tests each lane adds
- **SERVER** (against the scratch DB): every refusal in 3.5 with its sentence; `max` 1 replaces in place (same id, new text, new `createdAt`); `max` 3 refuses a fourth; `top` needs a pick; room scope drops `projectId`; anonymous stores no name or project and `get` returns counts only, `whoami.anon` returns the caller's pick; un-pick cascades through `answer` and through `removeItem`; answers skip the 80-notes cap and the 2000 notes count; `addItem` refuses kind `answer` and takes `ask` with a stage block and a project; `checkInOptions` dedupes by application id then name, earlier before applications, place only for public statuses; `checkIn` for each ref kind, linking a same-name card, two concurrent taps make one card, the earlier card keeps its author, an application card has no author, a stale tile whose card was hidden is refused; `checkInOptions` leaves out an application and an earlier card that match a hidden card here; `addItem` refuses an `ask` from a stage that isn't `prompt` or `needs` (and from every Week 2 stage); `claimGuest` moves items, cards and votes, merges a clashing vote and an over-`max` answer, and is idempotent; `mySubmissions` covers a Week 2 vote, card and note and a Week 3 answer, and leaves out a week where the user only owns a carried card with nothing written on it; `adminExport` refuses non-admins and never contains a `k:` key.
- **STAGES:** every `STAGE_RENDERERS` name is exported; the private card makes no request and no storage write; slides line renders placeholders without links.
- **PROFILE:** the section renders weeks newest first and an empty state; the export panel builds a CSV with `boardExportCsv`.

## 9. What CORE settled that the brief left open
1. **Answers get their own ceilings** (`answersPerAuthor` 300, `answersPerBoard` 10,000) instead of counting toward the 2,000-note board cap the spec named, because boards now stay open for good and a full answer walk is up to about 96 rows per person per project.
2. **Check-ins are recorded** as `checkin:<cardId>` votes, so the profile can list "the projects they checked in with" (decision 10) and tiles can say "3 here". The spec had this as LATER.
3. ~~An application tile's new card is authored by the applicant.~~ **Reversed in the contract check:** an application tile's new card has `authorKey: null` (see 3.7). Nobody who tapped it owns it, and neither does a founder who never came. An earlier week's card keeps its original author (decision 13).
4. **Earlier cards beat applications** in the tile dedupe, so a returning Week 2 project keeps its writer, and gets its application linked by name when exactly one public application matches.
5. **Max-1 replace updates the row in place** and resets `createdAt`, so ids stay stable for the optimistic UI and "latest" stays true for `projectView`.
6. **Facilitators see anonymous prompts as counts too.** The admin export lists anonymous answers with no author at all.
7. **Slide numbers left the board's words.** The ways' small print and tips no longer cite slide numbers ("Rule of thumb from the deck: ..."), so a deck edit can't make them wrong. Cues use the clean deck's numbers.
8. **Two wording changes for the human needs rule:** "it takes a whole economy behind it" and "A whole economy takes enough roles" (the spec's "needs" there was a verb but read like a crowdpool word); `calls`' hint says "what the Renaissance calls for".
9. `shared/sessionCourse.test.ts` used `boardStages(3)` as "a default week with a circle"; it now uses week 4.

## 10. Ideas for after Wednesday (not in phase 2)
- A "Copy for Village OS" button on stage 13's room cards that copies `toVillageOsScope(view)` as JSON, ready for Week 4's paste step.
- "Last week you were with Toa Hermitage. Same today?" on Week 4's check-in, from `session-board:last-project` and `whoami.checkins`.
- A project page panel reading its cards' answers by `applicationId`, shown once a steward answered for it.
- The Recap at stage 0 could show the room's `needsSummary` beside the recordings.
- An opt-in, need-only count from the private card, at three or more, if Rye ever wants it.

## 11. Contract check (2026-10-13 evening, before phase 2)

I checked Rye's 16 decisions and spec sections 2, 3, 4, 5, 7 and 8 against this file and the shared code. The shared tests pass after the changes below (`npx vitest run` on the four board test files: 87 tests). Where a section above changed, it says "contract check" in place.

### What held up, checked one by one
- **Run of show:** 17 stages, kinds and steps in the spec's order, 3+5+6+5+9+12+11+10+12+7+8+5+8+10+5+3+1 = 120. Week 2's list, order and minutes are unchanged, and a test pins them. Weeks 4 to 13 still use the default stages, at 121 minutes.
- **Slides (decision 2):** every stage's refs match the clean numbers Rye gave, "if time" and "go deeper" included. All 31 page ids in `WEEK3_DECK` match `clean-deck-plan.json` row for row. `NEW1` and `NEW2` render as plain numbers. The deck id and the table sit in one constant.
- **Prompts:** every key from spec section 2 is there with the spec's mode, scope and max. The longest is 14 characters (`g-significance`, `m-contribution`). Every option list matches the spec word for word and in order: mate, rungs, breadth, whole, pulse, allies, the five ways, decide, circles, players, economies, box, week4, useful, and the 16 tap-to-fill words.
- **Human needs (decision 3):** ids, labels, plain lines, deck words and hues match spec 4.2 exactly.
- **Private card (decision 5):** its hint is word for word, and `answer` refuses its key. The mic is allowed: `DictationButton` uses the browser's Web Speech API and posts nothing to our server, so "We never save it or send it to our server" stays true.
- **Copy (decisions 7, 8, 9, 14):** the Welcome lede, the stage 2 `saved` line, the sign-in link, the Close line and Week 4's curriculum line are word for word. No em-dash or en-dash appears in the three shared files, and the banned-word, contrast, bare "needs" and money sweeps pass.
- **Auth:** `adminExport` uses `adminProcedure`. `claimGuest` uses `protectedProcedure` and needs the key in the body. `mySubmissions` is protected and reads only `u:<id>` rows. Nothing returns an author key or a guest key to a page.
- **Nothing closes a board:** no server path and no cron sets `status` to closed. The client's only caller is the facilitator's button on Close (item 10 below). `canWrite` stays true after the session clock ends.
- **Profile mount:** `SubmissionsTab` renders only on a person's own profile (it reads `my*` queries), so `mySubmissions` never shows on someone else's page.

### What I changed

| # | Problem | Fix | Where |
|---|---|---|---|
| 1 | Application-tile cards were authored by the applicant (`u:<userId>`). Decision 13 says to create them "with the name and applicationId". With the applicant as author, a founder who never came reads "You added Toa Hermitage" on their profile. The export would also credit them, and they would own a card they never touched. | `authorKey: null`. Facilitators curate it, the same as a register import. Choice 9.3 is marked reversed. | 3.7, 9.3, tests in 8 |
| 2 | A carried Week 2 card keeps its writer (Rye's call). With the old rule that any card makes a week appear, the writer's profile would show Week 3 even if they missed it. | A week appears for an item, a vote, or an authored card with something written on it. A card with only a name and a place never makes a week appear by itself. | 3.9, test in 8 |
| 3 | Hiding a stray card let its application or its Week 2 card come back as a tile, and a tap made a fresh copy. | Every card here, hidden ones too, seeds the dedupe. `checkIn` refuses a stale `a` or `w` ref that matches only a hidden card. Two applications with one name make one tile: applications are marked seen as they're added, approved and active first. | 3.6, 3.7 |
| 4 | `ask` was accepted from any stage index, so Week 2's board, which has no prompt stages, could take questions. | New `canAskFrom(week, i)`: `prompt` and `needs` stages only. The server and the foot line both use it. | `shared/sessionBoard.ts`, 3.3, test |
| 5 | `checkIn` took a `displayName` it never used. | Removed from the input. | 3.7 |
| 6 | A facilitator's `get` includes hidden rows and rows on hidden cards. Their room views and the export summary would count rows that everyone else's views leave out. | New `shownAnswerRows(items, hiddenCardIds)`. Pages and the export read the views through it. | `shared/humanNeeds.ts`, 3.10, 5, test |
| 7 | The export linked a project only when its application was approved or active, and most Week 3 tiles are submitted or under review. Decision 12 asks for "projects with their application links". | `BoardExportProject` gains `applicationStatus` and `adminPath`. `adminApplicationPath(id)` gives `/admin?tab=applications&open=<id>`, the existing review link. | `shared/boardEntries.ts`, 3.10, test |
| 8 | "Tap your project" on the chip and "Go back" on How deep, how wide called `go`, which moves the whole room for a facilitator. | New `StageProps.look(i)`: moves this screen only. | 5 |
| 9 | Once the session ends, stage 0 becomes the Recap, and the Recap shows nothing until the recording is mapped. People going at their own pace (decision 7) would never read the Part 1 of 2 Welcome (decision 8). | On a week with a `checkin` stage, render the Welcome under the Recap. Week 2 unchanged. | 5 |
| 10 | Week 3's Close still showed the facilitator a "Close the board" button, one tap from "End session". | No such button on a week with a `checkin` stage. "Open the board again" stays. Week 2 unchanged. | 5 |
| 11 | "What do you want to dig into in Week 4?" goes stale for anyone going at their own pace, and the server files it under the next unstarted session anyway. `sendFeedback` can also return `week: null`, which `sent` had no words for. | `TELL_US_COPY.topic` is a `{week}` template filled from the Season Schedule, with `topicNext` and `sentNext` fallbacks. It still reads Week 4 on Wednesday. | `shared/sessionBoard.ts`, 5, test |
| 12 | `NEEDS_COPY.noSeeds` said "on the last stage", which reads as the final stage. | "Plant up to three seeds first, on the stage before this one." | `shared/sessionBoard.ts`, test |
| 13 | `useClaimGuest` would mint a guest key through `sessionVoterKey()` on the profile page. It also didn't say when to fire for someone who signs in on the board without a reload. | Read the key and never mint one. Fire once a user is known, including after `AuthDialog`'s `onLogin` (a required prop). Fail silently. | 4, 5 |
| 14 | A card made with "Add your project" got no check-in mark. It was missing from the "here" count, the Close stat and the person's checked-in list. | After `addProject` resolves, call `actions.checkIn("p<id>")`. | 5 |
| 15 | The browser's form history could keep the private card's words. | The field sets `autoComplete="off"`, has no `name`, and sits outside any form. | 5 |

### Left as they are, on purpose
- **`claimGuest` and the three opportunity votes.** A merge can leave someone with more than three `item:` votes on Week 2. It never deletes a distinct vote, which is the safer way to err.
- **The Week 2 link select.** `facilitatorLists.applications` lists only approved and active applications, so a facilitator can't link a hand-added card to a submitted one. If SERVER has ten spare minutes, widen it to `CHECKIN_APPLICATION_STATUSES`. Only facilitators see that list.
- **Week 3's curriculum line** in `season2Curriculum.ts` ("Designing the structure of your project...") is unchanged, because Rye only decided Week 4's. A line that matches Part 1 could read: "Part 1 of 2: the big picture. The human needs your project is here to meet, who meets them, and who decides." That's Rye's call.
- **`NEW1`, `NEW2` and the clean deck's file id** still wait on the lead: one edit to `WEEK3_DECK`, then check three links.
- **The DOMAIN-LANGUAGE entry and the ADR** stay with the lead, per section 7. Re-check the next ADR number on origin/main before pushing.
