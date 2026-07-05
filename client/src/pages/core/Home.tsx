import { Link } from "wouter";
import { useCoreSeo } from "./useCoreSeo";
import { useCoreReveal } from "./useCoreReveal";
import CoreImage from "./CoreImage";
import { isCoreAssetReady } from "./coreAssets";

export default function Home() {
  useCoreSeo({
    title: "CORE - Church of the Regenerative Earth",
    description:
      "The Church of the Regenerative Earth (CORE) is the spiritual heart of ReGen Civics. We are the Earth, choosing to heal itself. A faith of land-based regeneration, community, and service to all life.",
    path: "/",
  });
  useCoreReveal();

  return (
    <>
      <section className={`hero${isCoreAssetReady("home-hero") ? " hero-image" : ""}`}>
        <div className="hero-media">
          <CoreImage id="home-hero" priority fallback={null} />
        </div>
        <div className="wrap">
          <p className="eyebrow">Church of the Regenerative Earth</p>
          <h1 className="kicker">CORE</h1>
          <p className="tagline">The spiritual heart of ReGen Civics.</p>
          <p className="lead">
            We are not separate from the Earth. We are the Earth, choosing to heal itself. This is a
            faith of land-based regeneration, gathering in community with the living world, and
            healing ourselves by healing the land we steward together.
          </p>
          <div className="btn-row">
            <Link href="/faith" className="btn btn-primary">What we believe</Link>
            <Link href="/get-involved" className="btn btn-ghost">Join us</Link>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 52, paddingBottom: 52 }}>
        <div className="wrap">
          <details className="disclosure">
            <summary>Why a church?</summary>
            <div className="disclosure-body">
              <p>
                A church, in its oldest meaning, is not a building. It is a gathered community of people
                aligned in a shared spiritual purpose. That is what we are: people who believe the Earth
                is alive, that we are one with her, and that healing her is healing ourselves.
              </p>
              <p>
                Our church is anti-dogmatic and poly-religious. We ask no one to adopt a single worldview
                or to leave the traditions they already hold. We gather around a shared mission, not a
                shared doctrine, because, like every living system, we believe a community's resilience
                grows from its diversity.
              </p>
              <Link href="/faith" className="btn btn-ghost" style={{ marginTop: 8 }}>See what we believe</Link>
            </div>
          </details>
        </div>
      </section>

      <section className="band-soft">
        <div className="wrap center">
          <p className="verse">
            "We are the Land. She is our body and we are hers. Healing her is healing ourselves."
          </p>
          <p className="attrib">From our founding creed</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <p className="eyebrow center">The CORE of ReGen Civics</p>
          <h2 className="center">A church and its living tools</h2>
          <p className="lead center">
            CORE is the spiritual purpose at the center of everything. It is why we do this. ReGen
            Civics is the ecosystem around that center: the tools, the structures, the games, and the
            fund that carry our spiritual path into the world and hold it steady.
          </p>
          <div className="grid grid-2 reveal" style={{ marginTop: 36 }}>
            <div className="card">
              <span className="icon" aria-hidden="true">🕯️</span>
              <h3>CORE holds the why</h3>
              <p>
                Our faith, our creed, our elders, and our practices. The belief that we are one with
                the Earth, and that to heal her is to heal ourselves. This is the still center
                everything grows from.
              </p>
            </div>
            <div className="card">
              <span className="icon" aria-hidden="true">🛠️</span>
              <h3>ReGen Civics holds the how</h3>
              <p>
                The platform, the quests, the community, and the fund that support land projects and
                the wider movement. Practical structures in service of the spiritual path, not the
                other way around.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <CoreImage
            id="home-village-abundance"
            className="section-media"
            sizes="(max-width: 860px) 100vw, 1080px"
            fallback={null}
          />
        </div>
      </section>

      <section className="band-parch">
        <div className="wrap">
          <p className="eyebrow center">What we hold</p>
          <h2 className="center">Three principles of life</h2>
          <div className="stack reveal" style={{ marginTop: 34, maxWidth: 820, marginLeft: "auto", marginRight: "auto" }}>
            <div className="principle">
              <span className="num">1</span>
              <div>
                <h3>We are one</h3>
                <p>The universe is a single living whole. Every person in our community is the Earth choosing to tend itself. There is only us.</p>
              </div>
            </div>
            <div className="principle">
              <span className="num">2</span>
              <div>
                <h3>Life deepens into beauty</h3>
                <p>Living systems grow toward complexity, resilience, and abundance. We regenerate rather than extract. We complexify rather than dominate.</p>
              </div>
            </div>
            <div className="principle">
              <span className="num">3</span>
              <div>
                <h3>We learn together</h3>
                <p>Consciousness grows by learning, sharing, and creating side by side. Every gathering is the Earth learning through us.</p>
              </div>
            </div>
          </div>
          <CoreImage
            id="home-temple-grove"
            className="section-media"
            sizes="(max-width: 860px) 100vw, 1080px"
            fallback={null}
            imgStyle={{ marginTop: 34 }}
          />
          <div className="center" style={{ marginTop: 30 }}>
            <Link href="/faith" className="btn btn-ghost">Read our full faith</Link>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <p className="eyebrow center">How we worship</p>
          <h2 className="center">Our practices are living and embodied</h2>
          <CoreImage
            id="home-night-ceremony"
            className="section-media"
            sizes="(max-width: 860px) 100vw, 1080px"
            fallback={null}
            imgStyle={{ marginTop: 28 }}
          />
          <div className="grid grid-3 reveal" style={{ marginTop: 34 }}>
            <div className="card"><span className="icon" aria-hidden="true">🌿</span><h3>Online gatherings</h3><p>We meet regularly to pray, sing, learn, and tend the community across the distance between us.</p></div>
            <div className="card"><span className="icon" aria-hidden="true">🍲</span><h3>Feeding those in need</h3><p>Sharing food is sacred. We grow, cook, and give so that no one in our reach goes hungry.</p></div>
            <div className="card"><span className="icon" aria-hidden="true">💚</span><h3>Healing circles</h3><p>Gentle, trauma-informed spaces where we tend one another and remember we are held.</p></div>
            <div className="card"><span className="icon" aria-hidden="true">🌳</span><h3>Food forest planting</h3><p>We put our hands in the soil and plant living systems that will feed generations we will never meet.</p></div>
            <div className="card"><span className="icon" aria-hidden="true">🔥</span><h3>Community gatherings</h3><p>Seasonal celebrations, shared meals, and land-based ceremony that grow us closer to each other and the land.</p></div>
            <div className="card"><span className="icon" aria-hidden="true">🌎</span><h3>Land stewardship</h3><p>Caring for land as an act of worship, holding it in trust for the Earth and for those who come after.</p></div>
          </div>
          <div className="center" style={{ marginTop: 30 }}>
            <Link href="/programs" className="btn btn-primary">See our programs</Link>
          </div>
        </div>
      </section>

      <section className="band-forest">
        <div className="wrap center">
          <p className="eyebrow">Wisdom keepers</p>
          <h2>We honor our elders</h2>
          <p className="lead center">
            We hold the wisdom of those who remember how to live with the land. Anastasia is one of
            our spiritual elders, and we treasure her teachings. As more elders come into the church,
            we make a place for their wisdom here.
          </p>
          <div className="btn-row"><Link href="/elders" className="btn btn-primary">Meet our elders</Link></div>
        </div>
      </section>

      <section className="center">
        <div className="wrap">
          <h2>Come be part of this</h2>
          <p className="lead center">
            CORE is for anyone drawn to the regenerative renaissance and the healing of our Earth,
            looking for a community to practice these beliefs in. You are welcome here, whatever else
            you believe.
          </p>
          <div className="btn-row">
            <Link href="/get-involved" className="btn btn-primary">Get involved</Link>
            <Link href="/donate" className="btn btn-ghost">Support the work</Link>
          </div>
        </div>
      </section>
    </>
  );
}
