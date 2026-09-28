/**
 * Funding contacts (funding engine Phase 4): the phone form's rules, the Gmail
 * compose link, the Pacific day, and the admin gate. No database.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { gmailComposeUrl, pacificToday, quickAddInput } from "./funding/contacts";

function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      method: "POST",
      headers: { origin: "https://regencivics.earth", host: "regencivics.earth" },
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

describe("quick add input", () => {
  it("needs only a name and what was said", () => {
    expect(quickAddInput.safeParse({ name: "Ana Rivera", summary: "Funds soil work in Oregon." }).success).toBe(true);
  });

  it("accepts blank optional fields and refuses bad ones", () => {
    expect(quickAddInput.safeParse({ name: "Ana", summary: "x", email: "", linkedinUrl: "" }).success).toBe(true);
    expect(quickAddInput.safeParse({ name: "Ana", summary: "x", email: "not-an-email" }).success).toBe(false);
    expect(quickAddInput.safeParse({ name: "Ana", summary: "x", linkedinUrl: "https://evil.example/in/ana" }).success).toBe(false);
    expect(quickAddInput.safeParse({ name: "Ana", summary: "x", linkedinUrl: "https://www.linkedin.com/in/ana-rivera" }).success).toBe(true);
    expect(quickAddInput.safeParse({ name: "Ana", summary: "x", warmth: 4 }).success).toBe(false);
    expect(quickAddInput.safeParse({ name: "Ana", summary: "x", followUpAt: "next week" }).success).toBe(false);
    expect(quickAddInput.safeParse({ name: " ", summary: "x" }).success).toBe(false);
  });
});

describe("gmailComposeUrl", () => {
  it("prefills a draft Rye edits and sends himself", () => {
    const url = gmailComposeUrl({ name: "Ana Rivera", email: "ana@example.org", source: "The Gathering 2026" }, { nextStep: "Send the one-pager." });
    expect(url).not.toBeNull();
    const u = new URL(url!);
    expect(u.origin + u.pathname).toBe("https://mail.google.com/mail/");
    expect(u.searchParams.get("view")).toBe("cm");
    expect(u.searchParams.get("to")).toBe("ana@example.org");
    expect(u.searchParams.get("su")).toBe("Good to meet you at The Gathering 2026");
    expect(u.searchParams.get("body")).toBe("Hi Ana,\n\nGood to meet you at The Gathering 2026. Send the one-pager.\n\nRye");
  });

  it("gives no link without an address", () => {
    expect(gmailComposeUrl({ name: "Ana", email: null, source: null }, { nextStep: null })).toBeNull();
  });
});

describe("pacificToday", () => {
  it("is the calendar day in Pacific time", () => {
    expect(pacificToday(new Date("2026-10-16T06:30:00.000Z"))).toBe("2026-10-15");
    expect(pacificToday(new Date("2026-10-16T08:30:00.000Z"))).toBe("2026-10-16");
  });
});

describe("fundingContacts router", () => {
  it("is admin-only on every procedure", async () => {
    const GATE = { code: expect.stringMatching(/^(UNAUTHORIZED|FORBIDDEN)$/) };
    for (const user of [null, { id: 9, role: "user" } as unknown as TrpcContext["user"]]) {
      const caller = appRouter.createCaller(makeCtx(user));
      await expect(caller.fundingContacts.quickAdd({ name: "Ana", summary: "x" })).rejects.toMatchObject(GATE);
      await expect(caller.fundingContacts.list()).rejects.toMatchObject(GATE);
      await expect(caller.fundingContacts.get({ id: 1 })).rejects.toMatchObject(GATE);
      await expect(caller.fundingContacts.followUps()).rejects.toMatchObject(GATE);
      await expect(caller.fundingContacts.doneFollowUp({ touchId: 1 })).rejects.toMatchObject(GATE);
      await expect(caller.fundingContacts.update({ id: 1, doNotContact: true })).rejects.toMatchObject(GATE);
      await expect(caller.fundingContacts.addTouch({ contactId: 1, channel: "call", summary: "x" })).rejects.toMatchObject(GATE);
    }
  });
});
