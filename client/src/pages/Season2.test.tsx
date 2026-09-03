/**
 * Season Two page: asserts the load-bearing intentions of the 2026-09 remake
 * actually render, so a future edit cannot quietly drop one.
 *
 * The intentions (Rye, 2026-09-02):
 *  - showcase framing, and selection for RANGE across maturity/scale/approach
 *  - the graduation gate sits at the END of the season, >= 9 of 13
 *  - crowdpooling is the second filter, decided by the public
 *  - graduated + pooled projects are the foundation of the index fund
 *  - the network is what makes a single project investable (organ framing)
 *  - 13 weeks, and not every project graduates
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Season2 from "./Season2";

vi.mock("@/components/AnimatedSection", () => ({
  AnimatedSection: ({ children, as: Tag = "div", ...rest }: { children: React.ReactNode; as?: string } & Record<string, unknown>) => {
    const Comp = (Tag || "div") as "div";
    return <Comp {...rest}>{children}</Comp>;
  },
}));

vi.mock("@/components/ReadableScrim", () => ({
  ReadableScrim: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/StickyThumbCta", () => ({ StickyThumbCta: () => null }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));
vi.mock("@/components/Season2Calendar", () => ({ Season2Calendar: () => null }));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const body = () => document.body.textContent ?? "";

describe("Season2 page", () => {
  beforeEach(() => {
    // jsdom has no matchMedia; the page calls it for prefers-reduced-motion.
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T15:00:00.000Z"));
    render(<Season2 />);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("leads with the showcase framing, not a deficit framing", () => {
    expect(
      screen.getByRole("heading", { name: /Thirteen of the strongest plays in the\s+Infinite Game/i }),
    ).toBeTruthy();
    expect(body()).not.toMatch(/can't afford to\s+ignore/i);
  });

  it("renders the four-step season arc", () => {
    for (const step of ["Selected", "Built", "Graduated", "Pooled and funded"]) {
      expect(screen.getByRole("heading", { name: step })).toBeTruthy();
    }
  });

  it("puts the graduation gate at the end of the season, at nine of thirteen", () => {
    expect(body()).toMatch(/at least nine projects to graduate/i);
    expect(body()).toMatch(/we want all thirteen/i);
    // The old per-step gate must not come back.
    expect(body()).not.toMatch(/finalized their models for a given step/i);
  });

  it("states the thirteen weeks and that not every project graduates", () => {
    expect(body()).toMatch(/Thirteen weekly sessions, September 26 through December 19/i);
    expect(screen.getByRole("heading", { name: /Not every project graduates/i })).toBeTruthy();
  });

  it("frames crowdpooling as the second filter decided in public", () => {
    expect(
      screen.getByRole("heading", { name: /The world decides which projects are\s+worth pooling into/i }),
    ).toBeTruthy();
    expect(body()).toMatch(/nine forms of capital/i);
  });

  it("connects the graduated cohort to the index fund", () => {
    expect(screen.getByRole("heading", { name: /The cohort becomes\s+the fund/i })).toBeTruthy();
    expect(body()).toMatch(/index fund for the ReGenerative\s+Renaissance/i);
  });

  it("carries the organ framing and earmarked investment", () => {
    expect(body()).toMatch(/investing in\s+one organ/i);
    expect(body()).toMatch(/earmark investment through the ReGen Civics Fund/i);
  });

  it("selects for range across maturity levels rather than ranking applicants", () => {
    expect(body()).toMatch(/different maturity levels/i);
    // An earlier-stage project is a real candidate, never "behind".
    expect(body()).not.toMatch(/competing from behind/i);
  });

  it("states the Season One selection rate", () => {
    expect(body()).toMatch(/13 projects out of the 46 that applied/i);
  });

  it("closes on the play CTA", () => {
    expect(
      screen.getByRole("heading", { name: /Show us your play in the Infinite Game to\s+regenerate our Earth/i }),
    ).toBeTruthy();
  });

  it("keeps the copy free of em-dashes", () => {
    expect(body()).not.toContain("—");
  });
});
