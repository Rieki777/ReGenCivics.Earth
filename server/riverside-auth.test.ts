/**
 * Who may call the Riverside webhook. It emails every newsletter subscriber,
 * so an unsigned caller could send a mass mail from our domain. Production
 * runs with NODE_ENV unset (measured 2026-09-28), so the old "reject only in
 * production" branch never fired there.
 */
import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { checkRiversideAuth } from "./webhooks/riverside";

const body = '{"event":"recording.complete","data":{"id":"r1"}}';
const sign = (secret: string) => "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
const base = { rawBody: body, secret: "", expectedToken: "", nodeEnv: undefined as string | undefined, deployed: true };

describe("checkRiversideAuth", () => {
  it("with a token set, a matching x-webhook-token passes and anything else is refused", () => {
    expect(checkRiversideAuth({ ...base, expectedToken: "tok-123", token: "tok-123" }).status).toBe(200);
    expect(checkRiversideAuth({ ...base, expectedToken: "tok-123", token: "tok-124" }).status).toBe(401);
    expect(checkRiversideAuth({ ...base, expectedToken: "tok-123" }).status).toBe(401);
    expect(checkRiversideAuth({ ...base, expectedToken: "tok-123", token: "" }).status).toBe(401);
  });

  it("with a secret set, a valid HMAC passes and a bad one is refused", () => {
    expect(checkRiversideAuth({ ...base, secret: "s3cret", signature: sign("s3cret") }).status).toBe(200);
    expect(checkRiversideAuth({ ...base, secret: "s3cret", signature: sign("other") }).status).toBe(401);
    expect(checkRiversideAuth({ ...base, secret: "s3cret" }).status).toBe(401);
  });

  it("with both set, either one passes", () => {
    const both = { ...base, secret: "s3cret", expectedToken: "tok-123" };
    expect(checkRiversideAuth({ ...both, signature: sign("s3cret") }).status).toBe(200);
    expect(checkRiversideAuth({ ...both, token: "tok-123" }).status).toBe(200);
    expect(checkRiversideAuth({ ...both, token: "nope", signature: "sha256=00" }).status).toBe(401);
  });

  it("with neither set, production refuses", () => {
    expect(checkRiversideAuth({ ...base, nodeEnv: "production" }).status).toBe(503);
  });

  it("with neither set on a deployed server, it still accepts today but logs an error to fix it", () => {
    const r = checkRiversideAuth({ ...base, nodeEnv: undefined, deployed: true });
    expect(r.status).toBe(200);
    expect(r.log).toMatch(/RIVERSIDE_WEBHOOK_TOKEN/);
  });

  it("locally, with neither set, it accepts quietly", () => {
    expect(checkRiversideAuth({ ...base, nodeEnv: "development", deployed: false })).toEqual({ status: 200 });
  });
});
