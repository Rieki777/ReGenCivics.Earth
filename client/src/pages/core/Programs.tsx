import { Link } from "wouter";
import { useCoreSeo } from "./useCoreSeo";
import { useCoreReveal } from "./useCoreReveal";
import CoreImage from "./CoreImage";
import { isCoreAssetReady, type CoreAssetId } from "./coreAssets";

/**
 * Program cards. `asset` names the illustration generated in Phase 4.5 from
 * ASSET_PROMPTS.md; until those images are on R2 the emoji icon is shown.
 */
const PROGRAMS = [
  {
    icon: "🌿",
    asset: "program-gathering",
    alt: "People gathered in a warm circle of light around a glowing seedling.",
    title: "Online gatherings",
    body: "We come together across the miles to pray, sing the hymns of the regeneration, learn, and hold the community close. These gatherings are the steady rhythm of our congregation, open to anyone who wants to sit with us.",
  },
  {
    icon: "🍲",
    asset: "program-meal",
    alt: "Hands sharing bowls of food across a long outdoor table.",
    title: "Feeding those in need",
    body: "Sharing food is one of the oldest and most sacred acts. We grow, cook, and give so that people in our reach are fed with care and dignity. Abundance is meant to move.",
  },
  {
    icon: "💚",
    asset: "program-healing",
    alt: "People sitting in a gentle circle, one hand resting on another.",
    title: "Healing circles",
    body: "Gentle, trauma-informed spaces where we tend to one another, speak honestly, and remember we are held. Many of us come from a world that has caused harm, and here we practice a different way of being together.",
  },
  {
    icon: "🌳",
    asset: "program-planting",
    alt: "Hands pressing a young sapling into rich earth.",
    title: "Food forest planting",
    body: "We put our hands in the soil and plant living systems that feed people and heal the land at once. We plant not only for this year's harvest but for the great-grandchildren who will one day sit in the shade of these trees.",
  },
  {
    icon: "🔥",
    asset: "program-ceremony",
    alt: "People around a small fire under a starlit sky in a forest clearing.",
    title: "Community building and growing events",
    body: "Seasonal celebrations, work days, shared meals, and land-based ceremony. These are the moments where a group of people becomes a kin, growing closer to each other and to the Earth we belong to.",
  },
  {
    icon: "🎶",
    asset: "program-song",
    alt: "People singing together with open, joyful faces.",
    title: "Sacred music",
    body: "The hymns of the regeneration are our devotional songs. We sing them at gatherings and study them together. They carry our theology in a form the whole body can feel.",
  },
];

export default function Programs() {
  useCoreSeo({
    title: "Programs - CORE",
    description:
      "The programs of the Church of the Regenerative Earth: online gatherings, feeding those in need, healing circles, food forest planting, and community growing events.",
    path: "/programs",
  });
  useCoreReveal();

  return (
    <>
      <section className={`hero${isCoreAssetReady("programs-hero") ? " hero-image" : ""}`} style={{ padding: "76px 0 60px" }}>
        <div className="hero-media">
          <CoreImage id="programs-hero" priority fallback={null} />
        </div>
        <div className="wrap">
          <p className="eyebrow">Programs</p>
          <h1>Worship you can put your hands into</h1>
          <p className="lead center">
            Our practices are active and embodied. We gather, we feed, we heal, and we plant. Each of
            these is a form of prayer, a way of living out the belief that to tend the land and one
            another is to tend ourselves.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          {/* Keeps the heading outline contiguous (h1 -> h2 -> the h3 cards). */}
          <h2 className="sr-only">Our programs</h2>
          <div className="grid grid-2 reveal">
            {PROGRAMS.map((p) => (
              <div className="card" key={p.title}>
                <CoreImage
                  id={p.asset as CoreAssetId}
                  className="card-media"
                  sizes="(max-width: 860px) 100vw, 33vw"
                  fallback={<span className="icon" aria-hidden="true">{p.icon}</span>}
                />
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band-parch">
        <div className="wrap center">
          <p className="eyebrow">A traveling program</p>
          <h2>The ReGen Ship</h2>
          <p className="lead center">
            A regenerative pirate ship with a chest of seeds. Crews sail Cascadia visiting the most beautiful
            places on earth in reverence and regeneration, planting food forests as they go. Voyage offerings
            support the church, and ten percent of every voyage buys the ship into community ownership.
          </p>
          <div className="btn-row">
            <a className="btn btn-primary" href="https://regencivics.earth/ship">Board the ship</a>
            <a className="btn btn-ghost" href="https://regencivics.earth/ship/quest">Win a free voyage</a>
          </div>
        </div>
      </section>

      <section className="band-forest">
        <div className="wrap center">
          <p className="eyebrow">Gather with us</p>
          <h2>Find the next gathering</h2>
          <p className="lead center">
            Our calendar of gatherings, ceremonies, and events lives alongside the wider ReGen Civics
            community. Come see what is coming up and join the one that calls to you.
          </p>
          <div className="btn-row">
            <a className="btn btn-primary" href="https://regencivics.earth/schedule">See the schedule</a>
            <Link href="/get-involved" className="btn btn-ghost">Get involved</Link>
          </div>
        </div>
      </section>
    </>
  );
}
