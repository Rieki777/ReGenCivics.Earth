import { Link } from "wouter";
import { useCoreSeo } from "./useCoreSeo";
import CoreImage from "./CoreImage";
import { isCoreAssetReady } from "./coreAssets";

export default function NotFound() {
  useCoreSeo({
    title: "Not found - CORE",
    description: "This path does not lead anywhere yet. Find your way back to the church.",
  });

  return (
    <section className={`hero${isCoreAssetReady("not-found-404") ? " hero-image" : ""}`} style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="hero-media">
        <CoreImage id="not-found-404" priority fallback={null} />
      </div>
      <div className="wrap">
        <p className="eyebrow">A little lost</p>
        <h1>This path is still growing</h1>
        <p className="lead center">
          The page you were looking for is not here. The way back is soft and green.
        </p>
        <div className="btn-row">
          <Link href="/" className="btn btn-primary">Return home</Link>
          <Link href="/faith" className="btn btn-ghost">Read our faith</Link>
        </div>
      </div>
    </section>
  );
}
