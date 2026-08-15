/**
 * One-off: generate the Keeper of the Fleet blog hero via the image-gen worker.
 * Run with the prod env so IMAGE_GEN_WORKER_URL + IMAGE_GEN_SECRET are present:
 *   railway run -s "ReGenCivics.Earth" -- npx tsx scripts/generate-ship-keeper-image.ts
 * Prints the stored image URL to paste into blogPosts.ts.
 */
import "dotenv/config";
import { generateImage } from "../server/_core/imageGeneration";

async function main() {
  const res = await generateImage({
    contentType: "blog",
    contentId: "keeper-of-the-fleet",
    contextText:
      "a warm ship keeper tending a vintage motorhome between voyages at a forest homestead at golden hour, folded organic linens stacked neatly, a small green pirate flag by the door, water and propane lines ready, morning light through evergreens, a role of quiet care and stewardship",
  });
  console.log("KEEPER_IMAGE_URL=" + res.url);
  console.log("KEEPER_IMAGE_KEY=" + res.key);
}

main().catch((e) => { console.error(e); process.exit(1); });
