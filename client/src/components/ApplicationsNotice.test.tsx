/**
 * The applications notice links the Ready to crowdpool list while a Season
 * takes rolling applications (build spec 2026-10-01, sections 16.3 and 16.4).
 *
 * APPLICATIONS is computed once at module load, and INTAKE_WINDOW.override
 * drives `reviewing`, never `rolling`, so a test that leaned on today's date
 * would quietly change meaning after 20 March 2027. The module is mocked with
 * a hoisted flag instead, so one file covers both cases.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const win = vi.hoisted(() => ({ rolling: true, followAlong: false, reviewing: true }));
vi.mock("@shared/applicationWindow", async (orig) => {
  const real = await orig<typeof import("@shared/applicationWindow")>();
  return {
    ...real,
    get APPLICATIONS() {
      return { ...real.APPLICATIONS, ...win };
    },
  };
});

import { ApplicationsNotice } from "./ApplicationsNotice";
import { ACCEPTANCE_LINE, FOLLOW_ALONG_LABEL } from "@shared/applicationWindow";
import { READINESS_HREF } from "@shared/crowdpoolReadiness";

describe("ApplicationsNotice", () => {
  it("while applications roll: what being accepted means, and What ready means to the list", () => {
    Object.assign(win, { rolling: true, followAlong: false, reviewing: true });
    render(<ApplicationsNotice showLink={false} />);
    expect(screen.getByText(ACCEPTANCE_LINE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "What ready means" })).toHaveAttribute("href", READINESS_HREF);
    expect(READINESS_HREF).toBe("/create-campaign#ready");
    // The follow-along link stays for the follow-along months only.
    expect(screen.queryByRole("link", { name: FOLLOW_ALONG_LABEL })).toBeNull();
  });

  it("outside the rolling and follow-along months: no What ready means link", () => {
    Object.assign(win, { rolling: false, followAlong: false, reviewing: false });
    render(<ApplicationsNotice />);
    expect(screen.queryByRole("link", { name: "What ready means" })).toBeNull();
    expect(screen.queryByText(ACCEPTANCE_LINE)).toBeNull();
  });

  it("while a Season is followed along: both links, once each", () => {
    Object.assign(win, { rolling: false, followAlong: true, reviewing: false });
    render(<ApplicationsNotice showLink={false} />);
    expect(screen.getAllByRole("link", { name: "What ready means" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: FOLLOW_ALONG_LABEL })).toBeInTheDocument();
  });
});
