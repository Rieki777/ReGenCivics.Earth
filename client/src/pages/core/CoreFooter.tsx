import { Link } from "wouter";

export default function CoreFooter() {
  return (
    <footer className="core-footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <h4>Church of the Regenerative Earth</h4>
            <p className="verse-foot">We are the Land.</p>
            <p style={{ fontSize: ".9rem" }}>
              A 508(c)(1)(a) faith ministry. Our home is the Earth herself.
            </p>
          </div>
          <nav aria-label="Church pages">
            <h4>Explore</h4>
            <Link href="/faith">Our Faith</Link>
            <Link href="/programs">Programs</Link>
            <Link href="/elders">Elders</Link>
            <Link href="/get-involved">Get Involved</Link>
            <Link href="/donate">Donate</Link>
            <Link href="/transparency">Transparency</Link>
          </nav>
          <nav aria-label="ReGen Civics links">
            <h4>ReGen Civics</h4>
            <a href="https://regencivics.earth">regencivics.earth</a>
            <a href="https://regencivics.earth/schedule">Schedule &amp; events</a>
            <a href="https://regencivics.earth">Community</a>
          </nav>
        </div>
        <p className="fine">
          Church of the Regenerative Earth (CORE) &middot; EIN 42-3198293 &middot; Founded 2026 &middot;
          Constitutional home: the SEEDS Constitution &middot; Governed by the people through the
          tools at regencivics.earth and Hypha.
        </p>
      </div>
    </footer>
  );
}
