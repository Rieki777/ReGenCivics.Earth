import { describe, expect, it } from "vitest";
import { HOLOS_REGEN_CIVICS_URL, HYLO_SEEDS_URL } from "@shared/communityLinks";
import { JOIN_HERO, RIVERSIDE_ROOM_URL, SITE_ORIGIN } from "@shared/sessionLinks";
import {
  catalogJoinSessions,
  hostIsOldStudio,
  joinLandingHtml,
  joinSessionsFromRows,
  joinStatusLine,
  parseJoinEventId,
  resolveJoinRedirectTarget,
  safeExternalHttpUrl,
  type JoinSession,
} from "./joinRedirect";

describe("parseJoinEventId", () => {
  it("accepts positive integers as strings or numbers", () => {
    expect(parseJoinEventId("42")).toBe(42);
    expect(parseJoinEventId(7)).toBe(7);
    expect(parseJoinEventId(["9"])).toBe(9);
  });

  it("rejects missing, zero, negative, and non-integers", () => {
    expect(parseJoinEventId(undefined)).toBeNull();
    expect(parseJoinEventId(null)).toBeNull();
    expect(parseJoinEventId("")).toBeNull();
    expect(parseJoinEventId("0")).toBeNull();
    expect(parseJoinEventId("-1")).toBeNull();
    expect(parseJoinEventId("3.5")).toBeNull();
    expect(parseJoinEventId("abc")).toBeNull();
    expect(parseJoinEventId({})).toBeNull();
  });
});

describe("safeExternalHttpUrl", () => {
  it("allows http and https", () => {
    expect(safeExternalHttpUrl("https://zoom.us/j/1")).toBe("https://zoom.us/j/1");
    expect(safeExternalHttpUrl(" http://example.com/room ")).toBe("http://example.com/room");
  });

  it("rejects open-redirect payloads", () => {
    expect(safeExternalHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalHttpUrl("data:text/html,hi")).toBeNull();
    expect(safeExternalHttpUrl("/relative")).toBeNull();
    expect(safeExternalHttpUrl("not a url")).toBeNull();
    expect(safeExternalHttpUrl(null)).toBeNull();
    expect(safeExternalHttpUrl("")).toBeNull();
  });
});

describe("resolveJoinRedirectTarget", () => {
  it("returns null when there is no event, so /join stays on this site", () => {
    expect(resolveJoinRedirectTarget(null)).toBeNull();
  });

  it("skips a stored old-studio URL and uses the backup meeting link", () => {
    expect(hostIsOldStudio(RIVERSIDE_ROOM_URL)).toBe(true);
    expect(
      resolveJoinRedirectTarget({
        riversideRoomUrl: "https://riverside.com/studio/custom-room",
        zoomUrl: "https://zoom.us/j/999",
      }),
    ).toBe("https://zoom.us/j/999");
  });

  it("uses a non-studio room URL when that is what the event stores", () => {
    expect(
      resolveJoinRedirectTarget({
        riversideRoomUrl: "https://enterholos.com/holon?h=regen-civics-seeds",
        zoomUrl: "https://zoom.us/j/999",
      }),
    ).toBe("https://enterholos.com/holon?h=regen-civics-seeds");
  });

  it("uses zoomUrl when the studio field is empty", () => {
    expect(
      resolveJoinRedirectTarget({
        riversideRoomUrl: null,
        zoomUrl: "https://zoom.us/j/999",
      }),
    ).toBe("https://zoom.us/j/999");
  });

  it("returns null when stored URLs are missing, unsafe, or only the old studio", () => {
    expect(resolveJoinRedirectTarget({ riversideRoomUrl: null, zoomUrl: null })).toBeNull();
    expect(
      resolveJoinRedirectTarget({
        riversideRoomUrl: "javascript:evil",
        zoomUrl: "/relative",
      }),
    ).toBeNull();
    expect(resolveJoinRedirectTarget({ riversideRoomUrl: RIVERSIDE_ROOM_URL, zoomUrl: null })).toBeNull();
    expect(
      resolveJoinRedirectTarget({
        riversideRoomUrl: "javascript:evil",
        zoomUrl: "https://zoom.us/j/ok",
      }),
    ).toBe("https://zoom.us/j/ok");
  });
});

describe("joinStatusLine", () => {
  const week = (n: number, start: string, title: string): JoinSession => ({
    week: n,
    title,
    start: new Date(start),
    end: new Date(new Date(start).getTime() + 2 * 3_600_000),
    status: "upcoming",
  });

  it("names the next session before it starts", () => {
    const line = joinStatusLine(catalogJoinSessions(), new Date("2026-10-07T20:00:00Z"));
    expect(line?.label).toBe("Next session");
    expect(line?.live).toBe(false);
    expect(line?.when).toContain("Season 2 · Week 3 ·");
    expect(line?.when).toContain("PT");
    expect(line?.title.length).toBeGreaterThan(0);
  });

  it("marks the session live while it is running", () => {
    const sessions = [week(3, "2026-10-10T18:00:00Z", "Game & Organisation Co-Creation Part 1")];
    const line = joinStatusLine(sessions, new Date("2026-10-10T18:30:00Z"));
    expect(line).toEqual({
      live: true,
      label: "Live now",
      when: "Season 2 · Week 3 · Oct 10 · 11am PT",
      title: "Game & Organisation Co-Creation Part 1",
    });
  });

  it("strips a stored Week prefix and skips cancelled rows", () => {
    const sessions = joinSessionsFromRows([
      {
        week: 4,
        title: "Week 4: Game & Organisation Co-Creation Part 2",
        startTime: new Date("2026-10-17T17:00:00Z"),
        endTime: null,
        status: "upcoming",
      },
      {
        week: 3,
        title: "Week 3: skipped",
        startTime: new Date("2026-10-10T17:00:00Z"),
        endTime: null,
        status: "cancelled",
      },
    ]);
    const line = joinStatusLine(sessions, new Date("2026-10-07T20:00:00Z"));
    expect(line?.title).toBe("Game & Organisation Co-Creation Part 2");
    expect(line?.when).toContain("Week 4");
  });
});

describe("joinLandingHtml", () => {
  it("leads with a studio join button and keeps the other gather places", () => {
    const html = joinLandingHtml(undefined, new Date("2026-10-07T20:00:00Z"));
    expect(RIVERSIDE_ROOM_URL).toBe(
      "https://riverside.com/studio/rieki-cordon-riekis-studio/wvhy-zyit",
    );
    expect(JOIN_HERO.wide).toContain("join-hero-tree.webp");
    expect(html).toContain(`src="${JOIN_HERO.wide}"`);
    expect(html).toContain(`srcset="${JOIN_HERO.phone}"`);
    expect(html).toContain(`<a class="join-call" href="${RIVERSIDE_ROOM_URL}">Join the call</a>`);
    expect(html).toContain(`<a class="vote-times" href="${SITE_ORIGIN}/season-schedule">Vote on call times here</a>`);
    expect(html).toContain(".vote-times");
    expect(html.indexOf('class="join-call"')).toBeLessThan(html.indexOf('class="vote-times"'));
    expect(html).toContain("min-height: 72px");
    expect(html).toContain("min-height: 64px");
    expect(html).toContain("width: 100%");
    expect(html).toContain("background: #0d2818");
    expect(html).toContain("background: #7dd87d");
    expect(html).toContain("color: #0d2818");
    expect(html).toContain("color: #ffffff");
    expect(html).toContain("outline: 3px solid #ffffff");
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain("Quicksand");
    expect(html).toContain("Next session");
    expect(html).toContain("Season 2 · Week 3 ·");
    expect(html).not.toContain("Georgia");
    expect(html).toContain(HOLOS_REGEN_CIVICS_URL);
    expect(html).toContain(HYLO_SEEDS_URL);
    expect(html.indexOf(HOLOS_REGEN_CIVICS_URL)).toBeLessThan(html.indexOf(HYLO_SEEDS_URL));
    expect(html).toContain("Watch on YouTube");
    expect(html).toContain("/schedule");
    expect(html).toContain('class="tile"');
    expect(html.indexOf('class="join-call"')).toBeLessThan(html.indexOf(HOLOS_REGEN_CIVICS_URL));
  });
});
