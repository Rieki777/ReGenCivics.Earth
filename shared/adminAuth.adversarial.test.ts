import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  emailGrantsAdmin,
  isAdminRole,
  normalizeEmail,
  shouldWriteAdminOnUpsert,
} from "./adminRole";
import { normalizeReturnTo } from "./oauthReturnTo";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

describe("admin role adversarial", () => {
  it("rejects lookalike, plus-tag, and homograph founder emails", () => {
    expect(emailGrantsAdmin("rieki.cordon@gmail.com.evil.com")).toBe(false);
    expect(emailGrantsAdmin("rieki.cordon@gmail.com@evil.com")).toBe(false);
    expect(emailGrantsAdmin("rieki.cordon+admin@gmail.com")).toBe(false);
    expect(emailGrantsAdmin("rieki.cordon@googlemail.com")).toBe(false);
    expect(emailGrantsAdmin("r.ieki.cordon@gmail.com")).toBe(false);
    expect(emailGrantsAdmin("rieki.cordon@gmail.com ")).toBe(true);
    expect(emailGrantsAdmin("\trieki.cordon@gmail.com\n")).toBe(true);
    expect(emailGrantsAdmin("riekі.cordon@gmail.com")).toBe(false);
    expect(emailGrantsAdmin("rieki.cordon@gmаil.com")).toBe(false);
    expect(emailGrantsAdmin("")).toBe(false);
    expect(emailGrantsAdmin(undefined)).toBe(false);
  });

  it("does not treat casing or whitespace as a different person", () => {
    expect(normalizeEmail("  RIEKI.CORDON@GMAIL.COM  ")).toBe("rieki.cordon@gmail.com");
    expect(emailGrantsAdmin("  RIEKI.CORDON@GMAIL.COM  ")).toBe(true);
  });

  it("rejects role strings that look privileged but are not", () => {
    expect(isAdminRole("Admin")).toBe(false);
    expect(isAdminRole("ADMIN")).toBe(false);
    expect(isAdminRole("administrator")).toBe(false);
    expect(isAdminRole("moderator")).toBe(false);
    expect(isAdminRole("owner")).toBe(false);
    expect(isAdminRole("")).toBe(false);
    expect(isAdminRole("admin ")).toBe(false);
  });

  it("never writes admin over an existing privileged role", () => {
    expect(
      shouldWriteAdminOnUpsert({
        existingRole: "superadmin",
        email: "rieki.cordon@gmail.com",
        openId: "google:1",
        ownerOpenId: "google:1",
      }),
    ).toBe(false);
    expect(
      shouldWriteAdminOnUpsert({
        existingRole: "admin",
        email: "rieki.cordon@gmail.com",
      }),
    ).toBe(false);
  });

  it("promotes a new or plain user when email or owner openId matches", () => {
    expect(
      shouldWriteAdminOnUpsert({
        existingRole: "user",
        email: "rieki.cordon@gmail.com",
      }),
    ).toBe(true);
    expect(
      shouldWriteAdminOnUpsert({
        existingRole: null,
        email: "rieki.cordon@gmail.com",
      }),
    ).toBe(true);
    expect(
      shouldWriteAdminOnUpsert({
        existingRole: "user",
        email: "someone@example.com",
        openId: "google:owner",
        ownerOpenId: "google:owner",
      }),
    ).toBe(true);
  });

  it("does not promote a random email even if a payload claims admin", () => {
    expect(
      shouldWriteAdminOnUpsert({
        existingRole: "user",
        email: "attacker@example.com",
        openId: "google:attacker",
        ownerOpenId: "google:owner",
      }),
    ).toBe(false);
  });
});

describe("OAuth returnTo adversarial", () => {
  it("drops off-site and protocol-relative targets", () => {
    expect(normalizeReturnTo("https://evil.example/phish")).toBeNull();
    expect(normalizeReturnTo("http://evil.example")).toBeNull();
    expect(normalizeReturnTo("//evil.example/phish")).toBeNull();
    expect(normalizeReturnTo("/\\evil.example/phish")).toBeNull();
    expect(normalizeReturnTo("javascript:alert(1)")).toBeNull();
    expect(normalizeReturnTo("data:text/html,hi")).toBeNull();
    expect(normalizeReturnTo("admin")).toBeNull();
  });

  it("drops header-injection and error-recycle targets", () => {
    expect(normalizeReturnTo("/admin\r\nLocation: https://evil.example")).toBeNull();
    expect(normalizeReturnTo("/admin\t?x=1")).toBeNull();
    expect(normalizeReturnTo("/admin?error=auth_failed")).toBeNull();
    expect(normalizeReturnTo("/admin?tab=applications&auth_failed=1")).toBeNull();
  });

  it("keeps the applications sheet deep link", () => {
    expect(normalizeReturnTo("/admin?tab=applications&open=44&view=reviews")).toBe(
      "/admin?tab=applications&open=44&view=reviews",
    );
    expect(normalizeReturnTo("  /admin-create  ")).toBe("/admin-create");
  });
});

describe("admin lock source scan", () => {
  it("keeps the client password theater out of admin UI", () => {
    const files = [
      "client/src/pages/Admin.tsx",
      "client/src/pages/AdminModeration.tsx",
      "client/src/components/admin/AdminAuthGate.tsx",
      "client/src/components/admin/AdminChrome.tsx",
      "client/src/components/admin/AdminCustomGamesPanels.tsx",
      "scripts/audit-admin-contrast.mjs",
    ];
    for (const rel of files) {
      const src = readFileSync(join(repoRoot, rel), "utf8");
      expect(src, rel).not.toMatch(/ADMIN_PASSWORD/);
      expect(src, rel).not.toMatch(/MODERATION_PASSWORD/);
      expect(src, rel).not.toMatch(/localStorage\.setItem\(\s*["']admin_authenticated/);
      expect(src, rel).not.toMatch(/localStorage\.setItem\(\s*["']moderation_authenticated/);
      expect(src, rel).not.toMatch(/AdminPasswordGate/);
    }
  });

  it("crawls /admin in the contrast audit route list", () => {
    const src = readFileSync(join(repoRoot, "scripts/contrast-audit.mjs"), "utf8");
    expect(src).toMatch(/['"]\/admin['"]/);
  });
});
