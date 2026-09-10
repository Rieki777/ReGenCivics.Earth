import { describe, expect, it } from "vitest";
import {
  claimedOutboundSend,
  guardAssistantSendClaim,
  OUTBOUND_WRITE_ASSISTANT_BLOCK,
  OUTBOUND_WRITE_COMPOSE_EXAMPLE,
  OUTBOUND_WRITE_SEND_REDIRECT,
} from "./lib/adminAIPrompt";

describe("claimedOutboundSend", () => {
  it("catches the false send claims the owner saw", () => {
    expect(claimedOutboundSend("I will send this email to all subscribers immediately.")).toBe(true);
    expect(claimedOutboundSend("I will proceed to send.")).toBe(true);
    expect(claimedOutboundSend("I'll send this now.")).toBe(true);
    expect(claimedOutboundSend("Would you like to send this out?")).toBe(true);
    expect(claimedOutboundSend("Want me to send this to all subscribers?")).toBe(true);
  });

  it("does not treat a refuse as a send claim", () => {
    expect(claimedOutboundSend("I cannot send from this chat.")).toBe(false);
    expect(claimedOutboundSend("Use Preview send on Write, then Confirm.")).toBe(false);
    expect(claimedOutboundSend("I never send. Here is a draft for the composer.")).toBe(false);
  });
});

describe("guardAssistantSendClaim", () => {
  it("appends the Write redirect when the model claims it will send", () => {
    const out = guardAssistantSendClaim(
      "Here is the letter. I will proceed to send this to all subscribers.",
      { onWrite: true },
    );
    expect(out).toContain(OUTBOUND_WRITE_SEND_REDIRECT);
    expect(out).toContain("Here is the letter.");
  });

  it("does not double the redirect", () => {
    const once = guardAssistantSendClaim("I will proceed to send.", { onWrite: true });
    const twice = guardAssistantSendClaim(once, { onWrite: true });
    expect(twice.split(OUTBOUND_WRITE_SEND_REDIRECT)).toHaveLength(2);
  });

  it("guards subscriber send claims even off Write", () => {
    const out = guardAssistantSendClaim(
      "I will send this email to all subscribers immediately.",
      { onWrite: false },
    );
    expect(out).toContain(OUTBOUND_WRITE_SEND_REDIRECT);
  });
});

describe("OUTBOUND_WRITE_ASSISTANT_BLOCK", () => {
  it("tells the FAB to fill Write and never send", () => {
    expect(OUTBOUND_WRITE_ASSISTANT_BLOCK).toContain("You cannot send email");
    expect(OUTBOUND_WRITE_ASSISTANT_BLOCK).toContain("Preview send");
    expect(OUTBOUND_WRITE_ASSISTANT_BLOCK).toContain("Apply to draft");
    expect(OUTBOUND_WRITE_ASSISTANT_BLOCK).toContain("Write with me");
    expect(OUTBOUND_WRITE_ASSISTANT_BLOCK).toContain(OUTBOUND_WRITE_COMPOSE_EXAMPLE);
    expect(OUTBOUND_WRITE_ASSISTANT_BLOCK).toContain('"tab":"outbound"');
    expect(OUTBOUND_WRITE_ASSISTANT_BLOCK).toContain('"surface":"write"');
    expect(OUTBOUND_WRITE_ASSISTANT_BLOCK).not.toContain("\u2014");
  });
});
