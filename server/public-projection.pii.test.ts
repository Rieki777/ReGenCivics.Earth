/**
 * Public-read PII boundary, everything outside player profiles.
 *
 * A sweep of every `publicProcedure` in `server/` on 2026-08-15 found ten
 * public reads returning whole database rows. Each one published columns
 * that were collected for a different purpose:
 *
 *   seedsClaims.lookup      claimant email, Base wallet, dispute + review trail
 *   localFood.list/getById  producer contact email and land coordinates
 *   videoSuggestions.list   submitter email and the JSON array of voter emails
 *   tools.list/getBySlug    submitter contact email, submitter + approver ids
 *   events.list/getBySeason/getById   check-in token and meeting-room URLs
 *   hyphaBridge.get         recipient wallet, tx hash, payouts, initiator id
 *
 * `events.checkinToken` was the worst of them, because it is not only
 * disclosure: `events.checkin` takes (token, any email) and both writes
 * `event_attendance` and mints a `regen_token_ledger` credit. Reading the
 * token off a public list was a mint.
 *
 * Every fix is a named field list rather than a filter applied afterwards,
 * so these tests assert on the field lists themselves. That is deliberate:
 * a list is what a future edit would have to change on purpose, and the
 * assertions stay meaningful without a database, so they run in the DB-less
 * unit job instead of skipping there.
 *
 * No real member data appears here. Synthetic values only.
 */
import { describe, expect, it } from "vitest";
import { getTableColumns, type Table } from "drizzle-orm";
import {
  events,
  localFoodApplications,
  regenTools,
  seedsClaims,
  videoSuggestions,
  hyphaBridges,
  type Event,
} from "../drizzle/schema";

import { toPublicEvent } from "./routes/events";
import { PUBLIC_LOCAL_FOOD_FIELDS } from "./routes/localFood";
import { PUBLIC_TOOL_FIELDS } from "./routes/tools";
import { PUBLIC_SEEDS_CLAIM_COLUMNS } from "./routes/seedsClaims";
import { PUBLIC_VIDEO_SUGGESTION_COLUMNS } from "./db/videoSuggestions";
import {
  PUBLIC_BRIDGE_FIELDS,
  PUBLIC_BRIDGE_PAYLOAD_FIELDS,
  toPublicBridge,
} from "./routes/hyphaBridge";
import { pickPublic, canSeeFullRecord, isAdminUser } from "./lib/public-projection";
import type { TrpcContext } from "./_core/context";

type Sess = TrpcContext["user"];
const asUser = (id: number, role = "user") => ({ id, role }) as unknown as Sess;

/**
 * Assert a projection excludes named columns AND that those columns are real,
 * so a rename cannot quietly turn the assertion into a tautology.
 */
function expectWithheld(
  projectionFields: readonly string[],
  table: Table,
  columns: readonly string[],
) {
  const real = Object.keys(getTableColumns(table));
  for (const col of columns) {
    expect(real, `${col} should still be a column`).toContain(col);
    expect(projectionFields, `${col} must not be public`).not.toContain(col);
  }
}

function syntheticEvent(overrides: Partial<Event> = {}): Event {
  const row: Record<string, unknown> = {};
  for (const col of Object.keys(getTableColumns(events))) row[col] = `synthetic-${col}`;
  return { ...row, id: 7, ...overrides } as unknown as Event;
}

// ── The shared helper ───────────────────────────────────────────────────────
describe("pickPublic", () => {
  it("copies only the named fields and leaves the rest ABSENT", () => {
    const out = pickPublic({ a: 1, b: 2, secret: 3 }, ["a", "b"] as const) as Record<string, unknown>;
    expect(Object.keys(out).sort()).toEqual(["a", "b"]);
    expect("secret" in out).toBe(false);
  });

  it("picks rather than deletes, so an unknown field is private by default", () => {
    const out = pickPublic({ a: 1, addedLater: "x" }, ["a"] as const) as Record<string, unknown>;
    expect("addedLater" in out).toBe(false);
  });
});

describe("canSeeFullRecord", () => {
  it("says no to an anonymous caller", () => {
    expect(canSeeFullRecord(null as unknown as Sess, 5)).toBe(false);
    expect(canSeeFullRecord(undefined, 5)).toBe(false);
  });

  it("says no to a different member", () => {
    expect(canSeeFullRecord(asUser(6), 5)).toBe(false);
  });

  it("says yes to the owner and to admins", () => {
    expect(canSeeFullRecord(asUser(5), 5)).toBe(true);
    expect(canSeeFullRecord(asUser(9, "admin"), 5)).toBe(true);
    expect(canSeeFullRecord(asUser(9, "superadmin"), 5)).toBe(true);
  });

  it("never treats an ownerless record as owned", () => {
    expect(canSeeFullRecord(asUser(5), null)).toBe(false);
    expect(canSeeFullRecord(asUser(5), undefined)).toBe(false);
  });

  it("does not mistake a normal role for an elevated one", () => {
    expect(isAdminUser(asUser(1, "user"))).toBe(false);
    expect(isAdminUser(asUser(1, "moderator"))).toBe(false);
  });
});

// ── events: disclosure plus a mint ──────────────────────────────────────────
describe("events public projection", () => {
  const anonEvent = toPublicEvent(syntheticEvent(), false) as Record<string, unknown>;
  const memberEvent = toPublicEvent(syntheticEvent(), true) as Record<string, unknown>;

  it("never emits the check-in token, to anyone, on any public read", () => {
    expect("checkinToken" in anonEvent).toBe(false);
    expect("checkinToken" in memberEvent).toBe(false);
    expect(Object.keys(getTableColumns(events))).toContain("checkinToken");
  });

  it("withholds the unsent reminder drafts", () => {
    for (const col of ["reminderCustomSubject", "reminderCustomBody", "reminderScheduledFor"]) {
      expect(col in anonEvent).toBe(false);
    }
  });

  it("nulls the meeting-room URLs for an anonymous caller", () => {
    expect(anonEvent.zoomUrl).toBeNull();
    expect(anonEvent.riversideRoomUrl).toBeNull();
  });

  it("keeps the room URLs working for a signed-in member", () => {
    expect(memberEvent.zoomUrl).toBe("synthetic-zoomUrl");
    expect(memberEvent.riversideRoomUrl).toBe("synthetic-riversideRoomUrl");
  });

  it("keeps the keys present so the Schedule page shape does not change", () => {
    expect("zoomUrl" in anonEvent).toBe(true);
    expect("riversideRoomUrl" in anonEvent).toBe(true);
  });

  it("still carries every field the Schedule and detail pages render", () => {
    for (const field of [
      "id", "title", "description", "startTime", "endTime", "timezone", "status",
      "type", "season", "episodeNumber", "youtubeUrl", "recordingId", "maxAttendees",
      "forumThreadId", "guestSpeakerName", "guestSpeakerBio", "guestSpeakerTopic",
    ]) {
      expect(field in anonEvent, `${field} is rendered by a page`).toBe(true);
    }
  });
});

// ── seeds claims: keyed by a public on-chain name ───────────────────────────
describe("seedsClaims.lookup projection", () => {
  const fields = Object.keys(PUBLIC_SEEDS_CLAIM_COLUMNS);

  it("withholds the claimant's identity, wallet and the review trail", () => {
    expectWithheld(fields, seedsClaims, [
      "email",
      "baseWalletAddress",
      "disputeReason",
      "evidenceUrls",
      "adminNotes",
      "reviewedBy",
      "claimedUsdAmount",
      "regenAmount",
    ]);
  });

  it("says only that a claim exists and where it stands", () => {
    expect(fields.sort()).toEqual(["createdAt", "id", "status"]);
  });
});

// ── local food: contact details and land coordinates ────────────────────────
describe("localFood public projection", () => {
  it("withholds the producer's contact details and exact coordinates", () => {
    expectWithheld(PUBLIC_LOCAL_FOOD_FIELDS, localFoodApplications, [
      "contactEmail",
      "contactName",
      "locationLat",
      "locationLng",
    ]);
  });

  it("keeps the public directory fields", () => {
    for (const field of ["id", "producerName", "description", "websiteUrl", "bioregionId"]) {
      expect(PUBLIC_LOCAL_FOOD_FIELDS).toContain(field);
    }
  });
});

// ── video suggestions: the voter email array ────────────────────────────────
describe("videoSuggestions.list projection", () => {
  const fields = Object.keys(PUBLIC_VIDEO_SUGGESTION_COLUMNS);

  it("withholds the submitter and every voter's email", () => {
    expectWithheld(fields, videoSuggestions, ["submitterEmail", "submitterName", "voterEmails"]);
  });

  it("keeps what the board renders, completed-post link included", () => {
    for (const field of ["id", "title", "description", "category", "voteCount", "status", "completedBlogSlug"]) {
      expect(fields).toContain(field);
    }
  });
});

// ── tools: submitter contact email ──────────────────────────────────────────
describe("tools public projection", () => {
  it("withholds the contact email and the submitter/approver ids", () => {
    expectWithheld(PUBLIC_TOOL_FIELDS, regenTools, ["contactEmail", "submittedBy", "approvedBy"]);
  });

  it("keeps what the library grid and detail page render", () => {
    for (const field of ["id", "slug", "name", "logoUrl", "websiteUrl", "pricingModel", "shortSummary", "totalClicks"]) {
      expect(PUBLIC_TOOL_FIELDS).toContain(field);
    }
  });
});

// ── hypha bridge: a 40-bit key is not a secret ──────────────────────────────
describe("hyphaBridge.get projection", () => {
  const bridge = {
    id: 1,
    bridgeKey: "synthetic-key",
    source: "crowdpool",
    sourceId: "synthetic-sourceId",
    targetDhoSlug: "synthetic-dho",
    formKind: "propose_contribution",
    initiatorUserId: 42,
    status: "created",
    hyphaProposalId: "synthetic-proposalId",
    hyphaTxHash: "synthetic-txHash",
    hyphaRecipientWallet: "synthetic-recipientWallet",
    basescanUrl: "synthetic-basescanUrl",
    hyphaTokenAmount: 1,
    hyphaTokenSymbol: "SYN",
    hyphaPassedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    payload: {
      title: "synthetic-title",
      description: "synthetic-description",
      targetDhoSlug: "synthetic-dho",
      source: "crowdpool",
      sourceId: "synthetic-sourceId",
      formKind: "propose_contribution",
      recipient: "synthetic-recipient",
      payouts: [{ amount: "1", token: "synthetic-token" }],
      initiatorUserId: 42,
      metadata: { synthetic: true },
    },
  } as never;

  const pub = toPublicBridge(bridge) as Record<string, unknown>;
  const payload = pub.payload as Record<string, unknown>;

  it("withholds the wallet, the transaction trail and the initiator", () => {
    expectWithheld(PUBLIC_BRIDGE_FIELDS, hyphaBridges, [
      "hyphaRecipientWallet",
      "hyphaTxHash",
      "basescanUrl",
      "initiatorUserId",
    ]);
    for (const key of ["hyphaRecipientWallet", "hyphaTxHash", "basescanUrl", "initiatorUserId"]) {
      expect(key in pub).toBe(false);
    }
  });

  it("withholds who is paid what, inside the payload too", () => {
    for (const key of ["recipient", "payouts", "metadata", "initiatorUserId"]) {
      expect(key in payload, `payload.${key} must not be public`).toBe(false);
      expect(PUBLIC_BRIDGE_PAYLOAD_FIELDS).not.toContain(key);
    }
  });

  it("keeps the proposal's own title, description and destination", () => {
    expect(payload.title).toBe("synthetic-title");
    expect(payload.description).toBe("synthetic-description");
    expect(payload.targetDhoSlug).toBe("synthetic-dho");
    expect(pub.source).toBe("crowdpool");
    expect(pub.status).toBe("created");
  });

  it("survives a bridge with no payload", () => {
    const noPayload = toPublicBridge({ ...(bridge as object), payload: null } as never) as Record<string, unknown>;
    expect(noPayload.payload).toBeNull();
  });
});
