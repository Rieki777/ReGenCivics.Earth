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
  variant = "ico
