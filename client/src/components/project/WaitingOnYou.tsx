/**
 * What is waiting on this project's stewards, in one short list: offers to
 * answer, places to mark delivered, thanks to send, a draft to send for
 * review, and offers sitting on a role that is already filled. Each row
 * jumps to the right tab of the offers panel. The counting lives in
 * shared/stewardQueue.ts.
 */
import { ArrowRight, CheckCircle2, Clock, Gift, PackageCheck, Send, AlertTriangle } from "lucide-react";
import type { OfferTab, StewardQueue } from "@shared/stewardQueue";

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
}: {
  queue: StewardQueue | null;
  loading: boolean;
  onJump: (tab: OfferTab) => void;
  onSendForReview: () => void;
}) {
  return (
    <section id="review" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <Clock className="w-5 h-5 text-[#4a7c59]" />
        Waiting on you
      </h2>
      {loading || !queue ? (
        <p className="text-sm text-[#1a472a]/75">Checking what needs you...</p>
      ) : queue.total === 0 ? (
        <p className="text-sm text-[#1a472a]/80 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4a7c59]" />
          Nothing is waiting on you right now.
        </p>
      ) : (
        <ul className="space-y-2">
          {queue.sendForReview && (
            <Row icon={Send} text="This campaign is a draft. Send it for review when it's ready." onClick={onSendForReview} />
          )}
          {queue.toAnswer.length > 0 && (
            <Row icon={Clock} text={`${plural(queue.toAnswer.length, "offer", "offers")} to answer`} onClick={() => onJump("waiting")} />
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
