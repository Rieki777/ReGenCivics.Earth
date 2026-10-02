import { describe, expect, it } from "vitest";
import {
  cancellingOpensASeat,
  duplicateSignupNext,
  isActiveReminderSeat,
  receivesSessionFollowup,
  signupKindForCapacity,
} from "./eventSignupSeats";

describe("event signup seats", () => {
  it("does not count a cancelled reminder or a waitlist row as a seat", () => {
    expect(isActiveReminderSeat({ signupType: "reminder", cancelledAt: null })).toBe(true);
    expect(isActiveReminderSeat({ signupType: "reminder", cancelledAt: new Date() })).toBe(false);
    expect(isActiveReminderSeat({ signupType: "waitlist", cancelledAt: null })).toBe(false);
  });

  it("opens the waitlist only when active seats fill the cap", () => {
    expect(signupKindForCapacity(2, 3)).toBe("reminder");
    expect(signupKindForCapacity(3, 3)).toBe("waitlist");
    expect(signupKindForCapacity(9, null)).toBe("reminder");
  });

  it("reopens a cancelled duplicate and leaves an active one alone", () => {
    expect(duplicateSignupNext(null)).toBe("already");
    expect(duplicateSignupNext(new Date("2026-01-01"))).toBe("revive");
  });

  it("promotes the waitlist only when an active reminder seat is cancelled", () => {
    expect(cancellingOpensASeat({ signupType: "reminder", cancelledAt: null })).toBe(true);
    expect(cancellingOpensASeat({ signupType: "reminder", cancelledAt: new Date() })).toBe(false);
    expect(cancellingOpensASeat({ signupType: "waitlist", cancelledAt: null })).toBe(false);
    expect(cancellingOpensASeat(null)).toBe(false);
  });

  it("sends the session follow-up to reminder seats only", () => {
    expect(receivesSessionFollowup("reminder")).toBe(true);
    expect(receivesSessionFollowup("waitlist")).toBe(false);
  });
});
