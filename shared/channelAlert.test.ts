import { describe, expect, it } from "vitest";
import {
  newEventChannelMessage,
  operatorPulseChannelMessage,
  recordingReadyChannelMessage,
  shipConflictChannelMessage,
} from "./channelAlert";

const BASE = "https://regencivics.earth";

describe("channel alert links", () => {
  it("puts the week board on a recording alert next to the watch link", () => {
    const message = recordingReadyChannelMessage({
      title: "S2E2 Live",
      watchUrl: "https://youtu.be/23cRivDtorQ",
      sourceUrl: `${BASE}/season2/week/2`,
      sourceLabel: "Week 2 board",
      forumUrl: `${BASE}/community/post/9`,
    });
    expect(message).toContain("https://youtu.be/23cRivDtorQ");
    expect(message).toContain("Week 2 board: https://regencivics.earth/season2/week/2");
    expect(message).toContain(`${BASE}/community/post/9`);
    expect(message).not.toBe("*Recording ready*\n\n*S2E2 Live*\n\nWatch: https://youtu.be/23cRivDtorQ");
  });

  it("refuses a recording alert with no game source", () => {
    expect(() => recordingReadyChannelMessage({
      title: "S2E2 Live",
      watchUrl: "https://youtu.be/23cRivDtorQ",
      sourceUrl: "  ",
      sourceLabel: "Week 2 board",
    })).toThrow(/game source/);
  });

  it("puts the week board on an event alert", () => {
    const message = newEventChannelMessage({
      title: "Week 3",
      seasonTag: " (Season 2)",
      when: "Thursday, October 15, 2026 at 10:00 AM America/Los_Angeles",
      joinUrl: "https://riverside.fm/studio/example",
      baseUrl: BASE,
      week: 3,
    });
    expect(message).toContain("https://riverside.fm/studio/example");
    expect(message).toContain("Week 3 board: https://regencivics.earth/season2/week/3");
    expect(message).toContain(`${BASE}/schedule`);
  });

  it("uses the Season 2 page when an event has no board week", () => {
    const message = newEventChannelMessage({
      title: "Open session",
      seasonTag: "",
      when: "Monday",
      joinUrl: `${BASE}/schedule`,
      baseUrl: `${BASE}/`,
      week: null,
    });
    expect(message).toContain("Season 2: https://regencivics.earth/season2");
  });

  it("points a ship conflict at the book and the admin calendar", () => {
    const message = shipConflictChannelMessage(["Oct 20 overlaps booking 4"], BASE);
    expect(message).toContain("Ship book: https://regencivics.earth/ship/book");
    expect(message).toContain("Ship admin: https://regencivics.earth/admin/ship");
  });

  it("leaves an ops ping that already links the site, and adds Overview when it does not", () => {
    const linked = `*Needs you today*\n\nOverview: ${BASE}/admin`;
    expect(operatorPulseChannelMessage(linked, BASE)).toBe(linked);
    expect(operatorPulseChannelMessage("Two items need a look.", BASE)).toContain(
      "Overview: https://regencivics.earth/admin",
    );
  });
});
