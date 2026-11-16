/**
 * /ship/crew - Join the Crew: the public door into the ReGen Pirates village
 * (SHIP_UNIFIED_GAME_PLAN.md, lane U1).
 *
 * The village runs on its own Village OS instance with its own accounts, so
 * this page only tells the road and links out. Until PIRATES_VILLAGE_URL is
 * set (flags.crewDoorUrl), the door reads "opening soon" and links nowhere.
 *
 * Public-safe words only (pirates-legal/TOKENS_AND_VOICE_QUESTIONS.md s6): no
 * token worth, no ownership or buyout terms, nothing about where the crew
 * plants. Buying in shows "opening soon" until counsel answers.
 */
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/PageWrapper";
import { Sprout, Trees, Hammer, Caravan, Package, Compass } from "lucide-react";
import { crewDoorLink } from "@shared/shipCrew";
import { BookNowButton, ShipEyebrow, ShipImage, ShipNavRow, ShipSection, ShipSigil, useShipFlags } from "./shipShared";

const PIRATE_WORK = [
  { icon: Sprout, title: "Plants treasure", body: "Seeds and food in the ground, wherever the fleet sails." },
  { icon: Trees, title: "Grows food forests", body: "Food forests and gardens on the land projects that call us in." },
  { icon: Hammer, title: "Raises natural buildings", body: "Earth, wood and stone, built by many hands." },
  { icon: Caravan, title: "Sails with the fleet", body: "A traveling village festival, rolling onto a land project together." },
  { icon: Package, title: "Keeps the Treasure Chest", body: "The fleet's chest of seeds, saved and shared." },
  { icon: Compass, title: "Takes the ship's quests", body: "The mural, the sauna, the jacks, and any quest a pirate proposes." },
];

const THE_ROAD = [
  { title: "Hail the ship", body: "Ask to come aboard. A pirate answers with a Letter of Passage." },
  { title: "Come aboard as a Deckhand", body: "You meet your matelot, a sworn pirate who walks your first moon (our monthly cycle) beside you." },
  { title: "Ready to Sail", body: "Your first quest is the real checklist that gets the ship ready to move." },
  { title: "Swear the Oath", body: "You swear the Regen Pirate Oath before witnesses and sign the Ship's Articles. Now you're a Pirate!" },
  { title: "Plant your seven", body: "Seven treasures, each one witnessed. On the seventh, the crew's Treasure Map opens to you." },
  { title: "Sail the seasons", body: "Roll into Landfalls with the fleet, and bring your own rig when you're ready." },
];

export default function ShipCrew() {
  const flags = useShipFlags();
  const welcome = crewDoorLink(flags.crewDoorUrl, "welcome");
  const hail = crewDoorLink(flags.crewDoorUrl, "hail");

  return (
    <PageWrapper>
      <SEO
        title="Join the Crew: the ReGen Pirates"
        description="The ReGen Ship has a crew. They travel to regenerate and plant treasure wherever they sail. Here's the road aboard."
        url="/ship/crew"
      />

      <ShipNavRow current="/ship/crew" />

      <ShipSection>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <ShipSigil className="w-12 h-12 text-[#b8862b] dark:text-[#e9b84a] mb-4" />
            <ShipEyebrow>The ReGen Pirates</ShipEyebrow>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Join the crew</h1>
            <p className="text-foreground/85 mb-3">
              The ReGen Ship has a crew. We travel to regenerate, and we plant treasure wherever we sail.
            </p>
            <p className="text-foreground/85">
              Pirate crews of old wrote their own Articles, chose their captains by vote and shared the take. We do the
              same on land.
            </p>
          </div>
          <div className="aspect-[4/3]">
            <ShipImage name="ship-forest-camp-guitar.jpg" alt="The ship camped in the Cascadia pines, someone playing guitar." className="h-full" />
          </div>
        </div>
      </ShipSection>

      <ShipSection className="bg-[#4a7c59]/8 pt-14">
        <ShipEyebrow>One role</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-2">Pirate</h2>
        <p className="text-foreground/80 mb-8 max-w-2xl">Every pirate does the work. Anyone can propose a new role when the fleet needs one.</p>
        <div className="grid md:grid-cols-2 gap-6">
          {PIRATE_WORK.map((w) => (
            <div key={w.title} className="flex gap-4">
              <w.icon className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-lg mb-1">{w.title}</h3>
                <p className="text-foreground/80">{w.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ShipSection>

      <ShipSection>
        <ShipEyebrow>The road aboard</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-8">From a hail to a pirate</h2>
        {/* Parchment, like the Articles themselves. Pinned light so its ink stays readable in dark mode. */}
        <ol className="[color-scheme:light] rounded-2xl bg-[#f4ead4] text-[#2b2116] p-6 md:p-8 space-y-5 shadow-sm ring-1 ring-[#2b2116]/10">
          {THE_ROAD.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9b84a] text-[#2a1a05] font-bold"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="text-[#2b2116]/80">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </ShipSection>

      <ShipSection className="bg-[#4a7c59]/8 pt-14">
        <ShipEyebrow>Two doors aboard the ship</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-8">Rent a voyage, or buy in</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-background p-6 ring-1 ring-black/10">
            <h3 className="font-semibold text-xl mb-2">Rent a voyage</h3>
            <p className="text-foreground/80 mb-5">Take her out for a week or a whole moon. Orientation is where most crews first meet a pirate.</p>
            <BookNowButton size="default" />
          </div>
          <div className="rounded-2xl bg-background p-6 ring-1 ring-black/10">
            <h3 className="font-semibold text-xl mb-2">Buy in</h3>
            <p className="text-foreground/80">Opening soon.</p>
          </div>
        </div>
      </ShipSection>

      <ShipSection>
        <ShipEyebrow>The crew's home</ShipEyebrow>
        {welcome && hail ? (
          <>
            <h2 className="text-3xl font-bold mb-3">Come find us</h2>
            <p className="text-foreground/80 mb-6 max-w-2xl">
              The crew lives in its own village, with its own sign-in. Read the Ship's Articles there, and hail the ship
              when you're ready.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[#e9b84a] hover:bg-[#f6d27d] text-[#2a1a05] font-bold">
                <a href={hail} rel="noopener">Hail the ship</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={welcome} rel="noopener">Visit the crew's home</a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-3">The crew's home opens soon</h2>
            <p className="text-foreground/80 max-w-2xl">
              The crew is setting up its own village. Until it opens, rent a voyage and meet the ship.
            </p>
          </>
        )}
      </ShipSection>
    </PageWrapper>
  );
}
