/**
 * The overlap engine.
 *
 * This is the part the Circle will actually argue from, so it has to be exact
 * and explainable: if the page says two projects both speak DIDComm, someone
 * has to be able to point at both sheets and see it. Everything here is a pure
 * function over the structured half of the sheets, with no LLM in the loop.
 */

import { describe, expect, it } from "vitest";
import {
  cleanFacets,
  cleanTerms,
  commonGround,
  computeOverlaps,
  MAX_TERMS_PER_AXIS,
  normalizeTerm,
  tallyTerms,
  termKey,
  type OverlapInput,
} from "./interopSheet";

const sheet = (id: number, toolName: string, facets: Partial<Record<string, string[]>>): OverlapInput => ({
  id,
  toolName,
  facets: cleanFacets(facets),
});

describe("term matching", () => {
  it("ignores case, spacing and punctuation that only reflect typing habits", () => {
    // Two projects that both speak DIDComm must match however each wrote it.
    expect(termKey("DIDComm")).toBe(termKey("didcomm"));
    expect(termKey("AT Protocol")).toBe(termKey("at-protocol"));
    expect(termKey("JSON-LD")).toBe(termKey("json ld"));
    expect(termKey("Open Badges")).toBe(termKey("open_badges"));
  });

  it("does not collapse genuinely different terms", () => {
    expect(termKey("JSON")).not.toBe(termKey("JSON-LD"));
    expect(termKey("DID")).not.toBe(termKey("DIDComm"));
    expect(termKey("OAuth 2.0")).not.toBe(termKey("OAuth 1.0"));
  });

  it("keeps the author's spelling for display", () => {
    expect(normalizeTerm("  Verifiable   Credentials ")).toBe("Verifiable Credentials");
  });

  it("strips the characters that would let a term misrepresent itself", () => {
    expect(normalizeTerm("DID\u202Ereversed")).toBe("DIDreversed");
    expect(normalizeTerm("JSON\u0000")).toBe("JSON");
  });
});

describe("cleanTerms", () => {
  it("drops blanks, non-strings and duplicates", () => {
    expect(cleanTerms(["JSON", "", "  ", "json", 42, null, "JSON-LD"])).toEqual(["JSON", "JSON-LD"]);
  });

  it("is not an array and returns nothing", () => {
    expect(cleanTerms("JSON")).toEqual([]);
    expect(cleanTerms(undefined)).toEqual([]);
    expect(cleanTerms({ 0: "JSON" })).toEqual([]);
  });

  it("bounds how many terms one sheet can claim", () => {
    const many = Array.from({ length: 200 }, (_, i) => `proto-${i}`);
    expect(cleanTerms(many)).toHaveLength(MAX_TERMS_PER_AXIS);
  });
});

describe("computeOverlaps", () => {
  it("finds nothing between projects with nothing in common", () => {
    const pairs = computeOverlaps([
      sheet(1, "Alpha", { protocols: ["Nostr"] }),
      sheet(2, "Beta", { protocols: ["Matrix"] }),
    ]);
    expect(pairs).toEqual([]);
  });

  it("names exactly what two projects share, and on which axis", () => {
    const pairs = computeOverlaps([
      sheet(1, "Social Fabric", { protocols: ["DIDComm", "Verifiable Credentials"], dataFormats: ["JSON-LD"] }),
      sheet(2, "ReGen Civics", { protocols: ["verifiable credentials"], dataFormats: ["json-ld", "CSV"] }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].score).toBe(2);
    expect(pairs[0].shared.map((s) => [s.axis, s.term])).toEqual([
      ["protocols", "Verifiable Credentials"],
      ["dataFormats", "JSON-LD"],
    ]);
  });

  it("ranks the strongest overlap first", () => {
    const pairs = computeOverlaps([
      sheet(1, "A", { protocols: ["DID", "IPFS", "Matrix"] }),
      sheet(2, "B", { protocols: ["DID", "IPFS", "Matrix"] }),
      sheet(3, "C", { protocols: ["DID"] }),
    ]);
    expect(pairs[0].score).toBe(3);
    expect(pairs[0].a.toolName).toBe("A");
    expect(pairs[0].b.toolName).toBe("B");
    expect(pairs[pairs.length - 1].score).toBe(1);
  });

  it("never pairs a sheet with itself", () => {
    const pairs = computeOverlaps([sheet(1, "Only", { protocols: ["DID"] })]);
    expect(pairs).toEqual([]);
  });

  it("reports each pair once, not twice", () => {
    const pairs = computeOverlaps([
      sheet(1, "A", { protocols: ["DID"] }),
      sheet(2, "B", { protocols: ["DID"] }),
    ]);
    expect(pairs).toHaveLength(1);
  });

  it("matches across every axis, not just protocols", () => {
    const pairs = computeOverlaps([
      sheet(1, "A", { identityModels: ["DID"], surfaces: ["Webhooks"] }),
      sheet(2, "B", { identityModels: ["did"], surfaces: ["webhooks"] }),
    ]);
    expect(pairs[0].shared.map((s) => s.axis).sort()).toEqual(["identityModels", "surfaces"]);
  });

  it("does not match the same word across different axes", () => {
    // "DID" as an identity model is not the same claim as "DID" as a protocol.
    const pairs = computeOverlaps([
      sheet(1, "A", { protocols: ["DID"] }),
      sheet(2, "B", { identityModels: ["DID"] }),
    ]);
    expect(pairs).toEqual([]);
  });

  it("is stable in order between runs", () => {
    const input = [
      sheet(1, "Zed", { protocols: ["DID"] }),
      sheet(2, "Alpha", { protocols: ["DID"] }),
      sheet(3, "Mid", { protocols: ["DID"] }),
    ];
    expect(JSON.stringify(computeOverlaps(input))).toBe(JSON.stringify(computeOverlaps(input)));
  });
});

describe("tallyTerms and commonGround", () => {
  it("counts how many projects name each term", () => {
    const tally = tallyTerms([
      sheet(1, "A", { protocols: ["DID", "IPFS"] }),
      sheet(2, "B", { protocols: ["DID"] }),
      sheet(3, "C", { protocols: ["did"] }),
    ]);
    const did = tally.find((t) => t.key === termKey("DID"))!;
    expect(did.count).toBe(3);
    expect(did.toolNames).toEqual(["A", "B", "C"]);
  });

  it("puts the most-shared first, which is what a standard is built from", () => {
    const tally = tallyTerms([
      sheet(1, "A", { protocols: ["DID", "Matrix"] }),
      sheet(2, "B", { protocols: ["DID"] }),
    ]);
    expect(tally[0].term).toBe("DID");
    expect(tally[0].count).toBe(2);
  });

  it("treats a term only one project names as a proposal, not common ground", () => {
    const ground = commonGround([
      sheet(1, "A", { protocols: ["DID", "Nostr"] }),
      sheet(2, "B", { protocols: ["DID"] }),
    ]);
    expect(ground.map((t) => t.term)).toEqual(["DID"]);
  });

  it("is empty when nobody has filed anything", () => {
    expect(tallyTerms([])).toEqual([]);
    expect(commonGround([])).toEqual([]);
  });

  it("does not double-count a project that repeats itself", () => {
    const tally = tallyTerms([sheet(1, "A", { protocols: ["DID", "did", "DID "] })]);
    expect(tally.find((t) => t.key === termKey("DID"))!.count).toBe(1);
  });
});
