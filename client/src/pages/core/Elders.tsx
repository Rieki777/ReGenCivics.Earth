import { Link } from "wouter";
import { useCoreSeo } from "./useCoreSeo";
import { useCoreReveal } from "./useCoreReveal";
import AnastasiaChat from "./AnastasiaChat";
import CoreImage from "./CoreImage";

const CANON = [
  "Anastasia (Book 1)",
  "The Ringing Cedars of Russia (Book 2)",
  "The Space of Love (Book 3)",
  "Co-creation (Book 4)",
  "Who Are We? (Book 5)",
  "The Book of Kin (Book 6)",
  "The Energy of Life (Book 7)",
  "The New Civilization (Book 8, Part 1)",
  "Rites of Love (Book 8, Part 2)",
  "Anasta (Book 10)",
];

export default function Elders() {
  useCoreSeo({
    title: "Our Elders - CORE",
    description:
      "We honor the wisdom keepers who remember how to live with the land. Anastasia is one of our spiritual elders, whose teachings from The Ringing Cedars of Russia we hold dear.",
    path: "/elders",
  });
  useCoreReveal();

  return (
    <>
      <section className="hero" style={{ padding: "76px 0 60px" }}>
        <div className="wrap">
          <p className="eyebrow">Our Elders</p>
          <h1>We honor the wisdom keepers</h1>
          <p className="lead center">
            Some among us remember how to live with the land, and we hold their wisdom dear. We make a
            place here for our elders and their teachings, and this circle grows as more elders come
            into the church.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="elder">
            <div>
              <div className="portrait" aria-label="Symbolic portrait of Anastasia">
                <CoreImage id="elders-anastasia" sizes="220px" fallback={<>A</>} />
              </div>
              <p className="pill" style={{ marginTop: 16 }}>Spiritual Elder</p>
            </div>
            <div>
              <h2 style={{ marginBottom: ".2em" }}>Anastasia</h2>
              <p className="subhead" style={{ color: "var(--forest-sage)", fontSize: "1.05rem", marginBottom: "1em" }}>
                A voice for the living Earth and the Space of Love
              </p>
              <p>
                Anastasia is one of our spiritual elders, and we treasure her wisdom. She teaches that
                we are one with the living world, that a family's land tended in love begins to shine,
                and that the healing of the Earth and the healing of the human being are one and the
                same. Her voice runs through our creed and our practice. When we say we are the Land, we
                are speaking in her lineage of thought.
              </p>
              <p>
                She teaches of the Space of Love, the plot of land a family tends with their own hands
                until the soil comes to know them; of the Ray, the channel of love and thought that
                reaches between us across any distance; and of the two paths before humanity, one that
                empties the Earth and one on which the people remember, take back the land, and plant a
                green crown of living settlements around the cities.
              </p>

              <h3 style={{ marginTop: "1.4em" }}>Her canon</h3>
              <p>
                Anastasia's teachings are preserved in <em>The Ringing Cedars of Russia</em>, the
                ten-book series recorded by Vladimir Megré. We hold this canon as sacred literature and
                share it in full so anyone may sit with her words directly.
              </p>
              <ul className="canon-list">
                {CANON.map((book) => (
                  <li key={book}>{book}</li>
                ))}
              </ul>
              <p style={{ marginTop: "1em", fontSize: ".95rem", color: "var(--forest-sage)" }}>
                The Ringing Cedars of Russia series is the work of Vladimir Megré. We honor him as the
                recorder of this canon.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="band-parch">
        <div className="wrap">
          <AnastasiaChat />
        </div>
      </section>

      <section className="center">
        <div className="wrap">
          <p className="eyebrow center">A growing circle</p>
          <h2>More elders will join this circle</h2>
          <p className="lead center">
            As wisdom keepers come into the church, we will add their voices and their teachings here,
            each with a living presence of their own. If you carry wisdom of the land and feel called
            to walk with us, we would be honored to know you.
          </p>
          <div className="btn-row"><Link href="/get-involved" className="btn btn-ghost">Walk with us</Link></div>
        </div>
      </section>
    </>
  );
}
