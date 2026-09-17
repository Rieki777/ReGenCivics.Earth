import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  BROADCAST_FILL_EVENT,
  BROADCAST_FILL_STORAGE_KEY,
  consumeBroadcastFill,
  outboundSocialHref,
  queueBroadcastFill,
} from "./broadcastFill";

describe("broadcastFill", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("deep-links to Outbound Social", () => {
    expect(outboundSocialHref()).toBe("/admin?tab=outbound&surface=social");
  });

  it("queues a body on the same key Broadcast Voice already reads", () => {
    expect(queueBroadcastFill("Soil first. Governance second.")).toBe(true);
    expect(sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY)).toBe(
      "Soil first. Governance second.",
    );
    expect(consumeBroadcastFill()).toBe("Soil first. Governance second.");
    expect(sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY)).toBeNull();
  });

  it("dispatches the same CustomEvent shape AdminBroadcastPanel listens for", () => {
    const seen: string[] = [];
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string }>).detail;
      if (detail?.text) seen.push(detail.text);
    };
    window.addEventListener(BROADCAST_FILL_EVENT, handler);
    queueBroadcastFill("From Harvest.");
    window.removeEventListener(BROADCAST_FILL_EVENT, handler);
    expect(seen).toEqual(["From Harvest."]);
    expect(sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY)).toBe("From Harvest.");
  });

  it("refuses empty or whitespace-only fills without writing or dispatching", () => {
    const spy = vi.fn();
    window.addEventListener(BROADCAST_FILL_EVENT, spy);
    expect(queueBroadcastFill("")).toBe(false);
    expect(queueBroadcastFill("   \n\t  ")).toBe(false);
    window.removeEventListener(BROADCAST_FILL_EVENT, spy);
    expect(spy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY)).toBeNull();
  });
});
