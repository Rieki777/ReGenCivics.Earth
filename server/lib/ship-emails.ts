/**
 * ReGen Ship email copy: the Ship's Manifest pre-voyage sequence plus the
 * operational notices. Best-effort: sendEmail no-ops without RESEND_API_KEY,
 * so the router never blocks on email. Copy follows the STEERING section 1
 * writing rules (no em-dashes, no banned patterns).
 *
 * The branded wrapper is added by sendEmail; these builders return the inner
 * body only. Time-triggered Manifest emails (T-14 ... homecoming) are built
 * here and dispatched by manifestEmail(); a nightly job can call them.
 */
import { sendEmail } from "../_core/email";
import { getOfferingUrl, getPlatformListingUrl } from "./ship-config";

const CHESTNUT_URL = "https://regencivics.earth/blog/great-american-chestnut-abundance";
const SHIP_URL = "https://regencivics.earth/ship";

function p(text: string): string {
  return `<p style="margin:0 0 16px;line-height:1.6;">${text}</p>`;
}
function h(text: string): string {
  return `<h2 style="margin:0 0 12px;font-size:20px;">${text}</h2>`;
}
function btn(href: string, label: string): string {
  return `<p style="margin:0 0 20px;"><a href="${href}" style="display:inline-block;background:#2f5d3a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;">${label}</a></p>`;
}

type Booking = {
  id: number;
  startDate: string;
  endDate: string;
  guests: number;
  isGifted?: boolean;
};

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    await sendEmail({ to, subject, html });
  } catch (err) {
    console.error("[ship-emails] send failed:", err);
  }
}

// ── Operational emails (sent by the router) ──────────────────────────────────

export async function emailBookingReceived(to: string, booking: Booking): Promise<void> {
  const html =
    h("We got your voyage request") +
    p("Ahoy, and thank you. Your request to sail the ReGen Ship is in.") +
    p(`Requested dates: ${booking.startDate} to ${booking.endDate}, for ${booking.guests} aboard.`) +
    p("Our calendar is the source of truth, so a crew member will confirm your week and walk you through the two-part way a voyage is arranged. You will hear from us soon.") +
    btn(SHIP_URL, "Read the ship's story");
  await send(to, "Your ReGen Ship voyage request", html);
}

export async function emailBookingApproved(to: string, booking: Booking): Promise<void> {
  const listing = getPlatformListingUrl();
  const html =
    h("Your week is approved") +
    p("Good news. Your voyage week is open and yours to claim.") +
    p("The rental itself is arranged through our insured platform listing. That charge activates the coverage the ship sails under. We will send you a custom offer for your exact dates.") +
    (listing ? btn(listing, "Go to the platform listing") : p("We will send your platform booking link shortly.")) +
    p("Once the platform booking is confirmed, your full welcome arrives: the voyage guide, the concierge to chart your treasure map, and the suggested voyage offering to the church.");
  await send(to, "Your ReGen Ship week is approved", html);
}

export async function emailBookingConfirmed(to: string, booking: Booking): Promise<void> {
  const offering = getOfferingUrl();
  const html =
    h("Welcome aboard") +
    p("Your voyage is confirmed. Here is what the ReGen Ship is, so you know what you are stepping into.") +
    p("She is a regenerative pirate ship, complete with your treasure chest of seeds. You do not just rent her. You take her on a voyage through Cascadia, visiting the most beautiful places on earth in reverence and regeneration.") +
    p("Everywhere you go, you plant. The chest holds seeds chosen to turn pine plantations back into food forests, the abundance this land knew before.") +
    btn(`${SHIP_URL}/guide`, "Open the voyage guide") +
    btn(`${SHIP_URL}/concierge`, "Meet the concierge and chart your map") +
    (offering
      ? p(`When you are ready, the suggested voyage offering to the church is here: <a href="${offering}">make an offering</a>. It is a gift, never a rental charge, and never required.`)
      : p("The suggested voyage offering details will follow.")) +
    p(`Read the story of the seeds: <a href="${CHESTNUT_URL}">The Great American Chestnut Abundance</a>.`);
  await send(to, "Welcome aboard the ReGen Ship", html);
}

export async function emailQuestActionVerified(to: string, actionTitle: string, points: number): Promise<void> {
  const html =
    h("Verified") +
    p(`Your quest action is verified: ${actionTitle}.`) +
    p(`That is ${points} points toward your voyage, and ${points} ReGen credited to you.`) +
    btn(`${SHIP_URL}/quest`, "See the leaderboard");
  await send(to, "A ReGen Ship quest action is verified", html);
}

export async function emailQuestWinner(to: string, rank: number): Promise<void> {
  const html =
    h("You earned a maiden voyage") +
    p(`You finished the Maiden Voyage Quest. You are finisher number ${rank}. Three crews sail free, and you are one of them.`) +
    p("A crew member will reach out to arrange your week and your platform booking. Winners pay nothing and no offering is expected.") +
    btn(`${SHIP_URL}/book`, "Choose your week");
  await send(to, "You won a ReGen Ship maiden voyage", html);
}

export async function emailApplicationReceived(to: string, kind: string): Promise<void> {
  const html =
    h("We received your application") +
    p(`Thank you. Your ${kind} application is in and a crew member will read it soon.`) +
    btn(SHIP_URL, "Back to the ship");
  await send(to, `Your ReGen Ship ${kind} application`, html);
}

export async function emailNominationReceived(to: string, nomineeName: string): Promise<void> {
  const html =
    h("Nomination received") +
    p(`Thank you for nominating ${nomineeName} for a crew slot. The church council reviews nominations for a bonus voyage.`) +
    btn(`${SHIP_URL}/quest`, "See the quest");
  await send(to, "Your ReGen Ship nomination", html);
}

// ── The Ship's Manifest sequence (time-triggered; dispatched by a job) ────────

export type ManifestStage = "welcome" | "t14" | "t7" | "t2" | "day3" | "homecoming";

export function manifestBody(stage: ManifestStage): { subject: string; html: string } {
  switch (stage) {
    case "welcome":
      return {
        subject: "Welcome Aboard, the ReGen Ship",
        html:
          h("Welcome Aboard") +
          p("She is a regenerative pirate ship with a chest of seeds and a fleet behind her. Your voyage guide and video walkthrough are coming together now.") +
          btn(`${SHIP_URL}/guide`, "The voyage guide"),
      };
    case "t14":
      return {
        subject: "Your Treasure Map, ReGen Ship",
        html:
          h("Your Treasure Map") +
          p("Two weeks out. Time to chart your voyage. The concierge will plot springs, waterfalls, food forests, and the land projects on your route, plus any events and open bounties during your week.") +
          btn(`${SHIP_URL}/concierge`, "Chart your map"),
      };
    case "t7":
      return {
        subject: "The Ship Herself, ReGen Ship",
        html:
          h("The Ship Herself") +
          p("One week out. A note on the water doctrine: use only the soaps and cleaning materials aboard, and bring no chemical body products. This keeps the water a regenerative force for the land that receives it.") +
          p("A refresher on the regenerative vegan diet aboard, and a packing list that includes what not to bring, are in the guide.") +
          btn(`${SHIP_URL}/guide`, "Systems and packing"),
      };
    case "t2":
      return {
        subject: "Setting Sail, ReGen Ship",
        html:
          h("Setting Sail") +
          p("Two days out. Your Keeper will run a two hour orientation: driving the 40 foot ship, collecting spring water, and the systems aboard.") +
          p(`The seed chest and the story behind it: <a href="${CHESTNUT_URL}">The Great American Chestnut Abundance</a>. Your log and passport are ready when you are.`),
      };
    case "day3":
      return {
        subject: "The Captain's Log, ReGen Ship",
        html:
          h("The Captain's Log") +
          p("How is the voyage? Log an entry, stamp your passport at the map pins, and log any plantings with the chest card. Nearby pins and events are on your map.") +
          btn(`${SHIP_URL}/map`, "Open the map"),
      };
    case "homecoming":
      return {
        subject: "Homecoming, ReGen Ship",
        html:
          h("Homecoming") +
          p("Welcome home. Your voyage log page is compiled and public if you chose. You planted your saved seeds in the healing hole, and that food forest grows with every crew.") +
          p("Here is your Ship's Bell referral code to pass to the next crew. Thank you for any offering you made, and if you are moved, a review on the platform helps the ship sail on.") +
          btn(`${SHIP_URL}/log`, "See your voyage log"),
      };
  }
}

export async function manifestEmail(to: string, stage: ManifestStage): Promise<void> {
  const { subject, html } = manifestBody(stage);
  await send(to, subject, html);
}
