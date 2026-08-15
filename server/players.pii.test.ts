/**
 * Player profile PII boundary.
 *
 * `player_profiles` rows carry member PII (email, wallet address, Base
 * account, Hypha and GitHub identifiers, exact map coordinates, private
 * token balances, notification preferences) in the same row as the public
 * game identity. Four public procedures used to return whole rows, so an
 * anonymous request to regencivics.earth could read all of it:
 *
 *   playerProfiles.list         every active member, one request, no input
 *   playerProfiles.getByHandle  any member by @handle
 *   playerProfiles.getById      any member by enumerable id
 *   playerProfiles.leaderboard  every verified member
 *
 * These tests hold the line three ways:
 *
 *  1. The allowlist itself is checked against the live table definition, so
 *     a renamed or newly added PII column cannot make the assertions vacuous.
 *  2. `toPublicPlayerProfile` must emit EXACTLY the allowlist keys. Private
 *     keys must be ABSENT, not null — a null still tells a scraper the field
 *     exists, and `Object.keys` is what a future full-row spread would break.
 *  3. Each procedure is driven through `appRouter.createCaller` as an
 *     anonymous caller, the owner, another member, and an admin.
 *
 * The db layer is mocked, so this runs in the DB-less unit job (`pnpm test`)
 * rather than skipping there and only proving anything under `test:all`.
 *
 * No real member data appears here. Every value is the literal string
 * "synthetic-<column>".
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { playerProfiles, type PlayerProfile } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserByHandle: vi.fn(),
    getPlayerProfileByUserId: vi.fn(),
    getPlayerProfileById: vi.fn(),
    getAllPlayerProfiles: vi.fn(),
    getVerifiedPlayerProfiles: vi.fn(),
  };
});

import * as db from "./db";
import { appRouter } from "./routers";
import { PUBLIC_PLAYER_PROFILE_FIELDS, toPublicPlayerProfile } from "./routes/players";

const ALL_COLUMNS = Object.keys(getTableColumns(playerProfiles));
const PUBLIC_FIELDS = [...PUBLIC_PLAYER_PROFILE_FIELDS] as string[];
const PRIVATE_COLUMNS = ALL_COLUMNS.filter((c) => !PUBLIC_FIELDS.includes(c));

/**
 * The columns whose exposure was the actual incident. Named explicitly so
 * the intent survives a refactor of the allowlist, and asserted to exist on
 * the table so a column rename fails the test instead of silently passing.
 */
const PII_COLUMNS = [
  "email",
  "walletAddress",
  "baseAccountName",
  "hyphaProfileUrl",
  "verificationTxHash",
  "githubHandle",
  "githubId",
  "locationLat",
  "locationLng",
  "locationLabel",
  "locationPrecision",
  "forumLocation",
  "notificationPrefs",
  "emailDigestFrequency",
  "companionMemoryOptIn",
  "rgvoicePrivate",
  "regenPrivate",
  "rcvoicePrivate",
  "rcivicsPrivate",
  "trustScore",
];

const OWNER_USER_ID = 77;
const OTHER_USER_ID = 88;

function syntheticProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  const row: Record<string, unknown> = {};
  for (const col of ALL_COLUMNS) row[col] = `synthetic-${col}`;
  return { ...row, id: 4242, userId: OWNER_USER_ID, ...overrides } as unknown as PlayerProfile;
}

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

const ANON = makeCtx(null);
const OWNER = makeCtx({ id: OWNER_USER_ID, role: "user" } as unknown as TrpcContext["user"]);
const OTHER = makeCtx({ id: OTHER_USER_ID, role: "user" } as unknown as TrpcContext["user"]);
const ADMIN = makeCtx({ id: 1, role: "admin" } as unknown as TrpcContext["user"]);

const mocked = db as unknown as {
  getUserByHandle: ReturnType<typeof vi.fn>;
  getPlayerProfileByUserId: ReturnType<typeof vi.fn>;
  getPlayerProfileById: ReturnType<typeof vi.fn>;
  getAllPlayerProfiles: ReturnType<typeof vi.fn>;
  getVerifiedPlayerProfiles: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  const profile = syntheticProfile();
  mocked.getUserByHandle.mockReset().mockResolvedValue({
    id: OWNER_USER_ID,
    handle: "synthetic-handle",
    name: "Synthetic Member",
  });
  mocked.getPlayerProfileByUserId.mockReset().mockResolvedValue(profile);
  mocked.getPlayerProfileById.mockReset().mockResolvedValue(profile);
  mocked.getAllPlayerProfiles.mockReset().mockResolvedValue([profile]);
  mocked.getVerifiedPlayerProfiles.mockReset().mockResolvedValue([profile]);
});

// ── The allowlist itself ────────────────────────────────────────────────────
describe("public player profile allowlist", () => {
  it("names only columns that exist on player_profiles", () => {
    for (const field of PUBLIC_FIELDS) expect(ALL_COLUMNS).toContain(field);
  });

  it("still describes real columns, so the exclusions are not vacuous", () => {
    for (const col of PII_COLUMNS) expect(ALL_COLUMNS).toContain(col);
  });

  it("excludes every PII column", () => {
    for (const col of PII_COLUMNS) expect(PUBLIC_FIELDS).not.toContain(col);
  });

  it("withholds coordinates while allowing the coarse bioregion", () => {
    expect(PUBLIC_FIELDS).not.toContain("locationLat");
    expect(PUBLIC_FIELDS).not.toContain("locationLng");
    expect(PUBLIC_FIELDS).toContain("bioregionId");
  });

  it("withholds every token balance, public cache and private ledger alike", () => {
    for (const col of ALL_COLUMNS) {
      if (/balance|Private$|Public$|lastTokenSync/i.test(col)) {
        expect(PUBLIC_FIELDS).not.toContain(col);
      }
    }
  });
});

// ── The projection ──────────────────────────────────────────────────────────
describe("toPublicPlayerProfile", () => {
  it("emits exactly the allowlist keys", () => {
    const pub = toPublicPlayerProfile(syntheticProfile());
    expect(Object.keys(pub).sort()).toEqual([...PUBLIC_FIELDS].sort());
  });

  it("leaves every private key ABSENT, not null", () => {
    const pub = toPublicPlayerProfile(syntheticProfile()) as Record<string, unknown>;
    for (const col of PRIVATE_COLUMNS) expect(col in pub).toBe(false);
  });

  it("picks rather than deletes, so a column added later is private by default", () => {
    const withNewColumn = {
      ...syntheticProfile(),
      someFutureSecret: "synthetic-someFutureSecret",
    } as unknown as PlayerProfile;
    const pub = toPublicPlayerProfile(withNewColumn) as Record<string, unknown>;
    expect("someFutureSecret" in pub).toBe(false);
  });

  it("keeps what the public profile page renders", () => {
    const pub = toPublicPlayerProfile(syntheticProfile()) as Record<string, unknown>;
    for (const field of ["userId", "displayName", "bio", "avatarUrl", "badges", "questsCompleted"]) {
      expect(field in pub).toBe(true);
    }
  });
});

// ── getByHandle: the public /@handle page ───────────────────────────────────
describe("playerProfiles.getByHandle", () => {
  it("gives an anonymous caller no PII", async () => {
    const res = (await appRouter
      .createCaller(ANON)
      .playerProfiles.getByHandle({ handle: "synthetic-handle" })) as Record<string, unknown>;
    for (const col of PRIVATE_COLUMNS) expect(col in res).toBe(false);
    expect(Object.keys(res).sort()).toEqual([...PUBLIC_FIELDS, "handle", "userName"].sort());
  });

  it("gives another signed-in member no PII either", async () => {
    const res = (await appRouter
      .createCaller(OTHER)
      .playerProfiles.getByHandle({ handle: "synthetic-handle" })) as Record<string, unknown>;
    for (const col of PII_COLUMNS) expect(col in res).toBe(false);
  });

  it("gives the owner the full record", async () => {
    const res = (await appRouter
      .createCaller(OWNER)
      .playerProfiles.getByHandle({ handle: "synthetic-handle" })) as Record<string, unknown>;
    for (const col of PII_COLUMNS) expect(col in res).toBe(true);
    expect(res.email).toBe("synthetic-email");
  });

  it("gives an admin the full record", async () => {
    const res = (await appRouter
      .createCaller(ADMIN)
      .playerProfiles.getByHandle({ handle: "synthetic-handle" })) as Record<string, unknown>;
    for (const col of PII_COLUMNS) expect(col in res).toBe(true);
  });

  it("still resolves the handle and name the page renders", async () => {
    const res = (await appRouter
      .createCaller(ANON)
      .playerProfiles.getByHandle({ handle: "synthetic-handle" })) as Record<string, unknown>;
    expect(res.handle).toBe("synthetic-handle");
    expect(res.userName).toBe("Synthetic Member");
  });

  it("returns null for an unknown handle", async () => {
    mocked.getUserByHandle.mockResolvedValue(undefined);
    const res = await appRouter
      .createCaller(ANON)
      .playerProfiles.getByHandle({ handle: "nobody-here" });
    expect(res).toBeNull();
  });
});

// ── getById: enumerable, so it was a one-loop scrape ────────────────────────
describe("playerProfiles.getById", () => {
  it("gives an anonymous caller no PII", async () => {
    const res = (await appRouter
      .createCaller(ANON)
      .playerProfiles.getById({ id: 4242 })) as Record<string, unknown>;
    for (const col of PRIVATE_COLUMNS) expect(col in res).toBe(false);
    expect(Object.keys(res).sort()).toEqual([...PUBLIC_FIELDS].sort());
  });

  it("gives the owner the full record", async () => {
    const res = (await appRouter
      .createCaller(OWNER)
      .playerProfiles.getById({ id: 4242 })) as Record<string, unknown>;
    for (const col of PII_COLUMNS) expect(col in res).toBe(true);
  });
});

// ── leaderboard ─────────────────────────────────────────────────────────────
describe("playerProfiles.leaderboard", () => {
  it("gives an anonymous caller no PII in any row", async () => {
    const rows = (await appRouter.createCaller(ANON).playerProfiles.leaderboard()) as Array<
      Record<string, unknown>
    >;
    expect(rows).toHaveLength(1);
    for (const row of rows) {
      for (const col of PRIVATE_COLUMNS) expect(col in row).toBe(false);
      expect(Object.keys(row).sort()).toEqual([...PUBLIC_FIELDS].sort());
    }
  });

  it("redacts a signed-in caller's view of other members too", async () => {
    const rows = (await appRouter.createCaller(OTHER).playerProfiles.leaderboard()) as Array<
      Record<string, unknown>
    >;
    for (const col of PII_COLUMNS) expect(col in rows[0]).toBe(false);
  });
});

// ── list: whole member table, admin panel only ──────────────────────────────
describe("playerProfiles.list", () => {
  it("rejects an anonymous caller", async () => {
    await expect(appRouter.createCaller(ANON).playerProfiles.list()).rejects.toThrow();
  });

  it("rejects a signed-in non-admin", async () => {
    await expect(appRouter.createCaller(OTHER).playerProfiles.list()).rejects.toThrow();
  });

  it("never reaches the database for a non-admin", async () => {
    await expect(appRouter.createCaller(ANON).playerProfiles.list()).rejects.toThrow();
    expect(mocked.getAllPlayerProfiles).not.toHaveBeenCalled();
  });

  it("still gives an admin the columns the admin panel renders", async () => {
    const rows = (await appRouter.createCaller(ADMIN).playerProfiles.list()) as Array<
      Record<string, unknown>
    >;
    expect(rows).toHaveLength(1);
    for (const col of ["walletAddress", "rvoiceBalance", "rgenBalance", "lastTokenSync", "isVerified"]) {
      expect(col in rows[0]).toBe(true);
    }
  });
});
