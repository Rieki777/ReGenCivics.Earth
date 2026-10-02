/**
 * A typed address on /unsubscribe does not drop anyone by itself.
 * A known subscriber gets a preferences link. An unknown address gets silence.
 * The page always says the same thing, so the form does not reveal who is on the list.
 */
import { textForEmail } from "../../shared/htmlText";

export function subscriberGetsUnsubscribeConfirm(subscriber: unknown): boolean {
  return subscriber != null;
}

export function unsubscribeConfirmLetter(confirmUrl: string): { subject: string; html: string } {
  const href = textForEmail(confirmUrl);
  return {
    subject: "Confirm your ReGen Civics email choices",
    html: `
      <h2 style="color: #1a472a; margin-top: 0;">Confirm this request</h2>
      <p style="color: #333; line-height: 1.6;">Someone asked to change the email for this address. Open the page and choose what to stop.</p>
      <p style="margin: 24px 0;">
        <a href="${href}" style="background:#1a472a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Open email preferences</a>
      </p>
      <p style="color:#666;font-size:13px;line-height:1.6;">If you did not ask for this, ignore this letter. Nothing changes until you use the page.</p>
    `,
  };
}
