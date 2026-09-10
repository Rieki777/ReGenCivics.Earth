import { describe, expect, it } from "vitest";
import {
  BROADCAST_FILL_STORAGE_KEY,
  consumeBroadcastFill,
  outboundSocialHref,
  queueBroadcastFill,
} from "./broadcastFill";

describe("broadcastFill", () => {
  it("deep-links to Outbound Social", () => {
    expect(outboundSocialHref()).toBe("/admin?tab=outbound&surface=social");
  });

  it("queues a body on the same key Broadcast Voice already reads", () => {
    queueBroadcastFill("Soil first. Governance second.");
    expect(sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY)).toBe(
      "Soil first. Governance second.",
    );
    expect(consumeBroadcastFill()).toBe("Soil first. Governance second.");
    expect(sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY)).toBeNull();
  });
});
