/**
 * Newsletter subscription state helpers.
 * Persist subscription status in localStorage so users are not re-prompted
 * after they have already subscribed.
 */

export const isNewsletterSubscribed = (): boolean =>
  typeof window !== "undefined" &&
  localStorage.getItem("newsletter_subscribed") === "true";

export const markNewsletterSubscribed = (): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("newsletter_subscribed", "true");
  }
};
