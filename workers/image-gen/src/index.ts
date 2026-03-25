interface Env {
  AI: Ai;
  R2: R2Bucket;
  AUTH_SECRET: string;
}

// Base regenerative theme applied to ALL generated images
const BASE_THEME = [
  "regenerative", "organic", "healing", "forest", "magical",
  "lush green landscape", "warm golden light", "bioluminescent details",
  "fantasy illustration style", "ultra detailed", "4K quality",
  "storybook atmosphere", "mycorrhizal network patterns",
].join(", ");

const CONTENT_PREFIXES: Record<string, string> = {
  forum:    "Community gathering space illustration —",
  quest:    "Epic quest scene illustration —",
  campaign: "Regenerative campaign poster illustration —",
  blog:     "Thoughtful editorial illustration —",
  video:    "Cinematic landscape backdrop illustration —",
  profile:  "Portrait of a land steward illustration —",
  default:  "Regenerative landscape illustration —",
};

function buildPrompt(contentType: string, contextText: string): string {
  const prefix = CONTENT_PREFIXES[contentType] ?? CONTENT_PREFIXES.default;
  const trimmed = contextText.slice(0, 200).replace(/[^\w\s,.!?'-]/g, " ");
  return `${prefix} ${trimmed}. Style: ${BASE_THEME}.`;
}

function generateKey(contentType: string, contentId: string | number, temp = false): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const prefix = temp ? "generated/temp" : "generated";
  return `${prefix}/${contentType}/${contentId}-${ts}.png`;
}

async function streamToBytes(stream: ReadableStream): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const auth = request.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${env.AUTH_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);

    // ── /promote: copy temp key to permanent, delete all temp files ──────────
    if (url.pathname.endsWith("/promote")) {
      let body: { selectedKey: string; allKeys: string[]; newKey: string };
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }

      const { selectedKey, allKeys, newKey } = body;
      if (!selectedKey || !allKeys || !newKey) {
        return new Response("Missing required fields: selectedKey, allKeys, newKey", { status: 400 });
      }

      try {
        // Copy selected temp object to permanent key
        const tempObj = await env.R2.get(selectedKey);
        if (!tempObj) return new Response("Selected temp object not found in R2", { status: 404 });
        const bytes = new Uint8Array(await tempObj.arrayBuffer());
        await env.R2.put(newKey, bytes, {
          httpMetadata: { contentType: "image/png" },
          customMetadata: { promotedAt: new Date().toISOString(), fromTemp: selectedKey },
        });

        // Delete all temp objects
        await Promise.all(allKeys.map(k => env.R2.delete(k)));

        const publicUrl = `https://assets.regencivics.earth/${newKey}`;
        console.log(`Promoted ${selectedKey} → ${newKey}`);
        return new Response(JSON.stringify({ key: newKey, url: publicUrl }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Promote failed:", err);
        return new Response(JSON.stringify({ error: "Promote failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // ── Default: generate image ───────────────────────────────────────────────
    let body: { contentType: string; contentId: string | number; contextText: string; temp?: boolean };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { contentType, contentId, contextText, temp = false } = body;
    if (!contentType || !contentId || !contextText) {
      return new Response("Missing required fields: contentType, contentId, contextText", { status: 400 });
    }

    const prompt = buildPrompt(contentType, contextText);
    const key = generateKey(contentType, contentId, temp);

    console.log(`Generating image: type=${contentType} id=${contentId} key=${key}`);

    let imageData: Uint8Array;
    try {
      const stream = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt,
        num_steps: 8,
      }) as ReadableStream;
      imageData = await streamToBytes(stream);
    } catch (err) {
      console.error("Workers AI generation failed:", err);
      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await env.R2.put(key, imageData, {
        httpMetadata: { contentType: "image/png" },
        customMetadata: {
          contentType,
          contentId: String(contentId),
          generatedAt: new Date().toISOString(),
          temp: String(temp),
        },
      });
    } catch (err) {
      console.error("R2 write failed:", err);
      return new Response(JSON.stringify({ error: "Storage write failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const publicUrl = `https://assets.regencivics.earth/${key}`;
    console.log(`Image generated successfully: ${publicUrl}`);

    return new Response(JSON.stringify({ key, url: publicUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
};
