import { describe, expect, it } from "vitest";
import { RIVERSIDE_ROOM_URL } from "@shared/sessionLinks";
import {
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
  it("falls back to the shared studio when there is no event", () => {
    expect(resolveJoinRedirectTarget(null)).toBe(RIVERSIDE_ROOM_URL);
  });

  it("prefers riversideRoomUrl over zoomUrl", () => {
    expect(
      resolveJoinRedirectTarget({
        riversideRoomUrl: "https://riverside.com/studio/custom-room",
        zoomUrl: "https://zoom.us/j/999",
      }),
    ).toBe("https://riverside.com/studio/custom-room");
  });

  it("uses zoomUrl when riverside is absent", () => {
    expect(
      resolveJoinRedirectTarget({
        riversideRoomUrl: null,
        zoomUrl: "https://zoom.us/j/999",
      }),
    ).toBe("https://zoom.us/j/999");
  });

  it("falls back when stored URLs are missing or unsafe", () => {
    expect(
      resolveJoinRedirectTarget({ riversideRoomUrl: null, zoomUrl: null }),
    ).toBe(RIVERSIDE_ROOM_URL);
    expect(
      resolveJoinRedirectTarget({
        riversideRoomUrl: "javascript:evil",
        zoomUrl: "/relative",
      }),
    ).toBe(RIVERSIDE_ROOM_URL);
    expect(
      resolveJoinRedirectTarget({
        riversideRoomUrl: "javascript:evil",
        zoomUrl: "https://zoom.us/j/ok",
      }),
    ).toBe("https://zoom.us/j/ok");
  });

  it("accepts an explicit fallback override", () => {
    expect(resolveJoinRedirectTarget(null, "https://example.com/fallback")).toBe(
      "https://example.com/fallback",
    );
  });
});
