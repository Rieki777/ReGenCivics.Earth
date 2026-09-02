import { describe, it, expect } from "vitest";
import {
  mapApplicationEmailRecipients,
  applyRecipientMergeFields,
  APPLICATION_EMAIL_STATUSES,
} from "./lib/applicationEmailRecipients";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    authMethod: user ? "legacy" : null,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function makeTestUser(id: number, role: "user" | "admin" = "user"): AuthenticatedUser {
  return {
    id,
    openId: String(id),
    name: role === "admin" ? "Admin User" : "Test User",
    email: `${role}-${id}@example.com`,
    role,
    loginMethod: "google",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as AuthenticatedUser;
}

describe("mapApplicationEmailRecipients", () => {
  it("maps contact email and name from the applicant account", () => {
    const result = mapApplicationEmailRecipients([
      {
        contactEmail: " steward@farm.example ",
        contactName: " Ada Steward ",
        projectName: "Green Valley",
      },
    ]);

    expect(result).toEqual([
      {
        email: "steward@farm.example",
        name: "Ada Steward",
        projectName: "Green Valley",
      },
    ]);
  });

  it("falls back to project name when the account has no display name", () => {
    const result = mapApplicationEmailRecipients([
      {
        contactEmail: "contact@land.example",
        contactName: null,
        projectName: "River Bend",
      },
    ]);

    expect(result[0].name).toBe("River Bend");
    expect(result[0].projectName).toBe("River Bend");
  });

  it("skips missing, blank, and invalid emails", () => {
    const result = mapApplicationEmailRecipients([
      { contactEmail: null, contactName: "A", projectName: "No Email" },
      { contactEmail: "   ", contactName: "B", projectName: "Blank" },
      { contactEmail: "not-an-email", contactName: "C", projectName: "Bad" },
      { contactEmail: "ok@land.example", contactName: "D", projectName: "Good" },
    ]);

    expect(result.map((r) => r.email)).toEqual(["ok@land.example"]);
  });

  it("dedupes the same contact email across projects", () => {
    const result = mapApplicationEmailRecipients([
      { contactEmail: "same@land.example", contactName: "First", projectName: "One" },
      { contactEmail: "SAME@land.example", contactName: "Second", projectName: "Two" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("First");
    expect(result[0].projectName).toBe("One");
  });
});

describe("applyRecipientMergeFields", () => {
  it("replaces name, email, and projectName per recipient", () => {
    const merged = applyRecipientMergeFields(
      "Hi {{name}}, {{projectName}} is at {{email}}.",
      {
        email: "ada@farm.example",
        name: "Ada",
        projectName: "Green Valley",
      },
    );

    expect(merged).toBe("Hi Ada, Green Valley is at ada@farm.example.");
  });
});

describe("applications.listEmailRecipients", () => {
  it("covers every Application Reviews status category", () => {
    expect([...APPLICATION_EMAIL_STATUSES]).toEqual([
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "changes_requested",
    ]);
  });

  it("rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(createTestContext(null));
    await expect(
      caller.applications.listEmailRecipients({ status: "approved" }),
    ).rejects.toThrow();
  });

  it("rejects non-admin callers", async () => {
    const caller = appRouter.createCaller(createTestContext(makeTestUser(42)));
    await expect(
      caller.applications.listEmailRecipients({ status: "approved" }),
    ).rejects.toThrow();
  });

  it("allows an admin and returns an array of recipients", async () => {
    const caller = appRouter.createCaller(createTestContext(makeTestUser(1, "admin")));
    const result = await caller.applications.listEmailRecipients({ status: "approved" });
    expect(Array.isArray(result)).toBe(true);
    for (const row of result) {
      expect(row.email).toMatch(/@/);
      expect(typeof row.name).toBe("string");
      expect(typeof row.projectName).toBe("string");
    }
  });
});
