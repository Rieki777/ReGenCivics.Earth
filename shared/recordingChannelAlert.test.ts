import { describe, expect, it } from "vitest";
import { recordingMailEffect } from "./recordingMailGuard";
import { recordingChannelAlertAllowed, type RecordingLetterOutcome } from "./recordingChannelAlert";

const NOW = new Date("2026-10-08T16:41:00.000Z");
const RECENT = new Date("2026-10-07T16:00:00.000Z");
const OLD = new Date("2024-03-29T15:00:00.000Z");

function effect(overrides: Partial<Parameters<typeof recordingMailEffect>[0]> = {}) {
  return recordingMailEffect({
    title: "Intro: ReGen Civics QUESTS & GAMES",
    sessionDate: RECENT,
    createdAt: RECENT,
    now: NOW,
    batchesThisRun: 0,
    batchesLast24h: 0,
    automatic: true,
    ...overrides,
  });
}

const sent: RecordingLetterOutcome = { held: null, kind: "recording_ready" };

describe("recording channel alert", () => {
  it("allows chat only when the letter guard would send and the letter cleared this call", () => {
    expect(recordingChannelAlertAllowed(effect(), sent)).toBe(true);
    expect(recordingChannelAlertAllowed(effect(), { held: null, kind: "session_notes" })).toBe(true);
  });

  it("blocks old recordings, numeric titles, and the daily cap", () => {
    expect(recordingChannelAlertAllowed(effect({ sessionDate: OLD, createdAt: OLD }), sent)).toBe(false);
    expect(recordingChannelAlertAllowed(effect({ createdAt: OLD }), sent)).toBe(false);
    expect(recordingChannelAlertAllowed(effect({ title: "54" }), sent)).toBe(false);
    expect(recordingChannelAlertAllowed(effect({ title: "Recording ready: 4" }), sent)).toBe(false);
    expect(recordingChannelAlertAllowed(effect({ batchesThisRun: 1 }), sent)).toBe(false);
    expect(recordingChannelAlertAllowed(effect({ batchesLast24h: 2 }), sent)).toBe(false);
  });

  it("does not ping when this call did not clear a letter", () => {
    expect(recordingChannelAlertAllowed(effect(), null)).toBe(false);
    expect(recordingChannelAlertAllowed(effect(), { held: null, kind: "skip" })).toBe(false);
    expect(recordingChannelAlertAllowed(effect(), { held: "skip_old", kind: "recording_ready" })).toBe(false);
    expect(recordingChannelAlertAllowed(effect(), { held: "needs_review", kind: "recording_ready" })).toBe(false);
    expect(recordingChannelAlertAllowed(effect(), { held: "claimed", kind: "recording_ready" })).toBe(false);
  });
});
