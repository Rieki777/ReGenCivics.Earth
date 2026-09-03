import { describe, expect, it } from "vitest";
import { catalogOpenAccessRows } from "@shared/sessionClock";

describe("catalog used by event sync", () => {
  it("gives the auto-create path the same April 2027 instant as the public calendar", () => {
    const april = catalogOpenAccessRows().find((r) => r.publishedDate === "2027-04-06");
    expect(april?.startTime.toISOString()).toBe("2027-04-06T18:00:00.000Z");
    expect(april?.timezone).toMatch(/PDT|GMT-7/);
  });
});
