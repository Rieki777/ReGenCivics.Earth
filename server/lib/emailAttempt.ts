/**
 * Shared read of a sendEmail result.
 * A letter counts as sent only when Resend returned an id.
 * Hold, the hourly cap, and provider errors return id null and must stay retryable.
 */

export type EmailSendStatus = "sent" | "held" | "rate_limited" | "provider_error";

export function providerAccepted(result: { id?: string | null } | null | undefined): boolean {
  return typeof result?.id === "string" && result.id.length > 0;
}

/**
 * Legacy scheduled_emails row after one attempt.
 * rate_limited stays pending so the next minute can retry.
 * Anything else with no Resend id is failed. sendEmail does not throw.
 */
export function scheduledEmailNextStatus(result: {
  id?: string | null;
  status?: string;
}): "pending" | "sent" | "failed" {
  if (result.status === "rate_limited") return "pending";
  if (providerAccepted(result)) return "sent";
  return "failed";
}
