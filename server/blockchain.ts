// server/blockchain.ts
// Read-only Base blockchain queries, no wallet, no signing.

console.log('[blockchain] BASE_RPC:', process.env.BASE_RPC_URL ? 'custom (Alchemy)' : 'fallback (public mainnet.base.org)');

// Addresses are the checksummed form from CLAUDE.md. eth_call is
// case-insensitive on the wire but the checksum spelling is the one
// Rye wants stored everywhere so logs stay consistent across services.
const BASE_RPC         = process.env.BASE_RPC_URL          ?? "https://mainnet.base.org";
export const RGVOICE_CONTRACT = process.env.RGVOICE_TOKEN_CONTRACT ?? "0x4d848B3f2D74D1D2f6c75c55d0751DAB8FC7D707";
export const REGEN_CONTRACT   = process.env.REGEN_TOKEN_CONTRACT   ?? "0x4E617cd113364193d215d107AdD6fa50418AA2E4";
// RCVoice + $RCivics are the fund-track counterparts. RCVoice contract
// is optional: if RCVOICE_TOKEN_CONTRACT is not set we skip the read
// and report 0 public. $RCivics address is the one from CLAUDE.md.
export const RCVOICE_CONTRACT = process.env.RCVOICE_TOKEN_CONTRACT ?? "";
export const RCIVICS_CONTRACT = process.env.RCIVICS_TOKEN_CONTRACT ?? "0x72e9B17a2F93A923D63666eC0a1c096B1443ef26";

/**
 * Map a tokenType (rgvoice / regen / rcvoice / rcivics) to its Base contract
 * address + symbol + DHO slug. Used by the claim flow to build Hypha bridge
 * rows and match Alchemy Transfer events back to the correct private-ledger
 * column. Returns null for tokens whose contract is not configured (e.g.
 * RCVoice if RCVOICE_TOKEN_CONTRACT is unset).
 */
export type TokenTypeKey = "rgvoice" | "regen" | "rcvoice" | "rcivics";
export interface TokenContract {
  tokenType: TokenTypeKey;
  contract: string;
  symbol: string;       // human label, e.g. "$ReGen"
  pair: "game" | "fund";
  dhoSlug: string;
}
export const TOKEN_CONTRACTS: Record<TokenTypeKey, TokenContract | null> = {
  rgvoice: { tokenType: "rgvoice", contract: RGVOICE_CONTRACT, symbol: "RGVoice",  pair: "game", dhoSlug: "regen-games"  },
  regen:   { tokenType: "regen",   contract: REGEN_CONTRACT,   symbol: "$ReGen",   pair: "game", dhoSlug: "regen-games"  },
  rcvoice: RCVOICE_CONTRACT
    ? { tokenType: "rcvoice", contract: RCVOICE_CONTRACT, symbol: "RCVoice",  pair: "fund", dhoSlug: "regen-civics" }
    : null,
  rcivics: { tokenType: "rcivics", contract: RCIVICS_CONTRACT, symbol: "$RCivics", pair: "fund", dhoSlug: "regen-civics" },
};

/** Find which tokenType a Base contract address maps to. Used by the
 * Alchemy webhook to identify which private column to debit. Address
 * comparison is case-insensitive. */
export function tokenTypeForContract(addr: string | undefined | null): TokenTypeKey | null {
  if (!addr) return null;
  const normalized = addr.toLowerCase();
  for (const [key, info] of Object.entries(TOKEN_CONTRACTS)) {
    if (info && info.contract.toLowerCase() === normalized) return key as TokenTypeKey;
  }
  return null;
}

const ERC20_BALANCE_OF_SELECTOR   = "0x70a08231";
const ERC1155_BALANCE_OF_SELECTOR = "0x00fdd58e";

function encodeAddress(addr: string): string {
  return addr.toLowerCase().replace("0x", "").padStart(64, "0");
}

function encodeUint256(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

async function ethCall(to: string, data: string): Promise<string | null> {
  try {
    const res = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to, data }, "latest"],
        id: 1,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json() as any;
    if (json.error) {
      console.warn('[blockchain] eth_call returned error:', json.error, 'to:', to);
      return null;
    }
    if (!json.result || json.result === "0x") return null;
    return json.result as string;
  } catch (e) {
    console.error('[blockchain] ethCall failed:', { to, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

async function readErc20Balance(contractAddr: string, walletAddr: string): Promise<number> {
  const calldata = ERC20_BALANCE_OF_SELECTOR + encodeAddress(walletAddr);
  let raw = await ethCall(contractAddr, calldata);

  if (!raw) {
    const calldata1155 = ERC1155_BALANCE_OF_SELECTOR + encodeAddress(walletAddr) + encodeUint256(BigInt(0));
    raw = await ethCall(contractAddr, calldata1155);
  }

  if (!raw) return 0;

  try {
    const rawBig = BigInt(raw);
    const human = rawBig / BigInt(10 ** 18);
    return Number(human);
  } catch {
    return 0;
  }
}

export async function fetchTokenBalances(walletAddress: string): Promise<{ rvoice: number; rgen: number }> {
  const [rvoice, rgen] = await Promise.all([
    readErc20Balance(RGVOICE_CONTRACT, walletAddress),
    readErc20Balance(REGEN_CONTRACT, walletAddress),
  ]);
  return { rvoice, rgen };
}

/**
 * Fetch all four token public balances from Base in one round-trip.
 * Returns zero for any contract address not configured (so RCVoice is
 * optional until its contract is deployed). Used by the profile
 * getMyTokens flow to compute public + private = total.
 */
export async function fetchAllTokenBalances(walletAddress: string): Promise<{
  rgvoice: number;
  regen: number;
  rcvoice: number;
  rcivics: number;
}> {
  const [rgvoice, regen, rcvoice, rcivics] = await Promise.all([
    readErc20Balance(RGVOICE_CONTRACT, walletAddress),
    readErc20Balance(REGEN_CONTRACT, walletAddress),
    RCVOICE_CONTRACT ? readErc20Balance(RCVOICE_CONTRACT, walletAddress) : Promise.resolve(0),
    RCIVICS_CONTRACT ? readErc20Balance(RCIVICS_CONTRACT, walletAddress) : Promise.resolve(0),
  ]);
  return { rgvoice, regen, rcvoice, rcivics };
}
