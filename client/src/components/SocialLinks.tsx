/**
 * SocialLinks - Unified social media links component
 * Reusable across all pages for consistency
 */

import { MessageCircle, Youtube, Globe, Network } from "lucide-react";
import {
  YOUTUBE_CHANNEL_URL,
  HYLO_SEEDS_URL,
  HOLOS_REGEN_CIVICS_URL,
} from "@shared/communityLinks";

// Social media configuration
export const SOCIAL_LINKS = {
  hylo: {
    name: "Hylo",
    url: HYLO_SEEDS_URL,
    icon: Globe,
    color: "#2d6a4f",
    hoverBg: "hover:bg-green-700/20",
  },
  holos: {
    name: "Holos",
    url: HOLOS_REGEN_CIVICS_URL,
    icon: Network,
    color: "#6b5b95",
    hoverBg: "hover:bg-purple-500/20",
  },
  socials: {
    name: "Socials",
    url: "/socials",
    icon: MessageCircle,
    color: "#7dd87d",
    hoverBg: "hover:bg-green-500/20",
  },
  youtube: {
    name: "YouTube",
    url: YOUTUBE_CHANNEL_URL,
    icon: Youtube,
    color: "#ff0000",
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
  show = ["hylo", "holos", "socials", "youtube"] as SocialKey[],
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
              className={`${colors.text} transition-all duration-200 hover:scale-110 inline-flex items-center justify-center min-w-[44px] min-h-[44px]`}
              title={social.name}
              aria-label={social.name}
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
