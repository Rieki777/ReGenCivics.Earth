import { describe, expect, it, beforeEach } from "vitest";
import {
  consumeOutboundWriteFill,
  isOutboundWriteComposeAction,
  isOutboundWriteSurface,
  parseOutboundWriteFill,
  queueOutboundWriteFill,
  serializeOutboundWriteFill,
  OUTBOUND_WRITE_FILL_KEY,
} from "@shared/outboundWriteFill";

describe("isOutboundWriteSurface", () => {
  it("matches Outbound Write only", () => {
    expect(isOutboundWriteSurface("outbound", "write")).toBe(true);
    expect(isOutboundWriteSurface("outbound", "social")).toBe(false);
    expect(isOutboundWriteSurface("outbound", "people")).toBe(false);
    expect(isOutboundWriteSurface("applications", "write")).toBe(false);
  });
});

describe("isOutboundWriteComposeAction", () => {
  it("accepts outbound write compose and the write alias", () => {
    expect(isOutboundWriteComposeAction({ type: "compose", tab: "outbound", surface: "write" })).toBe(true);
    expect(isOutboundWriteComposeAction({ type: "compose", tab: "outbound" })).toBe(true);
    expect(isOutboundWriteComposeAction({ type: "compose", tab: "write" })).toBe(true);
  });

  it("rejects broadcast and 1:1 contact compose", () => {
    expect(isOutboundWriteComposeAction({ type: "compose", tab: "broadcast" })).toBe(false);
    expect(isOutboundWriteComposeAction({ type: "compose", tab: "outbound", surface: "social" })).toBe(false);
    expect(isOutboundWriteComposeAction({ type: "compose", to: "a@b.c" })).toBe(false);
    expect(isOutboundWriteComposeAction({ type: "navigate", tab: "outbound", surface: "write" })).toBe(false);
  });
});

describe("serialize/parse outbound write fill", () => {
  it("round-trips subject, body, and layout", () => {
    const raw = serializeOutboundWriteFill({
      subject: "Season update",
      body: "Friends,\n\n[Watch](https://regencivics.earth/)",
      layout: "announcement",
    });
    expect(raw).toBeTruthy();
    const parsed = parseOutboundWriteFill(raw);
    expect(parsed).toEqual({
      subject: "Season update",
      body: "Friends,\n\n[Watch](https://regencivics.earth/)",
      layout: "announcement",
    });
  });

  it("treats a plain string as body copy", () => {
    expect(parseOutboundWriteFill("Just the letter body.")).toEqual({ body: "Just the letter body." });
  });

  it("drops empty payloads", () => {
    expect(serializeOutboundWriteFill({})).toBeNull();
    expect(parseOutboundWriteFill("{}")).toBeNull();
    expect(parseOutboundWriteFill("")).toBeNull();
  });
});

describe("queueOutboundWriteFill / consumeOutboundWriteFill", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const memory: Storage = {
      get length() { return store.size; },
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      key: (index: number) => [...store.keys()][index] ?? null,
    };
    Object.defineProperty(globalThis, "sessionStorage", { value: memory, configurable: true });
  });

  it("stores JSON and consume clears it", () => {
    expect(queueOutboundWriteFill({ subject: "Hello", body: "Body", layout: "plain" })).toBe(true);
    expect(sessionStorage.getItem(OUTBOUND_WRITE_FILL_KEY)).toContain("Hello");
    const fill = consumeOutboundWriteFill();
    expect(fill).toEqual({ subject: "Hello", body: "Body", layout: "plain" });
    expect(sessionStorage.getItem(OUTBOUND_WRITE_FILL_KEY)).toBeNull();
  });
});
