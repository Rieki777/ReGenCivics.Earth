export function StarsDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 20" className={`w-full h-5 text-[#7dd87d]/20 ${className}`} aria-hidden="true">
      {[100, 200, 300, 400, 500, 600, 700].map((x, i) => (
        <circle key={i} cx={x} cy={10 + (i % 2 === 0 ? -3 : 3)} r={1.5 + (i % 3)} fill="currentColor" className="vine-dot" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
      <line x1="80" y1="10" x2="720" y2="10" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 8" />
    </svg>
  );
}
