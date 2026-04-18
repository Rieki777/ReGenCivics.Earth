export function VineDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 40"
      className={`w-full h-8 text-[#7dd87d]/30 ${className}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 20 Q100 5 200 20 T400 20 T600 20 T800 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="vine-draw"
        pathLength="1"
      />
      <circle cx="200" cy="18" r="3" fill="currentColor" className="vine-dot" style={{ animationDelay: "0.3s" }} />
      <circle cx="400" cy="22" r="2.5" fill="currentColor" className="vine-dot" style={{ animationDelay: "0.6s" }} />
      <circle cx="600" cy="18" r="3" fill="currentColor" className="vine-dot" style={{ animationDelay: "0.9s" }} />
    </svg>
  );
}
