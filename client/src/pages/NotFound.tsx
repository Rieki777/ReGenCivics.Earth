import { TaoErrorState } from "@/components/TaoErrorState";

export default function NotFound() {
  return (
    <TaoErrorState
      message="When we think things are broken, ponder the TAO..."
      subtext="The page you're looking for has drifted like a leaf on the river."
      showCTAs={true}
    />
  );
}
