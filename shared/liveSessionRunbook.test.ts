import { describe, expect, it } from "vitest";
import {
  LIVE_SESSION_ROLES,
  applyLiveSessionRunbookPatch,
  buildLiveSessionChecklist,
  liveSessionRunbookHref,
  liveSessionRunbookNeedsOwners,
  liveSessionRunbookProgress,
  parseLiveSessionRunbookBag,
  serializeLiveSessionRunbookBag,
} from "./liveSessionRunbook";

describe("parseLiveSessionRunbookBag", () => {
  it("returns empty for null/corrupt", () => {
    expect(parseLiveSessionRunbookBag(null)).toEqual({});
    expect(parseLiveSessionRunbookBag("")).toEqual({});
    expect(parseLiveSessionRunbookBag("not-json")).toEqual({});
    expect(parseLiveSessionRunbookBag("[]")).toEqual({});
  });

  it("round-trips assignments", () => {
    const bag = applyLiveSessionRunbookPatch(
      {},
      42,
      {
        host: { owner: "Rieki", handoffNotes: "Open with gratitude" },
        tech: { roleSlug: "stream-tech" },
      },
      "2026-09-23T19:00:00.000Z",
    );
    const raw = serializeLiveSessionRunbookBag(bag);
    const parsed = parseLiveSessionRunbookBag(raw);
    expect(parsed["42"]?.roles.host?.owner).toBe("Rieki");
    expect(parsed["42"]?.roles.host?.handoffNotes).toBe("Open with gratitude");
    expect(parsed["42"]?.roles.tech?.roleSlug).toBe("stream-tech");
    expect(parsed["42"]?.updatedAt).toBe("2026-09-23T19:00:00.000Z");
  });
});

describe("buildLiveSessionChecklist + progress", () => {
  it("lists all five roles and tracks unassigned", () => {
    const items = buildLiveSessionChecklist({
      roles: {
        host: { owner: "Rieki", roleSlug: null, handoffNotes: null },
        chat: { owner: null, roleSlug: "chat-mod", handoffNotes: "Watch links" },
      },
    });
    expect(items.map((i) => i.id)).toEqual([...LIVE_SESSION_ROLES]);
    expect(items.find((i) => i.id === "host")?.assigned).toBe(true);
    expect(items.find((i) => i.id === "chat")?.assigned).toBe(true);
    expect(items.find((i) => i.id === "tech")?.assigned).toBe(false);
    const progress = liveSessionRunbookProgress(items);
    expect(progress.assigned).toBe(2);
    expect(progress.unassigned).toBe(3);
    expect(progress.complete).toBe(false);
    expect(liveSessionRunbookNeedsOwners({ roles: { host: { owner: "x", roleSlug: null, handoffNotes: null } } })).toBe(
      true,
    );
  });

  it("complete when every role has owner or seat", () => {
    const roles = Object.fromEntries(
      LIVE_SESSION_ROLES.map((id) => [id, { owner: id, roleSlug: null, handoffNotes: null }]),
    );
    expect(liveSessionRunbookNeedsOwners({ roles: roles as any })).toBe(false);
    expect(liveSessionRunbookProgress(buildLiveSessionChecklist({ roles: roles as any })).complete).toBe(
      true,
    );
  });
});

describe("liveSessionRunbookHref", () => {
  it("deep-links upcoming events, optionally open id", () => {
    expect(liveSessionRunbookHref()).toBe("/admin?tab=events&filter=upcoming");
    expect(liveSessionRunbookHref(9)).toBe("/admin?tab=events&filter=upcoming&open=9");
  });
});
