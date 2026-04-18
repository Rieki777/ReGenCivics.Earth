export function ForYouLabel({ label = "For You" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7dd87d]/15 text-[#7dd87d] text-xs font-semibold border border-[#7dd87d]/20">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M6 1l1.5 3.5L11 5l-2.5 2.5.5 3.5L6 9.5 3 11l.5-3.5L1 5l3.5-.5z" />
      </svg>
      {label}
    </span>
  );
}
