/**
 * /schedule for a non-executing agent.
 *
 * This route is first in the rewritten plan for one measured reason: the phase
 * -2 baseline asked four models and ChatGPT the four funnel questions, 36
 * answers, and not one came back with a date. A dated session is the only
 * object an agent can put on a calendar; "explore our ecosystem" is not. The
 * sessions were in production for humans and invisible to agents.
 *
 * The db module is mocked so this runs with no database, which also lets the
 * past-event and empty cases be asserted deterministically rather than
 * depending on whatever happens to be scheduled today.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const rows = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock("./db", () => ({
  getUpcomingEventsSnapshot: async () => rows.value,
}));

const { getScheduleContent } = await import("./_core/crawler-content");

/** The JSON-LD Event nodes, unwrapped from the ItemList. */
function events(jsonld: unknown) {
  const list = (jsonld as { itemListElement?: { item: Record<string, unknown> }[] })
    .itemListElement;
  return (list ?? []).map((l) => l.item);
}

const soon = new Date("2027-03-18T17:00:00.000Z");
const later = new Date("2027-04-15T17:00:00.000Z");

beforeEach(() => {
  rows.value = [];
  // getScheduleContent caches for ten minutes, so each test needs its own
  // module state. Resetting the registry is cheaper than exporting a cache
  // clearer that only tests would ever call.
  vi.resetModules();
});

async function fresh() {
  const mod = await import("./_core/crawler-content");
  return mod.getScheduleContent();
}

describe("/schedule crawler content", () => {
  it("puts a real date in the prose and an ISO date in the JSON-LD", async () => {
    rows.value = [
      {
        id: 1,
        title: "Open Access Session",
        description: "A monthly open call.",
        type: "open",
        startTime: soon,
        endTime: null,
        status: "upcoming",
        season: null,
        episodeNumber: null,
      },
    ];
    const c = await fresh();
    expect(c).not.toBeNull();

    // The readable form, for a model lifting prose.
    expect(c!.bodyHtml).toContain("March 18, 2027");
    // The machine form, for a model reading structured data. Both are the same
    // instant; a mismatch between them is the failure worth catching.
    expect(events(c!.jsonld)[0].startDate).toBe(soon.toISOString());
    expect(events(c!.jsonld)[0]["@type"]).toBe("Event");
  });

  it("names the next session in the opening sentence", async () => {
    rows.value = [
      { id: 1, title: "Season Two, episode 4", description: null, type: "episode", startTime: soon, endTime: null, status: "upcoming", season: "Season Two", episodeNumber: 4 },
      { id: 2, title: "Open Access Session", description: null, type: "open", startTime: later, endTime: null, status: "upcoming", season: null, episodeNumber: null },
    ];
    const c = await fresh();
    // Answer-first: the first thing an agent reads is the next dated thing,
    // not a paragraph about what a session is.
    expect(c!.bodyHtml).toMatch(/next session is Season Two, episode 4 on Thursday, March 18, 2027/);
  });

  it("never puts a meeting link in the payload", async () => {
    // An agent that hands a stranger a live Zoom url has routed round the
    // registration step, which is the only gate between a cold query and a
    // room with people in it.
    rows.value = [
      { id: 1, title: "Open Access Session", description: null, type: "open", startTime: soon, endTime: null, status: "upcoming", season: null, episodeNumber: null, zoomUrl: "https://zoom.us/j/secret" },
    ];
    const c = await fresh();
    expect(c!.bodyHtml).not.toContain("zoom.us");
    expect(JSON.stringify(c!.jsonld)).not.toContain("zoom.us");
    expect(events(c!.jsonld)[0].location).toEqual({
      "@type": "VirtualLocation",
      url: "https://regencivics.earth/schedule",
    });
  });

  it("says so plainly when nothing is scheduled", async () => {
    // The empty case has to read as "nothing scheduled", never as a page that
    // failed to load. An agent told nothing is on can say so; an agent handed
    // an empty shell invents.
    const c = await fresh();
    expect(c!.bodyHtml).toContain("No sessions are currently scheduled");
    expect(events(c!.jsonld)).toHaveLength(0);
  });

  it("escapes a title, so an event name cannot inject markup", async () => {
    rows.value = [
      { id: 1, title: '</h3><script>x</script>', description: null, type: "open", startTime: soon, endTime: null, status: "upcoming", season: null, episodeNumber: null },
    ];
    const c = await fresh();
    expect(c!.bodyHtml).not.toContain("<script>x</script>");
    expect(c!.bodyHtml).toContain("&lt;script&gt;");
  });
});
