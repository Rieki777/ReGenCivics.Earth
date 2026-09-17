import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./lib/worldview", () => ({
  getGuideWorldviewPreamble: vi.fn(async () => "\n\n## VOICE SOURCE MATERIAL\n<voice-profile>\nWarm and direct.\n</voice-profile>"),
  getStyleRules: vi.fn(async () => null),
}));

vi.mock("./lib/voice-learning", () => ({
  loadTopRules: vi.fn(async () => [
    { category: "tone", rule: "Prefer short sentences.", weight: 3 },
  ]),
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerUserId: 7 },
}));

describe("loadAdminVoiceContextBlock", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reuses Worldview preamble + learned voice_rules", async () => {
    const { loadAdminVoiceContextBlock } = await import("./lib/adminVoiceContext");
    const block = await loadAdminVoiceContextBlock({ ownerId: 7 });
    expect(block).toContain("Voice / second brain");
    expect(block).toContain("Warm and direct.");
    expect(block).toContain("Prefer short sentences.");
    expect(block).toContain("Broadcast");
  });
});
