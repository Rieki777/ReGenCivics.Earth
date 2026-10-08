import { describe, expect, it } from "vitest";
import { buildEditedRecordingEmailHtml, buildSessionNotesEmailHtml } from "./editedCutEmail";
import { buildRecordingReadyEmailHtml } from "./recordingReadyEmail";
import {
  gistBullets,
  insightItems,
  nextSteps,
  pickTopInsights,
  recapSectionsHtml,
} from "./recapDigest";

const SUMMARY = [
  "The open incubator runs on crowd pooling and a clear game for each project.",
  "Village OS covers quests, gratitude, roles, and Amora as a live example.",
  "The roundtable heard Tau Hermitage, Sand Angel, and Mindful Earth Farm.",
  "The group named which sessions support each project.",
  "Everyone left with one commitment before the next session.",
  "This sixth sentence stays out of the letter.",
].join(" ");

describe("recap digest", () => {
  it("turns a paragraph into at most five short bullets", () => {
    const bullets = gistBullets(SUMMARY);
    expect(bullets).toHaveLength(5);
    expect(bullets[0]).toContain("crowd pooling");
    expect(bullets.join(" ")).not.toContain("sixth sentence");
    expect(gistBullets("")).toEqual([]);
    expect(gistBullets(null)).toEqual([]);
  });

  it("keeps an existing bullet list and drops dash punctuation", () => {
    const bullets = gistBullets("- Name the game\n- Map the needs — then the roles\n- Make one commitment");
    expect(bullets).toEqual([
      "Name the game",
      "Map the needs, then the roles",
      "Make one commitment",
    ]);
  });

  it("ranks call insights and skips dismissed rows", () => {
    const top = pickTopInsights([
      { kind: "idea", content: "A shared map of village tools", status: "suggested" },
      { kind: "decision", content: "Each project writes its game before the next call", status: "suggested" },
      { kind: "wisdom", content: "A culture is the agreements people keep", status: "accepted" },
      { kind: "commitment", content: "This one was withdrawn", status: "dismissed" },
      { kind: "commitment", content: "Bring one need to the roundtable", status: "suggested" },
    ]);
    expect(top.map((row) => row.kind)).toEqual(["decision", "commitment", "wisdom"]);
  });

  it("links an insight to its timestamp and a task to its page", () => {
    const insights = insightItems([
      { kind: "decision", content: "Each project writes its game.", speaker: "Rieki", timestampSecs: 217, status: "suggested" },
    ], "JS8YoJE1PUI");
    expect(insights[0]?.href).toBe("https://youtu.be/JS8YoJE1PUI?t=217");
    expect(insights[0]?.note).toBe("Rieki");

    const steps = nextSteps({
      tasks: [
        { id: 12, title: "Write the game for your project.", workStatus: "proposed" },
        { id: 13, title: "Declined work", workStatus: "declined" },
      ],
      actionItems: [{ owner: "Ada", item: "This stays hidden while tasks exist" }],
      weekBoardHref: "https://regencivics.earth/season2/week/2",
      origin: "https://regencivics.earth",
    });
    expect(steps).toEqual([
      { text: "Write the game for your project", href: "https://regencivics.earth/bounties/12" },
    ]);

    const fromActions = nextSteps({
      actionItems: [{ item: "Add your project profile" }],
      weekBoardHref: "https://regencivics.earth/season2/week/2",
    });
    expect(fromActions[0]?.href).toBe("https://regencivics.earth/season2/week/2");
  });

  it("omits a section that has no lines", () => {
    const html = recapSectionsHtml({ gist: ["Crowd pooling is the raise."], insights: [], steps: [] });
    expect(html).toContain("The gist");
    expect(html).not.toContain("Key insights");
    expect(html).not.toContain("Your next steps");
    expect(recapSectionsHtml({})).toBe("");
  });

  it("places the digest above the watch button and the chapter list", () => {
    const chapters = [{ tSeconds: 59, title: "Crowd pooling", stamp: "00:59" }];
    const edited = buildEditedRecordingEmailHtml({
      week: 2,
      title: "Incubator Overview",
      videoId: "JS8YoJE1PUI",
      chapters,
      summary: SUMMARY,
      insights: insightItems([
        { kind: "decision", content: "Each project writes its game.", timestampSecs: 217, status: "suggested" },
      ], "JS8YoJE1PUI"),
      steps: nextSteps({
        tasks: [{ id: 4, title: "Name the game for your project", workStatus: "proposed" }],
        origin: "https://regencivics.earth",
      }),
      prefsUrl: "https://regencivics.earth/email-preferences?token=abc",
    });
    expect(edited.indexOf("The gist")).toBeLessThan(edited.indexOf("Open the Week 2 board"));
    expect(edited.indexOf("Your next steps")).toBeLessThan(edited.indexOf("Open the Week 2 board"));
    expect(edited.indexOf("Open the Week 2 board")).toBeLessThan(edited.indexOf("Jump to a moment"));
    expect(edited).toContain("https://regencivics.earth/season2/week/2");
    expect(edited).toContain("https://youtu.be/JS8YoJE1PUI?t=59");
    expect(edited).not.toContain("Key insights");
    expect(edited).not.toContain("https://youtu.be/JS8YoJE1PUI?t=217");
    expect(edited).not.toContain("The edited recording of");
    expect(edited).not.toContain("What we covered");
    const gistItems = edited.match(/The gist<\/p><ul[\s\S]*?<\/ul>/)?.[0] ?? "";
    expect(gistItems.match(/<li/g)?.length).toBe(3);

    const ready = buildRecordingReadyEmailHtml({
      title: "Incubator Overview",
      sessionDate: "Thursday, October 1, 2026",
      youtubeUrl: "https://youtu.be/JS8YoJE1PUI",
      aiSummary: SUMMARY,
      courseUrl: "https://regencivics.earth/season2/week/2",
      courseLabel: "Week 2 board",
      prefsUrl: "https://regencivics.earth/email-preferences?token=abc",
      chaptersHtml: "<p>Jump to a moment</p>",
    });
    expect(ready.indexOf("The gist")).toBeLessThan(ready.indexOf("Open the Week 2 board"));
    expect(ready.indexOf("Open the Week 2 board")).toBeLessThan(ready.indexOf("Jump to a moment"));
    expect(ready).not.toContain("Key insights");
    expect(ready).not.toContain("The recording from our latest");
    expect(ready).not.toContain("What we covered");

    const bare = buildSessionNotesEmailHtml({
      week: 2,
      title: "Incubator Overview",
      videoId: "JS8YoJE1PUI",
      summary: "",
      chapters,
      prefsUrl: "https://regencivics.earth/email-preferences?token=abc",
    });
    expect(bare).not.toContain("The gist");
    expect(bare).not.toContain("Key insights");
    expect(bare).toContain("Jump to a moment");
  });
});
