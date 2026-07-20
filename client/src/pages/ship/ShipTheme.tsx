/**
 * /ship/theme - The current docking theme.
 *
 * The ship takes the theme of wherever she is docked. She is docked at The
 * Sanctuary in Ashland, Oregon, so this season she sails as The Sanctuary of
 * Love. This page holds the doctrine (why the theme rotates with the dock), the
 * four loves the season is built on, how the theme shows up in her interior,
 * the Quest of Love (seven rites, one per day of the voyage), and the church
 * that runs her.
 *
 * When she docks somewhere new, change CURRENT_THEME and the rites below. The
 * page structure is the constant; the theme is the variable.
 */
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/PageWrapper";
import {
  Heart, HeartPulse, Sprout, Mountain, Flame, Droplets, Utensils,
  MessageCircle, Anchor, BookOpen, Moon, Users,
} from "lucide-react";
import { ShipImage, ShipSection, ShipEyebrow, ShipNavRow, BookNowButton, BookNowCallout } from "./shipShared";

/** The docking that sets the theme. Update this when she moves. */
const CURRENT_THEME = {
  name: "The Sanctuary of Love",
  dock: "The Sanctuary, Ashland, Oregon",
  season: "Her first sailing year",
  coreUrl: "https://core.regencivics.earth/programs",
};

/** The four loves this docking is built on. Tend all four and the fifth appears. */
const FOUR_LOVES = [
  {
    icon: Heart,
    title: "Love of the Beloved",
    body: "The person in the passenger seat. A week where your relationship is the point of the trip, not the thing you squeeze in around it. Married twenty years, together three months, or somewhere in the long middle. She was built for two.",
  },
  {
    icon: HeartPulse,
    title: "Love of the Body",
    body: "Spring water in her tanks. Cast iron and real food. Organic linens, organic soap, no off-gassing plastics, filtered showers. A moon of honey aboard. You come home to yourselves in better shape than you left.",
  },
  {
    icon: Sprout,
    title: "Love of the Land",
    body: "You carry a chest of seeds and you plant everywhere you go. You give days to the land projects on your map. Love grows in the direction of what you tend, and what you tend together grows you.",
  },
  {
    icon: Mountain,
    title: "Love of the Beautiful",
    body: "Waterfalls, hot springs, old growth, a summit at sunset. Beauty taken in reverence is a nutrient. The treasure map is drawn to put the most beautiful places on earth in front of you, one day at a time.",
  },
];

/** The Quest of Love. Seven rites, one per day of the Monday-to-Monday voyage. */
const RITES: Array<{
  day: string;
  icon: typeof Flame;
  title: string;
  subtitle: string;
  body: string;
  href?: string;
  linkLabel?: string;
}> = [
  {
    day: "Monday",
    icon: Flame,
    title: "The Boarding Rite",
    subtitle: "Leave the world at the gangplank",
    body: "Before you drive, each of you writes down what you are carrying that is not love. The worry, the grudge, the deadline. At the first camp you burn the paper in the fire ring. The voyage starts on the other side of that fire.",
  },
  {
    day: "Tuesday",
    icon: Droplets,
    title: "The Rite of Water",
    subtitle: "Drink from a living spring",
    body: "Find the spring on your map. Run her intake pump, fill her tanks from the source, and drink first from the same cup. The water you both live on this week comes out of the same ground.",
  },
  {
    day: "Wednesday",
    icon: Utensils,
    title: "The Rite of the Table",
    subtitle: "Cook the land for each other",
    body: "Harvest, glean, or buy from the closest grower you can find. Enjoy your meal together in a beautiful paradise. Save the seeds from everything you eat: at the voyage's end they go into the healing hole, growing plants that hold your love.",
  },
  {
    day: "Thursday",
    icon: Sprout,
    title: "The Rite of Hands",
    subtitle: "Give a day to the land",
    body: "Serve a land project on your treasure map. Whatever they need doing, do it. Plant something together before you leave, and put your hands in the same hole.",
  },
  {
    day: "Friday",
    icon: Mountain,
    title: "The Rite of Beauty",
    subtitle: "Stand in front of something that undoes you",
    body: "The waterfall, the ridge, the hot spring at dusk. The First Mate marks one on every voyage. Say nothing for the first ten minutes. Beauty gets in through the quiet.",
  },
  {
    day: "Saturday",
    icon: MessageCircle,
    title: "The Rite of Truth",
    subtitle: "The conversation you have been putting off",
    body: "There are prompt cards in the Captain's Book. Pull one, sit by the fire, and take turns. This is the day the week has been softening you for. Couples who are struggling and want to deepen: this rite is why the ship exists.",
    href: "/ship/voyage#rite-of-truth",
    linkLabel: "Open the Rite of Truth deck",
  },
  {
    day: "Sunday",
    icon: Anchor,
    title: "The Homecoming Rite",
    subtitle: "Plant the healing hole",
    body: "Sail home to her anchorage at The Sanctuary. Plant the seeds you saved in the healing hole, where every crew that ever sailed has planted theirs. Sign the log. The food forest that grows there is the record of your week.",
  },
];

/** How the theme dresses her inside. Refit in progress; photos land as it does. */
const INTERIOR = [
  { title: "The altar", body: "A small fixed shelf by the galley. Bring what you hold sacred. Every crew is welcome to leave something behind, if they desire." },
  { title: "The love nest", body: "The primary bedroom, made up in organic linens, blackout for real sleep, and a window you can watch the stars through." },
  { title: "The apothecary galley", body: "Cast iron, real food, in-line-filtered drinking water, and a jar of honey from a Cascadia beekeeper who works wild-flowering land." },
  { title: "The Hermitage seat", body: "One chair, set apart, facing out. Love needs solitude next to it. Whoever needs the seat takes it, and the other leaves them to it." },
  { title: "The seed chest", body: "The treasure. It rides where you can see it, because it is the reason the voyage is a voyage and not a vacation." },
  { title: "The Captain's Book", body: "Her log, her rites, and the prompt cards for the Rite of Truth. You write in it. The next crew reads it." },
];

/** Point-earning actions before you sail, themed to this docking. */
const LOVE_ACTIONS = [
  { title: "Give a day to a land project near you", points: 50, body: "Whatever they need doing. Share what you did." },
  { title: "Bring a couple onto the crew list", points: 50, body: "Someone who needs their next honeymoon. Send them the article." },
];

export default function ShipTheme() {
  return (
    <PageWrapper>
      <SEO
        title="The Sanctuary of Love | The ReGen Ship"
        description="The ship takes the theme of wherever she is docked. She is docked at The Sanctuary in Ashland, Oregon, so this season she sails as The Sanctuary of Love."
        image="/images/ship/ship-sanctuary-of-love-hero.jpg"
        url="/ship/theme"
      />

      {/* Hero */}
      <section className="relative min-h-[62vh] flex items-center justify-center text-center overflow-hidden">
        <ShipImage name="ship-sanctuary-of-love-hero.jpg" alt="A white lion statue on a stone ledge overlooking the valley at golden sunset, at the Ashland Sanctuary." rounded={false} className="absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 bg-black/50" />
        <div className="max-w-3xl mx-auto px-4 py-24 text-white">
          <p data-reveal className="uppercase tracking-widest text-sm font-semibold text-[#ffd700] mb-4">The current docking</p>
          <h1 data-reveal data-reveal-delay="80" className="text-4xl md:text-6xl font-bold mb-5 drop-shadow-lg">{CURRENT_THEME.name}</h1>
          <p data-reveal data-reveal-delay="160" className="text-lg md:text-2xl mb-8 text-white drop-shadow">She is docked at {CURRENT_THEME.dock}. So this season she sails as a sanctuary, and the sanctuary is built on love.</p>
          <div data-reveal data-reveal-delay="240" className="flex flex-wrap gap-4 justify-center">
            <BookNowButton size="lg" className="text-base px-7" />
            <Button asChild size="lg" className="bg-white text-[#1a472a] font-semibold text-base px-7 hover:bg-white/90 shadow-lg">
              <a href="/blog/more-than-one-honeymoon">Read the honeymoon story</a>
            </Button>
          </div>
        </div>
      </section>

      <ShipNavRow current="/ship/theme" />

      {/* The docking doctrine */}
      <ShipSection>
        <ShipEyebrow>The docking doctrine</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-6">Every dock gives her a theme</h2>
        <div className="prose prose-lg max-w-none text-foreground/90 space-y-4">
          <p>The ship is a vessel, and a vessel carries what it is filled with. Wherever she docks, the heart of that place becomes her heart for the season. Her interior gets dressed for it. Her quests get written for it. Her voyages get planned around it. When she moves to a new dock, the theme moves with her and the whole ship is made again.</p>
          <p>She is docked at The Sanctuary in Ashland, Oregon, between the Tower and the Hermitage. The Sanctuary holds love, and it has held it long enough that the land there knows how. So she sails as {CURRENT_THEME.name}, and every part of her is arranged around that one word.</p>
          <p>We chose it on purpose for her first season. Whatever gets built first sets the grain of the wood for everything after. If the fleet is going to carry anything down the road for the next fifty years, let it start by carrying this.</p>
        </div>
      </ShipSection>

      {/* The four loves */}
      <ShipSection className="bg-[#d4a574]/10">
        <ShipEyebrow>What the season is built on</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-3">The four loves aboard</h2>
        <p className="text-foreground/80 max-w-2xl mb-8">Every quest, every meal, every mile of the treasure map serves one of these four. Tend all four for a week and the fifth one arrives on its own, which is love of the whole thing: the crew, the community, the land, and the world that holds all of it.</p>
        <div className="grid md:grid-cols-2 gap-6">
          {FOUR_LOVES.map((l, i) => (
            <div key={l.title} data-reveal data-reveal-delay={(i % 2) * 100} className="flex gap-4">
              <l.icon className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-lg mb-1">{l.title}</h3>
                <p className="text-foreground/80">{l.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ShipSection>

      {/* The Love Voyage */}
      <ShipSection>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div data-reveal="left" className="aspect-[4/3]"><ShipImage name="ship-riverbank-rest.jpg" alt="Resting barefoot by a calm forest river in the pines." className="h-full" /></div>
          <div data-reveal="right">
            <ShipEyebrow>The Love Voyage</ShipEyebrow>
            <h2 className="text-3xl font-bold mb-4">You are allowed to have more than one honeymoon</h2>
            <p className="text-foreground/90 mb-4">The old story goes that a couple ate honey for a full moon before they stepped into their next season together. A moon of honey was a moon of medicine. Somewhere along the way that shrank into one vacation, taken once, mostly spent recovering from the wedding.</p>
            <p className="text-foreground/90 mb-4">The Sanctuary of Love gives that week back, as many times as your love needs it. You heal the land and the land heals your love. That exchange is the whole design of the season.</p>
            <a href="/blog/more-than-one-honeymoon" className="inline-flex items-center gap-1 text-[#2f5d3a] dark:text-[#ffd700] font-semibold underline decoration-2 underline-offset-4 hover:text-[#1a472a] dark:hover:text-[#ffe14d] transition-colors">Read: You're Allowed to Have More Than One Honeymoon <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </ShipSection>

      {/* The Quest of Love: seven rites */}
      <ShipSection className="bg-[#2f5d3a] text-white">
        <p className="uppercase tracking-widest text-xs font-semibold text-[#ffd700] mb-3">The Quest of Love</p>
        <h2 className="text-3xl font-bold mb-3">Seven days, seven rites, one voyage</h2>
        <p className="text-white/85 max-w-2xl mb-8">Every voyage boards on Monday and returns the following Monday. This season each of those days carries a rite. You do not have to do any of them. Crews who do them come home different, and the ones who do all seven get their week recorded in the Voyage Log as a completed Quest of Love.</p>
        <div className="space-y-4">
          {RITES.map((r, i) => (
            <div key={r.day} data-reveal data-reveal-delay={Math.min(i, 6) * 60} className="flex gap-4 rounded-2xl border border-white/15 bg-white/5 p-5">
              <r.icon className="w-8 h-8 text-[#ffd700] shrink-0 mt-1" aria-hidden="true" />
              <div>
                <p className="uppercase tracking-widest text-[11px] font-semibold text-[#ffd700]/90 mb-1">{r.day}</p>
                <h3 className="font-bold text-lg leading-tight">{r.title}</h3>
                <p className="text-white/70 text-sm mb-2">{r.subtitle}</p>
                <p className="text-white/85">{r.body}</p>
                {r.href && (
                  <Link
                    href={r.href}
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-[#ffd700] underline decoration-2 underline-offset-4 hover:text-[#ffe14d]"
                  >
                    {r.linkLabel ?? "Open"} <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <BookNowButton size="default" />
          <Button asChild variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20"><Link href="/ship/log">Read what past crews did</Link></Button>
        </div>
      </ShipSection>

      {/* Sail free: themed quest actions */}
      <ShipSection className="bg-[#4a7c59]/8">
        <ShipEyebrow>Sail her free</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-3">The Sanctuary of Love actions</h2>
        <p className="text-foreground/80 max-w-2xl mb-6">The Free Passage Quest enters you in the drawing for a free week when you reach the points line. This docking adds its own ways to earn, and every one of them is an act of love you can do from where you already are, before you ever board.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {LOVE_ACTIONS.map((a, i) => (
            <div key={a.title} data-reveal data-reveal-delay={(i % 2) * 80} className="rounded-2xl border bg-card p-5">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="font-semibold">{a.title}</h3>
                <span className="shrink-0 text-sm font-bold text-[#b8860b] dark:text-[#ffd700]">{a.points} pts</span>
              </div>
              <p className="text-sm text-foreground/75">{a.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f]"><Link href="/ship/quest">Enter the quest</Link></Button>
        </div>
      </ShipSection>

      {/* The interior */}
      <ShipSection>
        <ShipEyebrow>How the theme dresses her</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-3">Inside a sanctuary of love</h2>
        <p className="text-foreground/80 max-w-2xl mb-8">Her refit for this docking is underway. The bones are a 2006 luxury build with real wood and stone, cured decades past off-gassing. The Sanctuary supplies the rest.</p>
        <div className="grid md:grid-cols-3 gap-5">
          {INTERIOR.map((it, i) => (
            <div key={it.title} data-reveal data-reveal-delay={(i % 3) * 80} className="rounded-2xl border p-5 bg-card">
              <h3 className="font-semibold mb-1">{it.title}</h3>
              <p className="text-sm text-foreground/75">{it.body}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-6">Interior photos come aboard as the refit finishes. Open flame stays in the fire ring, never in the coach.</p>
        <BookNowCallout headline="Come sail the Sanctuary of Love" sub="Her weeks board Monday and return the following Monday. Pick an open week and take the voyage." />
      </ShipSection>

      {/* CORE */}
      <ShipSection className="bg-[#d4a574]/10">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <ShipEyebrow>Why a church runs this</ShipEyebrow>
            <h2 className="text-3xl font-bold mb-4">The Church of the Regenerative Earth holds the ship</h2>
            <p className="text-foreground/90 mb-4">The church exists to regenerate the Earth and to spread love-based civilization. The Sanctuary of Love is one of its first programs, and CORE now runs the ship's operations: her upkeep, her crew, her offerings, her log.</p>
            <p className="text-foreground/90 mb-4">Every ship after her joins the same body. The fleet needs an organization that can hold vessels for the long term, in service to the Regenerative Renaissance rather than to a return. That organization is the church.</p>
            <p className="text-foreground/90 mb-4">Ten percent of every voyage buys the ship herself back into community ownership.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f]"><a href={CURRENT_THEME.coreUrl}>See the church programs</a></Button>
              <Button asChild variant="outline"><Link href="/ship/fleet">Join the fleet</Link></Button>
            </div>
          </div>
          <div className="rounded-2xl border p-6 bg-card">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-6 h-6 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" />
              <h3 className="font-semibold text-lg">What the season is for</h3>
            </div>
            <ul className="space-y-3 text-foreground/80">
              <li className="flex gap-3"><Heart className="w-5 h-5 shrink-0 mt-0.5 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" /><span>Couples get a week where their love is the point of the trip.</span></li>
              <li className="flex gap-3"><Sprout className="w-5 h-5 shrink-0 mt-0.5 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" /><span>Land projects get hands, seeds, and a crew that shows up.</span></li>
              <li className="flex gap-3"><Users className="w-5 h-5 shrink-0 mt-0.5 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" /><span>The movement gets a vessel it owns a little more of after every voyage.</span></li>
              <li className="flex gap-3"><Moon className="w-5 h-5 shrink-0 mt-0.5 text-[#4a7c59] dark:text-[#7dd87d]" aria-hidden="true" /><span>The healing hole at The Sanctuary gets one more crew's seeds in the ground.</span></li>
            </ul>
          </div>
        </div>
      </ShipSection>

      {/* Closing CTA */}
      <ShipSection className="bg-[#2f5d3a] text-white text-center">
        <h2 className="text-3xl font-bold mb-4">When is your next honeymoon?</h2>
        <p className="text-white/85 max-w-2xl mx-auto mb-7">She is docked at The Sanctuary through her first sailing year. Her weeks board Monday and return the following Monday. The trial year rate is the sweetest she will ever be, and the crew who get there first get her at it.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <BookNowButton size="lg" />
          <Button asChild size="lg" variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20"><Link href="/ship/quest">Win a free voyage</Link></Button>
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
