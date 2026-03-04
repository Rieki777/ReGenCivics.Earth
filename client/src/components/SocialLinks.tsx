/**
 * SocialLinks - Unified social media links component
 * Reusable across all pages for consistency
 */

import { MessageCircle, Youtube } from "lucide-react";

// Discord icon (custom SVG)
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

// Social media configuration
export const SOCIAL_LINKS = {
  whatsapp: {
    name: "WhatsApp",
    url: "https://chat.whatsapp.com/KArQzEs0UQuLsGaLTvbp34",
    icon: MessageCircle,
    color: "#25D366",
    hoverBg: "hover:bg-green-500/20",
  },
  discord: {
    name: "Discord",
    url: "https://discord.gg/8aTzTxH3Qe",
    icon: DiscordIcon,
    color: "#5865F2",
    hoverBg: "hover:bg-indigo-500/20",
  },
  youtube: {
    name: "YouTube",
    url: "https://www.youtube.com/@SEEDSRegenerativeEconomies",
    icon: Youtube,
    color: "#FF0000",
    hoverBg: "hover:bg-red-500/20",
  },
};

type SocialKey = keyof typeof SOCIAL_LINKS;

interface SocialLinksProps {
  /** Which social links to show (defaults to all) */
  show?: SocialKey[];
  /** Visual variant */
  variant?: "icons" | "buttons" | "text" | "pills";
  /** Size of icons/buttons */
  size?: "sm" | "md" | "lg";
  /** Color scheme */
  colorScheme?: "light" | "dark" | "brand";
  /** Additional className */
  className?: string;
  /** Gap between items */
  gap?: "sm" | "md" | "lg";
}

export function SocialLinks({
  show = ["whatsapp", "discord", "youtube"],
  variant = "icons",
  size = "md",
  colorScheme = "light",
  className = "",
  gap = "md",
}: SocialLinksProps) {
  const sizeClasses = {
    sm: { icon: "w-4 h-4", button: "px-3 py-1.5 text-xs", pill: "px-2 py-1 text-xs" },
    md: { icon: "w-5 h-5", button: "px-4 py-2 text-sm", pill: "px-3 py-1.5 text-sm" },
    lg: { icon: "w-6 h-6", button: "px-5 py-2.5 text-base", pill: "px-4 py-2 text-base" },
  };

  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };

  const colorClasses = {
    light: {
      text: "text-white/80 hover:text-white",
      bg: "bg-white/10 hover:bg-white/20",
      border: "border-white/20 hover:border-white/40",
    },
    dark: {
      text: "text-[#1a472a] hover:text-[#1a472a]/80",
      bg: "bg-[#1a472a]/10 hover:bg-[#1a472a]/20",
      border: "border-[#1a472a]/20 hover:border-[#1a472a]/40",
    },
    brand: {
      text: "text-[#7dd87d] hover:text-[#9de89d]",
      bg: "bg-[#7dd87d]/10 hover:bg-[#7dd87d]/20",
      border: "border-[#7dd87d]/30 hover:border-[#7dd87d]/50",
    },
  };

  const colors = colorClasses[colorScheme];
  const sizes = sizeClasses[size];

  if (variant === "icons") {
    return (
      <div className={`flex items-center ${gapClasses[gap]} ${className}`}>
        {show.map((key) => {
          const social = SOCIAL_LINKS[key];
          const Icon = social.icon;
          return (
            <a
              key={key}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${colors.text} transition-all duration-200 hover:scale-110`}
              title={social.name}
            >
              <Icon className={sizes.icon} />
            </a>
          );
        })}
      </div>
    );
  }

  if (variant === "buttons") {
    return (
      <div className={`flex items-center flex-wrap ${gapClasses[gap]} ${className}`}>
        {show.map((key) => {
          const social = SOCIAL_LINKS[key];
          const Icon = social.icon;
          return (
            <a
              key={key}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 ${sizes.button} rounded-lg ${colors.bg} ${colors.text} border ${colors.border} transition-all duration-200`}
            >
              <Icon className={sizes.icon} />
              <span>{social.name}</span>
            </a>
          );
        })}
      </div>
    );
  }

  if (variant === "pills") {
    return (
      <div className={`flex items-center flex-wrap ${gapClasses[gap]} ${className}`}>
        {show.map((key) => {
          const social = SOCIAL_LINKS[key];
          const Icon = social.icon;
          return (
            <a
              key={key}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 ${sizes.pill} rounded-full ${colors.bg} ${colors.text} transition-all duration-200 hover:scale-105`}
            >
              <Icon className={sizeClasses.sm.icon} />
              <span className="font-medium">{social.name}</span>
            </a>
          );
        })}
      </div>
    );
  }

  // Text variant
  return (
    <div className={`flex items-center flex-wrap ${gapClasses[gap]} ${className}`}>
      {show.map((key, index) => {
        const social = SOCIAL_LINKS[key];
        return (
          <span key={key} className="flex items-center">
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${colors.text} underline font-medium transition-colors`}
            >
              {social.name}
            </a>
            {index < show.length - 1 && <span className={`mx-2 ${colors.text} opacity-50`}>•</span>}
          </span>
        );
      })}
    </div>
  );
}

export default SocialLinks;
