import { describe, expect, it } from "vitest";
import {
  chapterWatchUrl,
  parseDescriptionChapters,
  preferredChapters,
  timestampToSeconds,
} from "./youtubeChapters";

const WEEK2 = `
A few lines of description before the list.

Chapters
0:00 Welcome: the open incubator model
0:59 Crowd pooling, shared equity, and collective fundraising
(3:37) Why every project needs a clear “game”
5:44 Needs, governance, and building healthy cultures
7:28 Introducing Village OS
10:31 Quests, gratitude, roles, and community value systems
13:06 Amora: a live example of a community game
16:00 Making participation feel engaging and accessible
18:40 Clear roles, agreements, and onboarding
21:28 Shared knowledge, AI support, and the future of village-building
24:07 Coaching opportunities for regenerative communities
25:59 Project roundtable: surfacing community needs
29:32 Tau Hermitage: healing, incubation, and a clearer path forward
33:02 Sand Angel: land regeneration, hot springs, and raising capital
36:40 Mindful Earth Farm: collective ownership and growing the team
41:25 Shared opportunities and priorities for the season
44:32 Defining what success looks like
46:35 Designing the game: players, quests, value, and decision-making
52:41 Choosing the sessions that best support each project
58:54 Making one meaningful commitment before the next session
64:00 Community tools, project profiles, and getting involved
1:08:50 Where the community will gather and connect
1:11:40 Closing
`;

describe("timestampToSeconds", () => {
  it("reads MM:SS, parenthetical stamps, and minutes past 59", () => {
    expect(timestampToSeconds("00:00")).toBe(0);
    expect(timestampToSeconds("0:59")).toBe(59);
    expect(timestampToSeconds("64:00")).toBe(3840);
    expect(timestampToSeconds("1:04:00")).toBe(3840);
    expect(timestampToSeconds("1:08:50")).toBe(4130);
    expect(timestampToSeconds("10:99")).toBeNull();
    expect(timestampToSeconds("1:64:00")).toBeNull();
  });
});

describe("parseDescriptionChapters", () => {
  it("parses the Week 2 list under a Chapters heading", () => {
    const chapters = parseDescriptionChapters(WEEK2);
    expect(chapters).toHaveLength(23);
    expect(chapters[0]).toMatchObject({ tSeconds: 0, stamp: "0:00", title: "Welcome: the open incubator model" });
    expect(chapters[2]).toMatchObject({
      tSeconds: 217,
      stamp: "3:37",
      title: "Why every project needs a clear “game”",
    });
    expect(chapters[20]).toMatchObject({
      tSeconds: 3840,
      stamp: "64:00",
      title: "Community tools, project profiles, and getting involved",
    });
    expect(chapters[22]).toMatchObject({ tSeconds: 4300, title: "Closing" });
    expect(chapterWatchUrl("JS8YoJE1PUI", chapters[20].tSeconds)).toBe("https://youtu.be/JS8YoJE1PUI?t=3840");
  });

  it("reads a Timestamps heading and minutes past 59 in parentheses", () => {
    const chapters = parseDescriptionChapters([
      "Timestamps",
      "(0:00) Welcome",
      "(62:25) Shared opportunities",
      "(98:42) Closing",
    ].join("\n"));
    expect(chapters.map((c) => [c.tSeconds, c.title])).toEqual([
      [0, "Welcome"],
      [62 * 60 + 25, "Shared opportunities"],
      [98 * 60 + 42, "Closing"],
    ]);
    expect(chapters.some((c) => c.title === "Timestamps")).toBe(false);
  });

  it("accepts (00:00) Title, 00:00 Title, and a markdown stamp", () => {
    const chapters = parseDescriptionChapters([
      "Chapters",
      "(00:00) Welcome",
      "00:59 Shared equity",
      "- [1:04:00](https://youtu.be/JS8YoJE1PUI?t=3840) Community tools, project profiles, and getting involved",
    ].join("\n"));
    expect(chapters.map((c) => c.tSeconds)).toEqual([0, 59, 3840]);
    expect(chapters[0].title).toBe("Welcome");
    expect(chapters[2].title).toBe("Community tools, project profiles, and getting involved");
  });
});

describe("preferredChapters", () => {
  it("uses description chapters before AI chapters", () => {
    const picked = preferredChapters(
      [{ tSeconds: 64, title: "From the description" }],
      [{ tSeconds: 1, title: "From the model" }],
    );
    expect(picked.map((c) => c.title)).toEqual(["From the description"]);
  });

  it("falls back to AI chapters when the description has none", () => {
    const picked = preferredChapters(null, [{ tSeconds: 1, title: "From the model" }]);
    expect(picked.map((c) => c.title)).toEqual(["From the model"]);
  });
});
