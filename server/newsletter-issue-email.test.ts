import { describe, it, expect, vi } from "vitest";
import { ENV } from "./_core/env";

vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "msg_test" }),
}));
vi.mock("./db/newsletter", () => ({
  getNewsletterAudience: vi.fn().mockResolvedValue([
    { email: "a@example.org", name: "Ada", source: "footer", isActive: 1 },
  ]),
}));
vi.mock("./emailTracking", () => ({
  createEmailLog: vi.fn().mockResolvedValue(11),
}));

import {
  buildConfirmToken,
  verifyConfirmToken,
  issueBodyHash,
  TOKEN_TTL_MS,
  parseIssueAudience,
  previewUnsubscribeUrl,
  signedUnsubscribeUrl,
  verifyUnsubscribeToken,
} from "./lib/newsletter-issue-email";
import { markdownLetterDocument } from "../shared/letterHtml";

describe("outbound confirm token", () => {
  it("round-trips a valid payload", () => {
    const payload = { issueId: 7, hash: "a".repeat(64), recipients: 3, exp: Date.now() + TOKEN_TTL_MS };
    expect(verifyConfirmToken(buildConfirmToken(payload))).toEqual(payload);
  });

  it("rejects a tampered token", () => {
    const token = buildConfirmToken({ issueId: 7, hash: "a".repeat(64), recipients: 3, exp: Date.now() + TOKEN_TTL_MS });
    const [b64, sig] = token.split(".");
    const tampered = Buffer.from(JSON.stringify({ issueId: 8, hash: "a".repeat(64), recipients: 3, exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
    expect(verifyConfirmToken(`${tampered}.${sig}`)).toBeNull();
    expect(verifyConfirmToken(`${b64}.AAAA${sig.slice(4)}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = buildConfirmToken({ issueId: 7, hash: "a".repeat(64), recipients: 3, exp: Date.now() - 1000 });
    expect(verifyConfirmToken(token)).toBeNull();
  });
});

describe("issue hash", () => {
  it("changes when the audience changes", () => {
    const a = issueBodyHash("Hi", "Body", { sources: [], activeOnly: true });
    const b = issueBodyHash("Hi", "Body", { sources: ["exit_intent"], activeOnly: true });
    expect(a).not.toBe(b);
  });
});

describe("parseIssueAudience", () => {
  it("defaults to all active sources", () => {
    expect(parseIssueAudience(null)).toEqual({ sources: [], activeOnly: true });
  });
});

describe("newsletter preview footer", () => {
  it("includes a manage-preferences footer and a hosted image", () => {
    const html = markdownLetterDocument(
      "Hello\n\n![Hero](https://assets.regencivics.earth/hero.jpg)\n\n[Join](https://regencivics.earth/apply)",
      "announcement",
      { unsubscribeUrl: `${ENV.appUrl}/preferences`, postalAddress: "ReGen Civics Alliance, Ashland, Oregon, USA" },
    );
    expect(html).toContain("Manage email preferences");
    expect(html).toContain("/preferences");
    expect(html).not.toContain(">Unsubscribe<");
    expect(html).toContain("<img");
    expect(html).toContain("Join");
  });
});

describe("signed preference url", () => {
  it("points at /preferences and round-trips the unsubscribe token", async () => {
    expect(previewUnsubscribeUrl()).toMatch(/\/preferences$/);
    const url = await signedUnsubscribeUrl("ada@example.org");
    expect(url).toMatch(/\/preferences\?token=/);
    expect(url).not.toContain("/unsubscribe");
    const token = new URL(url).searchParams.get("token");
    expect(token).toBeTruthy();
    expect(await verifyUnsubscribeToken(token!)).toBe("ada@example.org");
  });
});
