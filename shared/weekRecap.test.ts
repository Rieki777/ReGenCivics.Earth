import { describe, expect, it } from "vitest";
import { assembleWeekRecap, showSessionRecap } from "./weekRecap";

describe("week recap", () => {
  it("stays off the welcome page until the session has ended", () => {
    expect(showSessionRecap(0, false)).toBe(false);
    expect(showSessionRecap(1, true)).toBe(false);
    expect(showSessionRecap(0, true)).toBe(true);
  });

  it("builds the board recap from the week's recordings", () => {
    const recap = assembleWeekRecap({
      week: 2,
      title: "Incubator Overview",
      origin: "https://regencivics.earth",
      recordings: [
        {
          id: 56,
          title: "S2E2 LIVE - Journey to ReGenerative Civilization - Incubator Overview",
          youtubeVideoId: "23cRivDtorQ",
          aiSummary: "Live notes stay behind the edited cut.",
          insights: [{ kind: "idea", content: "A live-only idea that should wait.", status: "suggested" }],
          tasks: [{ id: 9, title: "Bring one community need to the roundtable", workStatus: "proposed" }],
        },
        {
          id: 57,
          title: "S2E2 EDIT - Journey to ReGenerative Civilization - Incubator Overview",
          youtubeVideoId: "JS8YoJE1PUI",
          aiSummary: "The open incubator runs on crowd pooling and a clear game. Village OS covers quests, roles, and Amora. The roundtable heard three land projects.",
          insights: [
            { kind: "decision", content: "Each project writes its game before the next call.", speaker: "Rieki", timestampSecs: 217, status: "suggested" },
            { kind: "commitment", content: "This one was withdrawn.", status: "dismissed" },
          ],
          tasks: [
            { id: 9, title: "Bring one community need to the roundtable", workStatus: "proposed" },
            { id: 4, title: "Name the game for your project", workStatus: "proposed" },
          ],
        },
        {
          id: 3,
          title: "S2E1 something else",
          youtubeVideoId: "aaaaaaaaaaa",
          aiSummary: "Week 1 does not belong here.",
        },
      ],
    });
    expect(recap.title).toBe("Incubator Overview");
    expect(recap.gist[0]).toContain("crowd pooling");
    expect(recap.gist.join(" ")).not.toContain("Live notes");
    expect(recap.insights).toHaveLength(1);
    expect(recap.insights[0]?.href).toBe("https://youtu.be/JS8YoJE1PUI?t=217");
    expect(recap.steps.map((step) => step.href)).toEqual([
      "https://regencivics.earth/bounties/9",
      "https://regencivics.earth/bounties/4",
    ]);
    expect(recap.watches).toEqual([
      { label: "Watch the edited recording", href: "https://youtu.be/JS8YoJE1PUI" },
      { label: "Watch the live session", href: "https://youtu.be/23cRivDtorQ" },
    ]);
  });
});
