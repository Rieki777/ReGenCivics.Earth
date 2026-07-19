import { Link } from "wouter";
import { useCoreSeo } from "./useCoreSeo";
import { useCoreReveal } from "./useCoreReveal";
import CoreJsonLd from "./CoreJsonLd";
import CoreImage from "./CoreImage";
import { isCoreAssetReady } from "./coreAssets";

const FAITH_FAQ: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does the Church of the Regenerative Earth believe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We are the Earth, choosing to heal itself. Our faith is land-based: we believe we are one with the living world, and that healing ourselves happens through healing the land we steward together, in community, in service to all life.",
      },
    },
    {
      "@type": "Question",
      name: "Do I have to leave my other spiritual traditions to join?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. We are poly-religious. Our creed is universal and asks no one to leave their spiritual home. What we share is a mission: to heal ourselves by healing the land, in community, in service to all life.",
      },
    },
    {
      "@type": "Question",
      name: "What are the three principles of life?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We are one; life evolves through deepening coherence toward complexity and beauty; and consciousness actualizes through learning together.",
      },
    },
  ],
};

const VALUES = [
  "Exploration",
  "Reciprocity",
  "Openness",
  "Integrity",
  "Courage",
  "Trust",
  "Commitment",
  "Compassion",
];

export default function Faith() {
  useCoreSeo({
    title: "Our Faith - CORE",
    description:
      "The faith of the Church of the Regenerative Earth: we are the Land, we are one, and healing the Earth is healing ourselves. Our creed, principles, and values.",
    path: "/faith",
  });
  useCoreReveal();

  return (
    <>
      <CoreJsonLd id="faith-faq" data={FAITH_FAQ} />
      <section className={`hero${isCoreAssetReady("faith-cathedral-canopy") ? " hero-image" : ""}`} style={{ padding: "76px 0 60px" }}>
        <div className="hero-media">
          <CoreImage id="faith-cathedral-canopy" priority fallback={null} />
        </div>
        <div className="wrap">
          <p className="eyebrow">Our Faith</p>
          <h1>We are the Earth, choosing to heal itself</h1>
          <p className="lead center">
            Our faith is land-based. We believe that gathering in community with the land is sacred,
            that we are one with the living world, and that healing ourselves happens through healing
            the land we steward together. Our religion is service to all life.
          </p>
        </div>
      </section>

      <section className="band-forest">
        <div className="wrap center">
          <p className="verse">
            "We gather as people who believe the Earth is alive and that we are her. We gather as
            people who believe that healing her is healing ourselves."
          </p>
          <p className="attrib">Founding Declaration</p>
        </div>
      </section>

      <section style={{ paddingBottom: 0 }}>
        <div className="wrap" style={{ maxWidth: 500 }}>
          <CoreImage id="faith-seed" className="section-media media-sm" sizes="500px" fallback={null} />
        </div>
      </section>

      <section>
        <div className="wrap">
          <p className="eyebrow center">Three principles of life</p>
          <h2 className="center">The foundation of everything we believe</h2>
          <div className="stack reveal" style={{ marginTop: 34, maxWidth: 840, marginLeft: "auto", marginRight: "auto" }}>
            <div className="principle">
              <span className="num">1</span>
              <div>
                <h3>We are one</h3>
                <p>The universe exists and evolves as a single undividable wholeness. We are not separate from the Earth, from each other, or from the cosmos. Every cell in a body is the body. Every person in our community is the Earth choosing to tend itself.</p>
              </div>
            </div>
            <div className="principle">
              <span className="num">2</span>
              <div>
                <h3>Life evolves through deepening coherence</h3>
                <p>The universe is finely tuned to make life possible, and it grows toward complexity and beauty rather than collapse. Our systems, communities, and practices are designed to mimic this. We regenerate. We complexify into resilience.</p>
              </div>
            </div>
            <div className="principle">
              <span className="num">3</span>
              <div>
                <h3>Consciousness actualizes through learning together</h3>
                <p>We are an expression of a universe on a continual learning journey, developing our capacities to thrive together. Every quest is a step of consciousness waking up. Every gathering is the universe learning through us.</p>
              </div>
            </div>
          </div>
          <CoreImage
            id="faith-root-communion"
            className="section-media media-sm"
            sizes="500px"
            fallback={null}
            style={{ marginTop: 34 }}
          />
        </div>
      </section>

      <section className="band-parch">
        <div className="wrap">
          <p className="eyebrow center">Our founding creed</p>
          <h2 className="center">What we affirm</h2>
          <div className="grid grid-2 reveal" style={{ marginTop: 34 }}>
            <div className="card"><h3>We are the Land</h3><p>We are not separate from the Earth. She is our body and we are hers.</p></div>
            <div className="card"><h3>We are one</h3><p>All human beings, all species, and the Earth herself are expressions of a single living whole, as cells are to a body.</p></div>
            <div className="card"><h3>We are called to heal</h3><p>As healthy cells respond to illness in a body, we respond to the illness of the Earth with the same urgency and love.</p></div>
            <div className="card"><h3>Life is meant to be better</h3><p>Abundance is sacred. Joy, beauty, and nourishing food are spiritual goods. This is the natural condition of a healed Earth.</p></div>
            <div className="card"><h3>The fund is sacred</h3><p>Pooling resources to heal land and communities is an act of worship. It exists to make life better, never to extract.</p></div>
            <div className="card"><h3>Transparency is worship</h3><p>Financial flows, governance decisions, and community actions are open. Secrecy does not serve the whole.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <p className="eyebrow center">A land-based faith</p>
          <h2 className="center">Why we gather with the land</h2>
          <p className="lead center">
            Our elders teach that when a family puts its hands in the soil, the soil comes to know
            them, and what grows there grows for them. A space tended in love begins to shine. The
            land learns the people across the generations, and the children raised on it know who they
            are and what they are for. This is the heart of our practice: to live again with our hands
            in the living world, to plant trees for those who come after us, and to gather, on certain
            days, with all our kin.
          </p>
          <div className="center" style={{ marginTop: 24 }}>
            <Link href="/elders" className="btn btn-ghost">The wisdom we follow</Link>
          </div>
        </div>
      </section>

      <section className="band-soft">
        <div className="wrap">
          <CoreImage
            id="faith-animals-abundance"
            className="section-media"
            sizes="(max-width: 860px) 100vw, 1080px"
            fallback={null}
            style={{ marginBottom: 34 }}
          />
          <p className="eyebrow center">Our compass</p>
          <h2 className="center">Eight core values</h2>
          <div className="chips reveal" style={{ justifyContent: "center", marginTop: 28, maxWidth: 820, marginLeft: "auto", marginRight: "auto" }}>
            {VALUES.map((v) => (
              <span className="chip" key={v}><span aria-hidden="true">❧</span>{v}</span>
            ))}
          </div>
          <p className="lead center" style={{ marginTop: 26 }}>
            These eight values, drawn from the SEEDS Constitution we adopt as our constitutional home,
            are the navigational compass of the church. They shape every gathering, every song, and
            every quest.
          </p>
        </div>
      </section>

      <section className="center">
        <div className="wrap">
          <p className="eyebrow center">All are welcome</p>
          <h2>We are poly-religious</h2>
          <p className="lead center">
            You are welcome to keep your other spiritual practices and traditions. Our creed is
            universal and asks no one to leave their spiritual home. What we share is a mission: to
            heal ourselves by healing the land, in community, in service to all life.
          </p>
          <div className="btn-row"><Link href="/get-involved" className="btn btn-primary">Find your way in</Link></div>
        </div>
      </section>
    </>
  );
}
