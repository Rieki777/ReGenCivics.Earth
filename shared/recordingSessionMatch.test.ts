import { describe, expect, it } from "vitest";
import { matchEventToRecordings, matchRecordingToEvents } from "./recordingSessionMatch";

const eventStart = new Date("2026-10-07T17:00:00.000Z");

describe("matchRecordingToEvents", () => {
  it("links Week 2 by episode title inside 14 days", () => {
    const decision = matchRecordingToEvents(
      {
        id: 57,
        title: "S2E2 CLEAN - Journey to ReGenerative Civilization - Incubator Overview",
        sessionDate: new Date("2026-10-11T20:00:00.000Z"),
      },
      [
        {
          id: 4,
          title: "Week 2: Incubator Overview",
          startTime: eventStart,
          recordingId: null,
          episodeNumber: 2,
        },
      ],
    );
    expect(decision).toMatchObject({ action: "link", eventId: 4, recordingId: 57, reason: "session_title" });
  });

  it("does not link a placeholder livestream title", () => {
    const decision = matchRecordingToEvents(
      {
        id: 56,
        title: "ReGen Civics: Open Session",
        sessionDate: eventStart,
      },
      [
        {
          id: 4,
          title: "Week 2: Incubator Overview",
          startTime: eventStart,
          recordingId: null,
        },
      ],
    );
    expect(decision).toEqual({ action: "none", reason: "no_anchor" });
  });

  it("treats two events in range as ambiguous", () => {
    const decision = matchRecordingToEvents(
      {
        id: 57,
        title: "S2E2 Incubator Overview",
        sessionDate: eventStart,
      },
      [
        { id: 4, title: "Week 2: Incubator Overview", startTime: eventStart, recordingId: null },
        {
          id: 8,
          title: "Week 2: Incubator Overview (repeat)",
          startTime: new Date("2026-10-08T17:00:00.000Z"),
          recordingId: null,
        },
      ],
    );
    expect(decision).toEqual({ action: "none", reason: "ambiguous_title" });
  });

  it("does not publish a second recording onto a session that already has one", () => {
    const decision = matchRecordingToEvents(
      {
        id: 57,
        title: "S2E2 CLEAN - Incubator Overview",
        sessionDate: new Date("2026-10-07T20:29:00.000Z"),
      },
      [
        {
          id: 4,
          title: "Week 2: Incubator Overview",
          startTime: eventStart,
          recordingId: 56,
        },
      ],
    );
    expect(decision).toEqual({ action: "none", reason: "session_already_has_recording" });
  });
});

describe("matchEventToRecordings", () => {
  it("refuses when two recordings share the episode", () => {
    const decision = matchEventToRecordings(
      { id: 4, title: "Week 2: Incubator Overview", startTime: eventStart, recordingId: null },
      [
        { id: 56, title: "S2E2 LIVE - Incubator Overview", sessionDate: eventStart },
        { id: 57, title: "S2E2 CLEAN - Incubator Overview", sessionDate: new Date("2026-10-07T20:29:00.000Z") },
      ],
    );
    expect(decision).toEqual({ action: "none", reason: "ambiguous_title" });
  });
});
