/**
 * Board rows in plain words (shared/boardEntries.ts), for the profile's
 * "Weekly sessions" and the admin export.
 */
import { describe, expect, it } from "vitest";
import {
  EXPORT_COPY,
  EXPORT_WHY,
  SUBMISSIONS_COPY,
  adminApplicationPath,
  boardExportCsv,
  csvCell,
  describeCard,
  describeItem,
  describeVote,
  entryStage,
  weekHeading,
  type BoardExport,
} from "./boardEntries";
import { GAME_BLOCKS, NOTE_ITEM_KINDS, boardStages, promptsForWeek } from "./sessionBoard";

describe("describeItem", () => {
  it("covers every Week 2 kind, and a question for the wall", () => {
    const say = (kind: string, block: string | null = null) => describeItem(2, { kind, block, text: "hello" });
    expect(say("arrive")).toEqual({ label: "Your arrival word", value: "hello" });
    expect(say("leave")).toEqual({ label: "Your closing word", value: "hello" });
    expect(say("pain")).toEqual({ label: "A pain point you named", value: "hello" });
    expect(say("opp")).toEqual({ label: "A growth opportunity you named", value: "hello" });
    expect(say("ask", "s3")).toEqual({ label: "A question you asked", value: "hello" });
    for (const b of GAME_BLOCKS) expect(say("game", b.key)).toEqual({ label: `On the game canvas: ${b.title}`, value: "hello" });
    for (const kind of NOTE_ITEM_KINDS) expect(say(kind, "aim").label, kind).not.toBe("A note");
  });

  it("turns Week 3's answer keys and option keys into plain words", () => {
    const say = (block: string, text: string) => describeItem(3, { kind: "answer", block, text });
    expect(say("needs", "vitality")).toEqual({ label: "A human need your project is here to meet", value: "Vitality & Survival Needs" });
    expect(say("top", "love")).toEqual({ label: "A seed you planted", value: "Love" });
    expect(say("g-love", "thriving")).toEqual({ label: "Love: where you want them in three years", value: "Thriving" });
    expect(say("n-significance", "unmet")).toEqual({ label: "Significance: where your people are today", value: "Unmet" });
    expect(say("b-play", "75")).toEqual({ label: "Play: who it's for", value: "Most (75%)" });
    expect(say("m-routine", "circle")).toEqual({ label: "Routine: who meets it", value: "A circle of people in roles" });
    expect(say("whole", "50")).toEqual({ label: "How much of your people's human needs your project means to meet", value: "About half (50%)" });
    expect(say("allies", "fungi")).toEqual({ label: "A being that could hold a role on your land", value: "Fungi" });
    expect(say("purpose", "twelve families")).toEqual({ label: "Your project's first line", value: "twelve families" });
    expect(say("mate", "some").value).toBe("Some");
  });

  it("has a plain label for every Week 3 prompt someone can answer", () => {
    for (const p of promptsForWeek(3).values()) {
      if (p.mode === "private" || p.mode === "ask") continue;
      const first = p.options?.[0]?.key ?? "words";
      const e = describeItem(3, { kind: "answer", block: p.key, text: first });
      expect(e.label, p.key).not.toBe("An answer");
      if (p.options) expect(e.value, p.key).toBe(p.options[0].label === "Vitality & Survival Needs" && p.key === "top" ? "Vitality" : p.options[0].label);
    }
  });
});

describe("votes and cards in plain words", () => {
  it("names the opportunity, the week and the offer", () => {
    expect(describeVote("item:4", { itemText: (id) => (id === 4 ? "Shared work parties" : null) })).toEqual({ label: "You voted for", value: "Shared work parties" });
    expect(describeVote("week:4")).toEqual({ label: "You raised a hand for", value: "Week 4: Game & Organisation Co-Creation Part 2" });
    expect(describeVote("offer:coach")).toEqual({ label: "You raised a hand to", value: "Coach a village" });
    expect(describeVote("checkin:12")).toBeNull();
  });

  it("reads a Week 2 card's stage, where it is, readiness and one move", () => {
    const e = describeCard({ phase: "sprout", whereNow: "On the land", ready: "bogus", nextMove: "Call the neighbours" });
    expect(e).toEqual([
      { label: "Where your project is", value: "Sprout" },
      { label: "Where you are now", value: "On the land" },
      { label: "Your one move", value: "Call the neighbours" },
    ]);
    expect(describeCard({})).toEqual([]);
  });

  it("orders entries by the stage they belong to", () => {
    expect(entryStage(3, { kind: "answer", block: "purpose", text: "x" })).toBe(5);
    expect(entryStage(3, { kind: "ask", block: "s8", text: "x" })).toBe(8);
    expect(entryStage(3, { kind: "ask", block: "s40", text: "x" })).toBeNull();
    expect(entryStage(3, { kind: "arrive", block: null, text: "x" })).toBe(boardStages(3).findIndex((s) => s.kind === "breath"));
    expect(entryStage(2, { kind: "opp", block: null, text: "x" })).toBe(boardStages(2).findIndex((s) => s.kind === "circle"));
    expect(weekHeading(3)).toEqual({ title: "Week 3: Game & Organisation Co-Creation Part 1", href: "/season2/week/3" });
  });
});

describe("the profile and export words", () => {
  it("follow the writing rules and say human needs", () => {
    const lines = [...Object.values(SUBMISSIONS_COPY), ...Object.values(EXPORT_COPY)];
    for (const line of lines) {
      expect(line, line).not.toContain(String.fromCodePoint(0x2014));
      expect(line, line).not.toContain(String.fromCodePoint(0x2013));
      expect(line, line).not.toMatch(/\b(delve|journey|unlock|empower|seamless|tapestry|foster|leverage)\b/i);
      expect(line.match(/(?<!human )\bneeds\b/gi) ?? [], line).toEqual([]);
    }
    expect(EXPORT_COPY.why).toBe(EXPORT_WHY);
  });

  it("gives an admin a link to every linked application, whatever its status", () => {
    expect(adminApplicationPath(57)).toBe("/admin?tab=applications&open=57");
  });
});

describe("the export as CSV", () => {
  it("quotes what needs quoting and never lets a cell run as a formula", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('say "hi", then go')).toBe('"say ""hi"", then go"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell(null)).toBe("");
    expect(csvCell(12)).toBe("12");
  });

  it("writes a header, every row, every anonymous answer and every vote count", () => {
    const data: BoardExport = {
      generatedAt: "2026-10-14T19:00:00.000Z",
      why: EXPORT_WHY,
      weeks: [{
        week: 3, title: "Week 3", href: "/season2/week/3", status: "open",
        projects: [],
        rows: [{
          id: 1, kind: "answer", key: "purpose", stage: "What it's all for", label: "Your project's first line", value: "twelve families, living well",
          projectId: 7, projectName: "Toa Hermitage", applicationId: 12, displayName: null, author: "guest", userId: null,
          chosen: false, hidden: false, createdAt: "2026-10-14T17:20:00.000Z",
        }],
        anonymous: [{ key: "mate", label: "How well your main organisation meets your human needs", value: "Some", createdAt: "2026-10-14T17:21:00.000Z" }],
        votes: [{ target: "week:4", label: "You raised a hand for", value: "Week 4", count: 6 }],
        summary: null,
        projectViews: [],
      }],
    };
    const lines = boardExportCsv(data).trimEnd().split("\r\n");
    expect(lines[0]).toBe("week,project,application_id,kind,key,stage,question,answer,author,user_id,display_name,chosen,hidden,created_at");
    expect(lines[1]).toBe('3,Toa Hermitage,12,answer,purpose,What it\'s all for,Your project\'s first line,"twelve families, living well",guest,,,,,2026-10-14T17:20:00.000Z');
    expect(lines[2]).toContain(",anonymous,");
    expect(lines[2]).not.toContain("Toa");
    expect(lines[3]).toBe("3,,,votes,week:4,,You raised a hand for,Week 4 (6),,,,,,");
    expect(EXPORT_WHY).toBe("We read these answers to shape how we build Village OS.");
  });
});
