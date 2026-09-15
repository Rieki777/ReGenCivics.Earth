// server/routes/meta.ts
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { HUB_CONTRACT, type HubContract } from "../../shared/hubContract";

export const metaRouter = router({
  // Which version of each public surface's MEANING this hub speaks. Public, no
  // auth, no database: a village asks once per sync and caches it with the
  // snapshot. The numbers and their history are in shared/hubContract.ts and
  // docs/CROWDPOOL_HUB_CONTRACT.md section 10. Accepts `{}` or no input, so a
  // caller that always sends an object does not have to special-case this one.
  contract: publicProcedure
    .input(z.object({}).strict().optional())
    .query((): HubContract => ({ ...HUB_CONTRACT })),
});
