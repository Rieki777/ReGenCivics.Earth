export function RiverDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 40" className={`w-full h-8 text-[#7dd87d]/25 ${className}`} preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 20 Q50 10 100 20 T200 20 T300 18 T400 22 T500 18 T600 22 T700 20 T800 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="vine-draw"
        pathLength="1"
      />
      <path
        d="M0 24 Q50 14 100 24 T200 24 T300 22 T400 26 T500 22 T600 26 T700 24 T800 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
        className="vine-draw"
        pathLength="1"
        style={{ animationDelay: "0.3s" }}
      />
    </svg>
  );
}
