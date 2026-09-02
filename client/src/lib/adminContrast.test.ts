import { describe, expect, it } from "vitest";
import {
  adminStatusChipClass,
  formatClaimant,
  ADMIN_LIGHT_FIELD,
  ADMIN_DARK_FIELD,
} from "./adminContrast";

describe("adminStatusChipClass", () => {
  it("maps known statuses to solid forest chips, not pale pastels", () => {
    expect(adminStatusChipClass("approved")).toContain("bg-[#1a472a]");
    expect(adminStatusChipClass("approved")).toContain("text-[#f8f5f0]");
    expect(adminStatusChipClass("rejected")).toContain("bg-[#8b1e1e]");
    expect(adminStatusChipClass("under_review")).toContain("bg-[#1a3a5c]");
    expect(adminStatusChipClass("in_discussion")).toContain("bg-[#3d2a5c]");
  });

  it("does not emit Badge-fighting pastel utilities", () => {
    const cls = adminStatusChipClass("approved");
    expect(cls).not.toContain("bg-green-100");
    expect(cls).not.toContain("text-green-800");
    expect(cls).not.toContain("text-primary-foreground");
  });

  it("keeps light-field placeholders at 75% forest, not pale gray", () => {
    expect(ADMIN_LIGHT_FIELD).toContain("placeholder:text-[#1a472a]/75");
    expect(ADMIN_DARK_FIELD).toContain("placeholder:text-white/70");
  });
});

describe("formatClaimant", () => {
  it("prefers name and email together", () => {
    expect(formatClaimant({
      claimantName: "Rye",
      claimantEmail: "rye@example.com",
      userId: 1,
    })).toEqual({ primary: "Rye", secondary: "rye@example.com" });
  });

  it("falls back to User # when both are missing", () => {
    expect(formatClaimant({
      claimantName: null,
      claimantEmail: "  ",
      userId: 1,
    })).toEqual({
      primary: "User #1",
      secondary: "No name or email on this account",
    });
  });
});
