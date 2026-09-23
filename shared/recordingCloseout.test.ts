import { describe, expect, it } from "vitest";
import {
  applyCloseoutMetaPatch,
  buildCloseoutDeepLinks,
  closeoutFilterMatch,
  countCloseoutFilters,
  defaultCloseoutDueDate,
  hasPublishedEditedCut,
  isCloseoutOverdue,
  parseCloseoutMetaBag,
  resolveCloseoutRow,
  resolveCloseoutStatus,
} from "./recordingCloseout";

describe("hasPublishedEditedCut / resolveCloseoutStatus", () => {
  it("published URL forces Done", () => {
    expect(hasPublishedEditedCut({ editedYoutubeUrl: " https://youtu.be/x " })).toBe(true);
    expect(
      resolveCloseoutStatus(
        { editedYoutubeUrl: "https://youtu.be/x" },
        { status: "needs_cut" },
      ),
    ).toBe("done");
  });

  it("defaults to needs_cut without meta", () => {
    expect(resolveCloseoutStatus({ editedYoutubeUrl: null }, null)).toBe("needs_cut");
    expect(resolveCloseoutStatus({ editedYoutubeUrl: "" }, {})).toBe("needs_cut");
  });

  it("honors in_progress and ready_to_publish meta", () => {
    expect(
      resolveCloseoutStatus({ editedYoutubeUrl: null }, { status: "in_progress" }),
    ).toBe("in_progress");
    expect(
      resolveCloseoutStatus({ editedYoutubeUrl: null }, { status: "ready_to_publish" }),
    ).toBe("ready_to_publish");
  });

  it("maps meta done without URL to ready_to_publish", () => {
    expect(
      resolveCloseoutStatus({ editedYoutubeUrl: null }, { status: "done" }),
    ).toBe("ready_to_publish");
  });
});

describe("due dates", () => {
  it("defaults to sessionDate + 7 days UTC", () => {
    expect(defaultCloseoutDueDate({ sessionDate: "2026-09-16T18:00:00.000Z" })).toBe(
      "2026-09-23",
    );
  });

  it("falls back to createdAt", () => {
    expect(
      defaultCloseoutDueDate({ sessionDate: null, createdAt: "2026-09-01T00:00:00.000Z" }),
    ).toBe("2026-09-08");
  });

  it("overdue only for open rows before today", () => {
    const now = Date.parse("2026-09-23T12:00:00.000Z");
    expect(isCloseoutOverdue("2026-09-22", "needs_cut", now)).toBe(true);
    expect(isCloseoutOverdue("2026-09-23", "needs_cut", now)).toBe(false);
    expect(isCloseoutOverdue("2026-09-22", "done", now)).toBe(false);
  });
});

describe("meta bag parse / patch", () => {
  it("parses valid bag and ignores junk", () => {
    const bag = parseCloseoutMetaBag(
      JSON.stringify({
        "12": { status: "in_progress", assignee: "Rieki", dueDate: "2026-09-30" },
        bad: { status: "needs_cut" },
        "x": null,
      }),
    );
    expect(bag["12"]?.assignee).toBe("Rieki");
    expect(bag["12"]?.status).toBe("in_progress");
    expect(bag.bad).toBeUndefined();
  });

  it("applyCloseoutMetaPatch merges and clears empties", () => {
    let bag = applyCloseoutMetaPatch({}, 5, {
      status: "in_progress",
      assignee: "Editor",
      roleSlug: "media-weaver",
      dueDate: "2026-10-01",
    });
    expect(bag["5"]?.roleSlug).toBe("media-weaver");
    bag = applyCloseoutMetaPatch(bag, 5, { assignee: "", roleSlug: null });
    expect(bag["5"]?.assignee).toBeUndefined();
    expect(bag["5"]?.roleSlug).toBeUndefined();
    expect(bag["5"]?.status).toBe("in_progress");
  });
});

describe("filters and deep links", () => {
  it("filter match + counts", () => {
    const rows = [
      resolveCloseoutRow(
        { id: 1, editedYoutubeUrl: null, sessionDate: "2026-09-01" },
        { status: "needs_cut" },
        { nowMs: Date.parse("2026-09-23T00:00:00.000Z") },
      ),
      resolveCloseoutRow(
        { id: 2, editedYoutubeUrl: "https://youtu.be/c", sessionDate: "2026-09-10" },
        { assignee: "A" },
        { nowMs: Date.parse("2026-09-23T00:00:00.000Z") },
      ),
      resolveCloseoutRow(
        { id: 3, editedYoutubeUrl: null, createdAt: "2026-09-20" },
        { status: "in_progress", assignee: "B", dueDate: "2026-09-30" },
        { nowMs: Date.parse("2026-09-23T00:00:00.000Z") },
      ),
    ];
    expect(closeoutFilterMatch(rows[0], "unassigned")).toBe(true);
    expect(closeoutFilterMatch(rows[0], "overdue")).toBe(true);
    expect(closeoutFilterMatch(rows[1], "done")).toBe(true);
    expect(closeoutFilterMatch(rows[2], "in_progress")).toBe(true);
    const counts = countCloseoutFilters(rows);
    expect(counts.all).toBe(3);
    expect(counts.done).toBe(1);
    expect(counts.open).toBe(2);
    expect(counts.needs_cut).toBe(1);
  });

  it("deep links include recording id and optional event", () => {
    expect(buildCloseoutDeepLinks(9).editedHref).toBe(
      "/admin?tab=edited-cuts&recording=9",
    );
    expect(buildCloseoutDeepLinks(9, 44).eventsHref).toBe(
      "/admin?tab=events&filter=past&open=44",
    );
  });
});
