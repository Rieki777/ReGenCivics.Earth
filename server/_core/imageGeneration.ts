/**
 * Image generation stub — the legacy AI image proxy is no longer available.
 * To re-enable: integrate directly with Anthropic's image capabilities,
 * OpenAI DALL-E, or Cloudflare Workers AI.
 */

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  _options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  throw new Error("Image generation is not configured.");
}
