/**
 * Send one recipient at a time.
 * A provider or internal rate limit retries that recipient, then stops the
 * rest of the list without marking them failed. The next pass skips anyone
 * already accepted, so a person is never sent the same letter twice.
 */

export type PaceStatus = "sent" | "skipped" | "rate_limited" | "held" | "failed" | "deferred";

export type PaceResult = {
  accepted: number;
  dropped: number;
  outcomes: Array<{ email: string; status: PaceStatus }>;
};

function acceptedId(result: { id?: string | null }): boolean {
  return typeof result.id === "string" && result.id.length > 0;
}

export async function sendPacedEmails(opts: {
  recipients: string[];
  alreadyAccepted?: ReadonlySet<string>;
  sendOne: (email: string) => Promise<{ id: string | null; status: string }>;
  delayMs?: number;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<PaceResult> {
  const delayMs = opts.delayMs ?? 1100;
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
  const sleep = opts.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const already = opts.alreadyAccepted ?? new Set<string>();
  const outcomes: PaceResult["outcomes"] = [];
  let accepted = 0;
  let dropped = 0;
  let halt: "rate_limited" | "held" | null = null;

  for (let i = 0; i < opts.recipients.length; i++) {
    const email = opts.recipients[i] ?? "";
    const key = email.trim().toLowerCase();
    if (already.has(key)) {
      outcomes.push({ email, status: "skipped" });
      accepted += 1;
      continue;
    }
    if (halt) {
      outcomes.push({ email, status: "deferred" });
      dropped += 1;
      continue;
    }

    let status: PaceStatus = "failed";
    let sent = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await opts.sendOne(email);
      if (acceptedId(result)) {
        sent = true;
        status = "sent";
        break;
      }
      if (result.status === "rate_limited") {
        status = "rate_limited";
        if (attempt < maxAttempts) await sleep(Math.min(8000, 1000 * 2 ** (attempt - 1)));
        continue;
      }
      if (result.status === "held") {
        status = "held";
        break;
      }
      status = "failed";
      break;
    }

    outcomes.push({ email, status });
    if (sent) {
      accepted += 1;
      const more = opts.recipients.slice(i + 1).some((next) => !already.has(next.trim().toLowerCase()));
      if (more && delayMs > 0) await sleep(delayMs);
    } else {
      dropped += 1;
      if (status === "rate_limited" || status === "held") halt = status;
    }
  }

  return { accepted, dropped, outcomes };
}
