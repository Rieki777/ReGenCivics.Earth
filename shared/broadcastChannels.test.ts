import { describe, expect, it } from "vitest";
import {
  BROADCAST_CHANNELS,
  broadcastBodiesReady,
  buildBufferPostTargets,
  clipToBroadcastLimit,
  fillChannelBodiesFromMaster,
  isBroadcastChannelId,
  isBroadcastComposeSurface,
  profilesForChannel,
  resolveChannelBody,
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

describe("clipToBroadcastLimit", () => {
  it("leaves short copy alone", () => {
    expect(clipToBroadcastLimit("Plant food forests.", 280)).toBe("Plant food forests.");
  });

  it("cuts on a sentence boundary when one exists", () => {
    const text = "First thought is short. Second thought goes on for a while and will overflow the cap.";
    expect(clipToBroadcastLimit(text, 40)).toBe("First thought is short.");
  });

  it("falls back to a word boundary", () => {
    expect(clipToBroadcastLimit("one two three four five", 12)).toBe("one two");
  });
});

describe("resolveChannelBody", () => {
  it("uses the channel body when non-empty", () => {
    expect(resolveChannelBody("master", { twitter: "short x" }, "twitter")).toBe("short x");
  });

  it("falls back to master when the channel box is empty or whitespace", () => {
    expect(resolveChannelBody("master", { twitter: "  " }, "twitter")).toBe("master");
    expect(resolveChannelBody("master", {}, "linkedin")).toBe("master");
  });
});

describe("buildBufferPostTargets", () => {
  const profiles = [
    { id: "p-x", service: "twitter" },
    { id: "p-li", service: "linkedin" },
  ];

  it("maps each Buffer channel to its own body and profile", () => {
    const { targets, missingChannels } = buildBufferPostTargets({
      selectedChannelIds: ["twitter", "linkedin", "farcaster"],
      masterText: "Master long copy for everyone.",
      channelBodies: {
        twitter: "Short X take.",
        linkedin: "Longer LinkedIn take for builders.",
      },
      profiles,
    });
    expect(missingChannels).toEqual([]);
    expect(targets).toEqual([
      { profileId: "p-x", channelId: "twitter", text: "Short X take." },
      { profileId: "p-li", channelId: "linkedin", text: "Longer LinkedIn take for builders." },
    ]);
  });

  it("falls back to master text when a channel body is unset", () => {
    const { targets } = buildBufferPostTargets({
      selectedChannelIds: ["twitter", "linkedin"],
      masterText: " One body. ",
      channelBodies: { twitter: "X only" },
      profiles,
    });
    expect(targets).toEqual([
      { profileId: "p-x", channelId: "twitter", text: "X only" },
      { profileId: "p-li", channelId: "linkedin", text: "One body." },
    ]);
  });

  it("lists channels with no connected Buffer profile", () => {
    const { targets, missingChannels } = buildBufferPostTargets({
      selectedChannelIds: ["twitter", "bluesky"],
      masterText: "hi",
      channelBodies: {},
      profiles: [{ id: "p-x", service: "twitter" }],
    });
    expect(targets.map((t) => t.channelId)).toEqual(["twitter"]);
    expect(missingChannels).toEqual(["bluesky"]);
  });

  it("posts to every selected profile when a network has several", () => {
    const multi = [
      { id: "p-x-a", service: "twitter" },
      { id: "p-x-b", service: "twitter" },
      { id: "p-li", service: "linkedin" },
    ];
    const { targets, missingChannels } = buildBufferPostTargets({
      selectedChannelIds: ["twitter", "linkedin"],
      masterText: "One body.",
      channelBodies: {},
      profiles: multi,
      selectedProfileIds: ["p-x-a", "p-x-b", "p-li"],
    });
    expect(missingChannels).toEqual([]);
    expect(targets).toEqual([
      { profileId: "p-x-a", channelId: "twitter", text: "One body." },
      { profileId: "p-x-b", channelId: "twitter", text: "One body." },
      { profileId: "p-li", channelId: "linkedin", text: "One body." },
    ]);
  });

  it("respects a subset of selected profiles on one network", () => {
    const multi = [
      { id: "p-x-a", service: "twitter" },
      { id: "p-x-b", service: "twitter" },
    ];
    const { targets } = buildBufferPostTargets({
      selectedChannelIds: ["twitter"],
      masterText: "Hi",
      channelBodies: {},
      profiles: multi,
      selectedProfileIds: ["p-x-b"],
    });
    expect(targets).toEqual([{ profileId: "p-x-b", channelId: "twitter", text: "Hi" }]);
  });

  it("keeps first-profile-only when selectedProfileIds is omitted", () => {
    const multi = [
      { id: "p-x-a", service: "twitter" },
      { id: "p-x-b", service: "twitter" },
    ];
    const { targets } = buildBufferPostTargets({
      selectedChannelIds: ["twitter"],
      masterText: "Hi",
      channelBodies: {},
      profiles: multi,
    });
    expect(targets).toEqual([{ profileId: "p-x-a", channelId: "twitter", text: "Hi" }]);
  });
});

describe("profilesForChannel", () => {
  it("returns every matching service profile", () => {
    expect(
      profilesForChannel(
        [
          { id: "a", service: "twitter" },
          { id: "b", service: "Twitter" },
          { id: "c", service: "linkedin" },
        ],
        "twitter",
      ).map((p) => p.id),
    ).toEqual(["a", "b"]);
  });
});

describe("fillChannelBodiesFromMaster", () => {
  it("copies the master into every selected channel", () => {
    expect(fillChannelBodiesFromMaster("Hello village", ["twitter", "linkedin"], "copy")).toEqual({
      twitter: "Hello village",
      linkedin: "Hello village",
    });
  });

  it("adapts length per channel", () => {
    const long =
      "First sentence is fine. " +
      "Second sentence keeps going until it would overflow a short network limit for sure.";
    const filled = fillChannelBodiesFromMaster(long, ["twitter", "linkedin"], "adapt");
    expect(filled.twitter.length).toBeLessThanOrEqual(280);
    expect(filled.linkedin).toBe(long.trim());
  });
});

describe("broadcastBodiesReady", () => {
  it("requires a non-empty in-limit body for every selected channel", () => {
    expect(broadcastBodiesReady(["twitter"], "hi", {})).toBe(true);
    expect(broadcastBodiesReady(["twitter", "linkedin"], "", { twitter: "x" })).toBe(false);
    expect(
      broadcastBodiesReady(["twitter", "linkedin"], "master", {
        twitter: "x",
        linkedin: "li",
      }),
    ).toBe(true);
  });
});
