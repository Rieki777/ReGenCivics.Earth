/**
 * ShareButton — one-tap sharing.
 *
 * Uses the native Web Share sheet when available (phones, most modern
 * browsers), and falls back to copying the link with a toast. Every share
 * fires analytics so we can see which surfaces actually get shared.
 *
 * Designed to drop in anywhere: quest completions, project pages, the fund
 * page. Two visual variants: "solid" (a primary pill) and "soft" (a quiet
 * outline that sits inside cards).
 */
import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export interface ShareButtonProps {
  /** Stable id for analytics, e.g. "quest_complete", "project_card". */
  where: string;
  /** Text shown on the share sheet / used as the message. */
  title: string;
  text?: string;
  /** Absolute or relative URL. Defaults to the current page. */
  url?: string;
  label?: string;
  variant?: "solid" | "soft";
  className?: string;
}

export function ShareButton({
  where,
  title,
  text,
  url,
  label = "Share",
  variant = "soft",
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const resolvedUrl = () => {
    if (!url) return typeof window !== "undefined" ? window.location.href : "";
    if (url.startsWith("http")) return url;
    return typeof window !== "undefined" ? `${window.location.origin}${url}` : url;
  };

  const onShare = async () => {
    const shareUrl = resolvedUrl();
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };

    if (nav.share) {
      try {
        await nav.share({ title, text: text ?? title, url: shareUrl });
        analytics.shareClicked(where, "web_share");
        return;
      } catch {
        // User cancelled the sheet, or it failed. Fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Link copied", { icon: "🌱" });
      analytics.shareClicked(where, "copy");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 min-h-[44px] px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7dd87d] active:scale-95";
  const variants = {
    solid: "bg-[#7dd87d] text-[#0d2818] hover:bg-[#9de89d] shadow-md hover:-translate-y-0.5",
    soft: "border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10",
  };

  return (
    <button
      type="button"
      onClick={onShare}
      className={cn(base, variants[variant], className)}
      aria-label={`Share: ${title}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default ShareButton;
