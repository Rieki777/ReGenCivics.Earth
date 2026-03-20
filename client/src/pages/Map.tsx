/**
 * Map Page - Full-screen interactive globe map
 * Shows all land projects, alliance organizations, and applicants
 */
import { Suspense, lazy } from "react";
const GlobeMap = lazy(() => import("@/components/GlobeMap"));
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { BannerDisplay } from "@/components/BannerDisplay";

function GlobePlaceholder() {
  return (
    <div
      className="w-full bg-[#0a1f14] animate-pulse"
      style={{ minHeight: "calc(100vh - 64px)" }}
      aria-hidden="true"
    />
  );
}

export default function MapPage() {
  return (
    <>
      <BackButton />
      <BannerDisplay bannerKey="map-banner" />
      <SEO
        title="Global Network Map | ReGen Civics"
        description="Explore our global network of regenerative land projects and alliance organizations building regenerative societies around the world."
      />
      <Suspense fallback={<GlobePlaceholder />}>
        <GlobeMap fullPage />
      </Suspense>
    </>
  );
}
