/**
 * The composer opened by the FAB gesture: Save must call the Phase 1 create
 * path, an offline capture must queue and flush, and a server refusal must NOT
 * be dressed up as a pending sync.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TRPCClientError } from "@trpc/client";
import { HarvestNoteComposer } from "./HarvestNoteComposer";

const createMutateAsync = vi.fn();
const transcribeMutateAsync = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    quickNotes: {
      create: { useMutation: () => ({ mutateAsync: createMutateAsync, isPending: false }) },
      transcribeVoice: { useMutation: () => ({ mutateAsync: transcribeMutateAsync, isPending: false }) },
    },
  },
}));

const QUEUE_KEY = "harvest-offline-notes";

function refusal(code: string, message: string) {
  const err = new TRPCClientError(message);
  // TRPCClientError.data is what the client inspects to tell a refusal from a
  // network failure.
  Object.defineProperty(err, "data", { value: { code }, writable: true });
  return err;
}

async function typeAndSave(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox"), text);
  await user.click(screen.getByTestId("harvest-save"));
  return user;
}

describe("HarvestNoteComposer", () => {
  beforeEach(() => {
    // localStorage is a working in-memory Storage, cleared per test, from
    // client/src/test-setup.ts.
    createMutateAsync.mockReset();
    transcribeMutateAsync.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it("shows a text box, a mic button and a visible Save button", () => {
    render(<HarvestNoteComposer voiceEnabled />);

    expect(screen.getByRole("textbox")).toBeDefined();
    expect(screen.getByLabelText("Record a voice note")).toBeDefined();
    const save = screen.getByTestId("harvest-save");
    expect(save).toBeDefined();
    expect(save.textContent).toContain("Save note");
  });

  it("Save calls the Phase 1 create path, confirms, and clears the box", async () => {
    createMutateAsync.mockResolvedValue({ captureId: "c1" });
    render(<HarvestNoteComposer voiceEnabled />);

    await typeAndSave("compost the roof");

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({ body: "compost the roof" });
    });
    expect(screen.getByTestId("harvest-saved-flash").textContent).toContain("Saved to your brain");
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });

  it("queues an offline capture and flushes it when service returns", async () => {
    createMutateAsync.mockRejectedValueOnce(new Error("Failed to fetch"));
    render(<HarvestNoteComposer voiceEnabled />);

    await typeAndSave("idea while off-grid");

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]")).toHaveLength(1);
    });
    expect(screen.getByText(/waiting to sync/i)).toBeDefined();

    // Service returns: the outbox flushes on the browser's online event.
    createMutateAsync.mockResolvedValue({ captureId: "c2" });
    window.dispatchEvent(new Event("online"));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({ body: "idea while off-grid" });
      expect(JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]")).toHaveLength(0);
    });
  });

  it("does not queue a note the server refused, and gives the text back", async () => {
    createMutateAsync.mockRejectedValue(refusal("FORBIDDEN", "Owner access required"));
    render(<HarvestNoteComposer voiceEnabled />);

    await typeAndSave("note from another admin");

    await waitFor(() => {
      expect(screen.getByTestId("harvest-save-error").textContent).toContain("Owner access required");
    });
    // The lie we are guarding against: "waiting to sync" over a note that never can.
    expect(localStorage.getItem(QUEUE_KEY)).toBeNull();
    expect(screen.queryByText(/waiting to sync/i)).toBeNull();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("note from another admin");
  });

  it("hides the mic when voice is not available", () => {
    render(<HarvestNoteComposer voiceEnabled={false} />);
    expect(screen.queryByLabelText("Record a voice note")).toBeNull();
    expect(screen.getByTestId("harvest-save")).toBeDefined();
  });
});
