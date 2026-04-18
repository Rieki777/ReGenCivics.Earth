import { useState, useRef } from "react";

type PageInfo = { title: string; description?: string; image?: string };

const PAGE_MANIFEST: Record<string, PageInfo> = {
  "/fund": { title: "The Fund", description: "Land-backed investments in systemic regeneration" },
  "/quest": { title: "Quests", description: "Earn tokens and heal the Earth through regenerative actions" },
  "/community": { title: "Community", description: "Join the conversation" },
  "/governance": { title: "Governance", description: "How decisions get made" },
  "/bionomics": { title: "Bionomics", description: "The living economy" },
};

export function HoverPreview({ href, children }: { href: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const info = PAGE_MANIFEST[href];
  if (!info) return <>{children}</>;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => { timer.current = setTimeout(() => setShow(true), 600); }}
      onMouseLeave={() => { clearTimeout(timer.current); setShow(false); }}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#1a472a] border border-[#7dd87d]/20 rounded-xl p-3 shadow-xl z-50 pointer-events-none animate-in fade-in duration-150">
          <p className="text-white font-semibold text-sm">{info.title}</p>
          {info.description && <p className="text-white/60 text-xs mt-1">{info.description}</p>}
        </div>
      )}
    </span>
  );
}
