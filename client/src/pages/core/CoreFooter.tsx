import { Link } from "wouter";
import CoreImage from "./CoreImage";

export default function CoreFooter() {
  return (
    <footer className="core-footer">
      <div className="footer-media" aria-hidden="true">
        <CoreImage id="footer-canopy-band" fallback={null} />
      </div>
      <div className="wrap">
        <div className="cols">
          <div>
            {/* Styled like headings, but plain <p>: real h4s here put an
                h2->h4 jump in every page's heading outline. */}
            <p className="footer-h">Church of the Regenerative Earth</p>
            <p className="verse-foot">We are the Land.</p>
            <p style={{ fontSize: ".9rem" }}>
              A 508(c)(1)(a) faith ministry. Our home is the Earth herself.
            </p>
          </div>
          <nav aria-label="Church pages">
            <p className="footer-h">Explore</p>
            <Link href="/faith">Our Faith</Link>
            <Link href="/programs">Programs</Link>
            <Link href="/elders">Elders</Link>
            <Link href="/get-involved">Get Involved</Link>
            <Link href="/donate">Donate</Link>
            <Link href="/transparency">Transparency</Link>
          </nav>
          <nav aria-label="ReGen Civics links">
            <p className="footer-h">ReGen Civics</p>
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
