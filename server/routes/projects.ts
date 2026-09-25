/**
 * The public project page: /project/:key (shared/projectKey.ts).
 *
 * One land project, public to visitors, with its campaign tools shown only
 * to its stewards (server/lib/project-steward.ts). This router reads; every
 * steward tool on the page calls a campaigns.* procedure that checks the
 * steward on the server again.
 *
 * The read itself lives in server/lib/project-page.ts (resolveProjectPage),
 * shared with the crawler content and the share card for /project/:key, so
 * the three can never drift apart. Privacy notes are there.
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { resolveProjectPage } from "../lib/project-page";

export { pickFrontCampaign } from "../lib/project-page";

export const projectsRouter = router({
  getPublic: publicProcedure
    .input(z.object({ key: z.string().max(120), campaign: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      return await resolveProjectPage({ key: input.key, user: ctx.user, focusId: input.campaign ?? null });
    }),
});
