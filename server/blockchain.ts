// server/blockchain.ts
// Read-only Base blockchain queries — no wallet, no signing.

console.log('[blockchain] BASE_RPC:', process.env.BASE_RPC_URL ? 'custom (Alchemy)' : 'fallback (public mainnet.base.org)');

const BASE_RPC         = process.env.BASE_RPC_URL          ?? "https://mainnet.base.org";
const RGVOICE_CONTRACT = process.env.RGVOICE_TOKEN_CONTRACT ?? "0x4d848b3f2d74d1d2f6c75c55d0751dab8fc7d707";
const REGEN_CONTRACT   = process.env.REGEN_TOKEN_CONTRACT   ?? "0x4e617cd113364193d215d107add6fa50418aa2e4";

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
      console.warn('[blockchain] ethCall json.error:', json.error);
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
