/**
 * /ship - The ReGen Ship announcement + landing page.
 * Hero, taglines, the story, the offering, gallery, strikethrough pricing,
 * the quest CTA, and the fleet CTA. Pirate flavor lives in the copy and icons.
 */
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/PageWrapper";
import { Anchor, Map, Sprout, Ship as ShipIcon, Droplets, Wifi, Bike, Sun } from "lucide-react";
import {
  ShipImage, InteriorPlaceholder, PriceTag, ShipSection, ShipEyebrow, ShipNavRow,
  SHIP_TAGLINE, CHESTNUT_URL,
} from "./shipShared";

const PERKS = [
  { icon: Sun, title: "The healthiest coach on the road", body: "A 2006 luxury build chosen on purpose: real wood and stone trim, cured decades past off-gassing. 100% organic linens and towels, cast iron and natural cookware, organic soaps and body products stocked for you." },
  { icon: Droplets, title: "Water like nowhere else", body: "Whole-coach filtration strips chlorine from any city fill. Filtered showers. Gravity-filtered drinking water. And a spring-water intake pump that fills your tanks straight from a living spring up to 50 feet away." },
  { icon: Wifi, title: "Fully off-grid, fully connected", body: "Generator and electrical system meet 100% of your energy needs. Starlink internet anywhere on earth. Propane cooking and hot water. A full-size washing machine with drying stand." },
  { icon: Bike, title: "The adventure pack", body: "Electric bike. Stand-up paddleboard. Paddle ball. Hammocks. Cascadia field guides, instruments, and games." },
  { icon: ShipIcon, title: "Room to live", body: "Forty feet, three slide-outs, two bedrooms, two bathrooms, and a living room big enough for morning yoga. Designed for a couple; hosts two couples in comfort." },
  { icon: Sprout, title: "The treasure", body: "A chest of seeds, a personalized treasure map, and a ship's concierge that plots your voyage through springs, waterfalls, food forests, and the land projects regenerating Cascadia." },
];

const GALLERY = [
  { name: "ship-forest-camp-guitar.jpg", alt: "The ship camped in the Cascadia pines, awning out, a paddleboard leaning against her, someone playing guitar." },
  { name: "ship-cascadia-forest.jpg", alt: "The ship nestled in old-growth Cascadia conifers." },
  { name: "ship-double-rainbow.jpg", alt: "A double rainbow arching over the ship." },
  { name: "ship-canyon-overlook.jpg", alt: "Feet resting over a canyon river at a Cascadia overlook." },
  { name: "ship-campfire-dusk.jpg", alt: "A fire ring and chairs beside the ship at dusk." },
  { name: "ship-riverbank-rest.jpg", alt: "Resting barefoot by a calm forest river in the pines." },
  { name: "ship-tipis-prairie.jpg", alt: "The ship between two tipis under a big sky." },
  { name: "ship-lake-powell-overlook.jpg", alt: "The ship above a wide lake vista." },
];

export default function Ship() {
  return (
    <PageWrapper>
      <SEO
        title="The ReGen Ship"
        description={SHIP_TAGLINE}
        image="/images/ship/ship-zion-redrock-hero.jpg"
        url="/ship"
      />

      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center text-center overflow-hidden">
        <ShipImage name="ship-zion-redrock-hero.jpg" alt="The ReGen Ship beneath red rock cliffs in crisp daylight." rounded={false} className="absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 bg-black/45" />
        <div className="max-w-3xl mx-auto px-4 py-24 text-white">
          <p data-reveal className="uppercase tracking-widest text-sm font-semibold text-[#ffd700] mb-4">A program of the Church of the Regenerative Earth</p>
          <h1 data-reveal data-reveal-delay="80" className="text-4xl md:text-6xl font-bold mb-5 drop-shadow-lg">The ReGen Ship has raised her flag</h1>
          <p data-reveal data-reveal-delay="160" className="text-lg md:text-2xl mb-8 text-white drop-shadow">{SHIP_TAGLINE}</p>
          <div data-reveal data-reveal-delay="240" className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" className="bg-[#ffd700] text-[#1a472a] font-bold text-base px-7 shadow-[0_0_28px_rgba(255,215,0,0.55)] hover:bg-[#ffe14d] hover:shadow-[0_0_40px_rgba(255,215,0,0.85)] animate-glow transition-shadow">
              <Link href="/ship/quest">Win the maiden voyage</Link>
            </Button>
            <Button asChild size="lg" className="bg-white text-[#1a472a] font-semibold text-base px-7 hover:bg-white/90 shadow-lg">
              <Link href="/ship/book">See open weeks</Link>
            </Button>
          </div>
        </div>
      </section>

      <ShipNavRow current="/ship" />

      {/* The story */}
      <ShipSection>
        <ShipEyebrow>The ship</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-6">A regenerative pirate ship, complete with your treasure chest of seeds</h2>
        <div className="prose prose-lg max-w-none text-foreground/90 space-y-4">
          <p>She is a 40-foot land yacht, a 2006 Fleetwood Revolution LE: all wood and stone trim inside, two bedrooms, two bathrooms, a galley that cooks real food, a living room big enough for morning yoga, a full washing machine, Starlink overhead, and spring water in her tanks. Built for a couple. Hosts two couples in comfort.</p>
          <p>You do not just rent her. You take her on a voyage. Your treasure map is drawn for you by the ship herself: land projects to serve, springs to drink from, waterfalls, food forests, and the places where past crews planted their seeds. You sail Cascadia visiting the most beautiful places on earth in reverence and regeneration.</p>
        </div>
        <div className="mt-5">
          <a href="/blog/the-regen-ship" className="inline-flex items-center gap-1 text-[#2f5d3a] dark:text-[#ffd700] font-semibold underline decoration-2 underline-offset-4 hover:text-[#1a472a] dark:hover:text-[#ffe14d] transition-colors">Read her full story <span aria-hidden="true">→</span></a>
        </div>
      </ShipSection>

      {/* The seeds */}
      <ShipSection className="bg-[#4a7c59]/8">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div data-reveal="left" className="aspect-[4/3]"><ShipImage name="ship-seed-chest.jpg" alt="A wooden chest overflowing with labeled seed packets and chestnuts." className="h-full" /></div>
          <div data-reveal="right">
            <ShipEyebrow>The treasure chest</ShipEyebrow>
            <h2 className="text-3xl font-bold mb-4">Everywhere you go, you plant</h2>
            <p className="text-foreground/90 mb-4">The chest holds seeds chosen to turn pine plantations back into the food forests they once were, the great abundance this land knew before. Eat local fruit, save the seeds, and when you sail home to her anchorage at The Sanctuary in Ashland, plant your harvest in the healing hole and watch a food forest grow from every crew that ever sailed.</p>
            <a href={CHESTNUT_URL} className="inline-flex items-center gap-1 text-[#2f5d3a] dark:text-[#ffd700] font-semibold underline decoration-2 underline-offset-4 hover:text-[#1a472a] dark:hover:text-[#ffe14d] transition-colors">Read The Great American Chestnut Abundance <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </ShipSection>

      {/* Gallery */}
      <ShipSection>
        <ShipEyebrow>The most beautiful places on earth</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-6">Where she has been</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {GALLERY.map((g, i) => (
            <div key={g.name} data-reveal data-reveal-delay={i * 80} className="aspect-[4/3] overflow-hidden rounded-2xl group">
              <ShipImage name={g.name} alt={g.alt} className="h-full transition-transform duration-500 group-hover:scale-105" />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Aboard the ship</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InteriorPlaceholder label="The galley" />
            <InteriorPlaceholder label="The living room" />
            <InteriorPlaceholder label="The primary bedroom" />
            <InteriorPlaceholder label="The bath" />
          </div>
        </div>
      </ShipSection>

      {/* Perks */}
      <ShipSection className="bg-[#4a7c59]/8">
        <ShipEyebrow>Everything you need for an epic regenerative adventure</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-8">What sails with you</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {PERKS.map((p, i) => (
            <div key={p.title} data-reveal data-reveal-delay={(i % 2) * 100} className="flex gap-4">
              <p.icon className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-lg mb-1">{p.title}</h3>
                <p className="text-foreground/80">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-6">Health notes stay factual: materials, filtration, and organic supplies. No medical claims.</p>
      </ShipSection>

      {/* Pricing + offering */}
      <ShipSection>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <ShipEyebrow>The trial year</ShipEyebrow>
            <h2 className="text-3xl font-bold mb-4">Her community trial year</h2>
            <PriceTag className="mb-4" />
            <p className="text-foreground/90 mb-4">One-week voyages, for the crew who get here first. Those with abundance are asked to wait for year two, when upgrades land and the rate climbs toward what she is worth.</p>
            <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f]"><Link href="/ship/book">Request a week</Link></Button>
          </div>
          <div className="rounded-2xl border p-6 bg-card">
            <h3 className="font-semibold text-lg mb-2">How a voyage is arranged</h3>
            <p className="text-foreground/80 mb-3">A voyage has two transparent parts, kept separate:</p>
            <ul className="space-y-2 text-foreground/80 list-disc pl-5">
              <li>The insured rental charge, paid on the platform. It activates the coverage the ship sails under.</li>
              <li>A suggested voyage offering to the church. Culturally this is how crews keep the ship sailing. It is a gift, never required, and your booking never depends on it.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">Ten percent of every voyage buys the ship herself back into community ownership.</p>
          </div>
        </div>
      </ShipSection>

      {/* Quest + fleet CTAs */}
      <ShipSection className="bg-[#2f5d3a] text-white">
        <div className="grid md:grid-cols-2 gap-8">
          {/* The quest, as a glowing gold callout */}
          <div data-reveal className="quest-card-gold flex flex-col rounded-2xl p-6 bg-gradient-to-br from-[#ffd700]/20 to-[#d4a574]/10 border border-[#ffd700]/50">
            <Map className="w-10 h-10 text-[#ffd700] mb-3 animate-float" aria-hidden="true" />
            <p className="uppercase tracking-widest text-xs font-semibold text-[#ffd700] mb-1">The maiden voyage</p>
            <h2 className="text-2xl font-bold mb-2 text-[#ffd700]">It sails this August. Win the week-long adventure.</h2>
            <p className="text-white/90 mb-4 flex-1">Reach 150 points and you're in every draw. Every point above raises your odds. The maiden voyage sails free, and every 20% of the year that books unlocks one more free voyage, up to six.</p>
            <Button asChild className="bg-[#ffd700] text-[#1a472a] font-bold hover:bg-[#ffe14d] shadow-[0_0_20px_rgba(255,215,0,0.5)] self-start"><Link href="/ship/quest">Enter the quest</Link></Button>
          </div>
          <div data-reveal data-reveal-delay="120" className="flex flex-col">
            <Anchor className="w-10 h-10 text-[#ffd700] mb-3" aria-hidden="true" />
            <h2 className="text-2xl font-bold mb-2">The flagship of the ReGen Fleet</h2>
            <p className="text-white/85 mb-4 flex-1">A traveling festival that moves from land project to land project, building homes, planting food forests, and healing waterways. Own an RV? Raise your flag.</p>
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20 self-start"><Link href="/ship/fleet">Join the fleet</Link></Button>
          </div>
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
