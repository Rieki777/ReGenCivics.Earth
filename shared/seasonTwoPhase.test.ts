/**
 * The Selection Day invitation retires itself.
 *
 * The failure this prevents is a quiet one: a live page still telling people
 * to bring a video to a Saturday that has passed. Because the switch is a pure
 * function of the clock rather than a cron, it cannot be missed, and it can be
 * tested at any instant rather than only by waiting.
 */

import { describe, expect, it } from "vitest";
import {
  SEASON_TWO_SELECTION_DAY,
  seasonTwoInviteCutoff,
  seasonTwoPhase,
} from "./seasonTwoPhase";

const at = (iso: string) => new Date(iso);

describe("seasonTwoPhase", () => {
  it("invites people right up to the end of Selection Day", () => {
    // Pacific is UTC-7 in late September, so Saturday 26th runs to 07:00Z on the 27th.
    expect(seasonTwoPhase(at("2026-09-24T12:00:00Z"))).toBe("before");
    expect(seasonTwoPhase(at("2026-09-26T16:00:00Z"))).toBe("before"); // Sat 09:00 PT
    expect(seasonTwoPhase(at("2026-09-27T06:59:00Z"))).toBe("before"); // Sat 23:59 PT
  });

  it("has retired the invitation by Sunday morning Pacific", () => {
    expect(seasonTwoPhase(at("2026-09-27T07:00:00Z"))).toBe("after"); // Sun 00:00 PT
    expect(seasonTwoPhase(at("2026-09-27T17:00:00Z"))).toBe("after"); // Sun 10:00 PT
    expect(seasonTwoPhase(at("2026-10-05T12:00:00Z"))).toBe("after");
  });

  it("flips exactly at midnight Pacific, not at midnight UTC", () => {
    // The whole point: a UTC cutoff would have retired the copy at 17:00 PT on
    // Saturday, while the session was still running.
    const cutoff = seasonTwoInviteCutoff();
    expect(seasonTwoPhase(new Date(cutoff.getTime() - 1000))).toBe("before");
    expect(seasonTwoPhase(cutoff)).toBe("after");
    expect(cutoff.toISOString()).toBe("2026-09-27T07:00:00.000Z");
  });

  it("names Selection Day as the Saturday people are being invited to", () => {
    const d = new Date(`${SEASON_TWO_SELECTION_DAY}T12:00:00Z`);
    expect(d.getUTCDay()).toBe(6); // Saturday
  });

  it("is monotonic: once after, always after", () => {
    const cutoff = seasonTwoInviteCutoff().getTime();
    for (const days of [1, 7, 30, 365]) {
      expect(seasonTwoPhase(new Date(cutoff + days * 86_400_000))).toBe("after");
    }
  });
});
