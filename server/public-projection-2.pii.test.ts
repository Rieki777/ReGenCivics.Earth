/**
 * Public-read boundary, round two: the MEDIUM findings.
 *
 * The first pass fixed the ten HIGH rows from the 2026-08-15 sweep, where
 * contact details and wallets reached anonymous callers. These eleven are
 * quieter and mostly the same mistake in a different key: internal review
 * trails, unpublished drafts, and identity columns that turn a piece of
 * community signal into a named person's statement.
 *
 *   activityFeed.list          actorId, and an open metadata blob
 *   orgRatings.getForOrg       raterId
 *   claims.listContributors    the whole review + tier-negotiation trail
 *   claims.getContributor      same, and enumerable by id
 *   claims.listProposalParties organisers' notes
 *   campaigns.list/getById     adminNotes, reviewedBy/At, and draft pitches
 *   govProposals.list          draft and withdrawn bodies
 *   govProposals.listVotes     voterId, delegatedFromId, weight
 *   plays.getBySlug            creator/submitter/approver ids, pending rows
 *   ship.seeds.listVerified    userId, bookingId, notes, exact coordinates
 *
 * Same discipline as round one: assert the field lists, assert withheld
 * columns are ABSENT, and assert each withheld column still exists on its
 * table so a rename fails the test rather than quietly passing it.
 *
 * No real member data appears here. Synthetic values only.
 */
import { describe, expect, it } from "vitest";
import { getTableColumns, type Table } from "drizzle-orm";
import {
  activityFeedEvents,
  campaigns,
  govVotes,
  historicalClaims,
  organisationRatings,
  plays,
  proposalParties,
  shipSeedPlantings,
  toolsLibraryEntries,
  type Campaign,
} from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

import { PUBLIC_ACTIVITY_EVENT_FIELDS } from "./routes/activityFeed";
import { PUBLIC_ORG_RATING_FIELDS } from "./routes/orgRatings";
import {
  PUBLIC_CLAIM_COLUMNS,
  PUBLIC_PROPOSAL_PARTY_COLUMNS,
  PUBLIC_TOOLS_LIBRARY_COLUMNS,
} from "./routes/claims";
import { PUBLIC_CAMPAIGN_FIELDS, canSeeCampaign, toPublicCampaign } from "./routes/campaigns";
import { PUBLIC_GOV_VOTE_COLUMNS, UNPUBLISHED_PROPOSAL_STATUSES } from "./routes/govProposals";
import { PUBLIC_PLAY_FIELDS } from "./routes/plays";
import { coarsenSeedCoordinate } from "./routes/ship";

type Sess = TrpcContext["user"];
const asUser = (id: number, role = "user") => ({ id, role }) as unknown as Sess;
const ANON = undefined;
const ADMIN = asUser(9, "admin");

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

// ── activityFeed ────────────────────────────────────────────────────────────
describe("activityFeed.list projection", () => {
  it("withholds the actor and the open metadata blob", () => {
    expectWithheld(PUBLIC_ACTIVITY_EVENT_FIELDS, activityFeedEvents, ["actorId", "metadata"]);
  });

  it("keeps the shape of an event without naming who caused it", () => {
    expect([...PUBLIC_ACTIVITY_EVENT_FIELDS].sort()).toEqual(
      ["createdAt", "eventType", "actorType", "id", "targetId", "targetType", "visibility"].sort(),
    );
  });
});

// ── orgRatings ──────────────────────────────────────────────────────────────
describe("orgRatings.getForOrg projection", () => {
  it("withholds the rater's identity", () => {
    expectWithheld(PUBLIC_ORG_RATING_FIELDS, organisationRatings, ["raterId"]);
  });

  it("keeps the scores and the note, which are the content", () => {
    for (const field of [
      "soilScore", "biodiversityScore", "waterScore", "chemicalFreeScore",
      "communityScore", "workerWellbeingScore", "overallScore", "note",
    ]) {
      expect(PUBLIC_ORG_RATING_FIELDS).toContain(field);
    }
  });
});

// ── claims ──────────────────────────────────────────────────────────────────
describe("claims contributor projection", () => {
  const fields = Object.keys(PUBLIC_CLAIM_COLUMNS);

  it("withholds the entire review and tier-negotiation trail", () => {
    expectWithheld(fields, historicalClaims, [
      "reviewerId", "reviewedAt", "reviewDecision", "reviewNote",
      "suggestedTier", "suggestedTierUsd", "suggestedTierTokens",
      "contributorOverride", "overrideReason",
      "adjustedTier", "adjustedTierUsd", "adjustedTierTokens",
      "improvementSuggestion", "improvementForumPostId",
      "userId", "currentStep", "proposalPartyId",
    ]);
  });

  it("keeps the published recognition itself", () => {
    for (const field of [
      "displayName", "claimType", "description", "evidenceLinks",
      "formsOfCapital", "tangibleOutputs", "whatsAlive",
      "finalTier", "finalTierUsd", "finalTierTokens", "publishedAt",
    ]) {
      expect(fields).toContain(field);
    }
  });
});

describe("claims tools-library projection", () => {
  const fields = Object.keys(PUBLIC_TOOLS_LIBRARY_COLUMNS);

  it("withholds the contributing member's id", () => {
    expectWithheld(fields, toolsLibraryEntries, ["contributorUserId"]);
  });

  it("keeps what the contributor page renders", () => {
    for (const field of ["toolName", "toolDescription", "accessLink", "toolType"]) {
      expect(fields).toContain(field);
    }
  });
});

describe("claims.listProposalParties projection", () => {
  const fields = Object.keys(PUBLIC_PROPOSAL_PARTY_COLUMNS);

  it("withholds the organisers' notes", () => {
    expectWithheld(fields, proposalParties, ["notes"]);
  });

  it("keeps the announcement", () => {
    for (const field of ["title", "scheduledAt", "season", "videoLink", "recordingLink", "status"]) {
      expect(fields).toContain(field);
    }
  });
});

// ── campaigns ───────────────────────────────────────────────────────────────
function syntheticCampaign(overrides: Partial<Campaign> = {}): Campaign {
  const row: Record<string, unknown> = {};
  for (const col of Object.keys(getTableColumns(campaigns))) row[col] = `synthetic-${col}`;
  return { ...row, id: 3, userId: 42, status: "active", ...overrides } as unknown as Campaign;
}

describe("campaigns projection", () => {
  it("withholds the review trail", () => {
    expectWithheld(PUBLIC_CAMPAIGN_FIELDS, campaigns, ["adminNotes", "reviewedBy", "reviewedAt"]);
  });

  it("leaves the review trail ABSENT for an anonymous caller, not null", () => {
    const pub = toPublicCampaign(syntheticCampaign(), ANON) as Record<string, unknown>;
    for (const key of ["adminNotes", "reviewedBy", "reviewedAt"]) {
      expect(key in pub).toBe(false);
    }
  });

  it("keeps the whole pitch, so the gallery and detail page still render", () => {
    const pub = toPublicCampaign(syntheticCampaign(), ANON) as Record<string, unknown>;
    for (const field of [
      "title", "description", "projectName", "location", "status", "userId",
      "totalValue", "pledgedTotal", "financialTarget", "durationDays",
      "startedAt", "createdAt", "projectImageUrl", "isDemo",
    ]) {
      expect(field in pub, `${field} is rendered`).toBe(true);
    }
  });

  it("gives admins the review trail back", () => {
    const pub = toPublicCampaign(syntheticCampaign(), ADMIN) as Record<string, unknown>;
    expect("adminNotes" in pub).toBe(true);
  });
});

describe("campaign visibility", () => {
  it("hides drafts, the review queue and rejections from strangers", () => {
    for (const status of ["draft", "pending_review", "rejected"]) {
      const c = syntheticCampaign({ status: status as Campaign["status"] });
      expect(canSeeCampaign(ANON, c), `${status} must not be public`).toBe(false);
      expect(canSeeCampaign(asUser(99), c), `${status} must not leak to other members`).toBe(false);
    }
  });

  it("shows an unpublished campaign to its creator and to admins", () => {
    const draft = syntheticCampaign({ status: "draft" });
    expect(canSeeCampaign(asUser(42), draft)).toBe(true);
    expect(canSeeCampaign(ADMIN, draft)).toBe(true);
  });

  it("shows published campaigns to everyone", () => {
    for (const status of ["active", "funded", "completed", "cancelled"]) {
      const c = syntheticCampaign({ status: status as Campaign["status"] });
      expect(canSeeCampaign(ANON, c), `${status} should stay public`).toBe(true);
    }
  });
});

// ── governance ──────────────────────────────────────────────────────────────
describe("govProposals", () => {
  it("treats drafts and withdrawals as unpublished", () => {
    expect([...UNPUBLISHED_PROPOSAL_STATUSES].sort()).toEqual(["draft", "withdrawn"]);
  });
});

describe("govProposals.listVotes projection", () => {
  const fields = Object.keys(PUBLIC_GOV_VOTE_COLUMNS);

  it("withholds everything that attributes a vote", () => {
    expectWithheld(fields, govVotes, ["voterId", "delegatedFromId", "weight"]);
  });

  it("keeps the stance and its reason, which the group has to answer", () => {
    expect(fields.sort()).toEqual(["createdAt", "id", "proposalId", "reason", "stance"]);
  });
});

// ── plays ───────────────────────────────────────────────────────────────────
describe("plays projection", () => {
  it("withholds the creator, submitter and approver ids", () => {
    expectWithheld(PUBLIC_PLAY_FIELDS, plays, ["creatorUserId", "submittedBy", "approvedBy"]);
  });

  it("keeps the published credit and the buy link", () => {
    for (const field of ["creatorProjectName", "externalPaymentUrl", "externalPriceLabel", "priceRegenTokens"]) {
      expect(PUBLIC_PLAY_FIELDS).toContain(field);
    }
  });

  it("keeps all fourteen culture sections", () => {
    const sections = PUBLIC_PLAY_FIELDS.filter((f) => f.startsWith("section"));
    expect(sections).toHaveLength(14);
  });
});

// ── ship seed plantings ─────────────────────────────────────────────────────
describe("ship.seeds.listVerified", () => {
  it("drops precision below about 110 m", () => {
    expect(coarsenSeedCoordinate(12.3456789)).toBe(12.346);
    expect(coarsenSeedCoordinate(-4.00001)).toBe(-4);
    expect(coarsenSeedCoordinate(0)).toBe(0);
  });

  it("leaves a missing coordinate missing rather than turning it into 0", () => {
    // ShipMap filters on `p.lat != null`; a 0 here would drop a marker in
    // the Gulf of Guinea.
    expect(coarsenSeedCoordinate(null)).toBeNull();
  });

  it("keeps enough precision that ShipMap's max zoom shows no lattice", () => {
    // 0.001 degrees is roughly 23 px at zoom 15, which reads as scatter.
    expect(coarsenSeedCoordinate(51.507412)).toBe(51.507);
    expect(coarsenSeedCoordinate(51.5074)).not.toBe(coarsenSeedCoordinate(51.5084));
  });

  it("names userId, bookingId and notes as columns it must not publish", () => {
    // The projection is inline in the resolver, so this asserts against the
    // table rather than a list: these three exist and are the ones withheld.
    const real = Object.keys(getTableColumns(shipSeedPlantings));
    for (const col of ["userId", "bookingId", "notes"]) expect(real).toContain(col);
  });
});
