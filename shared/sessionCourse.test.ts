import { describe, expect, it } from "vitest";
import { boardStages } from "./sessionBoard";
import {
  courseModes,
  courseSideFromRecording,
  courseWeekFromRecording,
  defaultCourseMode,
  emptySpan,
  publishedSpan,
  readCourseProgress,
  WEEK2_COURSE_SEED,
} from "./sessionCourse";
import { mapStagesToSide, mergeMappedSide, parseLooseChapters } from "./sessionCourseMap";

const CHAPTERS = [
  [0, "Welcome: the open incubator model"],
  [59, "Crowd pooling, shared equity, and collective fundraising"],
  [217, "Why every project needs a clear game"],
  [344, "Needs, governance, and building healthy cultures"],
  [448, "Introducing Village OS"],
  [631, "Quests, gratitude, roles, and community value systems"],
  [786, "Amora: a live example of a community game"],
  [960, "Making participation feel engaging and accessible"],
  [1120, "Clear roles, agreements, and onboarding"],
  [1288, "Shared knowledge, AI support, and the future of village-building"],
  [1447, "Coaching opportunities for regenerative communities"],
  [1559, "Project roundtable: surfacing community needs"],
  [1772, "Tau Hermitage: healing, incubation, and a clearer path forward"],
  [1982, "Sand Angel: land regeneration, hot springs, and raising capital"],
  [2200, "Mindful Earth Farm: collective ownership and growing the team"],
  [2485, "Shared opportunities and priorities for the season"],
  [2672, "Defining what success looks like"],
  [2795, "Designing the game: players, quests, value, and decision-making"],
  [3161, "Choosing the sessions that best support each project"],
  [3534, "Making one meaningful commitment before the next session"],
  [3840, "Community tools, project profiles, and getting involved"],
  [4130, "Where the community will gather and connect"],
  [4300, "Closing"],
].map(([tSeconds, title]) => ({ tSeconds: tSeconds as number, title: title as string }));

describe("week 2 course seed", () => {
  it("publishes the edited welcome clip and hides the unmapped drop-in", () => {
    const welcome = WEEK2_COURSE_SEED.spans[0];
    const breath = WEEK2_COURSE_SEED.spans[1];
    const close = WEEK2_COURSE_SEED.spans[9];
    const tools = WEEK2_COURSE_SEED.spans[10];
    expect(publishedSpan(welcome, "edited")).toEqual({ start: 0, end: 59 });
    expect(publishedSpan(breath, "edited")).toBeNull();
    expect(publishedSpan(welcome, "live")).toEqual({ start: 0, end: 149 });
    expect(publishedSpan(breath, "live")).toEqual({ start: 149, end: 474 });
    expect(close.liveStart).toBe(5922);
    expect(close.liveEnd).toBeNull();
    expect(tools.liveStart).toBe(5271);
    expect(tools.liveEnd).toBe(5922);
    expect(WEEK2_COURSE_SEED.spans.map((span) => span.liveConfidence)).toEqual(Array(11).fill("high"));
    expect(courseModes(WEEK2_COURSE_SEED)).toEqual(["live", "edited"]);
  });

  it("opens on the side that has times", () => {
    const liveOnly = {
      ...WEEK2_COURSE_SEED,
      editedVideoId: WEEK2_COURSE_SEED.editedVideoId,
      spans: WEEK2_COURSE_SEED.spans.map((span) => ({ ...span, editedStart: null, editedEnd: null, editedConfidence: null })),
    };
    expect(defaultCourseMode(liveOnly, "edited")).toBe("live");
    const editedOnly = {
      ...WEEK2_COURSE_SEED,
      spans: WEEK2_COURSE_SEED.spans.map((span) => ({ ...span, liveStart: null, liveEnd: null, liveConfidence: null })),
    };
    expect(defaultCourseMode(editedOnly, "live")).toBe("edited");
    expect(defaultCourseMode(WEEK2_COURSE_SEED, "live")).toBe("live");
  });

  it("remembers a mode and the stages already watched", () => {
    const progress = readCourseProgress(JSON.stringify({ mode: "live", stage: 3, watched: [0, 3, 99] }), 11);
    expect(progress).toEqual({ mode: "live", stage: 3, watched: [0, 3] });
  });
});

describe("mapStagesToSide", () => {
  const stages = boardStages(2);
  const chapters = CHAPTERS;

  it("keeps the Village OS chapter on a village stage at high confidence", () => {
    const spans = mapStagesToSide(stages, "edited", { chapters });
    const village = spans.find((span) => span.editedStart === 448);
    expect(village?.confidence).toBe("high");
    expect(village?.evidence).toMatch(/Village OS/);
  });

  it("assigns a chapter that names the stage", () => {
    const later = boardStages(3);
    const spans = mapStagesToSide(later, "live", {
      chapters: [
        { tSeconds: 0, title: "Welcome" },
        { tSeconds: 120, title: "Project circle" },
        { tSeconds: 400, title: "Closing" },
      ],
    });
    expect(spans[later.findIndex((s) => s.kind === "welcome")].liveStart).toBe(0);
    expect(spans[later.findIndex((s) => s.kind === "circle")].liveStart).toBe(120);
    expect(spans[later.findIndex((s) => s.kind === "close")].liveStart).toBe(400);
  });

  it("does not replace a time an admin saved", () => {
    const mapped = mapStagesToSide(stages, "edited", { chapters });
    const edited = mapped.map((span, index) =>
      index === 0 ? { ...span, editedStart: 12, editedEnd: 40, adminEdited: true, evidence: "hand" } : span,
    );
    const again = mapStagesToSide(stages, "edited", { chapters });
    const merged = mergeMappedSide(edited, again, "edited");
    expect(merged[0].editedStart).toBe(12);
    expect(merged[0].evidence).toBe("hand");
  });

  it("fills an empty live side on a reviewed row when the match is high", () => {
    const prev = WEEK2_COURSE_SEED.spans.map((span) => ({
      ...span,
      liveStart: null,
      liveEnd: null,
      liveConfidence: null,
    }));
    const fresh = prev.map((span) =>
      span.stageIndex === 0
        ? { ...emptySpan(0), liveStart: 40, liveEnd: 90, liveConfidence: "high" as const, confidence: "high" as const }
        : emptySpan(span.stageIndex),
    );
    const merged = mergeMappedSide(prev, fresh, "live");
    expect(merged[0].liveStart).toBe(40);
    expect(merged[0].editedStart).toBe(0);
    expect(merged[0].adminEdited).toBe(true);
  });

  it("leaves a reviewed row alone when the new live match is low", () => {
    const prev = WEEK2_COURSE_SEED.spans.map((span) => ({
      ...span,
      liveStart: null,
      liveEnd: null,
      liveConfidence: null,
    }));
    const fresh = prev.map((span) =>
      span.stageIndex === 0
        ? { ...emptySpan(0), liveStart: 40, liveEnd: 90, liveConfidence: "low" as const, confidence: "low" as const }
        : emptySpan(span.stageIndex),
    );
    const merged = mergeMappedSide(prev, fresh, "live");
    expect(merged[0].liveStart).toBeNull();
    expect(merged[0].editedStart).toBe(0);
  });
});

describe("chapters and week", () => {
  it("reads 64:00 and 1:08:50 as chapter times", () => {
    const chapters = parseLooseChapters(
      ["0:00 Welcome", "64:00 Community tools", "1:08:50 Where the community will gather", "(0:59) Crowd pooling"].join("\n"),
    );
    expect(chapters.map((c) => c.tSeconds)).toEqual([0, 3840, 4130, 59]);
  });

  it("reads a Timestamps block with parenthesized minutes past 59", () => {
    const chapters = parseLooseChapters([
      "Timestamps",
      "(0:00) Welcome",
      "(2:29) Drop in",
      "(62:25) Shared opportunities",
      "(98:42) Closing",
    ].join("\n"));
    expect(chapters.map((c) => c.tSeconds)).toEqual([0, 149, 3745, 5922]);
    expect(chapters.map((c) => c.title)).toEqual(["Welcome", "Drop in", "Shared opportunities", "Closing"]);
  });

  it("reads the week from an episode number or an S2E title", () => {
    expect(courseWeekFromRecording({ season: "Season 2", episodeNumber: 2, title: "call" })).toBe(2);
    expect(courseWeekFromRecording({ title: "S2E2 LIVE - Incubator Overview" })).toBe(2);
    expect(courseWeekFromRecording({ title: "office hours" })).toBeNull();
    expect(courseSideFromRecording({ youtubeVideoId: "JS8YoJE1PUI", title: "S2E2" })).toBe("edited");
    expect(courseSideFromRecording({ title: "S2E2 LIVE - Incubator Overview", recordingKind: "raw" })).toBe("live");
  });
});
