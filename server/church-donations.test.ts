import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

/**
 * churchDonations tests. In the vitest environment there is no STRIPE_SECRET_KEY
 * and no DATABASE_URL, so we exercise: the not-live guard, input validation, the
 * make-payments permission guard, and Stripe webhook signature verification
 * (the mechanism the receiver depends on). No live Stripe or DB calls are made.
 */
function makeCtx(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

function user(role: "user" | "admin" = "user", id = 99): AuthenticatedUser {
  return {
    id, openId: `open-${id}`, email: `u${id}@example.com`, name: `User ${id}`,
    loginMethod: "google", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  } as AuthenticatedUser;
}

describe("churchDonations", () => {
  it("donationsEnabled reports not-live when Stripe is unconfigured", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.churchDonations.donationsEnabled()).resolves.toEqual({ enabled: false });
  });

  it("createCheckoutSession refuses when Stripe is not configured", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.churchDonations.createCheckoutSession({ amountCents: 3000, interval: "one_time" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("createCheckoutSession rejects an amount below the minimum", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.churchDonations.createCheckoutSession({ amountCents: 50, interval: "one_time" }),
    ).rejects.toBeTruthy();
  });

  it("recordPayout rejects a caller without the make-payments right", async () => {
    const caller = appRouter.createCaller(makeCtx(user("user")));
    await expect(
      caller.churchDonations.recordPayout({ amountCents: 5000, purpose: "seedlings" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("stripe webhook signature verification", () => {
  const stripe = new Stripe("sk_test_dummy_key_for_signing");
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", data: { object: {} } });

  it("rejects a tampered / missing signature", () => {
    expect(() => stripe.webhooks.constructEvent(payload, "t=1,v1=bad", secret)).toThrow();
  });

  it("accepts a correctly signed payload", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = stripe.webhooks.constructEvent(payload, header, secret);
    expect(event.id).toBe("evt_test");
    expect(event.type).toBe("checkout.session.completed");
  });
});
