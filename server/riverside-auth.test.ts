/**
 * Who may call the Riverside webhook. It emails every newsletter subscriber,
 * so an unsigned caller could send a mass mail from our domain. Recordings
 * come from the YouTube pipeline (server/jobs/coordinationPipeline.ts); this
 * webhook is off unless RIVERSIDE_WEBHOOK_SECRET is set, in every NODE_ENV.
 * It used to skip the check whenever NODE_ENV wasn't "production", and
 * production runs with NODE_ENV unset (measured 2026-09-28).
 */
import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { checkRiversideAuth } from "./webhooks/riverside";

const body = '{"event":"recording.complete","data":{"id":"r1"}}';
const sign = (secret: string, raw = body) => "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");

describe("checkRiversideAuth", () => {
  it("with no secret it is off, whatever is sent", () => {
    expect(checkRiversideAuth({ rawBody: body, secret: "" }).status).toBe(503);
    expect(checkRiversideAuth({ rawBody: body, secret: "", signature: sign("anything") }).status).toBe(503);
  });

  it("with a secret, a valid signature over the exact body passes", () => {
    expect(checkRiversideAuth({ rawBody: body, secret: "s3cret", signature: sign("s3cret") })).toEqual({ status: 200 });
  });

  it("with a secret, a missing, wrong or re-serialised signature is refused", () => {
    expect(checkRiversideAuth({ rawBody: body, secret: "s3cret" }).status).toBe(401);
    expect(checkRiversideAuth({ rawBody: body, secret: "s3cret", signature: sign("other") }).status).toBe(401);
    expect(checkRiversideAuth({ rawBody: body, secret: "s3cret", signature: sign("s3cret", body + " ") }).status).toBe(401);
    expect(checkRiversideAuth({ rawBody: body, secret: "s3cret", signature: "sha256=00" }).status).toBe(401);
  });
});
