/**
 * What a Resend webhook event should do to one email_logs row.
 * Matching is by Resend id only. A missing id does not pick another letter
 * to the same address.
 */

export type ProviderMailStatus = "delivered" | "bounced" | "failed" | "complained";

export type ProviderEventAction =
  | { kind: "status"; status: ProviderMailStatus; reason?: string }
  | { kind: "open" }
  | { kind: "click" }
  | { kind: "note" }
  | { kind: "ignore" };

type EventData = {
  email_id?: string;
  bounce?: { message?: string };
  complaint?: { feedback_type?: string };
  reason?: string;
};

export function providerEventAction(type: string, data: EventData | undefined): ProviderEventAction {
  const reason = data?.reason?.slice(0, 500);
  switch (type) {
    case "email.delivered":
      return { kind: "status", status: "delivered" };
    case "email.bounced":
      return { kind: "status", status: "bounced", reason: data?.bounce?.message || reason || "Unknown bounce reason" };
    case "email.complained":
      return { kind: "status", status: "complained", reason: data?.complaint?.feedback_type || "spam" };
    case "email.failed":
      return { kind: "status", status: "failed", reason: reason || "Provider failed" };
    case "email.suppressed":
      return { kind: "status", status: "failed", reason: reason ? `Suppressed: ${reason}` : "Suppressed" };
    case "email.opened":
      return { kind: "open" };
    case "email.clicked":
      return { kind: "click" };
    case "email.delivery_delayed":
      return { kind: "note" };
    default:
      return { kind: "ignore" };
  }
}

export type ResendDispatchResult = "applied" | "duplicate" | "unmatched" | "ignored";

/**
 * Apply one event after the signature check.
 * claim returns duplicate when this svix-id was already stored.
 * findLogId looks up the Resend message id and nothing else.
 */
export async function dispatchResendEvent(input: {
  eventType: string;
  resendEmailId: string;
  data?: EventData;
  claim: () => Promise<"new" | "duplicate">;
  release: () => Promise<void>;
  findLogId: (resendEmailId: string) => Promise<number | null>;
  apply: (emailLogId: number, action: ProviderEventAction) => Promise<void>;
}): Promise<ResendDispatchResult> {
  const action = providerEventAction(input.eventType, input.data);
  const claim = await input.claim();
  if (claim === "duplicate") return "duplicate";
  try {
    if (action.kind === "ignore" || action.kind === "note") return "ignored";
    const emailLogId = await input.findLogId(input.resendEmailId);
    if (emailLogId == null) return "unmatched";
    await input.apply(emailLogId, action);
    return "applied";
  } catch (err) {
    await Promise.resolve(input.release()).catch(() => {});
    throw err;
  }
}
