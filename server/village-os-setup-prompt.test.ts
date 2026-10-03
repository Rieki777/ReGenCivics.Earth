import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/ssrf", () => ({ assertSafeExternalUrl: vi.fn(async () => ({ resolvedAddresses: [] })) }));

import { resetSetupPromptCache, villageOsSetupPrompt } from "./lib/village-os-setup-prompt";
import { VILLAGE_OS_SETUP_PROMPT_RAW_URL } from "@shared/villageOsOffer";

const FILE = ["# Village OS setup prompt", "", "Copy everything below the line.", "", "---", "", "I am a community founder.", "  Keep this indent."].join("\n");

describe("villageOsSetupPrompt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetSetupPromptCache();
  });

  function stubFetch(body: string, init: ResponseInit = {}) {
    const fetchMock = vi.fn(async () => new Response(body, { status: 200, ...init }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("reads the pinned file once, keeps only the part for the assistant, and caches it", async () => {
    const fetchMock = stubFetch(FILE);
    expect(await villageOsSetupPrompt(0)).toBe("I am a community founder.\n  Keep this indent.");
    expect(await villageOsSetupPrompt(30 * 60 * 1000)).toBe("I am a community founder.\n  Keep this indent.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(VILLAGE_OS_SETUP_PROMPT_RAW_URL);
    expect(init.redirect).toBe("error");
  });

  it("gives null for a file without the line, an error page, an oversized file or a failed fetch", async () => {
    stubFetch("# notes only, no rule");
    expect(await villageOsSetupPrompt(0)).toBeNull();
    resetSetupPromptCache();
    stubFetch(FILE, { status: 404 });
    expect(await villageOsSetupPrompt(0)).toBeNull();
    resetSetupPromptCache();
    stubFetch(FILE, { headers: { "content-length": String(65 * 1024) } });
    expect(await villageOsSetupPrompt(0)).toBeNull();
    resetSetupPromptCache();
    // A streamed body carries no Content-Length, so it is caught after reading.
    const big = new TextEncoder().encode(`---\n${"x".repeat(70 * 1024)}`);
    const streamed = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(big); c.close(); } });
    const streamedFetch = vi.fn(async () => new Response(streamed, { status: 200 }));
    vi.stubGlobal("fetch", streamedFetch);
    expect(await villageOsSetupPrompt(0)).toBeNull();
    expect(streamedFetch).toHaveBeenCalledTimes(1);
    resetSetupPromptCache();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connect ECONNREFUSED"); }));
    expect(await villageOsSetupPrompt(0)).toBeNull();
  });

  it("tries again a minute after a failure, and shares one fetch between callers", async () => {
    stubFetch("", { status: 503 });
    expect(await villageOsSetupPrompt(0)).toBeNull();
    const fetchMock = stubFetch(FILE);
    expect(await villageOsSetupPrompt(30_000)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    const [a, b] = await Promise.all([villageOsSetupPrompt(60_001), villageOsSetupPrompt(60_001)]);
    expect(a).toBe("I am a community founder.\n  Keep this indent.");
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
