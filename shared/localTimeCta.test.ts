import { describe, expect, it } from "vitest";
import {
  LOCAL_TIME_CTA_LABEL,
  TIMEANDDATE_UTC_LOCATION_ID,
  buildLocalTimeUrl,
  localTimeCtaHtml,
  utcCompactIsoMinute,
} from "./localTimeCta";

describe("utcCompactIsoMinute", () => {
  it("formats the absolute instant in UTC minute precision", () => {
    // 11:00 PDT = 18:00 UTC on 2026-09-26
    expect(utcCompactIsoMinute(new Date("2026-09-26T18:00:00.000Z"))).toBe("20260926T1800");
  });

  it("pads single-digit months, days, hours, and minutes", () => {
    expect(utcCompactIsoMinute(new Date("2026-01-05T07:05:00.000Z"))).toBe("20260105T0705");
  });

  it("rejects invalid dates", () => {
    expect(() => utcCompactIsoMinute(new Date("nope"))).toThrow(/valid Date/);
  });
});

describe("buildLocalTimeUrl", () => {
  it("uses timeanddate fixedtime with UTC location id", () => {
    const url = buildLocalTimeUrl(new Date("2026-09-26T18:00:00.000Z"), {
      title: "Open Access Session",
      durationHours: 2,
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://www.timeanddate.com/worldclock/fixedtime.html",
    );
    expect(parsed.searchParams.get("iso")).toBe("20260926T1800");
    expect(parsed.searchParams.get("p1")).toBe(TIMEANDDATE_UTC_LOCATION_ID);
    expect(parsed.searchParams.get("msg")).toBe("Open Access Session");
    expect(parsed.searchParams.get("ah")).toBe("2");
  });

  it("omits msg and ah when not provided", () => {
    const url = buildLocalTimeUrl(new Date("2026-09-26T18:00:00.000Z"));
    const parsed = new URL(url);
    expect(parsed.searchParams.get("msg")).toBeNull();
    expect(parsed.searchParams.get("ah")).toBeNull();
  });

  it("truncates long titles for the converter page", () => {
    const long = "A".repeat(100);
    const url = buildLocalTimeUrl(new Date("2026-09-26T18:00:00.000Z"), { title: long });
    const msg = new URL(url).searchParams.get("msg")!;
    expect(msg.length).toBeLessThanOrEqual(80);
    expect(msg.endsWith("…")).toBe(true);
  });
});

describe("localTimeCtaHtml", () => {
  it("renders an escaped Your local time pill with the converter href", () => {
    const html = localTimeCtaHtml(new Date("2026-09-26T18:00:00.000Z"), {
      title: 'Week 1: <script>alert(1)</script>',
    });
    expect(html).toContain(LOCAL_TIME_CTA_LABEL);
    expect(html).toContain("timeanddate.com/worldclock/fixedtime.html");
    expect(html).toContain("iso=20260926T1800");
    expect(html).toContain(`p1=${TIMEANDDATE_UTC_LOCATION_ID}`);
    expect(html).toContain("target=\"_blank\"");
    // title is only in the URL query; URLSearchParams encodes < >
    expect(html).toContain("msg=Week");
    expect(html).not.toContain("<script>");
  });

  it("returns empty string for invalid dates", () => {
    expect(localTimeCtaHtml(new Date("nope"))).toBe("");
  });
});
