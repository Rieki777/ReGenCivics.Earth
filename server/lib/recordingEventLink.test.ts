import { describe, expect, it } from "vitest";
import {
  decideEventRecordingLink,
  decideRecordingEventLink,
  preferredRecordingYoutubeUrl,
  recordingYoutubeIds,
} from "./recordingEventLink";

const baseRec = {
  id: 10,
  sessionDate: new Date("2026-09-10T17:00:00.000Z"),
  youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  editedYoutubeUrl: null as string | null,
  youtubeVideoId: "dQw4w9WgXcQ",
  riversideUrl: null as string | null,
};

const baseEvent = {
  id: 1,
  startTime: new Date("2026-09-10T17:00:00.000Z"),
  youtubeUrl: null as string | null,
  recordingId: null as number | null,
  forumThreadId: null as number | null,
  status: "upcoming" as string | null,
};

describe("recordingYoutubeIds / preferredRecordingYoutubeUrl", () => {
  it("collects ids and prefers edited URL", () => {
    expect(recordingYoutubeIds(baseRec)).toContain("dQw4w9WgXcQ");
    expect(
      preferredRecordingYoutubeUrl({
        ...baseRec,
        editedYoutubeUrl: "https://youtu.be/edited11111",
      }),
    ).toBe("https://youtu.be/edited11111");
  });
});

describe("decideRecordingEventLink", () => {
  it("links on unique YouTube id even without forum thread", () => {
    const decision = decideRecordingEventLink(baseRec, [
      { ...baseEvent, youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" },
    ]);
    expect(decision).toMatchObject({
      action: "link",
      reason: "youtube_id",
      eventId: 1,
      recordingId: 10,
    });
  });

  it("links on unique ±4h session window and fills youtubeUrl", () => {
    const decision = decideRecordingEventLink(baseRec, [baseEvent]);
    expect(decision).toMatchObject({
      action: "link",
      reason: "unique_session_window",
      fillYoutubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  });

  it("refuses ambiguous session window", () => {
    const decision = decideRecordingEventLink(baseRec, [
      baseEvent,
      { ...baseEvent, id: 2, startTime: new Date("2026-09-10T18:00:00.000Z") },
    ]);
    expect(decision).toEqual({ action: "none", reason: "ambiguous_session_window" });
  });

  it("skips already-linked candidates", () => {
    const decision = decideRecordingEventLink(baseRec, [
      { ...baseEvent, recordingId: 99 },
    ]);
    expect(decision).toEqual({ action: "none", reason: "no_unlinked_candidates" });
  });
});

describe("decideEventRecordingLink", () => {
  it("links event youtube to unique recording", () => {
    const decision = decideEventRecordingLink(
      { ...baseEvent, youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      [baseRec],
      new Set(),
    );
    expect(decision).toMatchObject({ action: "link", reason: "youtube_id", recordingId: 10 });
  });

  it("ignores recordings already owned by another event", () => {
    const decision = decideEventRecordingLink(baseEvent, [baseRec], new Set([10]));
    expect(decision.action).toBe("none");
  });
});
