# Lane INVESTOR — "the packet stops sending everything to everyone"

**Read `../BUILD_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r6-investor`, branch `wt/r6-investor`, cut from `origin/main`
at `b5bed01`, deps installed, `.env` present.
**Migration number allocated: `0104`.** Use it only if you genuinely need a column (see §3). 0102 and
0103 are allocated elsewhere or deliberately skipped; **do not take another number and never renumber.**

**This is the first fix of round 6 and it is the highest-priority item in the program.** It is the
founder's own cap table.

---

## 1 · The defect, verified by the coordinator at `b5bed01` on 2026-08-29

`POST /api/investor-docs/request` (`server/index.ts`, anchor: `app.post("/api/investor-docs/request"`)
is a **public, unauthenticated** route. It takes `{name, email, accredited}` from anyone, and then:

```
const docs: any[] = investorDocsRepo.all();
```

**Every row in `investor_docs`, unfiltered**, is turned into a list of download links and emailed to
whatever address the requester typed. There is no per-document gate anywhere in the path.

The links are `/api/uploads/<filename>`. That route's own comment states the posture plainly:
*"Investor documents and the like live behind a request-and-email gate. The gate is weak (anyone with
the URL can fetch)"*. So a link, once emailed, is a bearer credential that never expires and can be
forwarded.

**Two corrections to what you may have been told, both verified:**

1. **These documents are NOT cached one-year-immutable.** That branch of `GET /api/uploads/:filename`
   applies only to `image/`, `font/` and `audio/`. PDFs and unknown types get
   `Cache-Control: private, no-cache`. The coordinator's handoff said otherwise and was wrong.
2. **`GET /api/admin/investor-docs` is admin-gated** and is not part of this leak. The listing is
   fine. The email is the leak.

The one real bound that exists: `overLimit("investor-docs:<ip>", numberVar("abuse.investor_docs_per_ip_hourly"), 1h)`.
That is a rate limit on volume, not a gate on content.

**Everything above is a hypothesis until you have read it yourself. Read it first.**

## 2 · Objective, as a harm metric

**No document leaves the vault by email unless a human has explicitly chosen to put that document in
the investor packet, and a requester is never told they were sent something they were not sent.**

## 3 · The design, and where your judgement is wanted

The column `investor_docs.requires_request` already exists (`boolean`, default `false`, NOT NULL,
schema line ~212). Round 5's tidy lane found it is **written as a literal `false` at upload and read
by nothing**, and recommended keeping it as the place a gate would live while fixing the comment
above it, which currently claims *"Doc vault gating, if the record carries it"* and is false.

**Preferred shape, and the coordinator's default. Deviate with evidence if you find a better one:**

1. **A per-document choice, made by an admin, explicit, and OFF for every row that exists today.**
   Whether that is `requires_request` reinterpreted or a new column is your call once you have read
   the code. If `requires_request` can carry it honestly, use it and fix its comment; if reusing it
   would make the first honest reader wrong, take `0104` and add a clean column. **Say which you
   chose and why.** Existing rows must not be silently opted in.
2. **The packet email sends only chosen documents.**
3. **When nothing is chosen, the route must not send an empty or misleading packet.** Capture the
   lead exactly as it does now, tell the requester plainly that a person will follow up, and notify
   the admins. **A "here is your packet" email with no packet in it is the fallback-is-a-claim
   defect wearing a different coat.**
4. **An admin control to make the choice**, wherever the investor vault is administered. A column no
   screen can set is the dead-editor defect in reverse: a gate nobody can open.
5. **Say what was sent, in the lead record.** The submission row should record which documents went,
   so a founder can answer "what did this person receive" a year later. This is cheap and it is the
   difference between a leak you can bound and one you cannot.

**What NOT to build:** do not add authentication to `/api/uploads/:filename` for these documents.
Unguessable filenames plus an explicit per-document choice is the posture this round is buying;
converting the vault to a signed-URL scheme is a larger design decision and belongs to the founder,
not to this lane. **If you believe that is the only honest fix, say so and stop rather than build it.**

## 4 · Your zone

**Yours:**
- `server/index.ts`, the investor region ONLY: from the anchor `app.get("/api/admin/investor-docs"`
  through `app.put("/api/admin/investor-summary"`. That is roughly lines 18560 to 19200 at `b5bed01`.
  **Anchor by route string, never by line number.**
- `server/db/schema.ts`, the `investorDocs` table only.
- `drizzle/0104_*.sql` if you take it.
- The admin surface for the investor vault in `client/src/pages/Admin.tsx` — **the investor tab's
  own hunks only.** `Admin.tsx` is ~9,000 lines and is the most contended file in this repo.
- Tests: add to the existing e2e/route suites; do not restructure them.

**NOT yours, and two other lanes are inside this file right now:**
- Lane G-D holds `server/index.ts` in the org/seat region and `/api/game/progression`.
- Lane G-E holds the objection routes in the governance block.
- `server/lib/uploads.ts` and anything the upload-strip gate watches. If your fix seems to need a
  write into the uploads volume, stop: `check-upload-strip.mjs` refuses any write outside
  `server/lib/uploads.ts`, and that gate is correct.

## 5 · Gates specific to this lane

Beyond the standard set in the house rules:

- **`check-repo-payloads.mjs` will bite you.** `submissions` has `status` and `rewarded` NOT NULL,
  and this exact route threw `Column 'status' cannot be null` on every call until PR #79, so **the
  public investor-packet form had never once captured a lead.** If you touch that insert, the gate
  must stay green. Remember `int` is NOT exempt from the gate; only `bool` and `defaultNow` are.
- **`check-save-honesty.mjs`** (new in PR #90) watches for surfaces that claim success without
  asking the server. Your admin control must satisfy it.
- **A test that a request with zero chosen documents sends no download links.** This is the
  regression that matters most; write it first and watch it fail against `b5bed01`.
- **A test that a chosen document is sent and an unchosen one is not**, in the same run.

## 6 · Report additionally

- **What is actually in `investor_docs` on production: the COUNT and the TITLES only.** No URLs, no
  file contents, no download. The founder needs to know the size of what has been exposed. If you
  cannot reach production read-only without risk, say so and report the count you can reach.
- Whether any other route, feed, sitemap, crawler surface or export exposes `investor_docs` rows or
  their filenames. **Enumerate every door into this room; do not ask whether your door is safe.**
  That instruction found a second undiscovered public leak in round 5.
- Whether the filenames are guessable (the vault keeps the document's own name in the file via
  `vaultBase()`, which is a real consideration for the "unguessable URL" posture in §3).
