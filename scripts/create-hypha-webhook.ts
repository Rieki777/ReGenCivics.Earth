/**
 * Create (or inspect) the Alchemy Custom Webhook that feeds
 * /api/webhooks/hypha-alchemy — the hub's ONE listener for every fork's
 * Hypha DAO on Base (ADR-46).
 *
 * Why one webhook covers everyone: Hypha-on-Base is a multi-tenant
 * singleton — ProposalCreated(proposalId, spaceId, ...) carries an indexed
 * spaceId per DAO, and every space (regen's DHOs, Amora's, any future
 * fork's) emits from the same proposals contract. Verified 2026-07-31 over
 * the public RPC: 4 distinct spaceIds emitted proposals through
 * 0x001bA7a00a259Fb12d7936455e292a60FC2bef14 in a 4.5-day sample, and the
 * event topic hashes match the receiver's ABI exactly.
 *
 * Usage:
 *   ALCHEMY_NOTIFY_TOKEN=<token> pnpm tsx scripts/create-hypha-webhook.ts --list
 *   ALCHEMY_NOTIFY_TOKEN=<token> pnpm tsx scripts/create-hypha-webhook.ts \
 *     --url https://<prod-domain>/api/webhooks/hypha-alchemy
 *
 * The token is the Notify API auth token: dashboard.alchemy.com -> Data ->
 * Webhooks -> "AUTH TOKEN" (top right). It is NOT an app API key.
 *
 * On success the script prints the webhook's SIGNING KEY — set it on
 * Railway as ALCHEMY_HYPHA_WEBHOOK_SIGNING_KEY (comma-append to rotate
 * without downtime; the receiver checks every listed key).
 */
import "dotenv/config";

const NOTIFY_API = "https://dashboard.alchemy.com/api";
const CONTRACT = (process.env.HYPHA_DAO_PROPOSALS_CONTRACT ?? "0x001bA7a00a259Fb12d7936455e292a60FC2bef14").toLowerCase();

// The exact log shape the receiver's decodeHyphaProposalLog expects:
// body.event.data.block.logs[] with topics/data/transaction.hash/account.address.
const GRAPHQL_QUERY = `
{
  block {
    logs(filter: {addresses: ["${CONTRACT}"], topics: []}) {
      data
      topics
      transaction { hash }
      account { address }
    }
  }
}`.trim();

async function notify(path: string, init: RequestInit = {}): Promise<any> {
  const token = process.env.ALCHEMY_NOTIFY_TOKEN;
  if (!token) {
    console.error("ALCHEMY_NOTIFY_TOKEN is not set.");
    console.error("Get it from dashboard.alchemy.com -> Data -> Webhooks -> AUTH TOKEN (top right),");
    console.error("then set it in the environment (Railway or a local shell) and re-run.");
    process.exit(1);
  }
  const res = await fetch(`${NOTIFY_API}${path}`, {
    ...init,
    headers: { "X-Alchemy-Token": token, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`Notify API ${path} -> ${res.status}:`, JSON.stringify(body));
    process.exit(1);
  }
  return body;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    const data = await notify("/team-webhooks", { method: "GET" });
    const hooks = data?.data ?? [];
    console.log(`${hooks.length} webhook(s) on this team:`);
    for (const h of hooks) {
      console.log(`- id=${h.id} type=${h.webhook_type} network=${h.network} active=${h.is_active}`);
      console.log(`  url=${h.webhook_url}`);
    }
    return;
  }

  const urlIdx = args.indexOf("--url");
  const target = urlIdx >= 0 ? args[urlIdx + 1] : undefined;
  if (!target || !target.startsWith("https://")) {
    console.error("Pass --url https://<prod-domain>/api/webhooks/hypha-alchemy (or --list).");
    process.exit(1);
  }

  const created = await notify("/create-webhook", {
    method: "POST",
    body: JSON.stringify({
      network: "BASE_MAINNET",
      webhook_type: "GRAPHQL",
      webhook_url: target,
      graphql_query: { query: GRAPHQL_QUERY, skip_empty_messages: true },
    }),
  });
  const hook = created?.data;
  console.log("Webhook created:");
  console.log(`  id:          ${hook?.id}`);
  console.log(`  network:     ${hook?.network}`);
  console.log(`  url:         ${hook?.webhook_url}`);
  console.log(`  signing key: ${hook?.signing_key}`);
  console.log("");
  console.log("Set on Railway: ALCHEMY_HYPHA_WEBHOOK_SIGNING_KEY=<signing key above>");
  console.log("(comma-append to an existing value to rotate keys without downtime)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
