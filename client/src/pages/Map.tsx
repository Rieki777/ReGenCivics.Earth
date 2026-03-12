/**
 * Map Page - Full-screen interactive globe map
 * Shows all land projects, alliance organizations, and applicants
 */
import GlobeMap from "@/components/GlobeMap";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { BannerDisplay } from "@/components/BannerDisplay";

export default function MapPage() {
  return (
    <>
      <BackButton />
      <BannerDisplay bannerKey="map-banner" />
      <SEO
        title="Global Network Map | ReGen Civics"
        description="Explore our global network of regenerative land projects and alliance organizations building regenerative societies around the world."
      />
      <GlobeMap fullPage />
    </>
  );
}
