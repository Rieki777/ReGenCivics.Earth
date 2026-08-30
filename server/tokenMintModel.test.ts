/**
 * The issuance model, asserted against the source rather than promised in a
 * comment.
 *
 * R92, the founder, 2026-08-29: "ReGen Civics mints on transfer with all
 * actions and so do these Games. We may add a different function later to mint
 * from a treasury but that will be a future optional setting."
 *
 * Answering that question cost a 25-agent audit and the founder's time, and
 * the answer is a property of the code that anybody can break in an afternoon
 * by adding a treasury balance and reading it before a credit. So it is a test.
 * Every assertion below is a source scan, which means every negative has to be
 * proved against a control that IS present in the same scan, or a rename turns
 * the whole file into a green that checked nothing.
 *
 * Runs in the fast lane: no database, no network.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = (p: string) => resolve(__dirname, "..", p);
const read = (p: string) => readFileSync(root(p), "utf8");

const TOKENS_SRC = read("server/db/tokens.ts");
const SCHEMA_SRC = read("drizzle/schema.ts");
const BLOCKCHAIN_SRC = read("server/blockchain.ts");

/** Every file that writes the private ledger, from the imports that do it. */
const LEDGER_WRITERS = [
  "server/db/tokens.ts",
  "server/db/bounties.ts",
  "server/lib/gratitude-cycles.ts",
  "server/lib/hypha-bridge/webhook-receiver.ts",
  "server/lib/tierDetector.ts",
  "server/routes/batchJobs.ts",
  "server/routes/players.ts",
  "server/routes/plays.ts",
  "server/routes/questCrews.ts",
  "server/routes/seedsClaims.ts",
  "server/routes/ship.ts",
] as const;

describe("the ledger writers are the files this test thinks they are", () => {
  it("finds a creditPrivateTokens call in every one of them", () => {
    // Guard the guard. If a writer is renamed or moved, the scans below would
    // pass over a file that no longer exists in this list and report green on
    // a smaller codebase than they claim to cover.
    const missing = LEDGER_WRITERS.filter((f) => !read(f).includes("creditPrivateTokens"));
    expect(missing).toEqual([]);
  });
});

describe("a credit is issuance, so it names no source account", () => {
  it("takes a recipient and an amount and nothing to draw from", () => {
    const signature = TOKENS_SRC.slice(
      TOKENS_SRC.indexOf("export async function creditPrivateTokens"),
      TOKENS_SRC.indexOf("): Promise<number | null> {"),
    );
    // Control: the parameters that ARE there. If this half fails the slice is
    // wrong and the negative below proves nothing.
    expect(signature).toContain("userId: number");
    expect(signature).toContain("amount: number");
    expect(signature).toContain("source: CreditSource");

    // `source` here is a free-text TAG describing the game event, and it is
    // deliberately not an account id. Anything that looks like a funding
    // account in this signature is the treasury arriving by the side door.
    for (const funder of ["fromUserId", "fromAccount", "sourceAccount", "treasuryId", "debitFrom", "payerId"]) {
      expect(signature).not.toContain(funder);
    }
  });

  it("inserts one row and reads no balance to fund it", () => {
    // Control: the write it does make.
    expect(TOKENS_SRC).toContain("tx.insert(userTokenLedger)");
    // The only SELECT in the transaction is the profile whose cache column is
    // recomputed. A second entity read before the insert would be a supply
    // check, and there is not one.
    expect(TOKENS_SRC.match(/\.from\(playerProfiles\)/g)?.length).toBe(2);
    expect(TOKENS_SRC).not.toMatch(/\.from\((treasury|tokenSupply|supply)\w*\)/);
  });
});

describe("nothing in the token path holds a supply or a treasury account", () => {
  const SUPPLY_WORDS = [
    "totalSupply",
    "total_supply",
    "circulatingSupply",
    "treasuryBalance",
    "treasury_balance",
    "mintAuthority",
    "remainingSupply",
  ];

  it("finds none of them, against a control that is present everywhere", () => {
    const offenders: string[] = [];
    for (const file of LEDGER_WRITERS) {
      const src = read(file);
      // Control, in the same read: the thing every one of these files does.
      expect(src).toContain("creditPrivateTokens");
      for (const word of SUPPLY_WORDS) {
        if (src.includes(word)) offenders.push(`${file}: ${word}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("finds no supply table in the schema, against a control table that is there", () => {
    // Control: the ledger table itself, so a schema rewrite cannot make this
    // pass by accident.
    expect(SCHEMA_SRC).toContain('mysqlTable("user_token_ledger"');
    expect(SCHEMA_SRC).not.toMatch(/mysqlTable\("(token_supply|treasury|treasury_balances|mint_authority)"/);
  });
});

describe("every debit is a claim, a reconcile or a reversal", () => {
  /**
   * A debit whose counterparty is somebody else's credit would be a transfer
   * out of a balance, which is the supply model. So the debits are enumerated
   * by their source tag, and a new one has to be argued for here before it can
   * land. The three that exist all destroy a private token rather than move
   * it: the claim sends it on chain, the reconcile un-does a refund the chain
   * contradicted, and the reversal un-does a bounty credit.
   */
  const ALLOWED_DEBIT_SOURCES = ["claim_pending", "claim_reconciled_debit", "bounty_reversed"];

  it("finds every debit site and every one carries an allowed source", () => {
    const found: string[] = [];
    for (const file of LEDGER_WRITERS) {
      const lines = read(file).split("\n");
      lines.forEach((line, i) => {
        if (!/^\s*amount: -/.test(line)) return;
        const ahead = lines.slice(i, i + 6).join("\n");
        const tag = ahead.match(/source: "([^"]+)"/)?.[1] ?? `UNTAGGED at ${file}:${i + 1}`;
        found.push(tag);
      });
    }
    // Guard the guard: the regex has to be finding debits at all.
    expect(found.length).toBeGreaterThanOrEqual(3);
    expect([...new Set(found)].sort()).toEqual([...ALLOWED_DEBIT_SOURCES].sort());
  });
});

describe("the hub issues nothing on chain", () => {
  it("keeps the read-only invariant and holds no signer", () => {
    // Control: the RPC call it does make.
    expect(BLOCKCHAIN_SRC).toContain("eth_call");
    expect(BLOCKCHAIN_SRC).toContain("Read-only Base blockchain queries, no wallet, no signing");
    for (const signer of ["privateKey", "PRIVATE_KEY", "signTransaction", "sendRawTransaction", "eth_sendTransaction", "Wallet("]) {
      expect(BLOCKCHAIN_SRC).not.toContain(signer);
    }
  });
});

describe("the model is written down where the next reader meets it", () => {
  it("says so on the one write surface", () => {
    expect(TOKENS_SRC).toContain("THE HUB MINTS ON TRANSFER");
    expect(TOKENS_SRC).toContain("IS A CEILING ON ISSUANCE AND NEVER A BALANCE");
    expect(TOKENS_SRC).toContain("THE HUB MINTS NOTHING ON CHAIN");
  });

  it("says so on the ledger table, where a reader looks for the missing half", () => {
    expect(SCHEMA_SRC).toContain("SINGLE-ENTRY BY DESIGN, BECAUSE THE HUB MINTS ON TRANSFER");
  });
});
