import { describe, expect, it } from "vitest";
import {
  BROADCAST_CHANNELS,
  isBroadcastChannelId,
  isBroadcastComposeSurface,
  strictestBroadcastLimit,
} from "./broadcastChannels";

describe("strictestBroadcastLimit", () => {
  it("keeps the historical 280 when nothing is selected", () => {
    expect(strictestBroadcastLimit([])).toBe(280);
  });

  it("uses LinkedIn's room when that is the only channel", () => {
    expect(strictestBroadcastLimit(["linkedin"])).toBe(3000);
  });

  it("tightens to X when X is in a mixed set", () => {
    expect(strictestBroadcastLimit(["linkedin", "twitter", "facebook"])).toBe(280);
  });

  it("uses Farcaster's cap when that is the only channel", () => {
    expect(strictestBroadcastLimit(["farcaster"])).toBe(320);
  });

  it("ignores unknown ids", () => {
    expect(strictestBroadcastLimit(["not-a-channel", "bluesky"])).toBe(300);
  });
});

describe("broadcast channel catalog", () => {
  it("covers the six compose channels", () => {
    expect(BROADCAST_CHANNELS.map((c) => c.id)).toEqual([
      "twitter",
      "linkedin",
      "facebook",
      "instagram",
      "bluesky",
      "farcaster",
    ]);
  });

  it("accepts only catalog ids", () => {
    expect(isBroadcastChannelId("twitter")).toBe(true);
    expect(isBroadcastChannelId("threads_x")).toBe(false);
  });
});

describe("isBroadcastComposeSurface", () => {
  it("treats the legacy Broadcast tab as social compose", () => {
    expect(isBroadcastComposeSurface("broadcast")).toBe(true);
  });

  it("treats Outbound Social as social compose", () => {
    expect(isBroadcastComposeSurface("outbound", "social")).toBe(true);
  });

  it("does not treat other Outbound surfaces as social compose", () => {
    expect(isBroadcastComposeSurface("outbound")).toBe(false);
    expect(isBroadcastComposeSurface("outbound", "write")).toBe(false);
    expect(isBroadcastComposeSurface("outbound", "people")).toBe(false);
    expect(isBroadcastComposeSurface("settings")).toBe(false);
  });
});
