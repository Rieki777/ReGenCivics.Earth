/**
 * shipManifest router — the physical Ship's Inventory manifest.
 *
 * Public read of the `ship_inventory` table: everything aboard the 2006
 * Fleetwood Revolution LE, transcribed from the RV walkthrough videos and
 * seeded via scripts/seed-ship-inventory-manifest.ts. This is DISTINCT from
 * ship.inventory.* (which serves the gamified `ship_inventory_items` bag).
 * Surfaced at /ship/inventory, grouped by zone on the client.
 */
import { asc } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { shipInventory } from "../../drizzle/schema";

export const shipManifestRouter = router({
  // Public: the full manifest, ordered by zone then category then name.
  list: publicProcedure.query(async () => {
    const d = await getDb();
    if (!d) return [];
    return d
      .select()
      .from(shipInventory)
      .orderBy(
        asc(shipInventory.zone),
        asc(shipInventory.category),
        asc(shipInventory.name),
      );
  }),
});
