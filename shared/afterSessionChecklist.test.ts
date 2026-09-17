import { describe, expect, it } from "vitest";
import {
  applyChecklistOverrides,
  buildAfterSessionChecklist,
  checklistProgress,
  hasEditedCut,
  hasRawRecording,
  hasWatchLinked,
  isUpcomingButPast,
  postSessionLetterKeyForRecording,
} from "./afterSessionChecklist";

describe("hasWatchLinked", () => {
  it("accepts event youtube without recording", () => {
    expect(hasWatchLinked({ id: 1, youtubeUrl: "https://youtu.be/x" }, null)).toBe(true);
  });
  it("accepts recording edited cut", () => {
    expect(
      hasWatchLinked({ id: 1 }, { id: 9, editedYoutubeUrl: "https://youtu.be/cut" }),
    ).toBe(true);
  });
  it("fails when nothing linked", () => {
    expect(hasWatchLinked({ id: 1, status: "completed" }, null)).toBe(false);
  });
});

describe("edited cut optional until raw", () => {
  it("raw detection", () => {
    expect(hasRawRecording({ id: 1, youtubeVideoId: "abc" })).toBe(true);
    expect(hasRawRecording({ id: 1 })).toBe(false);
    expect(hasEditedCut({ id: 1, editedYoutubeUrl: " https://youtu.be/c " })).toBe(true);
  });
});

describe("buildAfterSessionChecklist", () => {
  it("marks watch pending and cut N/A without recording", () => {
    const items = buildAfterSessionChecklist({
      event: { id: 10, status: "completed" },
      recording: null,
      isPast: true,
    });
    expect(items.find((i) => i.id === "watch")?.status).toBe("pending");
    expect(items.find((i) => i.id === "edited_cut")?.status).toBe("na");
    expect(items.find((i) => i.id === "post_session_letter")?.status).toBe("na");
    expect(items.find((i) => i.id === "recording_email")?.status).toBe("na");
    expect(items.find((i) => i.id === "mark_completed")?.status).toBe("done");
  });

  it("edited cut optional when raw exists; letter actionable", () => {
    const items = buildAfterSessionChecklist({
      event: { id: 10, status: "completed", recordingId: 5 },
      recording: {
        id: 5,
        youtubeUrl: "https://youtu.be/raw",
        emailSent: 0,
      },
      isPast: true,
    });
    expect(items.find((i) => i.id === "watch")?.status).toBe("done");
    expect(items.find((i) => i.id === "edited_cut")?.status).toBe("optional");
    expect(items.find((i) => i.id === "post_session_letter")?.status).toBe("action");
    expect(items.find((i) => i.id === "post_session_letter")?.canAct).toBe(true);
    expect(items.find((i) => i.id === "recording_email")?.status).toBe("pending");
  });

  it("letter done when issue exists; email done when emailSent", () => {
    const items = buildAfterSessionChecklist({
      event: { id: 10, status: "completed", recordingId: 5 },
      recording: {
        id: 5,
        editedYoutubeUrl: "https://youtu.be/cut",
        emailSent: 1,
      },
      letter: { issueId: 42, status: "draft" },
      isPast: true,
    });
    expect(items.find((i) => i.id === "edited_cut")?.status).toBe("done");
    expect(items.find((i) => i.id === "post_session_letter")?.status).toBe("done");
    expect(items.find((i) => i.id === "recording_email")?.status).toBe("done");
  });

  it("mark completed action when upcoming-but-past", () => {
    expect(isUpcomingButPast({ id: 1, status: "upcoming" }, true)).toBe(true);
    const items = buildAfterSessionChecklist({
      event: { id: 10, status: "upcoming", youtubeUrl: "https://youtu.be/x" },
      isPast: true,
    });
    const mark = items.find((i) => i.id === "mark_completed");
    expect(mark?.status).toBe("action");
    expect(mark?.canAct).toBe(true);
  });
});

describe("overrides + progress", () => {
  it("applies localStorage-style overrides", () => {
    const base = buildAfterSessionChecklist({
      event: { id: 1, status: "completed" },
      isPast: true,
    });
    const applied = applyChecklistOverrides(base, { watch: true });
    expect(applied.find((i) => i.id === "watch")?.status).toBe("done");
  });

  it("progress counts non-na rows", () => {
    const items = buildAfterSessionChecklist({
      event: { id: 1, status: "completed", recordingId: 2 },
      recording: { id: 2, youtubeUrl: "https://youtu.be/r", emailSent: 1 },
      letter: { issueId: 9, status: "draft" },
      isPast: true,
    });
    const p = checklistProgress(items);
    expect(p.total).toBeGreaterThan(0);
    expect(p.done).toBeGreaterThan(0);
    expect(p.pendingAction).toBeGreaterThanOrEqual(0);
  });
});

describe("postSessionLetterKeyForRecording", () => {
  it("matches shared idempotency prefix", () => {
    expect(postSessionLetterKeyForRecording(7)).toBe("post-session-letter:rec:7");
  });
});
