/**
 * What is waiting on this project's stewards, in one short list: offers to
 * answer, places to mark delivered, thanks to send, a draft to send for
 * review (or one the review team sent back for changes, to send again), and
 * offers sitting on a role that is already filled. Each row
 * jumps to the right tab of the offers panel. The counting lives in
 * shared/stewardQueue.ts.
 *
 * Notes from offer links (build spec 2026-09-27, section 10.2): someone who
 * offered without an account can send the stewards a short note from their
 * private link. Their spine notice (contributor_reply) lands on #review, so
 * this list says how many offers still in play carry a note and jumps to
 * them; each note shows on its offer's card.
 *
 * Ready to crowdpool ticks (bundle 1, section 16.3): while the campaign is a
 * draft, in review or sent back, a row says how many of the eight are ticked
 * until all are, and jumps to the status card where the list sits.
 */
import { ArrowRight, CheckCircle2, ClipboardCheck, Clock, Gift, MessageSquare, PackageCheck, Send, AlertTriangle } from "lucide-react";
import type { OfferTab, StewardQueue } from "@shared/stewardQueue";
import { OFFER_NOTES, SEND_BACK } from "@shared/crowdpoolCopy";
import { CROWDPOOL_READINESS } from "@shared/crowdpoolReadiness";

const READY_TOTAL = CROWDPOOL_READINESS.length;

/** The row while some Ready to crowdpool items are still unticked. */
export const readyTickedRow = (n: number) =>
  `${n} of ${READY_TOTAL} Ready to crowdpool items ticked. The review team sees your ticks.`;

export type OfferNotesSummary = { count: number; tab: OfferTab } | null;

/**
 * Offers still in play (waiting or accepted) that carry at least one note
 * from their offer link. Jumps to Waiting when any of them waits, else to
 * Accepted. Null when there are none.
 */
export function offerNotesSummary(
  contributions: Array<{ id: number; status: string }>,
  messages: Record<number, unknown[] | undefined>,
): OfferNotesSummary {
  let count = 0;
  let waiting = false;
  for (const c of contributions) {
    if (c.status !== "pending" && c.status !== "accepted") continue;
    if (!(messages[c.id]?.length)) continue;
    count++;
    if (c.status === "pending") waiting = true;
  }
  return count > 0 ? { count, tab: waiting ? "waiting" : "accepted" } : null;
}

function Row({ icon: Icon, text, onClick, tone = "default" }: {
  icon: typeof Clock;
  text: string;
  onClick: () => void;
  tone?: "default" | "warn";
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 rounded-xl p-3 text-left text-sm transition-colors ${
          tone === "warn" ? "bg-amber-50 hover:bg-amber-100 text-amber-900" : "bg-[#f0f7f0] hover:bg-[#e2efe2] text-[#1a472a]"
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 min-w-0">{text}</span>
        <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-70" />
      </button>
    </li>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function WaitingOnYou({
  queue,
  loading,
  onJump,
  onSendForReview,
  offerNotes = null,
  sentBack = false,
  readyTicked = null,
  onOpenReadiness,
}: {
  queue: StewardQueue | null;
  loading: boolean;
  onJump: (tab: OfferTab) => void;
  onSendForReview: () => void;
  /** Offers in play with a note from their offer link (offerNotesSummary). */
  offerNotes?: OfferNotesSummary;
  /** The review team sent this campaign back for changes (a draft with sentBackAt, or legacy rejected). */
  sentBack?: boolean;
  /** Ready to crowdpool items ticked on this campaign; null when the list is not open or not loaded. */
  readyTicked?: number | null;
  /** Scrolls to the status card, where the list sits. */
  onOpenReadiness?: () => void;
}) {
  const showReady = typeof readyTicked === "number" && readyTicked < READY_TOTAL;
  return (
    <section id="review" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <Clock className="w-5 h-5 text-[#4a7c59]" />
        Waiting on you
      </h2>
      {loading || !queue ? (
        <p className="text-sm text-[#1a472a]/75">Checking what needs you...</p>
      ) : queue.total === 0 && !offerNotes && !showReady ? (
        <p className="text-sm text-[#1a472a]/80 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4a7c59]" />
          Nothing is waiting on you right now.
        </p>
      ) : (
        <ul className="space-y-2">
          {queue.sendForReview && (
            <Row
              icon={Send}
              text={sentBack ? SEND_BACK.waitingRow : "This campaign is a draft. Send it for review when it's ready."}
              onClick={onSendForReview}
            />
          )}
          {showReady && (
            <Row
              icon={ClipboardCheck}
              text={readyTickedRow(readyTicked as number)}
              onClick={() => (onOpenReadiness ? onOpenReadiness() : document.getElementById("campaign-status")?.scrollIntoView({ behavior: "smooth", block: "start" }))}
            />
          )}
          {queue.toAnswer.length > 0 && (
            <Row icon={Clock} text={`${plural(queue.toAnswer.length, "offer", "offers")} to answer`} onClick={() => onJump("waiting")} />
          )}
          {offerNotes && (
            <Row icon={MessageSquare} text={OFFER_NOTES.row(offerNotes.count)} onClick={() => onJump(offerNotes.tab)} />
          )}
          {queue.pendingOnFilledRoles.length > 0 && (
            <Row
              icon={AlertTriangle}
              tone="warn"
              text={queue.pendingOnFilledRoles.length === 1
                ? "1 offer is waiting on a filled role. Decline it with a kind note, or raise the hours."
                : `${queue.pendingOnFilledRoles.length} offers are waiting on a filled role. Decline them with a kind note, or raise the hours.`}
              onClick={() => onJump("waiting")}
            />
          )}
          {queue.toDeliver.length > 0 && (
            <Row icon={PackageCheck} text={`${plural(queue.toDeliver.length, "accepted place", "accepted places")} to mark delivered once they land`} onClick={() => onJump("accepted")} />
          )}
          {queue.toThank.length > 0 && (
            <Row icon={Gift} text={`${plural(queue.toThank.length, "delivery", "deliveries")} waiting for a thank-you`} onClick={() => onJump("delivered")} />
          )}
        </ul>
      )}
    </section>
  );
}
