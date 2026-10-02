import { describe, expect, it } from "vitest";
import { mergeRecipients } from "@shared/eventAutoReminders";
import { ALWAYS_INCLUDE_REMINDER_RECIPIENTS, isAlwaysIncluded } from "./reminderAlwaysInclude";

describe("ALWAYS_INCLUDE_REMINDER_RECIPIENTS", () => {
  it("holds only well-formed, lowercase, unique addresses", () => {
    const emails = ALWAYS_INCLUDE_REMINDER_RECIPIENTS.map((r) => r.email);
    expect(new Set(emails).size).toBe(emails.length);
    for (const email of emails) {
      expect(email).toBe(email.trim().toLowerCase());
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    }
    expect(mergeRecipients([[...ALWAYS_INCLUDE_REMINDER_RECIPIENTS]]).map((r) => r.email)).toEqual(emails);
  });

  it("includes Franz", () => {
    expect(isAlwaysIncluded("franz@integrity.earth")).toBe(true);
  });

  it("matches regardless of case or stray whitespace, and nobody else", () => {
    expect(isAlwaysIncluded("  Franz@Integrity.Earth ")).toBe(true);
    expect(isAlwaysIncluded("someone@integrity.earth")).toBe(false);
  });

  it("is not exported from the shared module the admin client imports", async () => {
    const shared = await import("@shared/eventAutoReminders");
    expect("ALWAYS_INCLUDE_REMINDER_RECIPIENTS" in shared).toBe(false);
    expect("isAlwaysIncluded" in shared).toBe(false);
    expect(JSON.stringify(shared)).not.toContain("franz@integrity.earth");
  });
});
