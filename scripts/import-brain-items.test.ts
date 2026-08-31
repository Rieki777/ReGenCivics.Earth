/**
 * The tasks.json importer's mapping rules, on real rows.
 *
 * These are pure functions on purpose: the mapping is the part that can be
 * wrong in a way nobody notices, and it can be checked without a database, an
 * R2 bucket, or the 33 MB of Telegram exports, none of which exist in CI.
 *
 * Two things these tests deliberately pin, because both are the kind of claim
 * that decays into folklore:
 *
 *  - the importer can never write `ready` (the gate is a human's, brain-gate.ts)
 *  - a row whose text is empty is still imported, because all 49 of them carry
 *    a screenshot and the screenshot IS the item (response doc 17.6)
 *
 * The tasks.json file is untracked and lives only in the main checkout, so the
 * suites that read it skip when it is absent rather than fail. The rest run
 * everywhere off literal rows copied out of it.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  KNOWN_SESSIONS,
  assertImportableState,
  contentTypeFor,
  isSafePhotoName,
  kindHint,
  MAYBE_DONE_BEFORE,
  maybeDone,
  mergeTriageState,
  normalizePhotoRoot,
  parseArgs,
  parseTasks,
  placeholderBody,
  planItem,
  repoFor,
  resolvePhoto,
  stateFor,
  type TaskRow,
} from "./import-brain-items";

/** Real rows, copied verbatim out of TASK_SESSIONS_2026-08-29/tasks.json. */
const ROWS: Record<string, TaskRow> = {
  // A screenshot with a caption, closed by the triage.
  "113853": {
    id: "113853",
    date: "2026-08-08",
    session: "01-amora-map-render",
    screenshots: ["photo_971@08-08-2026_10-57-42.jpg"],
    text: "Icon style should default to our painted 3d buildings and on the picker here the button overlaps and exists the screen.",
    status: "closed-or-na",
  },
  // The plan's build example.
  "113554": {
    id: "113554",
    date: "2026-06-13",
    session: "SPRING/BATCH_C-amora-custom.md",
    screenshots: ["photo_756@13-06-2026_09-40-16.jpg"],
    text: "Remove every instance of \u201cAmora is client #1\u201d",
    status: "open",
  },
  // The plan's ask example: a question, short.
  "113639": {
    id: "113639",
    date: "2026-08-12",
    session: "04-amora-admin-bugs",
    screenshots: ["photo_1013@12-08-2026_09-52-13.jpg"],
    text: "how do I turn modules on in admin if not on this panel?",
    status: "open",
  },
  // The plan's create example. It is 160 words; see the test.
  "114025": {
    id: "114025",
    date: "2026-08-20",
    session: "10-content-and-site",
    screenshots: [],
    text:
      "Problem children are addicted to their phones. We like to just blame them in addiction and blame the tech company, but I think something that's not talked about. " +
      "Nearly enough is how we've made nature lesson engaging. Compile a list of early writings about North America.",
    status: "open",
  },
  // The plan's second build example.
  "113657": {
    id: "113657",
    date: "2026-08-11",
    session: "03-amora-map-wiring",
    screenshots: ["photo_1002@11-08-2026_08-11-30.jpg"],
    text: "the map should have working links to be useful",
    status: "open",
  },
};

describe("stateFor", () => {
  it("open becomes raw with nobody blocking", () => {
    expect(stateFor("open")).toEqual({ state: "raw" });
  });

  it("needs-rye is raw with Rye in blocked_on, not a state of its own", () => {
    expect(stateFor("needs-rye")).toEqual({ state: "raw", blockedOn: "Rye" });
  });

  it("deferred parks", () => {
    expect(stateFor("deferred")).toEqual({ state: "parked" });
  });

  it("closed-or-na lands done and names who closed it", () => {
    expect(stateFor("closed-or-na")).toEqual({
      state: "done",
      closedBy: "opus-triage-2026-08-29",
    });
  });

  it("never returns ready, for any status", () => {
    for (const s of ["open", "needs-rye", "deferred", "closed-or-na"] as const) {
      expect(stateFor(s).state).not.toBe("ready");
    }
  });
});

describe("assertImportableState", () => {
  it("refuses ready by name", () => {
    expect(() => assertImportableState("ready")).toThrow(/never write state `ready`/);
  });

  it("refuses every other state the gate owns", () => {
    for (const s of ["shaped", "in_flight", "done_claimed"]) {
      expect(() => assertImportableState(s)).toThrow();
    }
  });

  it("allows the three the importer may write", () => {
    for (const s of ["raw", "parked", "done"]) {
      expect(() => assertImportableState(s)).not.toThrow();
    }
  });
});

describe("repoFor", () => {
  it("maps every amora session to game-amora", () => {
    expect(repoFor("01-amora-map-render")).toBe("game-amora");
    expect(repoFor("07-amora-voice-copy")).toBe("game-amora");
    expect(repoFor("SPRING/BATCH_C-amora-custom.md")).toBe("game-amora");
  });

  it("maps the site and content sessions to regen-civics", () => {
    expect(repoFor("10-content-and-site")).toBe("regen-civics");
    expect(repoFor("SPRING/BATCH_B-ship.md")).toBe("regen-civics");
    expect(repoFor("08-regen-investor-fund")).toBe("regen-civics");
  });

  /**
   * The correction. The plan's regex tested /core/i before its regen-civics
   * markers, so every row of 09-regen-event-core went to a `core-site` repo.
   * Three of that session's twenty rows are about core.regencivics.earth; the
   * other seventeen are the September event, season two outreach and the
   * custom-games page, which are regen-civics work.
   */
  it("does not send the ReGen event session to the CORE site", () => {
    expect(repoFor("09-regen-event-core")).toBe("regen-civics");
  });

  it("leaves personal and research sessions without a repo", () => {
    expect(repoFor("13-personal")).toBeNull();
    expect(repoFor("11-research-digest")).toBeNull();
    expect(repoFor("DEFERRED")).toBeNull();
  });

  it("returns null for a missing session rather than guessing", () => {
    expect(repoFor(undefined)).toBeNull();
    expect(repoFor("")).toBeNull();
    expect(repoFor("something-nobody-has-run-yet")).toBeNull();
  });

  it("still guesses for a session slug that does not exist yet", () => {
    expect(repoFor("14-amora-something-new")).toBe("game-amora");
    expect(repoFor("15-site-copy")).toBe("regen-civics");
  });
});

describe("kindHint", () => {
  it("calls a bare URL material", () => {
    expect(kindHint("https://wiki.p2pfoundation.net/New_Architecture_of_Humanity", false)).toBe("material");
  });

  it("calls a short question ask", () => {
    expect(kindHint(ROWS["113639"].text, true)).toBe("ask");
  });

  it("calls a captioned screenshot build", () => {
    expect(kindHint(ROWS["113554"].text, true)).toBe("build");
    expect(kindHint(ROWS["113657"].text, true)).toBe("build");
  });

  it("calls an errand todo", () => {
    expect(kindHint("Pay Amazon pay citi", false)).toBe("todo");
    expect(kindHint("Call navy federal to take off a late payment", false)).toBe("todo");
  });

  /**
   * The plan's worked example says row 114025 should come out `create`. It does
   * not: the row is 160 words and the rule wants more than 180. Lowering the
   * threshold to catch it pulls in twelve rows, ten of which read as build
   * ("8 forms of capital added to the flows overlay", "Modules ideas", "the
   * play store removed the wallet"), so the rule would get worse to make one
   * example pass. The threshold stayed and the expectation is corrected here.
   *
   * Nothing downstream is affected: 114025 is open, and an open row's `kind`
   * is `unsorted` no matter what the hint says.
   */
  it("does not call a 160-word first-person note create (the plan expected create)", () => {
    expect(kindHint(ROWS["114025"].text, false)).toBe("unsorted");
    expect(planItem(ROWS["114025"]).kind).toBe("unsorted");
  });

  it("calls a long first-person note create once it is past the threshold", () => {
    const long = `I want to ${"write about how we rebuild the commons together ".repeat(30)}`;
    expect(long.trim().split(/\s+/).length).toBeGreaterThan(180);
    expect(kindHint(long, false)).toBe("create");
  });
});

describe("planItem", () => {
  it("keys on the string id, so the source is telegram:<id> exactly", () => {
    expect(planItem(ROWS["113853"]).source).toBe("telegram:113853");
  });

  it("leaves kind unsorted for anything Rye still has to look at, and keeps the hint", () => {
    const p = planItem(ROWS["113554"]);
    expect(p.state).toBe("raw");
    expect(p.kind).toBe("unsorted");
    expect(p.hint).toBe("build");
    expect(p.proposed.kind_hint).toBe("build");
  });

  it("gives a closed row the hint as its kind and marks the source as a rule", () => {
    const p = planItem(ROWS["113853"]);
    expect(p.state).toBe("done");
    expect(p.kind).toBe("build");
    expect(p.closedBy).toBe("opus-triage-2026-08-29");
    expect(p.proposed.kind_source).toBe("rule");
  });

  it("carries the triage note into evidence", () => {
    const p = planItem({ ...ROWS["113853"], note: "Screenshot read 2026-08-29: already correct. Closed." });
    expect(p.evidence).toBe("Screenshot read 2026-08-29: already correct. Closed.");
  });

  it("imports an empty-text row rather than skipping it, and names its screenshot", () => {
    const p = planItem({ ...ROWS["113853"], text: "" });
    expect(p.bodyIsPlaceholder).toBe(true);
    expect(p.body).toContain("photo_971@08-08-2026_10-57-42.jpg");
    expect(p.proposed.body_placeholder).toBe(true);
    expect(p.photos).toHaveLength(1);
  });

  it("marks a placeholder body as a machine's, never as something Rye typed", () => {
    expect(placeholderBody(["a.jpg"])).toBe("(screenshot only: a.jpg)");
    expect(placeholderBody([])).toBe("(no text captured)");
  });

  it("drops an unsafe screenshot name instead of turning it into a key", () => {
    const p = planItem({ ...ROWS["113853"], screenshots: ["../../etc/passwd.jpg", "ok.jpg"] });
    expect(p.photos).toEqual(["ok.jpg"]);
    expect(p.unsafePhotos).toBe(1);
  });

  it("never plans a ready state", () => {
    for (const row of Object.values(ROWS)) {
      expect(() => assertImportableState(planItem(row).state)).not.toThrow();
    }
  });
});

describe("photo names", () => {
  it("accepts a plain Telegram export filename", () => {
    expect(isSafePhotoName("photo_971@08-08-2026_10-57-42.jpg")).toBe(true);
  });

  /**
   * The exports ship a downscaled twin beside every photo. Uploading the thumb
   * would put an unreadable screenshot behind an item whose whole content is
   * that screenshot.
   */
  it("refuses the _thumb twin", () => {
    expect(isSafePhotoName("photo_971@08-08-2026_10-57-42_thumb.jpg")).toBe(false);
  });

  it("refuses traversal, separators and unknown extensions", () => {
    expect(isSafePhotoName("../secrets.jpg")).toBe(false);
    expect(isSafePhotoName("sub/dir/photo.jpg")).toBe(false);
    expect(isSafePhotoName("photo.jpg\\..\\x")).toBe(false);
    expect(isSafePhotoName("payload.svg")).toBe(false);
    expect(isSafePhotoName("payload.html")).toBe(false);
    expect(isSafePhotoName("")).toBe(false);
  });

  it("only ever names a content type storagePut allows", () => {
    expect(contentTypeFor("a.jpg")).toBe("image/jpeg");
    expect(contentTypeFor("a.JPEG")).toBe("image/jpeg");
    expect(contentTypeFor("a.png")).toBe("image/png");
  });
});

describe("resolvePhoto across several export roots", () => {
  const A = "/exports/ChatExport_A/photos";
  const B = "/exports/ChatExport_B/photos";
  const onDisk = new Set([`${A}/in-a.jpg`, `${B}/in-b.jpg`]);
  const exists = (p: string) => onDisk.has(p.replace(/\\/g, "/"));

  it("finds a photo that is only in the first root", () => {
    expect(resolvePhoto("in-a.jpg", [A, B], exists)?.replace(/\\/g, "/")).toBe(`${A}/in-a.jpg`);
  });

  /**
   * The reason the runner takes more than one root at all: the 382 referenced
   * photos are 129 in one export and 253 in the other, so a single root always
   * leaves items with a broken attachment.
   */
  it("finds a photo that is only in the second root", () => {
    expect(resolvePhoto("in-b.jpg", [A, B], exists)?.replace(/\\/g, "/")).toBe(`${B}/in-b.jpg`);
  });

  it("returns null when no root has it, rather than inventing a path", () => {
    expect(resolvePhoto("nowhere.jpg", [A, B], exists)).toBeNull();
  });

  it("returns null for an unsafe name before it ever touches the disk", () => {
    let touched = false;
    resolvePhoto("../escape.jpg", [A], () => {
      touched = true;
      return true;
    });
    expect(touched).toBe(false);
  });

  it("accepts either the export directory or its photos/ subdirectory", () => {
    const isDir = (p: string) => p.replace(/\\/g, "/") === "/exports/ChatExport_A/photos";
    expect(normalizePhotoRoot("/exports/ChatExport_A", isDir).replace(/\\/g, "/")).toBe(
      "/exports/ChatExport_A/photos",
    );
    expect(normalizePhotoRoot("/exports/ChatExport_A/photos", isDir).replace(/\\/g, "/")).toBe(
      "/exports/ChatExport_A/photos",
    );
  });
});

describe("parseArgs", () => {
  it("takes repeated --photos roots in order", () => {
    const a = parseArgs(["tasks.json", "--photos", "one", "--photos", "two", "--dry-run"]);
    expect(a.tasksPath).toBe("tasks.json");
    expect(a.photoRoots).toEqual(["one", "two"]);
    expect(a.dryRun).toBe(true);
  });

  it("still accepts the plan's positional export directory", () => {
    const a = parseArgs(["tasks.json", "C:/exports/DataExport", "--dry-run"]);
    expect(a.photoRoots).toEqual(["C:/exports/DataExport"]);
  });

  it("rejects an unknown flag instead of ignoring it", () => {
    expect(() => parseArgs(["tasks.json", "--wipe"])).toThrow(/unknown flag/);
  });
});

describe("parseTasks", () => {
  it("strips a BOM and normalises ids to strings", () => {
    const rows = parseTasks('\uFEFF[{"id":1,"date":"2026-01-01","text":"x","status":"open"}]');
    expect(rows[0].id).toBe("1");
  });

  it("refuses a duplicate id, because source is the idempotency key", () => {
    const dup = '[{"id":"1","text":"a","status":"open","date":"2026-01-01"},{"id":"1","text":"b","status":"open","date":"2026-01-01"}]';
    expect(() => parseTasks(dup)).toThrow(/duplicate id/);
  });
});

// ── Against the real file, when it is present ────────────────────────────────

/**
 * tasks.json is untracked and lives in the main checkout, so a worktree has to
 * walk up to find it and CI never will. Walking beats a fixed `../../..`
 * because the worktree depth is not a constant.
 */
function findTasksJson(): string | undefined {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "TASK_SESSIONS_2026-08-29", "tasks.json");
    if (fs.existsSync(candidate)) return candidate;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return undefined;
}
const realTasks = findTasksJson();

// `describe.skipIf` skips the TESTS but still evaluates the describe body, so
// this read has to be guarded rather than merely skipped. Without the guard the
// suite threw ERR_INVALID_ARG_TYPE at collection on any machine without the
// untracked tasks.json — which is every CI runner. It passed locally and turned
// main red, because a failed collection is a failed suite, not a skipped one.
describe.skipIf(!realTasks)("the real tasks.json", () => {
  const rows = realTasks ? parseTasks(fs.readFileSync(realTasks, "utf8")) : [];

  it("maps every session slug it contains by hand, none by fallback", () => {
    const seen = [...new Set(rows.map((r) => r.session ?? ""))].filter(Boolean);
    const unmapped = seen.filter((s) => !KNOWN_SESSIONS.includes(s));
    expect(unmapped).toEqual([]);
  });

  it("plans a state for all 749 rows and none of them is ready", () => {
    expect(rows).toHaveLength(749);
    for (const r of rows) {
      const p = planItem(r);
      expect(() => assertImportableState(p.state)).not.toThrow();
    }
  });

  it("keeps every empty-text row, because every one of them is a screenshot", () => {
    const empty = rows.filter((r) => !String(r.text ?? "").trim());
    expect(empty.length).toBeGreaterThan(0);
    for (const r of empty) {
      const p = planItem(r);
      expect(p.body.length).toBeGreaterThan(0);
      expect(p.photos.length).toBeGreaterThan(0);
    }
  });

  it("gives no open item a machine-chosen kind", () => {
    for (const r of rows.filter((r) => r.status === "open" || r.status === "needs-rye")) {
      expect(planItem(r).kind).toBe("unsorted");
    }
  });
});

/**
 * The "probably done" flag (ADDENDUM-1 item 2).
 *
 * Every clause of this rule is here because it was measured, not because it
 * read well. The numbers are in the doc comment on `maybeDone`; these tests pin
 * the clauses so a later "simplification" has to argue with them:
 *
 *  - the cutoff, because the one the addendum named flags zero rows
 *  - the screenshot, because the items without one were 79% wrong
 *  - STILL BROKEN, because a later pass already answered those
 *  - raw only, because a closed row is not a question
 */
const flaggable = {
  state: "raw" as const,
  capturedAt: new Date("2026-06-20T12:00:00Z"),
  hint: "build" as const,
  photos: ["shot.jpg"],
  evidence: null,
};

describe("maybeDone", () => {
  it("flags an old raw screenshot item", () => {
    expect(maybeDone(flaggable)).toBe(true);
  });

  it("stops at the cutoff, on the day itself", () => {
    expect(maybeDone({ ...flaggable, capturedAt: new Date(`${MAYBE_DONE_BEFORE}T00:00:00Z`) })).toBe(false);
    expect(maybeDone({ ...flaggable, capturedAt: new Date("2026-07-31T23:00:00Z") })).toBe(true);
  });

  it("needs a screenshot: the text-only asks measured 79% wrong", () => {
    expect(maybeDone({ ...flaggable, photos: [] })).toBe(false);
  });

  it("never asks about an item a later pass already found broken", () => {
    expect(maybeDone({ ...flaggable, evidence: "STILL BROKEN 2026-08-30: the button is 1.16:1 on white" })).toBe(false);
    expect(maybeDone({ ...flaggable, evidence: "Spring export 30 Apr-29 Jul 2026." })).toBe(true);
  });

  it("only asks about work items, and only raw ones", () => {
    for (const hint of ["create", "ask", "material", "unsorted"] as const) {
      expect(maybeDone({ ...flaggable, hint })).toBe(false);
    }
    expect(maybeDone({ ...flaggable, hint: "todo" })).toBe(true);
    for (const state of ["done", "parked"] as const) {
      expect(maybeDone({ ...flaggable, state })).toBe(false);
    }
  });

  it("cannot flag a row with no date at all", () => {
    expect(maybeDone({ ...flaggable, capturedAt: null })).toBe(false);
  });
});

describe("planItem and the flag", () => {
  it("writes the flag and a reason a human can read", () => {
    const p = planItem(ROWS["113554"]);
    expect(p.proposed.maybe_done).toBe(true);
    expect(String(p.proposed.maybe_done_reason)).toContain(MAYBE_DONE_BEFORE);
  });

  it("leaves an August capture unflagged", () => {
    expect(planItem(ROWS["113657"]).proposed.maybe_done).toBeUndefined();
  });

  it("never flags a row the triage already closed", () => {
    expect(planItem(ROWS["113853"]).proposed.maybe_done).toBeUndefined();
  });
});

/**
 * The re-run guarantee. The importer has already run twice against production,
 * and an item Rye answered "still open" is still raw and still unsorted, so it
 * passes the pristine check and gets re-stamped. Without this merge the second
 * run would hand him the same question again, forever.
 */
describe("mergeTriageState", () => {
  const fresh = { kind_hint: "build", maybe_done: true, maybe_done_reason: "old" };

  it("lets the fresh flag stand when Rye has not answered", () => {
    expect(mergeTriageState(fresh, { kind_hint: "build" })).toEqual(fresh);
    expect(mergeTriageState(fresh, null)).toEqual(fresh);
  });

  it("keeps the flag off once he has said it is still open", () => {
    const out = mergeTriageState(fresh, { maybe_done_answer: "open", maybe_done_answered_at: "2026-08-30T10:00:00.000Z" });
    expect(out.maybe_done).toBeUndefined();
    expect(out.maybe_done_reason).toBeUndefined();
    expect(out.maybe_done_answer).toBe("open");
  });

  it("keeps a not-sure snooze rather than restarting the week", () => {
    const out = mergeTriageState(fresh, {
      maybe_done: true,
      maybe_done_answer: "unsure",
      maybe_done_snoozed_until: "2026-09-06T10:00:00.000Z",
    });
    expect(out.maybe_done).toBe(true);
    expect(out.maybe_done_snoozed_until).toBe("2026-09-06T10:00:00.000Z");
  });

  it("recomputes everything that is not the triage's", () => {
    const out = mergeTriageState(
      { kind_hint: "todo", session: "new" },
      { kind_hint: "build", session: "old", maybe_done_answer: "open" },
    );
    expect(out.kind_hint).toBe("todo");
    expect(out.session).toBe("new");
  });
});

// Same guard as the suite above: the body runs even when the tests are skipped.
describe.skipIf(!realTasks)("the flag over the real export", () => {
  const rows = realTasks ? parseTasks(fs.readFileSync(realTasks, "utf8")) : [];

  it("flags only raw, pre-cutoff, screenshot-bearing work items", () => {
    const flagged = rows.map(planItem).filter((p) => p.proposed.maybe_done === true);
    expect(flagged.length).toBeGreaterThan(0);
    for (const p of flagged) {
      expect(p.state).toBe("raw");
      expect(p.photos.length).toBeGreaterThan(0);
      expect(p.capturedAt!.toISOString().slice(0, 10) < MAYBE_DONE_BEFORE).toBe(true);
      expect(["build", "todo"]).toContain(p.hint);
    }
  });

  it("asks about a minority of the open list, not most of it", () => {
    const plans = rows.map(planItem);
    const raw = plans.filter((p) => p.state === "raw");
    const flagged = raw.filter((p) => p.proposed.maybe_done === true);
    // 72 of 219 at the time of writing. The assertion is the shape, not the
    // number: a rule that flags most of the backlog is not a triage queue.
    expect(flagged.length).toBeLessThan(raw.length / 2);
  });
});
