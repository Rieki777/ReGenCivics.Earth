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
      className="w-full bg-[#0a1f14] flex items-center justify-center"
      style={{ minHeight: "calc(100dvh - 64px)" }}
      role="status"
      aria-label="Loading the globe"
    >
      <p className="text-[#7dd87d]/50 text-sm tracking-wide animate-pulse">
        Loading the globe...
      </p>
    </div>
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
        image="/og/map.webp"
      />
      <h1 className="sr-only">ReGen Civics Project Map</h1>
      <Suspense fallback={<GlobePlaceholder />}>
        <GlobeMap fullPage />
      </Suspense>
    </>
  );
}
