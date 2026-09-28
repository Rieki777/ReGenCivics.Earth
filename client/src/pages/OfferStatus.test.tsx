import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const viewMock = vi.fn();
const withdrawMock = vi.fn();
const replyMock = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    offerStatus: {
      view: { useMutation: () => ({ mutateAsync: viewMock, isPending: false }) },
      withdraw: { useMutation: () => ({ mutateAsync: withdrawMock, isPending: false }) },
      reply: { useMutation: () => ({ mutateAsync: replyMock, isPending: false }) },
    },
  },
}));
vi.mock("wouter", async (orig) => ({
  ...(await orig<typeof import("wouter")>()),
  Link: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/components/AuthDialog", () => ({
  AuthDialog: ({ open, returnTo }: { open: boolean; returnTo?: string }) =>
    open ? <div data-testid="auth-dialog" data-return-to={returnTo} /> : null,
}));

import OfferStatus from "./OfferStatus";
import { __resetOfferTokenForTests, captureOfferTokenFromLocation, readOfferToken } from "@/lib/offerStatusToken";
import { ARRIVAL, LINK, OFFER_STEPS } from "@shared/crowdpoolCopy";

// 43 base64url characters, the shape of a real token.
const TOKEN = `Abc_def-${"1234567890".repeat(3)}ABCDE`;

function view(over: Record<string, unknown> = {}) {
  return {
    projectName: "Hill Farm",
    campaignTitle: "Spring Build",
    projectPath: "/project/12-hill-farm?campaign=3",
    offerTitle: "A trailer",
    needTitle: "Trailer",
    verb: "Offer",
    status: "pending",
    steps: [
      { key: "sent", label: "Sent", state: "done" },
      { key: "reviewing", label: "Stewards reviewing", state: "current" },
      { key: "accepted", label: "Accepted", state: "todo" },
      { key: "underway", label: "Underway", state: "todo" },
      { key: "delivered", label: "Delivered", state: "todo" },
      { key: "thanked", label: "Thanked", state: "todo" },
    ],
    ending: null,
    stepLine: OFFER_STEPS.stepLine.pending,
    acceptedHours: null,
    lend: null,
    stewardNote: null,
    arrivalNote: null,
    otherNeeds: [],
    canWithdraw: true,
    canReply: true,
    linkedToAccount: false,
    campaignState: "open",
    expiresAt: "2027-03-26T12:00:00.000Z",
    ...over,
  };
}

function openAt(hash: string) {
  window.history.replaceState(null, "", `/offer${hash}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetOfferTokenForTests();
  window.sessionStorage.clear();
});
afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("the token", () => {
  it("is read from the fragment, kept for this tab, and taken out of the address before the first call", async () => {
    openAt(`#${TOKEN}`);
    viewMock.mockImplementation(async () => {
      // By the time the server is asked, the address no longer holds it.
      expect(window.location.hash).toBe("");
      return view();
    });
    render(<OfferStatus />);
    await screen.findByRole("heading", { name: LINK.title("Hill Farm") });
    expect(viewMock).toHaveBeenCalledWith({ token: TOKEN });
    expect(window.location.pathname).toBe("/offer");
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain(TOKEN);
    expect(window.sessionStorage.getItem("regen-offer-status-token")).toBe(TOKEN);
  });

  it("survives a reload in the same tab from sessionStorage", async () => {
    window.sessionStorage.setItem("regen-offer-status-token", TOKEN);
    openAt("");
    viewMock.mockResolvedValue(view());
    render(<OfferStatus />);
    await screen.findByRole("heading", { name: LINK.title("Hill Farm") });
    expect(viewMock).toHaveBeenCalledWith({ token: TOKEN });
  });

  it("takes a second link opened in the same tab out of the address and shows that offer", async () => {
    openAt(`#${TOKEN}`);
    viewMock.mockResolvedValueOnce(view()).mockResolvedValueOnce(view({ offerTitle: "A cement mixer" }));
    render(<OfferStatus />);
    await screen.findByText(LINK.forCampaign("A trailer", "Spring Build"));
    const other = `Zyx-cba_${"0987654321".repeat(3)}EDCBA`;
    act(() => {
      // A same-document fragment change: no reload, so only the page can catch it.
      window.history.replaceState(null, "", `/offer#${other}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await screen.findByText(LINK.forCampaign("A cement mixer", "Spring Build"));
    expect(viewMock).toHaveBeenLastCalledWith({ token: other });
    expect(window.location.hash).toBe("");
  });

  it("App's early capture clears any fragment on /offer, and drops one too long to be a token", () => {
    openAt(`#${"x".repeat(150)}`);
    expect(captureOfferTokenFromLocation()).toBe(false);
    expect(window.location.hash).toBe("");
    expect(readOfferToken()).toBeNull();
    window.history.replaceState(null, "", `/project/1#${TOKEN}`);
    expect(captureOfferTokenFromLocation()).toBe(false);
    expect(window.location.hash).toBe(`#${TOKEN}`);
  });
});

describe("the page", () => {
  it("shows the steps as an ordered list with the current step marked, and the step line", async () => {
    openAt(`#${TOKEN}`);
    viewMock.mockResolvedValue(view());
    render(<OfferStatus />);
    await screen.findByText(LINK.forCampaign("A trailer", "Spring Build"));
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items[0].textContent).toContain("Sent");
    expect(items[0].textContent).toContain(LINK.stepDone);
    expect(items[1].getAttribute("aria-current")).toBe("step");
    expect(items[1].textContent).toContain(LINK.stepNow);
    expect(items[2].getAttribute("aria-current")).toBeNull();
    expect(screen.getByTestId("offer-step-line").textContent).toBe(OFFER_STEPS.stepLine.pending);
    expect(screen.getByRole("link", { name: LINK.seeProject }).getAttribute("href")).toBe("/project/12-hill-farm?campaign=3");
    expect(screen.getByText(LINK.expiresOn("26 March 2027"))).toBeDefined();
    // No share button on a private page.
    expect(screen.queryByRole("button", { name: /share/i })).toBeNull();
  });

  it("shows the stewards' note, the arrival note and other needs when there are some", async () => {
    openAt(`#${TOKEN}`);
    viewMock.mockResolvedValue(view({
      status: "accepted",
      stepLine: OFFER_STEPS.stepLine.accepted,
      canWithdraw: false,
      stewardNote: "See you Friday",
      arrivalNote: { whereToGo: "Gate 3", whatToBring: "Gloves &amp; boots", askFor: null, meals: null, beds: null, gettingThere: null },
      otherNeeds: [{ title: "Seed garlic", projectName: "Pachamama", verb: "Offer", path: "/project/9-pachamama#need-4" }],
    }));
    render(<OfferStatus />);
    await screen.findByText("See you Friday");
    expect(screen.getByRole("heading", { name: LINK.stewardNote })).toBeDefined();
    expect(screen.getByRole("heading", { name: ARRIVAL.viewHeading })).toBeDefined();
    expect(screen.getByText("Gate 3")).toBeDefined();
    expect(screen.getByText("Gloves & boots")).toBeDefined();
    expect(screen.queryByText(ARRIVAL.viewLabels.meals)).toBeNull();
    expect(screen.getByRole("link", { name: "Offer Seed garlic at Pachamama" }).getAttribute("href")).toBe("/project/9-pachamama#need-4");
    expect(screen.queryByRole("button", { name: LINK.withdraw })).toBeNull();
  });

  it("withdraws through the dialog, says so in a polite live region, and reloads", async () => {
    openAt(`#${TOKEN}`);
    viewMock.mockResolvedValueOnce(view()).mockResolvedValueOnce(view({
      status: "withdrawn", canWithdraw: false, canReply: false, stepLine: OFFER_STEPS.endings.withdrawn,
      ending: { key: "withdrawn", text: OFFER_STEPS.endings.withdrawn },
    }));
    withdrawMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<OfferStatus />);
    await user.click(await screen.findByRole("button", { name: LINK.withdraw }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(LINK.withdrawTitle)).toBeDefined();
    expect(within(dialog).getByText(LINK.withdrawBody)).toBeDefined();
    expect(within(dialog).getByRole("button", { name: LINK.withdrawKeep })).toBeDefined();
    await user.click(within(dialog).getByRole("button", { name: LINK.withdrawConfirm }));
    expect(withdrawMock).toHaveBeenCalledWith({ token: TOKEN });
    await waitFor(() => expect(viewMock).toHaveBeenCalledTimes(2));
    const live = screen.getAllByRole("status").find((el) => el.getAttribute("aria-live") === "polite" && el.textContent === LINK.withdrawn);
    expect(live).toBeDefined();
    await screen.findByText(OFFER_STEPS.endings.withdrawn);
    expect(screen.queryByRole("button", { name: LINK.withdraw })).toBeNull();
  });

  it("sends a note, refuses an empty one, and shows the daily limit under the field", async () => {
    openAt(`#${TOKEN}`);
    viewMock.mockResolvedValue(view());
    const user = userEvent.setup();
    render(<OfferStatus />);
    const field = await screen.findByLabelText(LINK.replyLabel);
    expect(screen.getByText(LINK.replyHelp)).toBeDefined();

    await user.click(screen.getByRole("button", { name: LINK.replySend }));
    expect(replyMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe(LINK.replyEmpty);

    replyMock.mockResolvedValueOnce({ ok: true });
    await user.type(field, "Can I bring it Friday?");
    await user.click(screen.getByRole("button", { name: LINK.replySend }));
    expect(replyMock).toHaveBeenCalledWith({ token: TOKEN, message: "Can I bring it Friday?" });
    await screen.findByText(LINK.replySent);
    expect((field as HTMLTextAreaElement).value).toBe("");

    replyMock.mockRejectedValueOnce({ message: LINK.replyLimit, data: { code: "TOO_MANY_REQUESTS" } });
    await user.type(field, "One more");
    await user.click(screen.getByRole("button", { name: LINK.replySend }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(LINK.replyLimit);
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });

  it("is read-only once the offer is on an account, and points to sign-in", async () => {
    openAt(`#${TOKEN}`);
    viewMock.mockResolvedValue(view({ linkedToAccount: true, canWithdraw: false, canReply: false }));
    const user = userEvent.setup();
    render(<OfferStatus />);
    expect(await screen.findByText(LINK.linked)).toBeDefined();
    expect(screen.queryByRole("button", { name: LINK.withdraw })).toBeNull();
    expect(screen.queryByLabelText(LINK.replyLabel)).toBeNull();
    expect(screen.queryByText(LINK.makeAccountLead)).toBeNull();
    await user.click(screen.getByRole("button", { name: LINK.signIn }));
    expect(screen.getByTestId("auth-dialog").getAttribute("data-return-to")).toBe("/project/12-hill-farm?campaign=3#your-contributions");
  });

  it("offers an account when not linked", async () => {
    openAt(`#${TOKEN}`);
    viewMock.mockResolvedValue(view());
    render(<OfferStatus />);
    expect(await screen.findByText(LINK.makeAccountLead)).toBeDefined();
    expect(screen.getByRole("button", { name: LINK.makeAccount })).toBeDefined();
  });
});

describe("a bad or expired link", () => {
  it("shows the expired message when the server does not know the token, and forgets it", async () => {
    openAt(`#${TOKEN}`);
    viewMock.mockRejectedValue({ message: LINK.bad, data: { code: "NOT_FOUND" } });
    render(<OfferStatus />);
    expect(await screen.findByRole("heading", { name: LINK.badTitle })).toBeDefined();
    expect(screen.getByText(LINK.badBody)).toBeDefined();
    expect(window.sessionStorage.getItem("regen-offer-status-token")).toBeNull();
  });

  it("shows it straight away, without asking, for something that is not a token", async () => {
    openAt("#nonsense");
    render(<OfferStatus />);
    expect(await screen.findByRole("heading", { name: LINK.badTitle })).toBeDefined();
    expect(viewMock).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("with no token at all", async () => {
    openAt("");
    render(<OfferStatus />);
    expect(await screen.findByTestId("offer-bad-link")).toBeDefined();
    expect(viewMock).not.toHaveBeenCalled();
  });
});
