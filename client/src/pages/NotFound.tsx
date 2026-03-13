import { TaoErrorState } from "@/components/TaoErrorState";

export default function NotFound() {
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
