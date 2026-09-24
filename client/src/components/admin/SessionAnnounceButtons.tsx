/**
 * Admin deep-links to announce a session on Hylo / Holos.
 * Opens destination tabs + copies suggested paste text — no API keys.
 */
import { useMemo, useCallback } from "react";
import { toast } from "sonner";
import { ClipboardList, ExternalLink, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildSessionAnnounce } from "@shared/sessionAnnounce";

export type SessionAnnounceButtonsProps = {
  title?: string | null;
  eventId?: number | null;
  startTime?: string | Date | null;
  timeZone?: string | null;
  publicUrl?: string | null;
  className?: string;
};

export function SessionAnnounceButtons({
  title,
  eventId,
  startTime,
  timeZone,
  publicUrl,
  className,
}: SessionAnnounceButtonsProps) {
  const announce = useMemo(
    () =>
      buildSessionAnnounce({
        title,
        eventId,
        startTime,
        timeZone,
        publicUrl,
      }),
    [title, eventId, startTime, timeZone, publicUrl],
  );

  const copyAnnounce = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(announce.body);
      toast.success("Announce text copied — paste into Hylo or Holos");
    } catch {
      toast.error("Could not copy announce text");
    }
  }, [announce.body]);

  return (
    <div
      className={
        className ??
        "flex flex-wrap items-center gap-2 rounded-lg border border-[#7dd87d]/20 bg-[#7dd87d]/[0.06] px-2.5 py-2"
      }
      data-testid="session-announce-buttons"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9de89d]/90 mr-0.5">
        Community announce
      </span>
      <Button
        type="button"
        size="sm"
        asChild
        className="h-7 px-2.5 text-[11px] bg-[#7dd87d]/20 text-[#9de89d] hover:bg-[#7dd87d]/30 hover:text-white border border-[#7dd87d]/35"
        data-testid="session-announce-hylo"
      >
        <a href={announce.hyloUrl} target="_blank" rel="noopener noreferrer">
          <Megaphone className="w-3 h-3 mr-1" />
          Announce on Hylo
          <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-70" />
        </a>
      </Button>
      <Button
        type="button"
        size="sm"
        asChild
        className="h-7 px-2.5 text-[11px] bg-[#7dd87d]/20 text-[#9de89d] hover:bg-[#7dd87d]/30 hover:text-white border border-[#7dd87d]/35"
        data-testid="session-announce-holos"
      >
        <a href={announce.holosUrl} target="_blank" rel="noopener noreferrer">
          <Megaphone className="w-3 h-3 mr-1" />
          Announce on Holos
          <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-70" />
        </a>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => void copyAnnounce()}
        className="h-7 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/10"
        data-testid="session-announce-copy"
      >
        <ClipboardList className="w-3 h-3 mr-1" />
        Copy announce text
      </Button>
    </div>
  );
}

export default SessionAnnounceButtons;
