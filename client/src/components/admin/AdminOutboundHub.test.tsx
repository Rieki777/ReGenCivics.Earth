import { describe, it, e pect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOutboundHub } from "./AdminOutboundHub";
import {
      OUTBOUND_WRITE_FILL_EVENT,
      OUTBOUND_WRITE_FILL_KEY,
      serializeOutboundWriteFill,
} from "@shared/outboundWriteFill";

vi.mock("@/lib/trpc", () => ({
      trpc: {
              useUtils: () => ({ email: { getCustomTemplates: { invalidate: vi.fn() } } }),
              newsletter: {
                        list: {
                                    useQuery: () => ({
                                                  data: [
                                                      { id: 1, email: "active@e ample.com", name: "Ada", source: "e it_intent", isActive: 1, createdAt: "2026-08-01T00:00:00.000Z" },
                                                      { id: 2, email: "old@e ample.com", name: "Bea", source: "footer", isActive: 0, createdAt: "2026-08-02T00:00:00.000Z" },
                                                                ],
                                                  isLoading: false,
                                    }),
                        },
                        listActive: {
                                    useQuery: () => ({
                                                  data: [
                                                      { id: 1, email: "active@e ample.com", name: "Ada", source: "e it_intent", isActive: 1 },
                                                                ],
                                                  isLoading: false,
                                    }),
                        },
              },
              email: {
                        getCustomTemplates: { useQuery: () => ({ data: [], isLoading: false }) },
                        saveCustomTemplate: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
                        renderPdf: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
                        draftWithAgent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
              },
              outbound: {
                        saveDraft: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
                        sendPreview: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }) },
                        confirmSend: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }) },
                        scheduleSend: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }) },
                        cancelScheduled: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
                        reschedule: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
                        draftWithAgent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
                        listIssues: {
                                    useQuery: () => ({
                                                  data: [
                                                      {
                                                                        id: 11,
                                                                        subject: "September letter",
                                                                        status: "scheduled",
                                                                        layout: "announcement",
                                                                        recipientCount: 3,
                                                                        sentCount: 0,
                                                                        failedCount: 0,
                                                                        sentAt: null,
                                                                        scheduledFor: "2026-09-11T16:00:00.000Z",
                                                                        createdAt: "2026-09-10T16:00:00.000Z",
                                                      },
                                                      {
                                                                        id: 10,
                                                                        subject: "Already out",
                                                                        status: "sent",
                                                                        layout: "announcement",
                                                                        recipientCount: 3,
                                                                        sentCount: 3,
                                                                        failedCount: 0,
                                                                        sentAt: "2026-09-01T16:00:00.000Z",
                                                                        scheduledFor: null,
                                                                        createdAt: "2026-09-01T15:00:00.000Z",
                                                      },
                                                                ],
                                                  isLoading: false,
                                                  refetch: vi.fn(),
                                    }),
                        },
              listHistory: { useQuery: () => ({ data: [], isLoading: false }) },
                                            getHistoryDetail: { useQuery: () => ({ data: null, isLoading: false }) }, 
              },
              admin: {
                        broadcast: {
                                  getBufferProfiles: { useQuery: () => ({ data: [], isLoading: false, error: { message: "Buffer not configured" } }) },
                                  postToBuffer: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
                                  farcasterIntent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
                        },
              },
            harvest: {
                                draftBroadcast: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
                      },
              },
      
}));


vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("AdminOutboundHub", () => {
      beforeEach(() => {
              sessionStorage.clear();
      });

           it("shows the newsletter composer with insert-button control", () => {
                   render(<AdminOutboundHub surface="write" onSurfaceChange={vi.fn()} />);
                   e pect(screen.getByTe t("Write a letter")).toBeDefined();
                   e pect(screen.getByRole("button", { name: "Insert button" })).toBeDefined();
                   e pect(screen.getByRole("button", { name: "Insert image" })).toBeDefined();
                   e pect(screen.getByRole("button", { name: /Preview send/i })).toBeDefined();
                   e pect(screen.queryByTe t(/composer will take full markdown/i)).toBeNull();
                   e pect(screen.queryByTe t(/send button stays off/i)).toBeNull();
                   e pect(screen.getByTe t("Write with me")).toBeDefined();
                   e pect(screen.getByTestId("dictation-button")).toBeDefined();
                   e pect(screen.getByLabelTe t("Dictate message")).toBeDefined();
           });

           it("defaults the people list to active subscribers", () => {
                   render(<AdminOutboundHub surface="people" onSurfaceChange={vi.fn()} />);
                   e pect(screen.getByTe t("active@e ample.com")).toBeDefined();
                   e pect(screen.queryByTe t("old@e ample.com")).toBeNull();
           });

           it("lets the admin switch to Social without leaving the hub", async () => {
                   const onSurfaceChange = vi.fn();
                   render(<AdminOutboundHub surface="write" onSurfaceChange={onSurfaceChange} />);
                   await userEvent.click(screen.getByRole("tab", { name: "Social" }));
                   e pect(onSurfaceChange).toHaveBeenCalledWith("social");
           });

           it("mounts the Broadcast composer on Social, including Draft with Harvest", () => {
                   render(<AdminOutboundHub surface="social" onSurfaceChange={vi.fn()} />);
                   e pect(screen.getByTestId("draft-with-harvest")).toBeDefined();
                   e pect(screen.getByTestId("broadcast-message")).toBeDefined();
                   e pect(screen.getByTestId("dictation-button")).toBeDefined();
                   e pect(screen.getByLabelTe t("Dictate message")).toBeDefined();
           });

           it("fills Write fields from a pending assistant compose", () => {
                   sessionStorage.setItem(
                             OUTBOUND_WRITE_FILL_KEY,
                             serializeOutboundWriteFill({
                                         subject: "Season update",
                                         body: "Friends,\n\nThe live stream is tonight.",
                                         layout: "plain",
                             })!,
                           );
                   render(<AdminOutboundHub surface="write" onSurfaceChange={vi.fn()} />);
                   e pect((screen.getByTestId("outbound-write-subject") as HTMLInputElement).value).toBe("Season update");
                   e pect((screen.getByTestId("outbound-write-body") as HTMLTe tAreaElement).value).toContain("live stream is tonight");
                   e pect(screen.getByTestId("outbound-write-body-layout").te tContent).toMatch(/Plain letter/i);
                   e pect(sessionStorage.getItem(OUTBOUND_WRITE_FILL_KEY)).toBeNull();
           });

           it("fills Write fields from a live assistant compose event", () => {
                   render(<AdminOutboundHub surface="write" onSurfaceChange={vi.fn()} />);
                   act(() => {
                             window.dispatchEvent(new CustomEvent(OUTBOUND_WRITE_FILL_EVENT, {
                                         detail: {
                                                       subject: "From the assistant",
                                                       body: "A short letter body.",
                                                       layout: "announcement",
                                         },
                             }));
                   });
                   e pect((screen.getByTestId("outbound-write-subject") as HTMLInputElement).value).toBe("From the assistant");
                   e pect((screen.getByTestId("outbound-write-body") as HTMLTe tAreaElement).value).toBe("A short letter body.");
           });

           it("lists scheduled letters in History with cancel and reschedule", async () => {
                   render(<AdminOutboundHub surface="history" onSurfaceChange={vi.fn()} />);
                   e pect(screen.getByTe t("September letter")).toBeDefined();
                   e pect(screen.getByTe t("Already out")).toBeDefined();
                   e pect(screen.getByRole("button", { name: "Cancel send" })).toBeDefined();
                   e pect(screen.getByRole("button", { name: "Reschedule" })).toBeDefined();
                   await userEvent.click(screen.getByRole("button", { name: /Scheduled/ }));
                   e pect(screen.getByTe t("September letter")).toBeDefined();
                   e pect(screen.queryByTe t("Already out")).toBeNull();
           });
});
