/**
 * Wallet balance tRPC route.
 * Reads on-chain $REGEN and $RCivics balances via the existing blockchain.ts helper.
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { fetchTokenBalances } from "../blockchain";

export const walletRouter = router({
  balances: publicProcedure
    .input(z.object({
      walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    }))
    .query(async ({ input }) => {
      try {
        const balances = await fetchTokenBalances(input.walletAddress);
        return { regen: balances.rgen ?? 0, rcivics: balances.rvoice ?? 0 };
      } catch (err: any) {
        console.warn("[wallet.balances] failed:", err.message);
        return { regen: null, rcivics: null };
      }
    }),
});
