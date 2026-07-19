/**
 * /ship/galley - The Galley: the ReGen Ship's food experience.
 *
 * The cultural diet (organic, plant-based, mostly raw), the two tracks, the daily
 * rhythm, the "What's Aboard? Remix It" interactive, the cookbook of formula
 * cards, the seasonal bioregional guide with the printable food treasure map, and
 * the community's published remixes.
 *
 * Voice + framing (Galley spec section 0): careful and invitational, abundance not
 * restriction. No em-dashes, no contrast framing, no medical claims.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ShipImage, ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";
import { GalleyTrackCards, HEALTH_NOTE, type TrackId } from "@/components/ship/GalleyTracks";
import { GalleyRemixer } from "@/components/ship/GalleyRemixer";
import { GALLEY_CARDS, type GalleyCard, type GalleyCategory } from "@/data/galleyCards";
import { GATHER_SPOTS, SEASON_WINDOWS } from "@/data/galleySeasons";
import { Coffee, Sun, Moon, MapPin, Download, Search, Utensils } from "lucide-react";

// The printable food treasure map. Landed at client/public/ship/ship-food-treasure-map.pdf.
const TREASURE_MAP_READY = true;
const TREASURE_MAP_URL = "/ship/ship-food-treasure-map.pdf";

const CATEGORY_LABELS: Record<GalleyCategory, string> = {
  morning: "Mornings",
  midday: "Midday",
  taco: "Taco night",
  sushi: "Make-your-own sushi",
  snack: "Snacks and sweets",
  sauce: "The flavor engine",
};
const CATEGORY_ORDER: GalleyCategory[] = ["morning", "midday", "taco", "sushi", "snack", "sauce"];

const RHYTHM = [
  { icon: Coffee, title: "Morning", body: "Optional tea, then juicy fruit. Watermelon, oranges, ripe peaches, melon. Eat until satisfied." },
  { icon: Sun, title: "Midday", body: "A deep salad, heavier fruit, a smoothie, or the signature chia bowl." },
  { icon: Moon, title: "Evening", body: "Build-your-own tacos (corn or cabbage wraps) or make-your-own sushi (cauliflower rice). Mostly raw, warm where you want it." },
];

// A few signature dishes to fill "From the Crews" until crews publish their own.
const STARTER_SLUGS = ["signature-chia-bowl", "deep-sanctuary-salad", "nori-hand-rolls"];
const STARTER_CARDS = STARTER_SLUGS
  .map((s) => GALLEY_CARDS.find((c) => c.slug === s))
  .filter((c): c is GalleyCard => Boolean(c));

function cardMatches(card: GalleyCard, track: TrackId | "all", query: string): boolean {
  if (track !== "all" && !card.tracks.includes(track)) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [card.name, ...card.base, ...card.fillings, ...card.toppings, ...card.sauce].join(" ").toLowerCase();
  return hay.includes(q);
}

function CardTile({ card, onOpen }: { card: GalleyCard; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-2xl border bg-card p-4 min-h-11 hover:border-[#4a7c59] hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-semibold text-[#2f5d3a] dark:text-[#9de89d]">{card.name}</h4>
        {card.raw && <Badge variant="secondary" className="shrink-0 text-[10px]">raw</Badge>}
      </div>
      <p className="text-sm text-foreground/80 line-clamp-2">{card.method}</p>
      <p className="text-xs text-muted-foreground mt-2">Tap to build your own</p>
    </button>
  );
}

function CardDetail({ card, onClose }: { card: GalleyCard | null; onClose: () => void }) {
  const rows: Array<[string, string[]]> = card
    ? [["Base", card.base], ["Fillings", card.fillings], ["Toppings", card.toppings], ["Sauce", card.sauce]]
    : [];
  return (
    <Dialog open={Boolean(card)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        {card && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#2f5d3a] dark:text-[#9de89d]">{card.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {card.raw && <Badge variant="secondary">fully raw</Badge>}
              {card.tracks.includes("table") && <Badge variant="outline">Ship's Table</Badge>}
              {card.tracks.includes("reset") && <Badge variant="outline">Deeper Reset</Badge>}
            </div>
            <div className="space-y-2">
              {rows.map(([label, vals]) =>
                vals.length ? (
                  <p key={label} className="text-sm">
                    <span className="uppercase tracking-wide text-[11px] font-semibold text-muted-foreground mr-2">{label}</span>
                    {vals.join(", ")}
                  </p>
                ) : null,
              )}
            </div>
            <p className="text-sm text-foreground/90 mt-3">{card.method}</p>
            <p className="text-sm italic text-[#8a5a2b] dark:text-[#e0b483] mt-2">{card.why}</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Galley() {
  const [track, setTrack] = useState<TrackId | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<GalleyCard | null>(null);
  const crews = trpc.ship.galley.publicFeed.useQuery(undefined, { staleTime: 60_000 });

  const grouped = useMemo(() => {
    const filtered = GALLEY_CARDS.filter((c) => cardMatches(c, track, query));
    return CATEGORY_ORDER.map((cat) => ({ cat, cards: filtered.filter((c) => c.category === cat) })).filter((g) => g.cards.length);
  }, [track, query]);

  return (
    <PageWrapper>
      <SEO
        title="The Galley"
        description="Cook what you gather. The ReGen Ship's cookbook, two dietary tracks, and a remixer that turns your market haul into living food."
        image="/images/ship/ship-galley-table.webp"
        url="/ship/galley"
      />

      {/* Hero */}
      <section className="relative min-h-[52vh] flex items-center justify-center text-center overflow-hidden">
        <ShipImage name="ship-galley-table.webp" alt="A galley table laid with ripe fruit, greens, and shared plates." rounded={false} className="absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 bg-black/50" />
        <div className="max-w-3xl mx-auto px-4 py-20 text-white">
          <p data-reveal className="uppercase tracking-widest text-sm font-semibold text-[#ffd700] mb-4">The Galley</p>
          <h1 data-reveal data-reveal-delay="80" className="text-4xl md:text-5xl font-bold mb-5 drop-shadow-lg">A week that could change how you eat for life</h1>
          <p data-reveal data-reveal-delay="160" className="text-lg md:text-xl text-white drop-shadow">
            When you visit another country, you taste its culture through its food. This is ours. For your week aboard,
            you are invited to eat the way this movement eats, the way this land ate before, alive and local and shared.
          </p>
        </div>
      </section>

      <ShipNavRow current="/ship/galley" />

      {/* The interactive, up top: the most hands-on part of the Galley leads,
          and the story of why we eat this way follows underneath. */}
      <ShipSection className="py-10">
        <ShipEyebrow>What's aboard?</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-3">Remix it</h2>
        <p className="text-foreground/80 max-w-2xl mb-6">
          Log what you gathered at the market and what is already aboard, then remix it into dishes that follow the
          ship's diet. Instant with the Remix engine, or ask the Ship's Yum Dealer for something wilder.
        </p>
        <GalleyRemixer />
      </ShipSection>

      {/* Why the diet is the regeneration */}
      <ShipSection className="py-10">
        <div data-reveal className="rounded-2xl border border-[#4a7c59]/40 bg-[#4a7c59]/5 p-6">
          <ShipEyebrow>Why it matters</ShipEyebrow>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">The diet is what makes the voyage regenerative</h2>
          <p className="text-foreground/85 max-w-3xl">
            Organic, plant-based, mostly raw food keeps the grey and blackwater clean enough to nourish the land through
            the healing hole. What the crew eats becomes what the land drinks. Aboard the ship you get a lived experience
            of this way of eating. You are invited to try it and watch how your body responds.
          </p>
        </div>
      </ShipSection>

      {/* The two tracks */}
      <ShipSection className="py-10">
        <ShipEyebrow>Two tracks</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-6">Pick how far you want to go</h2>
        <GalleyTrackCards />
      </ShipSection>

      {/* Daily rhythm */}
      <ShipSection className="bg-[#d4a574]/10 py-10">
        <ShipEyebrow>A day aboard</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-3">One way a day can flow</h2>
        <p className="text-foreground/80 max-w-2xl mb-6">This is an example, not a schedule. Some crews eat close to this every day and some never do. Eat when you are hungry, rest when you are tired, and take whatever fits.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {RHYTHM.map((r, i) => (
            <div key={r.title} data-reveal data-reveal-delay={i * 80} className="rounded-2xl border bg-card p-5">
              <r.icon className="w-7 h-7 text-[#b5651d] dark:text-[#e0b483] mb-3" aria-hidden="true" />
              <h3 className="font-semibold text-lg mb-1">{r.title}</h3>
              <p className="text-foreground/80 text-sm">{r.body}</p>
            </div>
          ))}
        </div>
      </ShipSection>

      {/* The Cook + her tradition */}
      <ShipSection className="py-10">
        <ShipEyebrow>The Ship's Yum Dealer</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-4">She engineers delicious nourishment out of living food</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div data-reveal="left" className="prose prose-lg max-w-none text-foreground/90 space-y-4">
            <p>
              The crew calls her the Yum Dealer because what she serves is pure delight and leaves you better than it
              found you. Almost nothing she makes ever meets a flame. What she
              really does is engineer nourishment: she takes ripe, raw, living food and composes it into meals that
              taste like a treat and feel good to eat. She is a natural hygienist, a real lineage gathered into a
              system in the 1830s by Sylvester Graham and carried forward by Herbert Shelton, Arnold Ehret, and
              T.C. Fry through the Life Science course, with roots running back through the Essenes and Hippocrates.
              Close to two hundred years of people paying careful attention to what living food does in a body, and
              what happens when you get out of the body's way.
            </p>
            <p>
              She knows why we eat fruit in the morning and melons on their own, why simple meals of a few
              ingredients sit easier than complicated ones, and why heat much above 118F turns living food into
              something else. She also knows food was never the whole of it. Sunlight, deep rest, clean air, moving
              your body, and eating with people you love are as much a part of this tradition as the plate is.
            </p>
            <p>
              Ask her why, and she will tell you. She is not here to convert you or to judge what you arrived
              eating. She is here to feed you well for a week and let your body have the last word.
            </p>
          </div>
          <div data-reveal="right" className="space-y-4">
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold text-lg mb-2">The first few days, honestly</h3>
              <p className="text-sm text-foreground/85 mb-2">
                Plenty of people report a headache, tiredness, or a short temper in the first days off coffee, sugar,
                and processed food. It commonly passes. It helps to drink water, sleep more than you think you need,
                and eat to real fullness on fruit rather than toughing it out.
              </p>
              <p className="text-sm text-foreground/85">
                That is what people report, and it is not a diagnosis. If something in your body worries you, that is
                a reason to have it looked at, not a sign to push through.
              </p>
            </div>
            <div className="rounded-2xl border border-[#b5651d]/40 bg-[#b5651d]/5 p-5">
              <h3 className="font-semibold text-lg mb-2">What she is, and what she isn't</h3>
              <p className="text-sm text-foreground/85">
                She is the crew's nourishment engineer and a guide to a food tradition. She is not a doctor, and she will tell you so herself.
                She does not diagnose, she does not read symptoms, and she does not coach fasting. For anything to do
                with your health, especially if you are pregnant, nursing, on medication, or managing a condition,
                talk to a professional who can actually look after you.
              </p>
            </div>
          </div>
        </div>
      </ShipSection>

      {/* The cookbook */}
      <ShipSection className="bg-[#2f5d3a]/[0.05] py-10">
        <ShipEyebrow>The cookbook</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-2">Build your own</h2>
        <p className="text-foreground/80 max-w-2xl mb-6">Every card is a formula, not a rule. Filter by track, search by an ingredient you have, and tap a card to build it.</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="inline-flex rounded-full border p-1 bg-card self-start">
            {(["all", "table", "reset"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrack(t)}
                aria-pressed={track === t}
                className={`px-4 py-2 min-h-11 sm:min-h-0 rounded-full text-sm font-medium transition-colors ${track === t ? "bg-[#2f5d3a] text-white" : "text-foreground/70 hover:text-foreground"}`}
              >
                {t === "all" ? "All" : t === "table" ? "Ship's Table" : "Deeper Reset"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ingredient" className="pl-9" aria-label="Search the cookbook by ingredient" />
          </div>
        </div>

        {grouped.length === 0 ? (
          <p className="text-muted-foreground">No cards match that yet. Try another ingredient.</p>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ cat, cards }) => (
              <div key={cat}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#4a7c59]" aria-hidden="true" /> {CATEGORY_LABELS[cat]}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cards.map((c) => <CardTile key={c.slug} card={c} onOpen={() => setOpen(c)} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </ShipSection>

      {/* Eat with the valley */}
      <ShipSection className="py-10">
        <ShipEyebrow>Eat with the valley</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-2">Where to gather, and what's in season</h2>
        <p className="text-foreground/80 max-w-2xl mb-6">The ship anchors at The Sanctuary in Ashland, Oregon. This is where the food comes from, and what the Rogue Valley is giving right now.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-lg mb-3">Where to gather</h3>
            <ul className="space-y-3">
              {GATHER_SPOTS.map((s) => (
                <li key={s.name} className="flex gap-3">
                  <MapPin className="w-5 h-5 text-[#4a7c59] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-foreground/80">{s.detail}</p>
                    {s.when && <p className="text-xs text-muted-foreground mt-0.5">{s.when}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-3">In season now</h3>
            <div className="space-y-3">
              {SEASON_WINDOWS.map((w) => (
                <div key={w.key} className={`rounded-2xl border p-4 ${w.isVoyageSeason ? "border-[#ffd700]/60 bg-[#ffd700]/8" : "bg-card"}`}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className="font-semibold">{w.label} {w.isVoyageSeason && <span className="text-xs font-normal text-[#8a5a2b] dark:text-[#e0b483]">voyage season</span>}</p>
                    <p className="text-xs text-muted-foreground">{w.months}</p>
                  </div>
                  <p className="text-sm text-foreground/80">{w.produce.join(", ")}.</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-[#8a5a2b]/40 bg-[#8a5a2b]/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">The Food Treasure Map</h3>
            <p className="text-sm text-foreground/80">A printable map of the foods to find and gather at the Ashland market and co-op, keyed to both tracks.</p>
          </div>
          {TREASURE_MAP_READY ? (
            <Button asChild className="bg-[#8a5a2b] hover:bg-[#754a22] min-h-11 shrink-0">
              <a href={TREASURE_MAP_URL} download>
                <Download className="w-4 h-4 mr-1.5" aria-hidden="true" /> Download the Food Treasure Map
              </a>
            </Button>
          ) : (
            <Button disabled className="min-h-11 shrink-0" title="The map is being drawn">
              <Download className="w-4 h-4 mr-1.5" aria-hidden="true" /> Coming aboard soon
            </Button>
          )}
        </div>
      </ShipSection>

      {/* From the Crews (with a few galley starters until crews publish their own) */}
      <ShipSection className="bg-[#4a7c59]/8 py-10">
        <ShipEyebrow>From the crews</ShipEyebrow>
        <h2 className="text-3xl font-bold mb-2">Dishes cooked aboard</h2>
        {crews.data && crews.data.length > 0 ? (
          <>
            <p className="text-foreground/80 max-w-2xl mb-6">The cookbook grows voyage over voyage. These are remixes crews made from their own hauls and shared.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {crews.data.map((r) => {
                const recipe = (r.recipe as { method?: string; why?: string } | Array<{ method?: string }> | null);
                const method = Array.isArray(recipe) ? recipe[0]?.method : recipe?.method;
                return (
                  <div key={r.id} className="rounded-2xl border bg-card p-4">
                    <h4 className="font-semibold text-[#2f5d3a] dark:text-[#9de89d] mb-1">{r.dishName}</h4>
                    {method && <p className="text-sm text-foreground/80 line-clamp-3">{method}</p>}
                    <p className="text-xs text-muted-foreground mt-2">by {r.crewName}</p>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="text-foreground/80 max-w-2xl mb-6">A few from the galley to start you off. Cook your own from your haul and add it here, and the cookbook grows voyage over voyage.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {STARTER_CARDS.map((c) => (
                <div key={c.slug} className="rounded-2xl border bg-card p-4">
                  <h4 className="font-semibold text-[#2f5d3a] dark:text-[#9de89d] mb-1">{c.name}</h4>
                  <p className="text-sm text-foreground/80 line-clamp-3">{c.method}</p>
                  <p className="text-xs text-muted-foreground mt-2">from the galley</p>
                </div>
              ))}
            </div>
          </>
        )}
      </ShipSection>

      {/* Health note footer */}
      <ShipSection className="py-8">
        <p className="text-xs text-muted-foreground max-w-2xl">{HEALTH_NOTE}</p>
      </ShipSection>

      <CardDetail card={open} onClose={() => setOpen(null)} />

      {/* Back to the ship */}
      <ShipSection className="py-8 text-center">
        <Button asChild variant="outline" className="min-h-11"><Link href="/ship">Back to the ship</Link></Button>
      </ShipSection>
    </PageWrapper>
  );
}
