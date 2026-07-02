import { useState, type ReactNode } from "react";
import { CORE_ASSETS, coreImgUrl, coreSrcSet, type CoreAssetId } from "./coreAssets";
import manifest from "./asset-manifest.json";

type ManifestEntry = { ready?: boolean; lqip?: string };
const ASSETS = (manifest as { assets?: Record<string, ManifestEntry> }).assets ?? {};

type Props = {
  id: CoreAssetId;
  /** Rendered until the asset is generated + marked ready in the manifest. */
  fallback: ReactNode;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
  /** LCP images (e.g. the home hero) load eagerly with high priority. */
  priority?: boolean;
};

/**
 * Renders a CORE illustration as a responsive WebP served through /api/img,
 * over a blurred LQIP placeholder, with the alt text from the registry. Before
 * an asset exists (empty manifest), and if the network fetch fails at runtime,
 * it renders `fallback` so the page never shows a broken image or raw alt text.
 */
export default function CoreImage({ id, fallback, sizes, className, imgClassName, imgStyle, priority }: Props) {
  const [failed, setFailed] = useState(false);
  const entry = ASSETS[id];
  const asset = CORE_ASSETS[id];
  if (!entry?.ready || !asset || failed) {
    return <>{fallback}</>;
  }
  const largest = asset.widths[0];
  return (
    <span
      className={`lqip${className ? ` ${className}` : ""}`}
      style={{
        display: "block",
        width: "100%",
        aspectRatio: `${asset.aspect[0]} / ${asset.aspect[1]}`,
        backgroundImage: entry.lqip ? `url(${entry.lqip})` : undefined,
      }}
    >
      <img
        src={coreImgUrl(id, largest)}
        srcSet={coreSrcSet(asset)}
        sizes={sizes ?? "100vw"}
        alt={asset.alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        // @ts-expect-error fetchpriority is valid HTML but not yet in React's types on this version
        fetchpriority={priority ? "high" : undefined}
        className={imgClassName}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...imgStyle }}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
