import { describe, expect, it } from "vitest";
import {
  attachDraftToLastUserMessage,
  buildDraftAgentSystemPrompt,
  parseDraftAgentOutput,
  stripEmailPii,
} from "./lib/emailDraftAgent";

describe("stripEmailPii", () => {
  it("replaces emails and leaves merge tokens", () => {
    const out = stripEmailPii("Write to zgeist@gmail.com and keep {{email}}");
    expect(out).not.toMatch(/zgeist@gmail\.com/);
    expect(out).toContain("{{email}}");
  });

  it("replaces phone numbers and keeps short dates", () => {
    const out = stripEmailPii("Call 415-555-2671 on 2026-09-02");
    expect(out).toContain("[phone]");
    expect(out).toContain("2026-09-02");
  });
});

describe("parseDraftAgentOutput", () => {
  it("strips em-dashes from subject and body", () => {
    const out = parseDraftAgentOutput(
      JSON.stringify({
        reply: "Warmed it up.",
        subject: "Hello \u2014 friend",
        body: "Hi {{name}}\u2013welcome.",
      }),
    );
    expect(out.subject).toBe("Hello - friend");
    expect(out.body).toBe("Hi {{name}}-welcome.");
    expect(out.reply).toBe("Warmed it up.");
  });

  it("returns empty strings on invalid JSON", () => {
    const out = parseDraftAgentOutput("not json");
    expect(out).toEqual({ reply: "", subject: "", body: "" });
  });
});

describe("buildDraftAgentSystemPrompt", () => {
  it("includes count and status, never a raw email", () => {
    const prompt = buildDraftAgentSystemPrompt({
      statusLabel: "Approved (zgeist@gmail.com)",
      recipientCount: 8,
    });
    expect(prompt).toContain("Recipient count: 8");
    expect(prompt).toContain("{{email}}");
    expect(prompt).not.toMatch(/zgeist@gmail\.com/);
    expect(prompt).not.toContain("\u2014");
  });
});

describe("attachDraftToLastUserMessage", () => {
  it("appends the draft to the last user turn", () => {
    const out = attachDraftToLastUserMessage(
      [{ role: "user", content: "Make it shorter." }],
      "Hello",
      "Hi {{name}}",
    );
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain("Make it shorter.");
    expect(out[0].content).toContain("<draft>");
    expect(out[0].content).toContain("Hi {{name}}");
  });

  it("appends a draft turn when the last message is from the assistant", () => {
    const out = attachDraftToLastUserMessage(
      [
        { role: "user", content: "Warm it up." },
        { role: "assistant", content: "Done." },
      ],
      "Hello",
      "Hi",
    );
    expect(out).toHaveLength(3);
    expect(out[2].role).toBe("user");
    expect(out[2].content).toContain("<draft>");
  });
});
