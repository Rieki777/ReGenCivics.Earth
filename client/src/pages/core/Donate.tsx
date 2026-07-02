import { Link } from "wouter";
import { useCoreSeo } from "./useCoreSeo";
import { useCoreReveal } from "./useCoreReveal";
import DonateOptions from "./DonateOptions";

export default function Donate() {
  useCoreSeo({
    title: "Donate - CORE",
    description:
      "Giving is worship. Support the Church of the Regenerative Earth and the fund that heals land and communities.",
    path: "/donate",
  });
  useCoreReveal();

  return (
    <>
      <section className="hero" style={{ padding: "76px 0 60px" }}>
        <div className="wrap">
          <p className="eyebrow">Give</p>
          <h1>Giving is worship</h1>
          <p className="lead center">
            Pooling our resources to heal land and communities is one of the most sacred things we do.
            Every gift is a vote for a world that regenerates rather than extracts. Not for profit, not
            for power, only for a life that gets better and better and better.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <DonateOptions />
        </div>
      </section>

      <section>
        <div className="wrap">
          <p className="eyebrow center">Where your gift goes</p>
          <h2 className="center">Every dollar is a seed</h2>
          <div className="grid grid-3 reveal" style={{ marginTop: 34 }}>
            <div className="card"><span className="icon" aria-hidden="true">🌎</span><h3>Healing the land</h3><p>Your giving helps steward and acquire land, plant food forests, and hold ground in trust for the Earth and the generations to come.</p></div>
            <div className="card"><span className="icon" aria-hidden="true">🍲</span><h3>Feeding people</h3><p>Gifts sustain our work of feeding those in need and keeping abundance moving through the community.</p></div>
            <div className="card"><span className="icon" aria-hidden="true">🤝</span><h3>Holding community</h3><p>Your support keeps our gatherings, healing circles, and sacred music alive and open to all who need them.</p></div>
          </div>
        </div>
      </section>

      <section className="band-parch">
        <div className="wrap center">
          <p className="eyebrow center">Held in the open</p>
          <h2>Every gift is visible</h2>
          <p className="lead center">
            Transparency is worship. The fund that receives your giving is governed by the community,
            and its flows are visible to our members. No individual controls it. You can see exactly
            how the church stewards what is entrusted to it.
          </p>
          <div className="btn-row"><Link href="/transparency" className="btn btn-ghost">See our transparency</Link></div>
        </div>
      </section>

      <section className="center">
        <div className="wrap">
          <h2>Ready to plant a seed?</h2>
          <p className="lead center">
            Giving flows through our home at ReGen Civics, alongside the fund and the wider movement.
            Step in to make your gift and see the work it joins.
          </p>
          <div className="btn-row">
            <a className="btn btn-primary" href="https://regencivics.earth">Give now</a>
            <Link href="/get-involved" className="btn btn-ghost">Other ways to help</Link>
          </div>
          <p style={{ marginTop: 18, fontSize: ".92rem", color: "var(--forest-sage)" }}>
            The Church of the Regenerative Earth is a 508(c)(1)(a) faith ministry.
          </p>
        </div>
      </section>
    </>
  );
}
