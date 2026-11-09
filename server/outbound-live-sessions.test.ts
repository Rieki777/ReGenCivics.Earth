/**
 * The Outbound live-sessions list (2026-11-09, ADR-80): Season 2 members and
 * the Open Access list, from the resolver the session reminders used. Pins:
 * one letter per address with Season 2 first, each link opens email
 * preferences with that person's topic ready to mute (never a campaign stop
 * link), and the footer says why the letter came.
 */
import { describe, expect, it, vi } from "vitest";

const resolveMock = vi.fn(async ({ audienceMode }: { audienceMode: string }) =>
  audienceMode === "season2_approved"
    ? [{ email: "Ann@Example.org", name: "Ann" }, { email: "", name: "No email" }]
    : [{ email: "ann@example.org", name: "Ann again" }, { email: "bo@example.org", name: "Bo" }],
);
vi.mock("./jobs/eventReminders", () => ({
  resolveAutoReminderRecipients: (opts: { audienceMode: string }) => resolveMock(opts),
}));
vi.mock("./lib/emailPrefs", () => ({
  managePreferencesUrl: async (email: string, opts?: { mute?: string }) =>
    `https://regencivics.earth/email-preferences?for=${email}&mute=${opts?.mute}`,
}));

import { listFooterReason, previewListUnsubscribeUrl, resolveOutboundRecipients } from "./lib/outboundAudience";
import { parseAudienceList, summarizeAudience } from "../shared/outboundHistory";

describe("the live-sessions list", () => {
  it("is Season 2 members then the Open Access list, one letter each, with a preferences link per topic", async () => {
    const rows = await resolveOutboundRecipients({ sources: [], list: { kind: "live_sessions" } });
    expect(rows).toEqual([
      {
        email: "Ann@Example.org",
        name: "Ann",
        source: "live_sessions",
        unsubscribeUrl: "https://regencivics.earth/email-preferences?for=Ann@Example.org&mute=season2",
      },
      {
        email: "bo@example.org",
        name: "Bo",
        source: "live_sessions",
        unsubscribeUrl: "https://regencivics.earth/email-preferences?for=bo@example.org&mute=open_access",
      },
    ]);
    expect(resolveMock).toHaveBeenCalledWith({ eventId: 0, audienceMode: "season2_approved" });
    expect(resolveMock).toHaveBeenCalledWith({ eventId: 0, audienceMode: "open_access" });
  });

  it("says why the letter came, and previews a preferences link", async () => {
    expect(await listFooterReason({ kind: "live_sessions" })).toBe(
      "You took part in Season 2 or the Open Access sessions on regencivics.earth.",
    );
    expect(previewListUnsubscribeUrl({ kind: "live_sessions" })).toContain("/email-preferences?token=preview");
  });

  it("parses from a stored letter and reads in plain words", () => {
    expect(parseAudienceList({ kind: "live_sessions" })).toEqual({ kind: "live_sessions" });
    expect(summarizeAudience({ sources: [], activeOnly: true, list: { kind: "live_sessions" } })).toBe(
      "Season 2 members and the Open Access list",
    );
  });
});

describe("filling in each person's name at send", async () => {
  const { mergeOutboundFields } = await import("./lib/newsletter-issue-email");

  it("puts the name and email in place of the tokens", () => {
    expect(mergeOutboundFields("Hi {{name}}, this went to {{ email }}.", { email: "ann@example.org", name: "Ann Lee" }))
      .toBe("Hi Ann Lee, this went to ann@example.org.");
  });

  it("reads friend when there is no name, and drops markdown marks from a name", () => {
    expect(mergeOutboundFields("Hi {{name}},", { email: "x@example.org", name: null })).toBe("Hi friend,");
    expect(mergeOutboundFields("Hi {{name}},", { email: "x@example.org", name: "  " })).toBe("Hi friend,");
    expect(mergeOutboundFields("Hi {{name}},", { email: "x@example.org", name: "**Bo** [x](y)" })).toBe("Hi Bo x(y),");
  });
});
