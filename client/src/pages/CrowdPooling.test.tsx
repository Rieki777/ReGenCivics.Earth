/**
 * /crowd-pooling is a contributor's page (build spec 2026-10-01, sections
 * 16.1, 16.2 and 16.4): how helping a land project works, no Ready to
 * crowdpool list, and old #ready links forwarded to the creator front door.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

const nav = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("wouter", async (orig) => ({
  ...(await orig<typeof import("wouter")>()),
  useLocation: () => ["/crowd-pooling", nav.navigate],
}));
vi.mock("@/components/SEO", () => ({ SEO: () => null, default: () => null, pageSEO: { crowdPooling: {} } }));
vi.mock("@/components/BackButton", () => ({ BackButton: () => null }));
vi.mock("@/components/character/ProfileCharacter", () => ({ default: () => <div data-testid="character" /> }));
vi.mock("@/components/CrowdPoolingTool", () => ({
  default: ({ aboveRecord, belowForm }: { aboveRecord: (ctx: unknown) => ReactNode; belowForm: ReactNode }) => (
    <div data-testid="gift-tool">
      {aboveRecord({ path: "general", setPath() {}, snap: { brings: 0, gifts: 0, roles: 0 } })}
      {belowForm}
    </div>
  ),
}));

import CrowdPooling from "./CrowdPooling";
import { CROWDPOOLING_WORDING, HOW_IT_WORKS } from "@shared/crowdpoolCopy";
import { GAME_NEEDS_LABEL, READINESS_HREF } from "@shared/crowdpoolReadiness";

describe("/crowd-pooling", () => {
  beforeEach(() => {
    nav.navigate.mockClear();
    window.history.replaceState(null, "", "/crowd-pooling");
  });
  afterEach(() => {
    // Unmount first: wouter's links listen to history, and a change while they are mounted updates outside act.
    cleanup();
    window.history.replaceState(null, "", "/");
  });

  it("an old #ready link renders nothing of the gift map and forwards to the front door, replacing the entry", () => {
    window.location.hash = "#ready";
    const { container } = render(<CrowdPooling />);
    expect(container.innerHTML).toBe("");
    expect(screen.queryByTestId("gift-tool")).toBeNull();
    expect(nav.navigate).toHaveBeenCalledWith(READINESS_HREF, { replace: true });
    expect(READINESS_HREF).toBe("/create-campaign#ready");
  });

  it("without the hash: how helping a land project works, in four steps, with the path to open needs", () => {
    render(<CrowdPooling />);
    expect(nav.navigate).not.toHaveBeenCalled();
    const block = screen.getByRole("region", { name: "How helping a land project works" });
    const steps = within(block).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps).toHaveLength(HOW_IT_WORKS.length);
    expect(steps[3]).toHaveTextContent("If it doesn't complete");
    expect(within(block).getByRole("link", { name: "See what's needed" })).toHaveAttribute("href", "/campaigns?tab=needs");
    expect(within(block).getByRole("link", { name: "Browse campaigns" })).toHaveAttribute("href", "/campaigns");
    expect(within(block).getByText(CROWDPOOLING_WORDING)).toBeInTheDocument();
    expect(block).toHaveTextContent(GAME_NEEDS_LABEL);
    expect(block).toHaveTextContent("Housing");
  });

  it("carries the project line to the front door and no Ready to crowdpool list", () => {
    const { container } = render(<CrowdPooling />);
    expect(screen.getByRole("link", { name: "See what it shows before its campaign opens." })).toHaveAttribute("href", READINESS_HREF);
    expect(screen.getByText(/Bringing a land project\?/)).toBeInTheDocument();
    expect(container.querySelector("#ready")).toBeNull();
    expect(container.textContent).not.toContain("Ready to crowdpool");
  });

  it("uses our words: no em-dash", () => {
    const { container } = render(<CrowdPooling />);
    expect(container.textContent ?? "").not.toContain(String.fromCharCode(0x2014));
  });
});
