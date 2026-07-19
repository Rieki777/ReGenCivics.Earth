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
  ShipImage, ShipInteriorCard, PriceTag, ShipSection, ShipEyebrow, ShipNavRow,
  SHIP_TAGLINE, CHESTNUT_URL, shipImg,
} from "./shipShared";
import { ShipInventory } from "@/components/ship/ShipInventory";
import { StateOfShip } from "@/components/ship/StateOfShip";
import { trpc } from "@/lib/trpc";
import AutoplayVideo from "@/components/AutoplayVideo";

const PERKS = [
  { icon: Sun, title: "The healthiest coach on the road", body: "A 2006 luxury build chosen on purpose: real wood and stone trim, cured decades past off-gassing. 100% organic linens and towels, cast iron and natural cookware, organic soaps and body products stocked for you." },
  { icon: Droplets, title: "Water like nowhere else", body: "Whole-coach filtration strips chlorine from any city fill. Filtered showers. In-line-filtered drinking water. And a spring-water intake pump that fills your tanks straight from a living spring up to 50 feet away." },
  { icon: Wifi, title: "Fully off-grid, fully connected", body: "Generator and electrical system meet 100% of your energy needs. Starlink internet anywhere on earth. Propane cooking and hot water. A full-size washing machine with drying stand." },
  { icon: Bike, title: "The adventure pack", body: "Stand-up paddleboard. Hammocks. Cascadia field guides, instruments, and games. A Love Your Body kit for tending yourselves aboard. The electric bike and paddle ball come aboard in year two." },
  { icon: ShipIcon, title: "Room to live", body: "Forty feet, three slide-outs, two bedrooms, two bathrooms, and a living room big enough for morning yoga. Designed for a couple; up to four aboard in comfort, or five when at least three are children." },
  { icon: Sprout, title: "The treasure", body: "A chest of seeds, a personalized treasure map, and a First Mate who plots your voyage through springs, waterfalls, food forests, and the land projects regenerating Cascadia." },
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
  // The entry threshold is admin-tunable server-side; read it live so the hero
  // callout never drifts from the real points line.
  const flags = trpc.ship.featureFlags.useQuery();
  const threshold = flags.data?.entryThreshold ?? 150;
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
          <h1 data-reveal className="text-4xl md:text-6xl font-bold mb-5 drop-shadow-lg text-[#ffd700]">The ReGen Ship sets Sail in Cascadia</h1>
          <p data-reveal data-reveal-delay="80" className="text-lg md:text-2xl mb-4 text-white drop-shadow">Come visit the most beautiful places on earth in reverence and regeneration.</p>
          <p data-reveal data-reveal-delay="160" className="uppercase tracking-widest text-sm font-semibold text-white mb-8">A partnership of ReGen Civics and CORE (Church of the Regenerative Earth) presenting:</p>
          <div data-reveal data-reveal-delay="240" className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" className="bg-[#ffd700] text-[#1a472a] font-bold text-base px-7 shadow-[0_0_28px_rgba(255,215,0,0.55)] hover:bg-[#ffe14d] hover:shadow-[0_0_40px_rgba(255,215,0,0.85)] animate-glow transition-shadow">
              <Link href="/ship/quest">Win a free voyage</Link>
            </Button>
            <Button asChild size="lg" className="bg-white text-[#1a472a] font-semibold text-base px-7 hover:bg-white/90 shadow-lg">
              <Link href="/ship/book">See open weeks</Link>
            </Button>
          </div>
        </div>
      </section>

      <ShipNavRow current="/ship" />

      {/* The current docking sets the season's theme */}
      <ShipSection className="py-8">
        <div data-reveal className="rounded-2xl border border-[#ffd700]/50 bg-gradient-to-br from-[#ffd700]/12 to-[#d4a574]/8 p-6">
          <ShipEyebrow>The current docking</ShipEyebrow>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">She sails this season as The Sanctuary of Love</h2>
          <p className="text-foreground/85 max-w-3xl mb-4">The ship takes the theme of wherever she is docked. She is docked at The Sanctuary in Ashland, Oregon, so love is the foundation of her first season: her interior, her quests, and every day of the voyage. Seven days aboard, seven rites, one Quest of Love.</p>
          <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f]"><Link href="/ship/theme">Enter the Sanctuary of Love</Link></Button>
        </div>
      </ShipSection>

      {/* The story */}
      <ShipSection>
        <ShipEyebrow>The ship</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-6">A regenerative pirate ship, complete with your treasure chest of seeds</h2>
        <div className="prose prose-lg max-w-none text-foreground/90 space-y-4">
          <p>She is a 40-foot land yacht, a 2006 Fleetwood Revolution LE: all wood and stone trim inside, two bedrooms, two bathrooms, a galley that cooks real food, a living room big enough for morning yoga, a full washing machine, Starlink overhead, and spring water in her tanks. Built for a couple. Up to four aboard in comfort, or five when at least three are children.</p>
          <p>You do not just rent her. You take her on a voyage. Your treasure map is drawn for you by the ship herself: land projects to serve, springs to drink from, waterfalls, food forests, and the places where past crews planted their seeds. You sail Cascadia visiting the most beautiful places on earth in reverence and regeneration.</p>
        </div>
        <div className="mt-5">
          <a href="/blog/the-regen-ship" className="inline-flex items-center gap-1 text-[#2f5d3a] dark:text-[#ffd700] font-semibold underline decoration-2 underline-offset-4 hover:text-[#1a472a] dark:hover:text-[#ffe14d] transition-colors">Read her full story <span aria-hidden="true">→</span></a>
        </div>
      </ShipSection>

      {/* The Ship's Inventory (the bag). Renders only once items are seeded. */}
      <ShipSection className="bg-[#0d1f16]/[0.03] dark:bg-[#0d1f16]/30">
        <ShipEyebrow>The bag</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-2">Everything she carries</h2>
        <p className="text-foreground/80 max-w-2xl mb-6">Open the bag. Every tool, toy, and bit of magic aboard, from the paddleboard to the walking staff that plants a forest as you go. Tap a slot to see what it does and where she keeps it.</p>
        <ShipInventory />
        <div className="mt-6">
          <Link href="/ship/inventory" className="inline-flex items-center gap-1 text-[#2f5d3a] dark:text-[#ffd700] font-semibold underline decoration-2 underline-offset-4 hover:text-[#1a472a] dark:hover:text-[#ffe14d] transition-colors">See the full ship inventory — every tool, hose, and battery aboard, and where she keeps it <span aria-hidden="true">→</span></Link>
        </div>
      </ShipSection>

      {/* The love voyage */}
      <ShipSection className="bg-[#d4a574]/10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div data-reveal="left" className="aspect-[4/3]"><ShipImage name="ship-campfire-dusk.jpg" alt="A couple resting by a fire ring beside the ship at dusk." className="h-full" /></div>
          <div data-reveal="right">
            <ShipEyebrow>The Love Voyage</ShipEyebrow>
            <h2 className="text-3xl font-bold mb-4">You're allowed to have more than one honeymoon</h2>
            <p className="text-foreground/90 mb-4">The old honeymoon was a full moon of honey and healing before a couple stepped into their next season together. The ReGen Ship gives you that week again: springs to drink from, waterfalls to swim under, land to serve, and a chest of seeds you plant side by side. Bring your partner, bring the kids, bring the crew of four.</p>
            <a href="/blog/more-than-one-honeymoon" className="inline-flex items-center gap-1 text-[#2f5d3a] dark:text-[#ffd700] font-semibold underline decoration-2 underline-offset-4 hover:text-[#1a472a] dark:hover:text-[#ffe14d] transition-colors">Read: You're Allowed to Have More Than One Honeymoon <span aria-hidden="true">→</span></a>
          </div>
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

      {/* The table: how we eat aboard, and why it feeds the land */}
      <ShipSection id="the-table" className="bg-[#2f5d3a]/[0.05]">
        <ShipEyebrow>The table</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-6">How we eat aboard, and why it feeds the land</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div data-reveal="left" className="prose prose-lg max-w-none text-foreground/90 space-y-4">
            <p>The pantry is a gift economy. She sails stocked, so eat what is aboard, cook freely, and set a full table. The one rule of an abundant ship is that you leave her fuller than you found her. When you use something up, replace it with something of equal or greater value, so the next crew boards into the same abundance you did. Live abundantly, and take care of the people voyaging after you.</p>
            <p>Everything aboard is organic, plant-based, and as local as the road allows. The food, the soaps, the oils, and the cleaners are all chosen so that anything going down her drains is safe to give back to the earth.</p>
            <p>That choice is the heart of her regenerative footprint. Because she runs plant-based and organic, the greywater and blackwater in her tanks leave clean enough to nourish an ecosystem. At the end of a voyage you empty her tanks into a healing hole, plant it, and the whole journey returns to the land as food for a forest. What the crew eats becomes what the land drinks.</p>
          </div>
          <div data-reveal="right">
            <AutoplayVideo
              comingSoon
              videoId=""
              title="Emptying the blackwater and planting a healing hole"
              thumbnailUrl={shipImg("ship-healing-hole.jpg")}
              thumbnailAlt="A freshly planted healing hole beside the ship, where the voyage's water returns to the land."
              playLabel="Emptying the tanks, planting a healing hole"
            />
            <p className="text-sm text-muted-foreground mt-3">A short film on emptying the black and greywater and using it to nourish a living landscape. Coming aboard soon.</p>
          </div>
        </div>
      </ShipSection>

      {/* The Galley: cook what you gather */}
      <ShipSection className="bg-[#d4a574]/10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div data-reveal="left">
            <ShipEyebrow>The Galley</ShipEyebrow>
            <h2 className="text-3xl font-bold mb-4">Cook the valley into a feast</h2>
            <p className="text-foreground/90 mb-4">The ship eats organic, plant-based, and mostly raw, because that keeps the water clean enough to nourish the land. The Galley shows you how, with a cookbook of build-your-own formulas and a remixer that turns your market haul into dishes. Log what you gathered, pick your track, and cook.</p>
            <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f]"><Link href="/ship/galley">Enter the Galley</Link></Button>
          </div>
          <div data-reveal="right" className="aspect-[4/3]"><ShipImage name="ship-galley-table.webp" alt="A galley table laid with ripe fruit, greens, and shared plates." className="h-full" /></div>
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
            <ShipInteriorCard name="ship-galley-table.webp" label="The galley" alt="The galley table laid with fruit and shared plates." />
            <ShipInteriorCard name="ship-interior-living.jpg" label="The living room" alt="The living area: the dinette by a wide window with a lake view, set up with Starlink for working aboard." />
            <ShipInteriorCard name="ship-interior-bedroom.jpg" label="The primary bedroom" alt="The primary bedroom with a gold velvet headboard, ceiling fan, and trailing ivy." />
            <ShipInteriorCard name="ship-interior-bath.jpg" label="The bath" alt="The bathroom with vanity, toilet, and the full-size washing machine in cherry cabinetry." />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <ShipInteriorCard name="ship-interior-bedroom-2.jpg" label="The bedroom, by candlelight" alt="The bedroom from the doorway, beaded curtain, framed art, and candles along the sill." />
            <ShipInteriorCard name="ship-interior-shower.jpg" label="The shower" alt="A corner shower with frosted glass, fresh towels, and a skylight overhead." />
            <ShipInteriorCard name="ship-interior-bath-sink.jpg" label="The vanity" alt="The bathroom vanity with a stone tile backsplash, brushed gold fixtures, and a folded towel." />
            <ShipInteriorCard name="ship-interior-altar.jpg" label="The altar" alt="A small altar with framed agate slices, candles, selenite, and a feather." />
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

      {/* State of the Ship: the public trust dashboard */}
      <ShipSection className="bg-[#2b7fb8]/[0.06]">
        <ShipEyebrow>State of the ship</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-2">She belongs to the movement, and here is the proof, live</h2>
        <p className="text-foreground/80 max-w-2xl mb-6">The whole community watches the tide rise together. Getting the word out is the game.</p>
        <div className="max-w-4xl"><StateOfShip /></div>
      </ShipSection>

      {/* Quest + fleet CTAs */}
      <ShipSection className="bg-[#2f5d3a] text-white">
        <div className="grid md:grid-cols-2 gap-8">
          {/* The quest, as a glowing gold callout */}
          <div data-reveal className="quest-card-gold flex flex-col rounded-2xl p-6 bg-gradient-to-br from-[#ffd700]/20 to-[#d4a574]/10 border border-[#ffd700]/50">
            <Map className="w-10 h-10 text-[#ffd700] mb-3 animate-float" aria-hidden="true" />
            <p className="uppercase tracking-widest text-xs font-semibold text-[#ffd700] mb-1">Win a free voyage</p>
            <h2 className="text-2xl font-bold mb-2 text-[#ffd700]">Qualify by August 16. Win a week-long voyage on your own dates.</h2>
            <p className="text-white/90 mb-4 flex-1">Reach {threshold} points by August 16 and you are in the drawing. Every point above raises your odds. On August 16 we draw the first free voyage, and more unlock as she books up, up to six. Winners pick their own open week.</p>
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
