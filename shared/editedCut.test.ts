import { describe, expect, it } from "vitest";
import {
  automaticRecordingMail,
  matchEditedCut,
  priorLetterAlreadySent,
  sessionLabelForCut,
  type CutEvent,
  type CutRecording,
} from "./editedCut";

const CUT = {
  videoId: "JS8YoJE1PUI",
  title: "S2E2 CLEAN - Journey to ReGenerative Civilization - Incubator Overview",
  publishedAt: new Date("2026-10-07T20:29:00.000Z"),
};

const week2Event: CutEvent = {
  id: 4,
  title: "Week 2: Incubator Overview",
  startTime: new Date("2026-10-03T17:00:00.000Z"),
  recordingId: null,
  episodeNumber: 2,
};

const week3Event: CutEvent = {
  id: 5,
  title: "Week 3: Game & Organisation Co-Creation Part 1",
  startTime: new Date("2026-10-10T17:00:00.000Z"),
  recordingId: null,
  episodeNumber: 3,
};

const openSession: CutRecording = {
  id: 56,
  title: "ReGen Civics: Open Session",
  sessionDate: new Date("2026-10-03T18:05:00.000Z"),
  youtubeVideoId: "23cRivDtorQ",
  editedYoutubeVideoId: null,
};

const laterOpenSession: CutRecording = {
  id: 58,
  title: "ReGen Civics: Open Session",
  sessionDate: new Date("2026-10-10T18:05:00.000Z"),
  youtubeVideoId: "laterlive000",
  editedYoutubeVideoId: null,
};

describe("matchEditedCut", () => {
  it("attaches the Week 2 clean cut to the livestream recording, outside the 4 hour window", () => {
    const match = matchEditedCut(CUT, [openSession, laterOpenSession], [week2Event, week3Event]);
    expect(match).toEqual({
      recordingId: 56,
      eventId: 4,
      reason: "event-nearby event 4",
    });
  });

  it("does not attach when the only nearby recording is a different week", () => {
    expect(matchEditedCut(CUT, [laterOpenSession], [week2Event, week3Event])).toBeNull();
  });

  it("does not match a cut published outside 14 days", () => {
    const late = { ...CUT, publishedAt: new Date("2026-10-20T20:29:00.000Z") };
    expect(matchEditedCut(late, [openSession], [week2Event])).toBeNull();
  });

  it("does not treat a livestream as an edited cut", () => {
    const live = { ...CUT, title: "ReGen Civics: Open Session LIVE", videoId: "23cRivDtorQ" };
    expect(matchEditedCut(live, [openSession], [week2Event])).toBeNull();
  });

  it("does not attach a video onto the recording that already owns that id", () => {
    const raw = { ...openSession, youtubeVideoId: CUT.videoId };
    expect(matchEditedCut(CUT, [raw], [week2Event])).toBeNull();
    const edited = { ...openSession, editedYoutubeVideoId: CUT.videoId };
    expect(matchEditedCut(CUT, [edited], [week2Event])).toBeNull();
  });

  it("uses the event title for the letter, not the upload title", () => {
    expect(sessionLabelForCut({
      cutTitle: CUT.title,
      eventTitle: week2Event.title,
      recordingTitle: openSession.title,
    })).toEqual({ week: 2, title: "Incubator Overview" });
  });
});

describe("automaticRecordingMail", () => {
  it("skips Recording ready after the edited letter, and sends notes once a summary exists", () => {
    expect(automaticRecordingMail({
      editedEmailSent: true,
      emailSent: false,
      hasSummary: false,
      hasWatchUrl: true,
    })).toBe("skip");
    expect(automaticRecordingMail({
      editedEmailSent: true,
      emailSent: false,
      hasSummary: true,
      hasWatchUrl: true,
    })).toBe("session_notes");
    expect(automaticRecordingMail({
      editedEmailSent: true,
      emailSent: true,
      hasSummary: true,
      hasWatchUrl: true,
    })).toBe("skip");
    expect(automaticRecordingMail({
      editedEmailSent: false,
      emailSent: false,
      hasSummary: false,
      hasWatchUrl: true,
    })).toBe("recording_ready");
  });
});

describe("priorLetterAlreadySent", () => {
  it("recognizes the Week 2 edited cut that already went out", () => {
    expect(priorLetterAlreadySent("JS8YoJE1PUI")).toBe(true);
    expect(priorLetterAlreadySent("https://youtu.be/JS8YoJE1PUI")).toBe(true);
    expect(priorLetterAlreadySent("23cRivDtorQ")).toBe(false);
    expect(priorLetterAlreadySent(null, undefined, "")).toBe(false);
  });
});
