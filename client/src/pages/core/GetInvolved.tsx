import { Link } from "wouter";
import { useCoreSeo } from "./useCoreSeo";
import { useCoreReveal } from "./useCoreReveal";
import CoreImage from "./CoreImage";
import { isCoreAssetReady } from "./coreAssets";

export default function GetInvolved() {
  useCoreSeo({
    title: "Get Involved - CORE",
    description:
      "Join the Church of the Regenerative Earth. Enter the community, take up quests, and gather with us through ReGen Civics.",
    path: "/get-involved",
  });
  useCoreReveal();

  return (
    <>
      <section className={`hero${isCoreAssetReady("get-involved-hero") ? " hero-image" : ""}`} style={{ padding: "76px 0 60px" }}>
        <div className="hero-media">
          <CoreImage id="get-involved-hero" priority fallback={null} />
        </div>
        <div className="wrap">
          <p className="eyebrow">Get Involved</p>
          <h1>There is a place for you here</h1>
          <p className="lead center">
            CORE is for anyone drawn to the regenerative renaissance and the healing of our Earth,
            looking for a community to practice these beliefs in. However you arrive, you are welcome.
            Here is how to begin.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap" style={{ maxWidth: 820 }}>
          {/* Keeps the heading outline contiguous (h1 -> h2 -> the h3 steps). */}
          <h2 className="sr-only">How to begin</h2>
          <CoreImage
            id="get-involved-community-life"
            className="section-media"
            sizes="820px"
            fallback={null}
            style={{ marginBottom: 34 }}
          />
          <div className="steps reveal">
            <div className="step">
              <div>
                <h3>Enter the community</h3>
                <p>Everything begins at ReGen Civics, our living home and gathering place. Create your profile and step into the community where the church lives and grows.</p>
                <p style={{ marginTop: 8 }}><a className="btn btn-primary" href="https://regencivics.earth">Join at regencivics.earth</a></p>
              </div>
            </div>
            <div className="step">
              <div>
                <h3>Take up your first quest</h3>
                <p>Our practices take the form of quests: land connection, food growing, community care, and more. Each one is a step of the path and a way to root yourself in the work.</p>
                <p style={{ marginTop: 8 }}><a href="https://regencivics.earth/quest">Explore quests</a></p>
              </div>
            </div>
            <div className="step">
              <div>
                <h3>Come to a gathering</h3>
                <p>Join an online gathering, a healing circle, a planting day, or a seasonal celebration. Sitting with the community is the surest way to feel whether this is home.</p>
                <p style={{ marginTop: 8 }}><a href="https://regencivics.earth/schedule">See the schedule</a></p>
              </div>
            </div>
            <div className="step">
              <div>
                <h3>Grow into the church</h3>
                <p>As you walk with us, you can take on more: stewarding land, guiding others, and helping govern the church through the community's shared tools. There is no ceiling and no gatekeeper. The path is open.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band-forest">
        <div className="wrap center">
          <CoreImage
            id="get-involved-sanctuary"
            className="section-media"
            sizes="(max-width: 860px) 100vw, 1080px"
            fallback={null}
            style={{ marginBottom: 34 }}
          />
          <p className="eyebrow">Governed by the people</p>
          <h2>Your voice shapes this church</h2>
          <p className="lead center">
            CORE has no ruling class. The direction and decisions of the church are held by the
            community through the shared governance tools at ReGen Civics and Hypha. When you join, you
            are not joining an audience. You are joining the people who steer.
          </p>
          <div className="btn-row">
            <a className="btn btn-primary" href="https://regencivics.earth">Step in</a>
            <Link href="/transparency" className="btn btn-ghost">How we govern</Link>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <CoreImage id="get-involved-path" className="section-media" sizes="820px" fallback={null} />
          <p className="lead center" style={{ marginTop: 26 }}>The path is open. However you arrive, we are glad you are here.</p>
        </div>
      </section>
    </>
  );
}
