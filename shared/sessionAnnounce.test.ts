import { describe, expect, it } from "vitest";
import { HOLOS_REGEN_CIVICS_URL, HYLO_SEEDS_URL } from "./communityLinks";
import { SITE_ORIGIN } from "./sessionLinks";
import {
  buildSessionAnnounce,
  formatSessionWhen,
  isIanaTimeZone,
  sessionPublicUrl,
} from "./sessionAnnounce";

describe("sessionPublicUrl", () => {
  it("points at the public event detail page", () => {
    expect(sessionPublicUrl(42)).toBe(`${SITE_ORIGIN}/events/42`);
  });
});

describe("formatSessionWhen", () => {
  it("returns null for missing/invalid", () => {
    expect(formatSessionWhen(null)).toBeNull();
    expect(formatSessionWhen("")).toBeNull();
    expect(formatSessionWhen("not-a-date")).toBeNull();
  });

  it("still formats when given a non-IANA abbreviation", () => {
    const text = formatSessionWhen("2026-09-24T17:00:00.000Z", "EDT");
    expect(text).toBeTruthy();
    expect(text!).toMatch(/2026/);
  });

  it("formats with a known IANA zone", () => {
    const text = formatSessionWhen("2026-09-24T17:00:00.000Z", "America/New_York");
    expect(text).toBeTruthy();
    expect(text!).toMatch(/September/);
    expect(text!).toMatch(/2026/);
    // 17:00Z is 1:00 PM Eastern (EDT in September)
    expect(text!).toMatch(/1:00\s*PM/i);
  });
});


describe("isIanaTimeZone", () => {
  it("accepts IANA / UTC and rejects abbreviations", () => {
    expect(isIanaTimeZone("America/Los_Angeles")).toBe(true);
    expect(isIanaTimeZone("UTC")).toBe(true);
    expect(isIanaTimeZone("EDT")).toBe(false);
    expect(isIanaTimeZone("PST")).toBe(false);
    expect(isIanaTimeZone(null)).toBe(false);
  });
});

describe("buildSessionAnnounce", () => {
  it("builds body + destination URLs from title, when, and event id", () => {
    const result = buildSessionAnnounce({
      title: "Open Access Session",
      startTime: "2026-09-24T17:00:00.000Z",
      timeZone: "UTC",
      eventId: 7,
    });

    expect(result.hyloUrl).toBe(HYLO_SEEDS_URL);
    expect(result.holosUrl).toBe(HOLOS_REGEN_CIVICS_URL);
    expect(result.publicUrl).toBe(`${SITE_ORIGIN}/events/7`);
    expect(result.body).toContain("Join us: Open Access Session");
    expect(result.body).toContain("When:");
    expect(result.body).toContain(`${SITE_ORIGIN}/events/7`);
    expect(result.body).toContain("See you in the circle");
  });

  it("falls back to schedule URL and default title", () => {
    const result = buildSessionAnnounce({ title: "  " });
    expect(result.publicUrl).toBe(`${SITE_ORIGIN}/schedule`);
    expect(result.body).toContain("Join us: ReGen Civics session");
    expect(result.body).not.toContain("When:");
  });

  it("respects an explicit publicUrl override", () => {
    const result = buildSessionAnnounce({
      title: "Custom",
      publicUrl: "https://example.test/x",
      eventId: 99,
    });
    expect(result.publicUrl).toBe("https://example.test/x");
    expect(result.body).toContain("https://example.test/x");
  });
});
