/**
 * SharePrompt - Contextual share modal shown after key actions.
 * Supports: Copy link, Twitter/X, LinkedIn, WhatsApp, Telegram, Email.
 * Tracks share clicks for analytics.
 */
import { useState } from "react";
import { Link2, X, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface SharePromptProps {
  url: string;
  text: string;
  /** Analytics context: what triggered this share */
  moment: string;
  onClose?: () => void;
  className?: string;
}

function hashUserId(id: number): string {
  return btoa(String(id)).replace(/=/g, "").slice(0, 8);
}

function buildShareUrl(base: string, userId?: number, platform?: string, context?: string): string {
  const url = new URL(base, window.location.origin);
  if (userId) url.searchParams.set("ref", hashUserId(userId));
  if (platform) url.searchParams.set("src", platform);
  if (context) url.searchParams.set("ctx", context);
  return url.toString();
}

function trackShare(moment: string, platform: string) {
  try {
    // Store share event in localStorage for analytics
    const key = "regen-share-events";
    const events = JSON.parse(localStorage.getItem(key) || "[]");
    events.push({ moment, platform, ts: Date.now() });
    // Keep last 100 events
    if (events.length > 100) events.splice(0, events.length - 100);
    localStorage.setItem(key, JSON.stringify(events));
  } catch { /* ignore */ }
}

export function SharePrompt({ url, text, moment, onClose, className = "" }: SharePromptProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const userId = (user as any)?.id;

  const shareUrl = buildShareUrl(url, userId, undefined, moment);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    trackShare(moment, "copy");
    setTimeout(() => setCopied(false), 2000);
  };

  const share = (platform: string, targetUrl: string) => {
    trackShare(moment, platform);
    window.open(targetUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(buildShareUrl(url, userId, undefined, moment));

  const targets = [
    { id: "twitter", label: "Twitter / X", icon: "𝕏", action: () => share("twitter", `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`) },
    { id: "linkedin", label: "LinkedIn", icon: "in", action: () => share("linkedin", `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`) },
    { id: "whatsapp", label: "WhatsApp", icon: "💬", action: () => share("whatsapp", `https://wa.me/?text=${encodedText}%20${encodedUrl}`) },
    { id: "telegram", label: "Telegram", icon: "✈️", action: () => share("telegram", `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`) },
    { id: "email", label: "Email", icon: "📧", action: () => { trackShare(moment, "email"); window.location.href = `mailto:?subject=${encodedText}&body=${encodedUrl}`; } },
  ];

  return (
    <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Tell someone about this</p>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Copy link (primary action) */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#7dd87d] text-[#1a472a] font-semibold text-sm hover:bg-[#6bc86b] transition-colors"
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        {copied ? "Copied!" : "Copy link"}
      </button>

      {/* Social targets */}
      <div className="grid grid-cols-5 gap-2">
        {targets.map(t => (
          <button
            key={t.id}
            onClick={t.action}
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            title={t.label}
          >
            <span className="text-lg">{t.icon}</span>
            <span className="text-[9px]">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * useReferralCapture - Captures ref/src/ctx params on page load.
 * Call once in App.tsx or a layout component.
 */
export function captureReferral() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const src = params.get("src");
    const ctx = params.get("ctx");
    if (ref || src || ctx) {
      const data = { ref, src, ctx, landingUrl: window.location.pathname, ts: Date.now() };
      sessionStorage.setItem("regen-referral", JSON.stringify(data));
    }
  } catch { /* ignore */ }
}

export function getReferralData(): { ref?: string; src?: string; ctx?: string; landingUrl?: string } | null {
  try {
    const raw = sessionStorage.getItem("regen-referral");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
