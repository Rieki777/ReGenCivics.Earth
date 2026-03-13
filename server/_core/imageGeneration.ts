/**
 * Image generation via Cloudflare Workers AI (Flux)
 * Worker: workers/image-gen/src/index.ts
 * Deploy instructions: see workers/image-gen/README (run: npx wrangler deploy from that directory)
 */
import { ENV } from "./env";

export type ContentType = "forum" | "quest" | "campaign" | "blog" | "video" | "profile" | "default";

export type GenerateImageOptions = {
  contentType: ContentType;
  contentId: string | number;
  contextText: string;
  /** Set true to store as a temp variation (for admin image studio) */
  temp?: boolean;
};

export type GenerateImageResponse = {
  key: string;
  url: string;
};

const BASE_THEME = `solarpunk regenerative world where ancient golden-age civilizations are overgrown with cascading life, massive ancient trees coated in moss and bioluminescent mycelium, glowing teal mushrooms, mycorrhizal network threadwork visible in soil and bark, fruiting plants and abundant layered gardens, birds and animals present at every scale, diverse life teeming at all levels, warm golden amber light emanating from within the canopy and from distant golden-spired living cities, deep forest green tones, golden accents and highlights, hyperrealistic magical realism, detailed fantasy concept art, photorealistic texture and specificity, ultra detailed, 4K, the scene feels real but more alive than reality, as if life's volume has been turned all the way up`;

const PREFIXES: Record<ContentType, string> = {
  blog: "A detailed magical realism scene depicting",
  quest: "A richly illustrated quest card scene showing a player in the act of",
  campaign: "A wide panoramic view of a regenerative landscape where",
  forum: "A real-looking gathering of diverse people in a living space where",
  video: "A cinematic landscape portal scene, as if the viewer is stepping through into",
  profile: "A photorealistic person standing within a regenerative landscape, surrounded by",
  default: "A lush regenerative scene within the ReGen Civics world, showing",
};

export function buildImagePrompt(
  contentType: ContentType,
  title: string,
  description?: string,
): string {
  const prefix = PREFIXES[contentType];
  const context = [title, description?.slice(0, 150)].filter(Boolean).join(", ");
  return `${prefix} ${context}, ${BASE_THEME}`;
}

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const rawUrl = ENV.imageGenWorkerUrl;
  const secret = ENV.imageGenSecret;

  if (!rawUrl || !secret) {
    throw new Error("Image generation not configured: set IMAGE_GEN_WORKER_URL (full URL with https://) and IMAGE_GEN_SECRET env vars");
  }

  // Guard against missing protocol (env var set without https://)
  const workerUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${secret}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Image generation worker returned ${response.status}: ${detail}`);
  }

  return response.json() as Promise<GenerateImageResponse>;
}
