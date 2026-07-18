/**
 * AMABanner, sticky site-wide banner for upcoming Ask Me Anything sessions.
 * Fetches the next active AMA from the DB and shows a dismissible banner.
 * Hidden if no active AMA or user has dismissed it in this session.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { X, Calendar, ExternalLink } from "lucide-react";

const DISMISS_KEY = "ama-banner-dismissed";

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function AMABanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  const { data: ama } = trpc.amas.getNext.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    enabled: !dismissed,
  });

  if (dismissed || !ama) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const dateLabel = formatDate(ama.date);

  return (
    <div
      role="banner"
      aria-label="Upcoming AMA announcement"
      className="relative z-[60] bg-gradient-to-r from-[#1a3a1a] via-[#0f2a0f] to-[#1a3a1a] border-b border-[#7dd87d]/25 shadow-lg"
    >
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <Calendar className="w-4 h-4 text-[#7dd87d] flex-shrink-0" aria-hidden="true" />
        <p className="text-white/85 text-sm flex-1 leading-snug">
          <span className="font-semibold text-[#7dd87d]">Live AMA:</span>{" "}
          <span className="font-medium">{ama.projectName}</span> with{" "}
          <span className="text-white">{ama.hostName}</span>
          {" "}: {dateLabel} at {ama.time}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {ama.forumThreadUrl && (
            <a
              href={ama.forumThreadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-[#1a472a] bg-[#7dd87d] hover:bg-[#9de89d] px-3 py-1.5 rounded-full transition-colors"
            >
              Join us <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss AMA banner"
            className="text-white/60 hover:text-white/80 transition-colors p-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 inline-flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
