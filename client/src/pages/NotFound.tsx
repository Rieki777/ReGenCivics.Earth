import { useEffect } from "react";
import { TaoErrorState } from "@/components/TaoErrorState";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page Not Found | ReGen Civics";
    // Set noindex for 404 pages
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', 'noindex, nofollow');
    return () => {
      // Restore default on unmount
      robotsMeta?.setAttribute('content', 'index, follow');
    };
  }, []);

  return (
    <TaoErrorState
      message="This path hasn't been cleared yet."
      subtext="The page you're looking for has drifted like a leaf on the river."
      showCTAs={true}
      extraLinks={[
        { label: "The Game", href: "/game" },
        { label: "Land Projects", href: "/land" },
        { label: "The Fund", href: "/fund" },
      ]}
    />
  );
}
