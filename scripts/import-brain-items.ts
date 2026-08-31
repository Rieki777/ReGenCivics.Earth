/**
 * Import TASK_SESSIONS_2026-08-29/tasks.json into `brain_items`, with every
 * referenced Telegram screenshot uploaded to the PRIVATE R2 prefix.
 *
 * Why the screenshots matter more than the rows (response doc 17.6): 134 of the
 * 219 open items are a screenshot with a one-line caption, and the files sit in
 * a Telegram export on the laptop. The phone cannot show them and a cloud
 * session cannot open them, so those items are unreachable no matter how good
 * the list view gets. This script is what makes them reachable.
 *
 * Rules this script obeys, in the order they matter:
 *
 *  1. It NEVER writes state `ready`. `ready` is a state a human passes an item
 *     through (brain-gate.ts); an importer that could set it would be a second,
 *     unchecked door. `assertImportableState` enforces this at runtime.
 *  2. It NEVER sets `kind` on an item Rye still has to look at. `session` is a
 *     reliable label for `repo` and only a weak one for `kind` (17.4), so the
 *     rule's guess lands in `proposed.kind_hint` and `kind` stays `unsorted`
 *     for everything open, blocked or parked. Closed rows take the hint as
 *     their kind because nobody is going to re-sort 529 archived items by hand.
 *  3. Items are created through `createItem` in server/lib/brain-items.ts, the
 *     one creation path every writer shares (17.1). See `stampImportedFields`
 *     for the columns that path cannot express yet and why.
 *  4. Nothing here is skipped for being empty. All 49 empty-text rows carry a
 *     screenshot; they ARE the screenshot, and dropping them would recreate
 *     exactly the failure 17.6 describes.
 *
 * Usage (from the repo root, with a .env carrying DATABASE_URL + OWNER_USER_ID):
 *
 *   npx tsx scripts/import-brain-items.ts TASK_SESSIONS_2026-08-29/tasks.json \
 *     --photos "C:/Users/taren/Downloads/Telegram Desktop/ChatExport_2026-08-29" \
 *     --photos "C:/Users/taren/Downloads/Telegram Desktop/ChatExport_2026-08-29 (1)" \
 *     --dry-run
 *
 * `--dry-run` touches neither the database nor R2 and needs no .env, so the
 * mapping can be checked anywhere. Drop it to write.
 *
 * Re-running is safe. Inserts are idempotent on (owner_id, source); an item
 * still in its imported shape (raw, unsorted, never promoted) is re-stamped,
 * which repairs a run that crashed halfway; an item Rye has since sorted keeps
 * everything he changed and only has its attachment keys refreshed, so a
 * second run can heal a failed photo upload without resetting his work.
 *
 * The photo roots: the plan named `DataExport_2026-08-30/photos/`, which does
 * not exist (that export is a bare result.json). The 382 distinct referenced
 * photos are split across two ChatExport directories, 129 in one and 253 in
 * the other, so more than one root has to be searched and neither alone is
 * complete. Pass `--photos` once per root; they are searched in order.
 */
import * as fs from "fs";
import * as path from "path";

// ── The shape of a tasks.json row ────────────────────────────────────────────

export type TaskStatus = "open" | "needs-rye" | "deferred" | "closed-or-na";

/**
 * `id` is a STRING in tasks.json ("113853"), not the number the plan's type
 * said. It is used verbatim in the `source` key, so the distinction is load
 * bearing: `telegram:113853`, never `telegram:113853.0`.
 */
export interface TaskRow {
  id: string;
  date: string;
  session?: string;
  screenshots?: string[];
  text: string;
  status: TaskStatus;
  /** Triage verdict written by the Opus pass on 2026-08-29. Becomes `evidence`. */
  note?: string;
}

export type KindHint = "create" | "build" | "todo" | "ask" | "material" | "unsorted";

/** The only states this importer may write. `ready` is deliberately absent. */
export type ImportState = "raw" | "parked" | "done";

// ── Mapping rules (pure, tested) ─────────────────────────────────────────────

/**
 * The triage's four verdicts become states. `needs-rye` is raw with a name in
 * `blocked_on` rather than its own state, because blocked-on-a-person is a
 * property of a raw item, not a place in the pipeline.
 *
 * The 529 closed rows are imported as `done` and carry `closed_by` so the
 * verdict is attributable. They are NOT trusted blindly (17.14): reopening is
 * one tap, and `whats-left-2026-08-29.md` records at least one false verdict.
 */
export function stateFor(status: TaskStatus): {
  state: ImportState;
  blockedOn?: string;
  closedBy?: string;
} {
  switch (status) {
    case "open":
      return { state: "raw" };
    case "needs-rye":
      return { state: "raw", blockedOn: "Rye" };
    case "deferred":
      return { state: "parked" };
    case "closed-or-na":
      return { state: "done", closedBy: "opus-triage-2026-08-29" };
    default: {
      // An unknown verdict is not silently coerced to done. Park it so it
      // shows up somewhere a human looks instead of in the archive.
      const never: never = status;
      throw new Error(`unknown task status: ${String(never)}`);
    }
  }
}

/**
 * Every session slug that appears in the 2026-08-29 export, mapped by hand.
 *
 * A table, not a regex, because the set is closed (20 values, 749 rows) and
 * the regex the plan proposed got one of them wrong: `09-regen-event-core`
 * matched `/core/i` before it could match `/event/`, sending all 20 of its rows
 * to a `core-site` repo. Only 3 of those 20 are about core.regencivics.earth;
 * the rest are the September event, season two outreach and the custom-games
 * page, all of which live in regen-civics. A hand table also means the mapping
 * can be read and corrected by someone who knows the work, which is the point
 * of 17.4: `repo` is the label the sessions actually carry.
 *
 * `null` is a real answer. `13-personal` and `11-research-digest` have no repo,
 * and an invented one would show up as a filter chip that lies.
 */
const SESSION_REPO: Record<string, string | null> = {
  "01-amora-map-render": "game-amora",
  "02-amora-map-nav": "game-amora",
  "03-amora-map-wiring": "game-amora",
  "03-amora-via-prompt3": "game-amora",
  "04-amora-admin-bugs": "game-amora",
  "05-amora-gov-tokens": "game-amora",
  "06-amora-economy-modules": "game-amora",
  "07-amora-voice-copy": "game-amora",
  "08-regen-investor-fund": "regen-civics",
  "09-regen-event-core": "regen-civics",
  "10-content-and-site": "regen-civics",
  "11-research-digest": null,
  "12-infra-fork-qa": "regen-civics",
  "13-personal": null,
  DEFERRED: null,
  "SPRING/BATCH_A-site-june-A1.md": "regen-civics",
  "SPRING/BATCH_A-site-june-A2.md": "regen-civics",
  "SPRING/BATCH_B-ship.md": "regen-civics",
  "SPRING/BATCH_C-amora-custom.md": "game-amora",
  "SPRING/BATCH_D-content-other.md": "regen-civics",
};

/** The session slugs above, for the test that asserts none of them drifts. */
export const KNOWN_SESSIONS = Object.keys(SESSION_REPO);

/**
 * session -> repo. Known slugs come from the table; anything else falls through
 * to heuristics for sessions that do not exist yet. The fallback checks the
 * regen-civics markers BEFORE `core`, because `event-core` and `regen-core`
 * are about ReGen Civics and only a bare `core` segment means the CORE site.
 */
export function repoFor(session: string | undefined | null): string | null {
  if (!session) return null;
  if (session in SESSION_REPO) return SESSION_REPO[session];
  if (/amora/i.test(session)) return "game-amora";
  if (/custom/i.test(session)) return "custom-games";
  if (/ship|site|content|investor|event|infra|fund|rsvp/i.test(session)) return "regen-civics";
  if (/core/i.test(session)) return "core-site";
  return null;
}

/**
 * A GUESS at what kind of thing a note is. Its precision is not measured and
 * must not be claimed (17.4). It lands in `proposed.kind_hint`, where it is
 * visibly a machine's suggestion, and only becomes the `kind` column on rows
 * the triage already closed.
 *
 * Left exactly as the plan specified it, including the 180-word threshold for
 * `create`. The plan's own worked example says row 114025 should come out
 * `create`; it is 160 words, so it comes out `unsorted`. Dropping the threshold
 * to 150 to make that one example pass drags in 12 rows, of which 10 read as
 * build ("8 forms of capital added to the flows overlay", "Modules ideas",
 * "the play store removed the wallet"). Tuning a rule until one example passes
 * makes the rule worse and the number dishonest, so the threshold stayed and
 * the expectation is corrected in the tests instead. A real classifier is
 * Slice 3; this is the placeholder that keeps `kind` empty until then.
 */
export function kindHint(text: string, hasScreenshot: boolean): KindHint {
  const t = (text ?? "").trim();
  if (/^https?:\/\/\S+$/.test(t) || (t.length < 200 && /https?:\/\//.test(t))) return "material";
  if (/\?\s*$/.test(t) && t.length < 300) return "ask";
  if (hasScreenshot) return "build";
  if (/^(i need to|need to|remember to|don'?t forget|send|email|call|pay|register|sign up|book)\b/i.test(t)) return "todo";
  if (t.split(/\s+/).filter(Boolean).length > 180 && /\b(i|my|we)\b/i.test(t)) return "create";
  if (/\b(fix|add|make|wire|button|page|menu|module|map|forum|quest|admin|icon|remove|rename)\b/i.test(t)) return "build";
  return "unsorted";
}

// ── The "probably done" flag ─────────────────────────────────────────────────

/**
 * Items captured before this date were never checked; their `open` status was
 * read off a list, not verified. See `maybeDone` for the measurement.
 *
 * ADDENDUM-1 item 2 wrote this cutoff as 2026-05-01. That flags NOTHING: the
 * oldest row in tasks.json still open is 2026-06-14, and the whole 30 Apr - 29
 * Jul window it was reaching for is what the export calls the Spring batches.
 * 2026-08-01 is the real seam in the data. Everything before it comes from the
 * Spring export, whose own triage note says "Status auto-derived: 'open' means
 * it is listed in WHATS_LEFT.md"; everything after it was read by the
 * 2026-08-29 verdict pass. Only the first group is a genuine open question.
 */
export const MAYBE_DONE_BEFORE = "2026-08-01";

/**
 * A verdict from a later pass that ALREADY checked and found the thing broken.
 * Five rows carry it. Asking "is this still real?" about an item somebody
 * verified as broken this month is the one flag that is definitely wrong.
 */
const VERIFIED_STILL_BROKEN = "STILL BROKEN";

export interface MaybeDoneView {
  state: ImportState;
  capturedAt: Date | null;
  hint: KindHint;
  photos: string[];
  evidence: string | null;
}

/**
 * Is this item probably already finished?
 *
 * Measured, not assumed. Of 20 hand-checked flagged items I could reach a
 * verdict on 10: 6 were already shipped, 4 were not, a 40% false-positive rate.
 * All four misses were items with NO screenshot, and all six hits had one. A
 * second, larger check held the split: of the 15 no-screenshot candidates, 14
 * were decidable and 11 of those were still genuinely open (79% wrong), while
 * a fresh sample of the screenshot ones ran 6 done to 1 open. So the screenshot
 * is part of the rule, not decoration.
 *
 * The mechanism behind the split, which is why it is a rule and not a fit: a
 * screenshot-anchored one-liner ("change the epic emoji from swords to a
 * mountain") is a nit against a page that has been rebuilt several times since,
 * and it was listed as open by a script rather than by a person. A paragraph of
 * text with no screenshot is a project brief ("add sign in with GitHub", "make
 * our ecosystem survive an Anthropic outage"), and a project ships only if
 * somebody ran it. Nobody did.
 *
 * What is NOT in this rule, and why, is in `SHIPPED_LOG.md` cross-checking:
 * see the note on `shippedLogSignal` below.
 */
export function maybeDone(v: MaybeDoneView): boolean {
  if (v.state !== "raw") return false;
  if (!v.capturedAt) return false;
  if (v.capturedAt.toISOString().slice(0, 10) >= MAYBE_DONE_BEFORE) return false;
  if (v.hint !== "build" && v.hint !== "todo") return false;
  if (v.photos.length === 0) return false;
  if ((v.evidence ?? "").startsWith(VERIFIED_STILL_BROKEN)) return false;
  return true;
}

/**
 * The keyword cross-check against SHIPPED_LOG.md that ADDENDUM-1 item 2 asks
 * for is NOT implemented, because it was measured and it carries no signal.
 *
 * The test that settled it: run the matcher twice, once against log entries
 * dated AFTER an item was captured (where "shipped since" is possible) and once
 * against entries dated BEFORE it (where it is impossible). A rule that detects
 * completion must fire far more often in the first direction. It did not. With
 * two-corpus rarity filtering and a two-term co-occurrence threshold, 23 of 167
 * items matched forward against an average of 15.2 available entries, and 62 of
 * 167 matched backward against 34.8 entries: the same rate per entry examined,
 * slightly worse forward. An exact-bigram variant was worse still, 4 forward
 * against 14 backward. The apparent hits are topical coincidence in Rye's own
 * vocabulary, and the eyeballed output says the same thing ("create a new song"
 * matched the assembly-examples entry on "create, title, parts, isolation").
 *
 * Three reasons it cannot work on this corpus, all structural:
 *   1. SHIPPED_LOG.md runs 2026-07-01 to 2026-08-15 and covers regen-civics
 *      only. Most old open items are game-amora or predate the log entirely.
 *   2. The item bodies are screenshot captions. "Replace this one" and "And the
 *      architect" have no terms to match on; 52 of 219 share no distinctive
 *      word with the log at all.
 *   3. The log is prose in the same voice as the captures, so what overlaps is
 *      the vocabulary Rye always uses, not the work that got done.
 *
 * Shipping it anyway would put a wrong "probably done" on roughly half the
 * queue, which is the failure ADDENDUM-1 names. The function is left here as a
 * signpost so the next person does not re-derive the same negative result.
 */
export function shippedLogSignal(): null {
  return null;
}

/**
 * Never trade a real attachment for an empty list.
 *
 * Both stamp paths write `attachments` unconditionally, and the list is built
 * from photos found ON DISK. So a re-run from a machine without the two
 * ChatExport directories, or with `--photos` simply forgotten, computes an
 * empty list for every row and blanks all 384 uploaded keys. The screenshots
 * are the reason this importer exists (17.6): 134 of the open items ARE a
 * screenshot, and the R2 objects would survive while every row pointing at
 * them would not.
 *
 * This became worth guarding when the `maybe_done` flag landed, because that
 * gives someone a reason to re-run the importer who has no reason to think
 * about photos at all.
 */
export function keepAttachments(fresh: string[], existing: unknown): string[] {
  if (fresh.length > 0) return fresh;
  return Array.isArray(existing) && existing.length > 0 ? (existing as string[]) : fresh;
}

/**
 * Re-run safety for the flag.
 *
 * `stampImportedFields` overwrites `proposed` wholesale, and an item Rye
 * answered "still open" or "not sure" is still raw and still unsorted, so it
 * passes the pristine check and gets re-stamped. Without this, a second import
 * would put `maybe_done` straight back on an item he has already answered, and
 * the queue would hand him the same question forever.
 *
 * The contract with the triage code is a prefix, not a list, so a future key
 * cannot be forgotten here: every `proposed` key beginning `maybe_done` belongs
 * to the triage once `maybe_done_answer` is present, and the importer copies
 * them across verbatim instead of recomputing. "Not sure" keeps its flag and
 * its snooze; "still open" keeps the flag off.
 */
export function mergeTriageState(
  fresh: Record<string, unknown>,
  existing: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out = { ...fresh };
  if (!existing || typeof existing.maybe_done_answer !== "string") return out;
  for (const k of Object.keys(out)) if (k.startsWith("maybe_done")) delete out[k];
  for (const [k, v] of Object.entries(existing)) if (k.startsWith("maybe_done")) out[k] = v;
  return out;
}

// ── Photo resolution ─────────────────────────────────────────────────────────

/** Extensions we will upload, mapped to the content type storagePut allows. */
const PHOTO_CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * A filename out of tasks.json is untrusted input: it decides an R2 key and a
 * path read off the disk. Only a bare filename with a known image extension is
 * allowed through, and `_thumb` variants are refused outright because the
 * export ships a downscaled twin next to every photo and uploading the thumb
 * would put an unreadable screenshot behind the item.
 */
export function isSafePhotoName(name: string): boolean {
  if (typeof name !== "string" || name.length === 0 || name.length > 200) return false;
  if (name.includes("/") || name.includes("\\") || name.includes("\0")) return false;
  if (name.includes("..")) return false;
  if (/_thumb\.[a-z0-9]+$/i.test(name)) return false;
  return path.extname(name).toLowerCase() in PHOTO_CONTENT_TYPE;
}

export function contentTypeFor(name: string): string {
  return PHOTO_CONTENT_TYPE[path.extname(name).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Find a photo across several export directories, in the order given.
 *
 * `exists` is injectable so the mapping can be tested without the 33 MB of
 * Telegram exports being present, which they are not in CI.
 */
export function resolvePhoto(
  name: string,
  roots: string[],
  exists: (p: string) => boolean = fs.existsSync,
): string | null {
  if (!isSafePhotoName(name)) return null;
  for (const root of roots) {
    const full = path.join(root, name);
    if (exists(full)) return full;
  }
  return null;
}

/**
 * Accept either a Telegram export directory or its `photos/` subdirectory, so
 * `--photos <export>` and `--photos <export>/photos` both work.
 */
export function normalizePhotoRoot(root: string, isDir: (p: string) => boolean = dirExists): string {
  const nested = path.join(root, "photos");
  return isDir(nested) ? nested : root;
}

function dirExists(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// ── The per-row plan ─────────────────────────────────────────────────────────

export interface PlannedItem {
  /** Idempotency key. Unique with owner_id. */
  source: string;
  body: string;
  /** What goes in the `kind` column: the hint for closed rows, `unsorted` otherwise. */
  kind: KindHint;
  /** What the rule guessed, recorded either way. */
  hint: KindHint;
  state: ImportState;
  blockedOn: string | null;
  closedBy: string | null;
  evidence: string | null;
  repo: string | null;
  capturedAt: Date | null;
  /** Filenames referenced by the row, already filtered for safety. */
  photos: string[];
  /** Referenced names that failed `isSafePhotoName` and will never be uploaded. */
  unsafePhotos: number;
  proposed: Record<string, unknown>;
  /** True when tasks.json carried no text and the body is the placeholder. */
  bodyIsPlaceholder: boolean;
}

/**
 * All 49 rows whose `text` is empty carry exactly one screenshot. The body
 * cannot be empty (the column is NOT NULL and an empty first line titles the
 * row "untitled", which is useless on a phone), so it names the screenshot and
 * `proposed.body_placeholder` records that a machine wrote it, not Rye.
 */
export function placeholderBody(photos: string[]): string {
  return photos.length > 0 ? `(screenshot only: ${photos.join(", ")})` : "(no text captured)";
}

/** Everything the runner needs for one row, decided without touching the DB. */
export function planItem(row: TaskRow): PlannedItem {
  const referenced = row.screenshots ?? [];
  const photos = referenced.filter(isSafePhotoName);
  const text = typeof row.text === "string" ? row.text : "";
  const bodyIsPlaceholder = text.trim().length === 0;
  const body = bodyIsPlaceholder ? placeholderBody(photos) : text;

  const { state, blockedOn, closedBy } = stateFor(row.status);
  const hint = kindHint(text, photos.length > 0);
  // Rule 2: only rows nobody has to look at again take the machine's kind.
  const kind: KindHint = state === "done" ? hint : "unsorted";

  const proposed: Record<string, unknown> = {
    kind_hint: hint,
    imported_from: "TASK_SESSIONS_2026-08-29/tasks.json",
    session: row.session ?? null,
  };
  if (kind === hint && hint !== "unsorted") proposed.kind_source = "rule";
  if (bodyIsPlaceholder) proposed.body_placeholder = true;

  const capturedAt = row.date ? new Date(`${row.date}T12:00:00Z`) : null;
  const captured = capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : null;
  const evidence = typeof row.note === "string" && row.note.trim() ? row.note.trim() : null;

  // The triage queue's entry condition. `raw` only: a closed row is not a
  // question, and a parked one is a decision Rye already made.
  if (maybeDone({ state, capturedAt: captured, hint, photos, evidence })) {
    proposed.maybe_done = true;
    proposed.maybe_done_reason = `captured before ${MAYBE_DONE_BEFORE}; open status was auto-derived, never checked`;
  }

  return {
    source: `telegram:${row.id}`,
    body,
    kind,
    hint,
    state,
    blockedOn: blockedOn ?? null,
    closedBy: closedBy ?? null,
    evidence,
    repo: repoFor(row.session),
    capturedAt: captured,
    photos,
    unsafePhotos: referenced.length - photos.length,
    proposed,
    bodyIsPlaceholder,
  };
}

/**
 * The one rule with no exceptions. Called before every write, so a future edit
 * that adds a status mapping cannot quietly hand the importer the gate's key.
 */
export function assertImportableState(state: string): asserts state is ImportState {
  if (state === "ready") {
    throw new Error("the importer may never write state `ready`: only the owner promotes");
  }
  if (state !== "raw" && state !== "parked" && state !== "done") {
    throw new Error(`the importer may not write state \`${state}\``);
  }
}

// ── tasks.json reading ───────────────────────────────────────────────────────

export function parseTasks(raw: string): TaskRow[] {
  const rows = JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;
  if (!Array.isArray(rows)) throw new Error("tasks.json must be a JSON array");
  const seen = new Set<string>();
  for (const r of rows as TaskRow[]) {
    if (typeof r?.id !== "string" && typeof r?.id !== "number") {
      throw new Error(`row without an id: ${JSON.stringify(r).slice(0, 120)}`);
    }
    const id = String(r.id);
    if (seen.has(id)) throw new Error(`duplicate id in tasks.json: ${id}`);
    seen.add(id);
    r.id = id;
  }
  return rows as TaskRow[];
}

// ── CLI ──────────────────────────────────────────────────────────────────────

export interface Args {
  tasksPath: string;
  photoRoots: string[];
  dryRun: boolean;
  ownerId: number | null;
  envPath: string | null;
  limit: number | null;
  skipUploads: boolean;
}

export function parseArgs(argv: string[]): Args {
  const out: Args = {
    tasksPath: "",
    photoRoots: [],
    dryRun: false,
    ownerId: null,
    envPath: null,
    limit: null,
    skipUploads: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-upload") out.skipUploads = true;
    else if (a === "--photos") out.photoRoots.push(argv[++i] ?? "");
    else if (a === "--owner") out.ownerId = Number(argv[++i]);
    else if (a === "--env") out.envPath = argv[++i] ?? null;
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a.startsWith("--")) throw new Error(`unknown flag: ${a}`);
    else if (!out.tasksPath) out.tasksPath = a;
    // A bare second positional is a photo root, so the plan's original
    // `<tasks.json> <export dir> --dry-run` invocation still works.
    else out.photoRoots.push(a);
  }
  out.photoRoots = out.photoRoots.filter(Boolean);
  return out;
}

interface Counters {
  rows: number;
  inserted: number;
  updated: number;
  /** Existing rows Rye had already moved: only their attachments were touched. */
  preserved: number;
  emptyText: number;
  photosPlanned: number;
  photosResolved: number;
  photosUploaded: number;
  photosMissing: number;
  photosSkipped: number;
  bytes: number;
  byState: Record<string, number>;
  byKind: Record<string, number>;
  byRepo: Record<string, number>;
  blocked: number;
  /** Raw items the triage queue will ask about. See `maybeDone`. */
  maybeDone: number;
  /** Keys a run left alone because it found no photo on disk. See `keepAttachments`. */
  attachmentsKept: number;
}

function bump(m: Record<string, number>, k: string) {
  m[k] = (m[k] ?? 0) + 1;
}

function report(c: Counters, dryRun: boolean) {
  const mb = (c.bytes / 1024 / 1024).toFixed(1);
  console.log("");
  console.log(dryRun ? "── dry run, nothing written ──" : "── import complete ──");
  console.log(`rows read          ${c.rows}`);
  console.log(`inserted           ${c.inserted}`);
  console.log(`updated            ${c.updated}`);
  console.log(`left as Rye had it ${c.preserved}  (already sorted; only attachments refreshed)`);
  console.log(`empty text         ${c.emptyText}  (imported with a screenshot placeholder body, never skipped)`);
  console.log(`blocked_on set     ${c.blocked}`);
  console.log(`maybe_done flagged ${c.maybeDone}  (raw, pre-${MAYBE_DONE_BEFORE}, screenshot, build/todo; the triage queue)`);
  console.log(
    `screenshots        ${c.photosPlanned} referenced, ${c.photosResolved} found on disk` +
      `${dryRun ? "" : `, ${c.photosUploaded} uploaded`}, ` +
      `${c.photosMissing} missing, ${c.photosSkipped} unsafe  (${mb} MB)`,
  );
  if (c.attachmentsKept) {
    console.log(`attachments kept   ${c.attachmentsKept}  (already in the database; this run found no photo on disk)`);
  }
  console.log(`by state           ${JSON.stringify(c.byState)}`);
  console.log(`by kind            ${JSON.stringify(c.byKind)}`);
  console.log(`by repo            ${JSON.stringify(c.byRepo)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.tasksPath) {
    console.error(
      "usage: tsx scripts/import-brain-items.ts <tasks.json> [--photos <dir>]... [--dry-run] [--owner <id>] [--env <path>] [--limit <n>] [--no-upload]",
    );
    process.exit(1);
  }

  const rows = parseTasks(fs.readFileSync(path.resolve(args.tasksPath), "utf8"));
  const roots = args.photoRoots.map((r) => normalizePhotoRoot(path.resolve(r)));
  for (const r of roots) {
    if (!dirExists(r)) console.warn(`warning: photo root does not exist: ${r}`);
  }
  if (roots.length === 0) {
    console.warn("warning: no --photos root given; every screenshot will count as missing");
  }

  const planned = (args.limit ? rows.slice(0, args.limit) : rows).map(planItem);
  for (const p of planned) assertImportableState(p.state);

  const c: Counters = {
    rows: planned.length,
    inserted: 0,
    updated: 0,
    preserved: 0,
    emptyText: 0,
    photosPlanned: 0,
    photosResolved: 0,
    photosUploaded: 0,
    photosMissing: 0,
    photosSkipped: 0,
    bytes: 0,
    byState: {},
    byKind: {},
    byRepo: {},
    blocked: 0,
    maybeDone: 0,
    attachmentsKept: 0,
  };

  // Resolve every photo first, so a dry run reports exactly what a real run
  // would upload and a real run fails loudly before it writes a single row.
  const resolved = new Map<string, string>(); // "<source>|<name>" -> absolute path
  for (const p of planned) {
    for (const name of p.photos) {
      c.photosPlanned++;
      const hit = resolvePhoto(name, roots);
      if (!hit) {
        c.photosMissing++;
        console.warn(`missing photo: ${name} (item ${p.source})`);
        continue;
      }
      resolved.set(`${p.source}|${name}`, hit);
      c.photosResolved++;
      try {
        c.bytes += fs.statSync(hit).size;
      } catch {
        /* size is a report line, not a decision */
      }
    }
    c.photosSkipped += p.unsafePhotos;
  }

  for (const p of planned) {
    bump(c.byState, p.state);
    bump(c.byKind, p.kind);
    bump(c.byRepo, p.repo ?? "(none)");
    if (p.bodyIsPlaceholder) c.emptyText++;
    if (p.blockedOn) c.blocked++;
    if (p.proposed.maybe_done === true) c.maybeDone++;
  }

  if (args.dryRun) {
    report(c, true);
    console.log("");
    console.log("sample of the first three plans:");
    for (const p of planned.slice(0, 3)) {
      console.log(
        `  ${p.source} state=${p.state} kind=${p.kind} hint=${p.hint} repo=${p.repo ?? "-"} ` +
          `photos=${p.photos.length} title="${p.body.split("\n")[0].slice(0, 60)}"`,
      );
    }
    return;
  }

  // ── Everything below needs the environment. Imported lazily and only here,
  // because server/_core/env.ts calls process.exit(1) when DATABASE_URL is
  // unset, which would make --dry-run impossible on a machine without .env.
  const { fileURLToPath } = await import("url");
  const dotenv = await import("dotenv");
  dotenv.config(args.envPath ? { path: path.resolve(args.envPath) } : {});
  if (!process.env.DATABASE_URL) {
    // A worktree has no .env of its own; the checkout's lives at the repo
    // root, one level above scripts/. Look there before giving up.
    const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
    if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Pass --env <path to .env>, or run from a checkout that has one.");
    process.exit(1);
  }

  const ownerId = args.ownerId ?? Number(process.env.OWNER_USER_ID ?? 0);
  if (!ownerId) {
    console.error("OWNER_USER_ID is not set and --owner was not given. Refusing to guess the owner.");
    process.exit(1);
  }

  const { createItem } = await import("../server/lib/brain-items");
  const { storagePut } = await import("../server/storage");
  const { getDb } = await import("../server/db");
  const { brainAudit, brainItems } = await import("../drizzle/schema");
  const { and, eq } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) {
    console.error("database unavailable");
    process.exit(1);
  }

  /**
   * The columns `createItem` cannot express.
   *
   * `createItem` is the one creation path (17.1) and it deliberately starts
   * every item `raw` with no repo, no evidence and no closer, because a caller
   * that could set those on insert could also set `ready`. `setItemState`
   * cannot help either: the state machine has no edge from `raw` to `done`, by
   * design, since a live item reaches done through the gate. An import of a
   * 529-row archive is the one caller that legitimately starts at the end.
   *
   * So this writes exactly those columns, asserts the state first, and files
   * its own audit row so the trail is unbroken. If `CreateInput` ever grows an
   * import-only escape hatch for state/closed_by/attachments, delete this.
   */
  async function stampImportedFields(
    itemId: number,
    p: PlannedItem,
    attachments: string[],
    existingProposed?: Record<string, unknown> | null,
    existingAttachments?: unknown,
  ): Promise<void> {
    assertImportableState(p.state);
    const keys = keepAttachments(attachments, existingAttachments);
    await db!
      .update(brainItems)
      .set({
        state: p.state,
        kind: p.kind,
        repo: p.repo,
        blockedOn: p.blockedOn,
        evidence: p.evidence,
        closedBy: p.closedBy,
        attachments: keys,
        proposed: mergeTriageState(p.proposed, existingProposed),
        capturedAt: p.capturedAt,
      })
      .where(and(eq(brainItems.id, itemId), eq(brainItems.ownerId, ownerId)));
    await db!.insert(brainAudit).values({
      ownerId,
      itemId,
      action: "import:stamp",
      detail: { state: p.state, kind: p.kind, repo: p.repo, attachments: keys.length },
      via: "import",
    });
  }

  /** The re-run path for an item Rye has already moved: heal the files, touch nothing else. */
  async function stampAttachmentsOnly(
    itemId: number,
    attachments: string[],
    existingAttachments?: unknown,
  ): Promise<void> {
    const keys = keepAttachments(attachments, existingAttachments);
    await db!
      .update(brainItems)
      .set({ attachments: keys })
      .where(and(eq(brainItems.id, itemId), eq(brainItems.ownerId, ownerId)));
    await db!.insert(brainAudit).values({
      ownerId,
      itemId,
      action: "import:attachments",
      detail: { attachments: keys.length },
      via: "import",
    });
  }

  for (const p of planned) {
    // 1. Upload this item's screenshots. Done before the row is written so an
    //    item never claims an attachment that is not in the bucket.
    const attachments: string[] = [];
    const taskId = p.source.slice("telegram:".length);
    for (const name of p.photos) {
      const hit = resolved.get(`${p.source}|${name}`);
      if (!hit) continue;
      const key = `harvest/shots/${ownerId}/${taskId}/${name}`;
      if (args.skipUploads) {
        attachments.push(key);
        continue;
      }
      try {
        const buf = fs.readFileSync(hit);
        // storagePut, never storageGet: storageGet returns a PUBLIC url the
        // moment STORAGE_PUBLIC_URL is set, which it is. These keys are read
        // back only through /api/brain/assets/*, behind the owner's session.
        await storagePut(key, buf, contentTypeFor(name));
        attachments.push(key);
        c.photosUploaded++;
      } catch (err) {
        console.error(`upload failed for ${name} (${p.source}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Create through the shared path, then stamp what it cannot carry.
    const before = await db
      .select({
        id: brainItems.id,
        state: brainItems.state,
        kind: brainItems.kind,
        readyAt: brainItems.readyAt,
        proposed: brainItems.proposed,
        attachments: brainItems.attachments,
      })
      .from(brainItems)
      .where(and(eq(brainItems.ownerId, ownerId), eq(brainItems.source, p.source)))
      .limit(1);
    const existed = before.length > 0;

    /**
     * A re-run must repair a crashed one without undoing Rye's work. A row is
     * still pristine if nobody has sorted it: raw, unsorted, never promoted.
     * Those get the full stamp, which is idempotent when the first run
     * finished and corrective when it did not. Anything Rye has moved gets
     * only its attachments refreshed, so a failed photo upload can be healed
     * without a re-import resetting his kinds and states to `unsorted`/`raw`.
     */
    const pristine =
      !existed || (before[0].state === "raw" && before[0].kind === "unsorted" && !before[0].readyAt);

    const item = await createItem(
      ownerId,
      {
        body: p.body,
        source: p.source,
        kind: p.kind,
        attachments,
        proposed: p.proposed,
        capturedAt: p.capturedAt ?? undefined,
        trust: "owner",
      },
      "import",
    );
    const hadAttachments = before[0]?.attachments ?? null;
    if (attachments.length === 0 && Array.isArray(hadAttachments) && hadAttachments.length > 0) {
      c.attachmentsKept += hadAttachments.length;
      console.warn(
        `keeping ${hadAttachments.length} existing attachment key(s) for ${p.source}: this run found none on disk`,
      );
    }
    if (pristine) {
      await stampImportedFields(item.id, p, attachments, before[0]?.proposed ?? null, hadAttachments);
    } else {
      await stampAttachmentsOnly(item.id, attachments, hadAttachments);
      c.preserved++;
    }

    if (existed) c.updated++;
    else c.inserted++;
    if ((c.inserted + c.updated) % 50 === 0) {
      console.log(`  ... ${c.inserted + c.updated} / ${planned.length}`);
    }
  }

  report(c, false);
}

// tsx runs this file directly; vitest imports it for the pure functions only.
const invokedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  /import-brain-items\.(ts|js|mjs)$/.test(process.argv[1]);

if (invokedDirectly) {
  main().then(
    () => process.exit(0),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
