import { describe, expect, it } from "vitest";
import { emailGrantsAdmin, isAdminRole, normalizeEmail } from "./adminRole";

describe("admin role", () => {
  it("treats admin and superadmin as capable", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("superadmin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  it("grants admin to the founder Google email, case-insensitive", () => {
    expect(emailGrantsAdmin("rieki.cordon@gmail.com")).toBe(true);
    expect(emailGrantsAdmin("Rieki.Cordon@Gmail.com")).toBe(true);
    expect(emailGrantsAdmin(" someone@example.com ")).toBe(false);
    expect(emailGrantsAdmin(null)).toBe(false);
  });

  it("normalizes email for upsert matching", () => {
    expect(normalizeEmail("  Rieki.Cordon@Gmail.com ")).toBe("rieki.cordon@gmail.com");
  });
});
