/**
 * HarvestCaptureModal: the global capture surface for the Harvest quick-note
 * inbox (Phase 1). Mounted site-wide so the mobile radial menu's "Add note"
 * item can open it from any page — the admin AI assistant only lives on /admin,
 * so it could never be the target for a global menu action.
 *
 * Why a menu item and a modal instead of a FAB gesture: no gesture survived iOS
 * Safari. Double-tap zoomed the page; long-press selected text / raised the
 * callout. A plain menu row is a plain tap target, which is the one thing that
 * always works. WizardRadialMenu dispatches `open-harvest-capture`; this listens
 * (exactly the SendGratitudeModal / SiteFooter pattern) and opens the composer.
 *
 * The sheet is anchored to the TOP, not the bottom. On iOS Safari the on-screen
 * keyboard does not shrink the layout viewport, so a bottom-anchored sheet
 * (bottom-0) sits BEHIND the keyboard the moment the textarea focuses — which is
 * the "screen overlay doesn't work" bug: only a sliver of the composer peeked
 * above the keyboard. Top-anchoring keeps the whole composer — textarea, mic,
 * Save — above where the keyboard rises.
 *
 * Admin-gated on the client (admin/superadmin). The save path stays owner-only
 * on the server (quickNotes.create is ownerProcedure); HarvestNoteComposer
 * surfaces a non-owner refusal honestly rather than faking a saved note.
 */
import { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HarvestNoteComposer } from "@/components/HarvestNoteComposer";

/** The window event the radial menu (and anything else) dispatches to open capture. */
export const HARVEST_CAPTURE_EVENT = "open-harvest-capture";

export function HarvestCaptureModal() {
  const { user } = useAuth();
  const canCapture = user?.role === "admin" || user?.role === "superadmin";
  const [open, setOpen] = useState(false);

  // Owner-only status probe; doubles as the voice-availability flag. Only fires
  // for admins, and quietly reports notReady for a non-owner admin (whose save
  // the composer will refuse honestly).
  const status = trpc.quickNotes.status.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    enabled: canCapture,
  });

  useEffect(() => {
    if (!canCapture) return;
    const openIt = () => setOpen(true);
    window.addEventListener(HARVEST_CAPTURE_EVENT, openIt);
    return () => window.removeEventListener(HARVEST_CAPTURE_EVENT, openIt);
  }, [canCapture]);

  // Render nothing for everyone else — no capture affordance, no hint it exists.
  if (!canCapture) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="top"
        data-testid="harvest-capture-sheet"
        className="rounded-b-2xl border-[#4a7c59]/30 bg-white p-0 gap-0 max-h-[92vh] overflow-y-auto"
        // Clear the status bar / notch so the header is not tucked under it.
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle className="flex items-center gap-2 text-[#1a472a]">
            <StickyNote className="w-5 h-5 text-[#4a7c59]" />
            Add note
          </SheetTitle>
        </SheetHeader>
        <HarvestNoteComposer voiceEnabled={Boolean(status.data?.voice)} />
      </SheetContent>
    </Sheet>
  );
}

export default HarvestCaptureModal;
