import { describe, expect, it } from "vitest";
import { HOLOS_REGEN_CIVICS_URL, HYLO_SEEDS_URL } from "@shared/communityLinks";
import { RIVERSIDE_ROOM_URL, SITE_ORIGIN } from "@shared/sessionLinks";
import {
  hostIsOldStudio,
  joinLandingHtml,
  parseJoinEventId,
  resolveJoinRedirectTarget,
  safeExternalHttpUrl,
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

describe("joinLandingHtml", () => {
  it("leads with a studio join button and keeps the other gather places", () => {
    const html = joinLandingHtml();
    expect(RIVERSIDE_ROOM_URL).toBe(
      "https://riverside.com/studio/rieki-cordon-riekis-studio/wvhy-zyit",
    );
    expect(html).toContain(`<a class="join-call" href="${RIVERSIDE_ROOM_URL}">Join the call</a>`);
    expect(html).toContain(`<a class="vote-times" href="${SITE_ORIGIN}/season-schedule">Vote on call times here</a>`);
    expect(html).toContain(".vote-times");
    expect(html.indexOf('class="join-call"')).toBeLessThan(html.indexOf('class="vote-times"'));
    expect(html).toContain("min-height: 72px");
    expect(html).toContain("min-height: 64px");
    expect(html).toContain("width: 100%");
    expect(html).toContain("background: #1a472a");
    expect(html).toContain("color: #ffffff");
    expect(html).toContain("outline: 3px solid #111111");
    expect(html).toContain(HOLOS_REGEN_CIVICS_URL);
    expect(html).toContain(HYLO_SEEDS_URL);
    expect(html).toContain("Watch on YouTube");
    expect(html).toContain("/schedule");
    expect(html.indexOf('class="join-call"')).toBeLessThan(html.indexOf(HOLOS_REGEN_CIVICS_URL));
    expect(html).toContain('property="og:title" content="Join the Season 2 Call | ReGen Civics"');
    expect(html).toContain('property="og:description" content="Join the live Season 2 call."');
    expect(html).toContain('property="og:image" content="https://regencivics.earth/og/s2/join.jpg"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('property="og:url" content="https://regencivics.earth/join"');
  });
});
