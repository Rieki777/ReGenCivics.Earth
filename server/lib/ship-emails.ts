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
    p("Once the platform booking is confirmed, your full welcome arrives: the voyage guide, the First Mate to chart your treasure map, and the suggested voyage offering to the church.");
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
    btn(`${SHIP_URL}/concierge`, "Meet the First Mate and chart your map") +
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

export async function emailQuestWinner(to: string): Promise<void> {
  const html =
    h("Your name was drawn. You sail free.") +
    p("You were in the draw, and your name came up. You have won a free voyage aboard the ReGen Ship.") +
    p("A crew member will reach out to arrange your week and your platform booking. Winners pay nothing and no offering is expected.") +
    btn(`${SHIP_URL}/book`, "Choose your week");
  await send(to, "You won a free ReGen Ship voyage", html);
}

// Sent when a crew crosses the points threshold: they are in every draw, and
// now they can fill in a crew profile so sponsors can find them.
export async function emailEnteredTheDraw(to: string): Promise<void> {
  const html =
    h("You are in the draw") +
    p("You reached the points threshold, so you are in every free-voyage drawing from here on. Every point above the line raises your odds.") +
    p("Now make your crew profile. Add a photo, a short bio, what you intend to do on your voyage, and a 60 second video if you can. Your card sails on the quest page, where anyone can sponsor your week.") +
    btn(`${SHIP_URL}/quest`, "Make your crew profile");
  await send(to, "You are in the ReGen Ship draw", html);
}

// Sent to an approved nominee who does not yet have an account: they are in the
// draw once they create their profile.
export async function emailCrewProfileInvite(to: string, nomineeName: string): Promise<void> {
  const html =
    h("You were nominated, and approved") +
    p(`${nomineeName}, the ReGen Civics and CORE teams reviewed your nomination and welcomed you into the draw for a free voyage aboard the ReGen Ship. No quest required.`) +
    p("Create your profile to activate your entry and add your crew card, so sponsors can find you and back your week. You need an account to be reachable if your name is drawn.") +
    btn(`${SHIP_URL}/quest`, "Create your profile");
  await send(to, "You are invited aboard the ReGen Ship", html);
}

function usd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Sent to a crew when someone sponsors part of their voyage.
export async function emailSponsorshipReceived(
  to: string,
  opts: { amountCents: number; sponsoredCents: number; goalCents: number },
): Promise<void> {
  const html =
    h("Someone sponsored your voyage") +
    p(`A supporter put ${usd(opts.amountCents)} toward your week aboard the ReGen Ship.`) +
    p(`You are at ${usd(opts.sponsoredCents)} of ${usd(opts.goalCents)}. When the goal is met, the church books your week and you sail.`) +
    btn(`${SHIP_URL}/quest`, "See your crew card");
  await send(to, "A sponsor backed your ReGen Ship voyage", html);
}

// Sent to the crew (and Rye) when a crew's sponsorship goal is met.
export async function emailSponsorGoalReached(to: string, crewName: string): Promise<void> {
  const html =
    h("The goal is met. This crew sails.") +
    p(`${crewName} reached the full voyage goal of ${usd(210000)}. Sponsors covered the week.`) +
    p("A crew member will book the voyage and reach out with the details. The church covers the platform booking, the same as a winner voyage.") +
    btn(`${SHIP_URL}/quest`, "See the crew");
  await send(to, "A ReGen Ship crew reached its goal", html);
}

export async function emailApplicationReceived(to: string, kind: string): Promise<void> {
  const html =
    h("We received your application") +
    p(`Thank you. Your ${kind} application is in and a crew member will read it soon.`) +
    btn(SHIP_URL, "Back to the ship");
  await send(to, `Your ReGen Ship ${kind} application`, html);
}

export async function emailDatasetOfferReceived(to: string, orgName: string): Promise<void> {
  const html =
    h("Thank you for offering your dataset") +
    p(`We received the dataset offer from ${orgName}. Thank you for helping grow the treasure map.`) +
    p("A crew member will review it and reach out. When a partner dataset joins the map, every pin from it carries a credit line back to you.") +
    btn(`${SHIP_URL}/map`, "See the treasure map");
  await send(to, "Your ReGen Ship dataset offer", html);
}

export async function emailNominationReceived(to: string, nomineeName: string): Promise<void> {
  const html =
    h("Nomination received") +
    p(`Thank you for nominating ${nomineeName}. The ReGen Civics and CORE teams review nominations together. If it is approved, ${nomineeName} enters the draw, no quest required.`) +
    btn(`${SHIP_URL}/quest`, "See the quest");
  await send(to, "Your ReGen Ship nomination", html);
}

// ── Free Voyage Giveaway (public entry layer) ─────────────────────────────────
// Word discipline: these say "entries" and "the draw", never "raffle" or
// "tickets". Free sweepstakes, not a paid raffle (campaign brief section 3).

// Sent on enter(): confirm the email before the entry counts. Also re-sent once by
// the nightly sweep at day 3 if still unconfirmed.
export async function emailVerifyGiveawayEntry(to: string, opts: { verifyUrl: string }): Promise<void> {
  const html =
    h("Confirm your entry") +
    p("You entered the draw for a free week aboard the ReGen Ship. Confirm your email and you are in.") +
    btn(opts.verifyUrl, "Confirm my entry") +
    p("The ReGen Ship is a solar vessel that makes far more power than she needs, so we point the surplus at real work on the land: water pumps, power tools, light and sound for gatherings off the grid. To launch her first sailing year, one crew sails a week free.") +
    p("Entries close September 6, 2026. No purchase or donation is ever needed to enter or win. If you did not enter, you can ignore this message.");
  await send(to, "Confirm your ReGen Ship entry", html);
}

// Sent on verify(): the entry is live. Carries the referral link, one story
// paragraph, and the countdown line.
export async function emailGiveawayWelcome(to: string, opts: { referralUrl: string }): Promise<void> {
  const html =
    h("You are in the draw") +
    p("Your entry is confirmed. One crew sails a free week aboard the ReGen Ship this year, and your name is in for it.") +
    p("She is a solar vessel that makes far more power than she needs, so we point the surplus at real work on the land: water pumps, power tools, light and sound for gatherings off the grid.") +
    p("Want better odds? Share your link. Every friend who enters through it and confirms their email adds five entries, up to forty. Bring five crewmates and we mail you the ship's colors.") +
    p(`Your link: <a href="${opts.referralUrl}">${opts.referralUrl}</a>`) +
    btn(opts.referralUrl, "Open your entry page") +
    p("Entries close September 6, 2026. The draw is on or about September 8. One crew sails free, and every entry helps chart where she sails next.");
  await send(to, "You are in the ReGen Ship draw", html);
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
          p("Two weeks out. Time to chart your voyage. The First Mate will plot springs, waterfalls, food forests, and the land projects on your route, plus any events and open bounties during your week.") +
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
